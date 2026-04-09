import React, { useState, useMemo } from 'react';
import { questionsData, allTopics } from '../data/questions';
import { CheckCircle, Circle, Flame } from 'lucide-react';

const TopicAccordion = () => {
  const [openTopic, setOpenTopic] = useState(null);

  const topicsMap = useMemo(() => {
    const map = {};
    allTopics.forEach(topic => {
      map[topic] = questionsData.filter(q => q.topics.includes(topic));
    });
    return map;
  }, []);

  const toggle = (topic) => {
    setOpenTopic(prev => (prev === topic ? null : topic));
  };

  return (
    <div className="glass" style={{ padding: '2rem', borderRadius: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>All Topics</h2>
      {Object.entries(topicsMap).map(([topic, qs]) => (
        <div key={topic} style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => toggle(topic)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.8rem 1rem',
              background: 'rgba(0,0,0,0.3)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            {topic} ({qs.length}) {openTopic === topic ? '▴' : '▾'}
          </button>
          {openTopic === topic && (
            <ul style={{ listStyle: 'none', padding: '0.5rem 1rem', marginTop: '0.5rem' }}>
              {qs.map(q => (
                <li key={q.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
                  <a href={`https://leetcode.com/problems/${q.title.toLowerCase().replace(/ /g, '-')}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {q.id}. {q.title}
                  </a>
                  {q.important && <Flame size={14} color="#f59e0b" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default TopicAccordion;
