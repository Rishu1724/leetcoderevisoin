import fs from 'fs';
import https from 'https';
const COMPANIES = [
  { name: 'Google', file: 'google_alltime.csv' },
  { name: 'Amazon', file: 'amazon_alltime.csv' },
  { name: 'Meta', file: 'facebook_alltime.csv' },
  { name: 'Microsoft', file: 'microsoft_alltime.csv' },
  { name: 'Apple', file: 'apple_alltime.csv' }
];

const BASE_REPO_URL = 'https://raw.githubusercontent.com/krishnadey30/LeetCode-Questions-CompanyWise/master/';

async function downloadCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) return resolve(''); // Ignore 404s silently
        resolve(data);
      });
    }).on('error', reject);
  });
}

function parseCSVRow(rowStr) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
}

async function fetchLeetCodeTopics() {
  console.log("Fetching LeetCode comprehensive problem topic map...");
  const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        data {
          frontendQuestionId: questionFrontendId
          topicTags {
            name
          }
        }
      }
    }
  `;

  // Actually, axios is likely installed since it's a typical React setup, or I can use native fetch.
  // We use native fetch since Node 18+ has it.
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { 
        categorySlug: "",
        skip: 0,
        limit: 4000,
        filters: {}
      }
    })
  });
  
  const result = await response.json();
  const map = {};
  if (result?.data?.problemsetQuestionList?.data) {
    result.data.problemsetQuestionList.data.forEach(q => {
      map[parseInt(q.frontendQuestionId)] = q.topicTags.map(t => t.name);
    });
  } else {
    console.warn("Failed to fetch LeetCode topics: ", JSON.stringify(result).substring(0, 200));
  }
  return map;
}

async function main() {
  const masterMap = {};
  let maxFreq = 0;

  for (const company of COMPANIES) {
    console.log(`Downloading data for ${company.name}...`);
    const csvData = await downloadCSV(BASE_REPO_URL + company.file);
    if (!csvData) {
      console.warn(`Could not fetch CSV for ${company.name}`);
      continue;
    }

    const lines = csvData.split('\n').filter(l => l.trim().length > 0);
    // Ignore header: ID,Title,Acceptance,Difficulty,Frequency,Leetcode Question Link
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVRow(lines[i]);
      if (row.length < 5) continue;
      
      const id = parseInt(row[0]);
      if (isNaN(id)) continue;
      
      const title = row[1];
      const difficulty = row[3];
      const frequency = parseFloat(row[4] || 0);

      if (!masterMap[id]) {
        masterMap[id] = {
          id,
          title,
          difficulty,
          frequency: 0,
          companies: new Set(),
        };
      }

      masterMap[id].companies.add(company.name);
      masterMap[id].frequency += frequency; // aggregate overlapping frequency
      if (masterMap[id].frequency > maxFreq) maxFreq = masterMap[id].frequency;
    }
  }

  // Find the top 20% frequency logic to mark `important: true`.  Or just a threshold.
  const allQs = Object.values(masterMap);
  allQs.sort((a,b) => b.frequency - a.frequency);
  const top20PercentileCount = Math.floor(allQs.length * 0.2);

  // Fetch topics
  const topicsMap = await fetchLeetCodeTopics();

  const finalArray = allQs.map((q, idx) => {
    return {
      id: q.id,
      title: q.title,
      difficulty: q.difficulty,
      topics: topicsMap[q.id] || ["Uncategorized"],
      companies: Array.from(q.companies),
      important: idx < top20PercentileCount // top 20% are important
    };
  });

  console.log(`Aggregated ${finalArray.length} unique questions across ${COMPANIES.length} top companies.`);

  const codeOut = `// AUTO-GENERATED DATABASE
export const questionsData = ${JSON.stringify(finalArray, null, 2)};

export const allTopics = [...new Set(questionsData.flatMap(q => q.topics))].sort();
export const allCompanies = [...new Set(questionsData.flatMap(q => q.companies))].sort();
`;

  fs.writeFileSync('./src/data/questions.js', codeOut);
  console.log('Successfully wrote to src/data/questions.js');
}

main().catch(console.error);
