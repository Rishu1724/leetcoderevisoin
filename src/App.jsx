import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, Circle, Briefcase, Hash, Activity, Flame, Clock, PlaySquare, Calendar, Award } from 'lucide-react';
import { questionsData, allTopics, allCompanies } from './data/questions';
import TopicAccordion from './components/TopicAccordion';
import { syncSolvedQuestions, getSolvedQuestions } from './firebase';

const API_BASE = '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('database'); // dashboard | database | assessment | alltopics
  const [username, setUsername] = useState(() => localStorage.getItem('lc_username') || '');
  const [isVerified, setIsVerified] = useState(() => localStorage.getItem('lc_verified') === 'true');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Manual Tracker State
  const [solvedQuestions, setSolvedQuestions] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [dailyFocus, setDailyFocus] = useState(() => JSON.parse(localStorage.getItem('lc_daily_focus') || '[]'));
  const [expandedTopic, setExpandedTopic] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('lc_username');
    const localSolved = localStorage.getItem('lc_solved');
    
    if (localSolved) {
      setSolvedQuestions(JSON.parse(localSolved));
    }

    if (savedUser) {
      setUsername(savedUser);
      getSolvedQuestions(savedUser).then(data => {
        if (data && Object.keys(data).length > 0) {
          setSolvedQuestions(data);
          localStorage.setItem('lc_solved', JSON.stringify(data));
        }
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lc_daily_focus', JSON.stringify(dailyFocus));
  }, [dailyFocus]);

  useEffect(() => {
    if (Object.keys(solvedQuestions).length > 0) {
      localStorage.setItem('lc_solved', JSON.stringify(solvedQuestions));
      if (username) {
        setIsSyncing(true);
        syncSolvedQuestions(username, solvedQuestions).finally(() => {
          setTimeout(() => setIsSyncing(false), 1000);
        });
      }
    }
  }, [solvedQuestions, username]);

  // DB Filters
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Assessment State
  const [assessmentActive, setAssessmentActive] = useState(false);
  const [assessmentTopic, setAssessmentTopic] = useState('');
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [timeSelected, setTimeSelected] = useState(2700); // 45 minutes default

  // Timer effect
  useEffect(() => {
    let timer;
    if (assessmentActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && assessmentActive) {
      alert("Time's up! Assessment finished.");
      setAssessmentActive(false);
    }
    return () => clearInterval(timer);
  }, [assessmentActive, timeLeft]);

  const fetchWithFallback = async (endpoint) => {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`);
      if (res.status === 429) throw new Error("RATE_LIMIT");
      if (!res.ok) throw new Error("API_ERROR");
      return await res.json();
    } catch (err) {
      throw err;
    }
  };

  const fetchLeetCodeStats = async (e) => {
    if (e) e.preventDefault();
    if (!username) return;
    setLoading(true);
    try {
      // Use fallback fetcher for better reliability
      const data = await fetchWithFallback(`/userProfile/${username}`);
      
      // If the API returns an "errors" array, or doesn't have valid solved data, it's invalid
      if (data && !data.errors && data.totalSolved !== undefined) {
        localStorage.setItem('lc_username', username);
        localStorage.setItem('lc_verified', 'true');
        setIsVerified(true);
        setStats(data);

        // Sync cloud data
        const cloudData = await getSolvedQuestions(username);
        if (cloudData && Object.keys(cloudData).length > 0) {
          setSolvedQuestions(cloudData);
        }
      } else {
        alert("Verification failed: User not found on LeetCode.");
      }
    } catch (err) {
      console.error(err);
      
      // Fallback for returning users only
      const existing = await getSolvedQuestions(username);
      if (existing && Object.keys(existing).length > 0) {
        setIsVerified(true);
        setSolvedQuestions(existing);
        localStorage.setItem('lc_username', username);
        localStorage.setItem('lc_verified', 'true');
      } else {
        if (err.message === "RATE_LIMIT") {
          alert("LeetCode API is busy (Rate Limit). Please try again in 1 minute.");
        } else {
          alert("Unable to verify user. Please check your spelling or try again later.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSolvedHistory = async () => {
    if (!username || !isVerified) return;
    setLoading(true);
    try {
      // 1. Get total solved count needed for limit
      const profile = await fetchWithFallback(`/userProfile/${username}`);
      if (!profile || profile.totalSolved === undefined) throw new Error("Could not fetch profile");

      // 2. Fetch full AC submission history
      const historyRes = await fetchWithFallback(`/${username}/acSubmission?limit=${profile.totalSolved + 50}`);
      if (!historyRes || !historyRes.submission) throw new Error("Could not fetch submission history");

      // 3. Map solved titles to IDs in our database
      const acTitles = new Set(historyRes.submission.map(s => s.title));
      const newlySolved = { ...solvedQuestions };
      let changed = false;

      questionsData.forEach(q => {
        if (acTitles.has(q.title) && !newlySolved[q.id]) {
          newlySolved[q.id] = true;
          changed = true;
        }
      });

      if (changed) {
        setSolvedQuestions(newlySolved);
        alert(`Success! Automatically marked ${Object.keys(newlySolved).length - Object.keys(solvedQuestions).length} new questions as solved.`);
      } else {
        alert("Your tracker is already up to date with your LeetCode history!");
      }

    } catch (err) {
      console.error(err);
      alert("Auto-Sync failed. All servers are currently busy. Please try again in a few minutes.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('lc_username');
    localStorage.removeItem('lc_verified');
    setUsername('');
    setIsVerified(false);
    setStats(null);
    setSolvedQuestions({});
  };

  const toggleSolved = (id) => {
    setSolvedQuestions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleFocus = (topic) => {
    setDailyFocus(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const jumpToTopic = (topic) => {
    setExpandedTopic(topic);
    setActiveTab('alltopics');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startAssessment = () => {
    if (!assessmentTopic) {
      alert("Please select a Topic for assessment.");
      return;
    }
    const topicPool = questionsData.filter(q => q.topics.includes(assessmentTopic));
    if (topicPool.length === 0) {
      alert("No questions found for this topic.");
      return;
    }
    
    // Pick 3 random or up to 3 questions
    const shuffled = [...topicPool].sort(() => 0.5 - Math.random());
    setAssessmentQuestions(shuffled.slice(0, 3));
    setTimeLeft(timeSelected);
    setAssessmentActive(true);
  };

  const endAssessment = () => {
    if (window.confirm("Are you sure you want to end the assessment?")) {
      setAssessmentActive(false);
    }
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'Easy': return 'var(--success)';
      case 'Medium': return 'var(--warning)';
      case 'Hard': return 'var(--danger)';
      default: return 'var(--text-secondary)';
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sort topics by frequency
  const sortedTopics = [...allTopics].sort((a, b) => {
      const aCount = questionsData.filter(q => q.topics.includes(a)).length;
      const bCount = questionsData.filter(q => q.topics.includes(b)).length;
      return bCount - aCount;
  });

  return (
    <div className="app-container" style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', paddingBottom: '4rem' }}>
      
      {!isVerified ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="glass" style={{ maxWidth: '500px', width: '100%', padding: '3rem', textAlign: 'center', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ background: 'var(--accent-primary)', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
              <PlaySquare size={40} color="black" />
            </div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '800' }}>Welcome</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.1rem' }}>Enter your LeetCode username to unlock your progress tracker and start syncing your database.</p>
            
            <form onSubmit={fetchLeetCodeStats} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input 
                  type="text" 
                  placeholder="LeetCode Username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%', padding: '1.2rem 1.2rem 1.2rem 3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: 'white', fontSize: '1rem', outline: 'none' }}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                style={{ padding: '1.2rem', background: 'var(--text-primary)', color: 'black', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.2s', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Verifying...' : 'Verify & Enter'}
              </button>
            </form>
            
            <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Only valid LeetCode accounts can access the database.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '2rem' }}>

      {/* Nav Header */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem', padding: '0 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="title-gradient" style={{ fontSize: '2.8rem', marginBottom: '0.2rem' }}>lc.tracker</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Master your Code Revision</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {username && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={16} color="var(--success)" />
                  <span>{username}</span>
                </div>
                <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}>Switch</button>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '12px' }}>
              {['dashboard', 'database', 'assessment', 'alltopics'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
                    color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab === 'alltopics' ? 'All Topics' : tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      {assessmentActive && activeTab === 'assessment' ? (
        <div className="glass" style={{ padding: '3rem', borderRadius: '24px', textAlign: 'center', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '1px solid var(--border)', paddingBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem' }}>Mock Assessment</h2>
              <p style={{ color: 'var(--accent-primary)' }}>{assessmentTopic}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem 2rem', borderRadius: '16px' }}>
              <Clock size={28} color="var(--danger)" />
              <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--danger)', fontFamily: 'monospace' }}>{formatTime(timeLeft)}</span>
            </div>
            <button onClick={endAssessment} style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}>End Test</button>
          </div>
          <div style={{ display: 'grid', gap: '2rem', flex: 1 }}>
            {assessmentQuestions.map((q, idx) => (
              <div key={q.id} style={{ background: 'rgba(0,0,0,0.4)', padding: '2rem', borderRadius: '16px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Question {idx + 1}</span>
                    <span style={{ color: getDifficultyColor(q.difficulty), fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>{q.difficulty}</span>
                    {q.important && <span style={{ color: '#f59e0b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={14}/> Top API Frequency</span>}
                  </div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                    <a href={`https://leetcode.com/problems/${q.title.toLowerCase().replace(/ /g, '-')}`} target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>{q.id}. {q.title}</a>
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {q.companies.map(c => <span key={c} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>{c}</span>)}
                  </div>
                </div>
                <div onClick={() => toggleSolved(q.id)} style={{ cursor: 'pointer' }}>
                  {solvedQuestions[q.id] ? <CheckCircle size={40} color="var(--success)" /> : <Circle size={40} color="var(--text-secondary)" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              
              {/* TODAY'S REVISION PLAN */}
              <section className="glass" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--accent-primary)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(0,0,0,0))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <Calendar size={28} color="var(--accent-primary)"/> Today's Revision Plan
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Focus on these topics to master your weak areas.</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.9rem' }}>
                    {dailyFocus.length} Topics Selected
                  </div>
                </div>

                {dailyFocus.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>No topics pinned for today. Add them below! 👇</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {dailyFocus.map(topic => {
                      const topicQs = questionsData.filter(q => q.topics.includes(topic));
                      const solvedCount = topicQs.filter(q => solvedQuestions[q.id]).length;
                      const progress = topicQs.length > 0 ? (solvedCount / topicQs.length) * 100 : 0;
                      return (
                        <div key={topic} className="glass" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }} onClick={() => jumpToTopic(topic)}>
                              <CheckCircle size={20} color={progress === 100 ? 'var(--success)' : 'var(--text-secondary)'} />
                              <h3 style={{ fontSize: '1.1rem' }}>{topic}</h3>
                            </div>
                            <button onClick={() => toggleFocus(topic)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
                          </div>
                          <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, background: 'var(--accent-primary)', height: '100%', transition: 'width 0.4s ease' }}></div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span>{solvedCount} / {topicQs.length} Solved</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
              <section className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <h2 style={{ marginBottom: '1rem' }}>Sync LeetCode Stats</h2>
                  <form onSubmit={fetchLeetCodeStats} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
                      style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', padding: '0.8rem 1rem', borderRadius: '8px', outline: 'none' }} />
                    <button type="submit" disabled={loading} style={{ background: 'var(--accent-primary)', border: 'none', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>{loading ? 'Fetching...' : 'Sync LeetCode'}</button>
                  </form>
                  <button 
                    onClick={fetchSolvedHistory} 
                    disabled={loading}
                    style={{ marginTop: '1rem', width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', padding: '0.6rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Activity size={14} color="var(--accent-primary)"/> Auto-Mark Solved Questions (From LeetCode History)
                  </button>
                </div>
                {stats && (
                  <div style={{ flex: 1, minWidth: '300px', borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Account Trophies</p>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalSolved} <span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}> / {stats.totalQuestions} Lifetime</span></p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <span style={{ color: 'var(--success)' }}>E: {stats.easySolved}</span>
                      <span style={{ color: 'var(--warning)' }}>M: {stats.mediumSolved}</span>
                      <span style={{ color: 'var(--danger)' }}>H: {stats.hardSolved}</span>
                    </div>
                  </div>
                )}
              </section>

              {/* TOPIC MASTERY GRID */}
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Award size={24} color="var(--accent-secondary)"/> Topic Mastery</h2>
              <div style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', display: 'grid', gap: '1.5rem' }}>
                {sortedTopics.map(topic => {
                  const topicQs = questionsData.filter(q => q.topics.includes(topic));
                  const solvedCount = topicQs.filter(q => solvedQuestions[q.id]).length;
                  const progress = topicQs.length > 0 ? (solvedCount / topicQs.length) * 100 : 0;
                  return (
                    <div key={topic} className="glass" style={{ padding: '1.5rem', borderRadius: '16px', position: 'relative', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zInterval: 10 }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleFocus(topic); }} 
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: dailyFocus.includes(topic) ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)' }}
                        >
                          <Activity size={18} fill={dailyFocus.includes(topic) ? 'var(--accent-primary)' : 'none'} />
                        </button>
                      </div>
                      <div onClick={() => jumpToTopic(topic)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingRight: '2rem' }}>
                          <h3 style={{ fontSize: '1.2rem', color: progress === 100 ? 'var(--success)' : 'white' }}>{topic}</h3>
                          <span style={{ color: 'var(--text-secondary)' }}>{solvedCount}/{topicQs.length}</span>
                        </div>
                        <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, background: progress === 100 ? 'var(--success)' : 'var(--accent-secondary)', height: '100%', transition: 'width 0.3s ease' }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DATABASE TAB */}
          {activeTab === 'database' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* FILTER PANEL */}
              <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '250px' }}>
                    <Search size={18} color="var(--text-secondary)" />
                    <input type="text" placeholder="Search question name or LeetCode number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--border)', outline: 'none', fontSize: '0.9rem' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <select value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--border)', outline: 'none', fontSize: '0.9rem' }}>
                      <option value="All">All Difficulties</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Briefcase size={16} color="var(--text-secondary)" />
                      <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--border)', outline: 'none', fontSize: '0.9rem' }}>
                        <option value="All">All Companies</option>
                        {allCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', position: 'relative', overflow: 'hidden', maxHeight: showAllTopics ? 'none' : '100px', transition: 'max-height 0.3s ease' }}>
                  <button onClick={() => setSelectedTopic('All')} style={{ padding: '6px 12px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', background: selectedTopic === 'All' ? 'var(--text-primary)' : 'rgba(255,255,255,0.1)', color: selectedTopic === 'All' ? 'black' : 'var(--text-primary)', transition: 'all 0.2s' }}>All Topics</button>
                  {sortedTopics.map(topic => {
                    const count = questionsData.filter(q => q.topics.includes(topic)).length;
                    const isSel = selectedTopic === topic;
                    return (
                      <button key={topic} onClick={() => setSelectedTopic(topic)} style={{ padding: '6px 12px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', background: isSel ? 'var(--text-primary)' : 'rgba(255,255,255,0.1)', color: isSel ? 'black' : 'var(--text-primary)', transition: 'all 0.2s' }}>{topic} <span style={{ opacity: isSel ? 0.8 : 0.5 }}>{count}</span></button>
                    );
                  })}
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                   <button 
                    onClick={() => setShowAllTopics(!showAllTopics)} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {showAllTopics ? 'Show Less' : `+ ${sortedTopics.length - 8} more topics`}
                  </button>
                </div>
              </div>

              {/* QUESTIONS TABLE */}
              <main className="glass" style={{ padding: '0', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.2rem' }}>{selectedTopic === 'All' ? 'All' : selectedTopic} Problems</h2>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {questionsData.filter(q => 
                      (selectedTopic === 'All' || q.topics.includes(selectedTopic)) && 
                      (selectedCompany === 'All' || q.companies.includes(selectedCompany)) && 
                      (selectedDifficulty === 'All' || q.difficulty === selectedDifficulty) && 
                      (searchQuery === '' || q.title.toLowerCase().includes(searchQuery.toLowerCase()) || q.id.toString().includes(searchQuery))
                    ).length} Matches
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', width: '60px', paddingLeft: '1.5rem' }}>Status</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Title</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Frequency</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Difficulty</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Companies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questionsData.filter(q => 
                        (selectedTopic === 'All' || q.topics.includes(selectedTopic)) && 
                        (selectedCompany === 'All' || q.companies.includes(selectedCompany)) && 
                        (selectedDifficulty === 'All' || q.difficulty === selectedDifficulty) && 
                        (searchQuery === '' || q.title.toLowerCase().includes(searchQuery.toLowerCase()) || q.id.toString().includes(searchQuery))
                      ).map(q => (
                        <tr key={q.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '1rem', paddingLeft: '1.5rem', cursor: 'pointer' }} onClick={() => toggleSolved(q.id)}>
                            {solvedQuestions[q.id] ? <CheckCircle size={20} color="var(--success)" /> : <Circle size={20} color="var(--text-secondary)" />}
                          </td>
                          <td style={{ padding: '1rem', fontWeight: '500' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <a href={`https://leetcode.com/problems/${q.title.toLowerCase().replace(/ /g, '-')}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{q.id}. {q.title}</a>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {q.topics.slice(0,3).map(t => <span key={t} style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', background: 'rgba(99,102,241,0.1)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{t}</span>)}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {q.important ? <span style={{ color: '#f59e0b', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Flame size={14}/></span> : null}
                          </td>
                          <td style={{ padding: '1rem', color: getDifficultyColor(q.difficulty), fontSize: '0.9rem' }}>{q.difficulty}</td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {q.companies.slice(0,3).map(c => <span key={c} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>{c}</span>)}
                              {q.companies.length > 3 && <span style={{fontSize: '0.7rem', color: 'var(--text-secondary)', padding: '0.2rem'}}>+{q.companies.length - 3}</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </main>
            </div>
          )}

          {/* ALL TOPICS TAB */}
          {activeTab === 'alltopics' && (
            <TopicAccordion 
              solvedQuestions={solvedQuestions} 
              onToggle={toggleSolved} 
              initialExpandedTopic={expandedTopic}
            />
          )}

          {/* ASSESSMENT TAB */}
          {activeTab === 'assessment' && (
            <div className="glass" style={{ padding: '4rem 2rem', borderRadius: '16px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(99,102,241,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                <PlaySquare size={40} color="var(--accent-primary)" />
              </div>
              <h2 style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>Mock Assessment</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '3rem', lineHeight: '1.6' }}>Simulate a real online assessment. Pick a LeetCode topic, set your timer, and solve unseen questions without distractions.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px', margin: '0 auto' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Target Topic</label>
                  <select value={assessmentTopic} onChange={e => setAssessmentTopic(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--accent-primary)', outline: 'none', fontSize: '1rem' }}>
                    <option value="" disabled>Select a Topic</option>
                    {allTopics.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Duration</label>
                  <select value={timeSelected} onChange={e => setTimeSelected(Number(e.target.value))} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem' }}>
                    <option value={1800}>30 Minutes</option>
                    <option value={2700}>45 Minutes</option>
                    <option value={3600}>60 Minutes</option>
                  </select>
                </div>
                <button onClick={startAssessment} style={{ background: 'var(--accent-primary)', border: 'none', color: 'white', padding: '1.2rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '1rem', transition: 'transform 0.2s' }}>Start Assessment</button>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    )}
    </div>
  );
}
