// Use Native Fetch available in Node 18+

const API_MIRRORS = [
  'https://alfa-leetcode-api.onrender.com',
  'https://alfa-leetcode-api-three.vercel.app',
  'https://alfa-leetcode-api.vercel.app'
];

exports.handler = async (event, context) => {
  const { path } = event.queryStringParameters || {};
  
  if (!path) {
    return { statusCode: 400, body: JSON.stringify({ error: "No path provided" }) };
  }

  for (const mirror of API_MIRRORS) {
    try {
      const url = `${mirror}${path}`;
      const response = await fetch(url);
      
      if (response.status === 429) continue; // Rate limit, try next
      if (!response.ok) continue;

      const data = await response.json();
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      };
    } catch (error) {
      console.error(`Mirror failed: ${mirror}`, error);
      continue;
    }
  }

  return {
    statusCode: 503,
    body: JSON.stringify({ error: "All LeetCode API mirrors are currently busy or down." })
  };
};
