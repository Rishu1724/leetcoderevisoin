import React, { useState, useMemo } from 'react';
import { questionsData, allTopics } from '../data/questions';
import { CheckCircle, Circle, Flame } from 'lucide-react';

const TopicAccordion = ({ solvedQuestions = {}, onToggle }) => {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', margin: 0 }}>All Topics</h2>
        <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
          Synced with <b>{Object.keys(solvedQuestions).length}</b> questions
        </div>
      </div>
      {Object.entries(topicsMap).map(([topic, qs]) => (
        <div key={topic} style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => toggle(topic)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '1rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.2s',
            }}
          >
            <span>{topic} <span style={{ opacity: 0.5, fontWeight: 'normal', marginLeft: '0.5rem' }}>({qs.length})</span></span>
            <span style={{ fontSize: '1.2rem' }}>{openTopic === topic ? '▴' : '▾'}</span>
          </button>
          {openTopic === topic && (
            <ul style={{ listStyle: 'none', padding: '0.5rem 1rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              {qs.map(q => {
                 const isSolved = solvedQuestions[q.id];
                 const getDiffColor = (d) => d === 'Easy' ? 'var(--success)' : d === 'Medium' ? 'var(--warning)' : 'var(--danger)';
                 return (
                  <li key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button 
                        onClick={() => onToggle(q.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: isSolved ? 'var(--success)' : 'rgba(255,255,255,0.3)' }}
                      >
                        {isSolved ? <CheckCircle size={20} /> : <Circle size={20} />}
                      </button>
                      <span style={{ color: getDiffColor(q.difficulty), fontSize: '0.75rem', minWidth: '55px', fontWeight: 'bold' }}>{q.difficulty}</span>
                      <a href={`https://leetcode.com/problems/${q.title.toLowerCase().replace(/ /g, '-')}`} target="_blank" rel="noreferrer" style={{ color: isSolved ? 'var(--text-secondary)' : 'white', textDecoration: isSolved ? 'line-through' : 'none', fontSize: '1rem', transition: 'all 0.2s' }}>
                        {q.id}. {q.title}
                      </a>
                    </div>
                    {q.important && <Flame size={18} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.4))' }} />}
                  </li>
                 );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default TopicAccordion;
