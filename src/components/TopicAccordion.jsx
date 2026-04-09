import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, Flame } from 'lucide-react';
import { questionsData, allTopics } from '../data/questions';

export default function TopicAccordion({ solvedQuestions = {}, onToggle }) {
  const [expandedTopic, setExpandedTopic] = useState('Arrays');

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'Easy': return 'var(--success)';
      case 'Medium': return 'var(--warning)';
      case 'Hard': return 'var(--danger)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {allTopics.map(topic => {
        const topicQs = questionsData.filter(q => q.topics.includes(topic));
        const solvedCount = topicQs.filter(q => solvedQuestions[q.id]).length;
        const isExpanded = expandedTopic === topic;

        return (
          <div key={topic} className="glass" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            <div 
              onClick={() => setExpandedTopic(isExpanded ? null : topic)}
              style={{ padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
                <h3 style={{ fontSize: '1.1rem' }}>{topic}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>{topicQs.length} Questions</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: solvedCount === topicQs.length && topicQs.length > 0 ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 'bold' }}>{solvedCount}/{topicQs.length} Solved</span>
              </div>
            </div>

            {isExpanded && (
              <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {topicQs.map(q => (
                  <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div onClick={() => onToggle(q.id)} style={{ cursor: 'pointer', display: 'flex' }}>
                        {solvedQuestions[q.id] ? <CheckCircle size={18} color="var(--success)" /> : <Circle size={18} color="var(--text-secondary)" />}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <a href={`https://leetcode.com/problems/${q.title.toLowerCase().replace(/ /g, '-')}`} target="_blank" rel="noreferrer" style={{ color: solvedQuestions[q.id] ? 'var(--text-secondary)' : 'white', textDecoration: solvedQuestions[q.id] ? 'line-through' : 'none', fontSize: '0.95rem' }}>{q.id}. {q.title}</a>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ color: getDifficultyColor(q.difficulty), fontSize: '0.75rem' }}>{q.difficulty}</span>
                          {q.important && <Flame size={12} color="#f59e0b" />}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{q.companies.slice(0, 2).join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
