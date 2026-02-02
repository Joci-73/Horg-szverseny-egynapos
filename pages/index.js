import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Trash2, Plus, Trophy, Fish, RefreshCw, LogOut, FolderOpen, Lock } from 'lucide-react';

const supabaseUrl = 'IDE_A_PROJECT_URL';
const supabaseKey = 'IDE_AZ_ANON_PUBLIC_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function FishingCompetition() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showCompetitionList, setShowCompetitionList] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [competitions, setCompetitions] = useState([]);
  const [title, setTitle] = useState('Horgászverseny');
  const [competitors, setCompetitors] = useState([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [nagyhalaInput, setNagyhalaInput] = useState('');
  const [aprohalaInput, setAprohalaInput] = useState('');
  const [darabszamInput, setDarabszamInput] = useState('');
  const [competitionId, setCompetitionId] = useState(null);

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadCompetitions();
    });
    return () => { authListener?.subscription?.unsubscribe(); };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      await loadCompetitions();
    } catch (error) {
      console.error('Auth hiba:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user);
      setShowLoginModal(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      setLoginError('Hibás email vagy jelszó');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Kijelentkezési hiba:', error);
    }
  };

  const loadCompetitions = async () => {
    try {
      const { data, error } = await supabase.from('competitions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCompetitions(data || []);
      if (data && data.length > 0) await loadCompetition(data[0].id);
    } catch (error) {
      console.error('Versenyek betöltési hiba:', error);
    }
  };

  const createNewCompetition = async () => {
    try {
      const now = new Date();
      const dateStr = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
      const { data, error } = await supabase.from('competitions').insert([{ title: 'Horgászverseny - ' + dateStr }]).select();
      if (error) throw error;
      setCompetitionId(data[0].id);
      setTitle(data[0].title);
      setCompetitors([]);
      await loadCompetitions();
      setShowCompetitionList(false);
    } catch (error) {
      alert('Hiba: ' + error.message);
    }
  };

  const loadCompetition = async (compId) => {
    try {
      setLoading(true);
      const { data: comp, error: compError } = await supabase.from('competitions').select('*').eq('id', compId).single();
      if (compError) throw compError;
      setCompetitionId(comp.id);
      setTitle(comp.title);
      const { data: competitorsData, error: comptsError } = await supabase.from('competitors').select('*').eq('competition_id', comp.id).order('sort_order', { ascending: true });
      if (comptsError) throw comptsError;
      const competitorsWithMeasurements = await Promise.all(
        (competitorsData || []).map(async (competitor) => {
          const { data: measurements, error: measError } = await supabase.from('measurements').select('*').eq('competitor_id', competitor.id).order('created_at', { ascending: true });
          if (measError) throw measError;
          const totalNagyhal = measurements.reduce((sum, m) => sum + m.nagyhal, 0);
          const totalAprohal = measurements.reduce((sum, m) => sum + m.aprohal, 0);
          const totalDarabszam = measurements.reduce((sum, m) => sum + m.darabszam, 0);
          const mindosszesen = totalNagyhal + totalAprohal;
          const biggestNagyhal = measurements.length > 0 ? Math.max(...measurements.map(m => m.nagyhal)) : 0;
          return { 
            ...competitor, 
            measurements,
            totalNagyhal,
            totalAprohal,
            totalDarabszam,
            mindosszesen,
            biggestNagyhal
          };
        })
      );
      setCompetitors(competitorsWithMeasurements);
      setShowCompetitionList(false);
    } catch (error) {
      console.error('Betöltési hiba:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteCompetition = async (compId) => {
    if (!confirm('Biztosan törölni szeretnéd?')) return;
    try {
      const { error } = await supabase.from('competitions').delete().eq('id', compId);
      if (error) throw error;
      await loadCompetitions();
      if (compId === competitionId) {
        const remaining = competitions.filter(c => c.id !== compId);
        if (remaining.length > 0) await loadCompetition(remaining[0].id);
        else await createNewCompetition();
      }
    } catch (error) {
      alert('Hiba: ' + error.message);
    }
  };

  const saveTitle = async (newTitle) => {
    if (!competitionId) return;
    try {
      const { error } = await supabase.from('competitions').update({ title: newTitle }).eq('id', competitionId);
      if (error) throw error;
      setCompetitions(competitions.map(c => c.id === competitionId ? { ...c, title: newTitle } : c));
    } catch (error) {
      console.error('Cím mentési hiba:', error);
    }
  };

  const addCompetitor = async () => {
    if (newName.trim() && competitors.length < 45 && competitionId) {
      try {
        const sortOrder = competitors.length + 1;
        const { data, error } = await supabase.from('competitors').insert([{ 
          competition_id: competitionId, 
          name: newName.trim(),
          sort_order: sortOrder
        }]).select();
        if (error) throw error;
        setCompetitors([...competitors, { 
          ...data[0], 
          measurements: [],
          totalNagyhal: 0,
          totalAprohal: 0,
          totalDarabszam: 0,
          mindosszesen: 0,
          biggestNagyhal: 0
        }]);
        setNewName('');
      } catch (error) {
        alert('Hiba: ' + error.message);
      }
    }
  };

  const deleteCompetitor = async (id) => {
    try {
      const { error } = await supabase.from('competitors').delete().eq('id', id);
      if (error) throw error;
      setCompetitors(competitors.filter(c => c.id !== id));
    } catch (error) {
      alert('Hiba: ' + error.message);
    }
  };

  const addMeasurement = async (competitorId) => {
    const nagyhal = parseInt(nagyhalaInput) || 0;
    const aprohal = parseInt(aprohalaInput) || 0;
    const darabszam = parseInt(darabszamInput) || 0;
    
    if (nagyhal === 0 && aprohal === 0 && darabszam === 0) {
      alert('Adj meg legalább egy értéket');
      return;
    }

    try {
      const { error } = await supabase.from('measurements').insert([{
        competitor_id: competitorId,
        nagyhal: nagyhal,
        aprohal: aprohal,
        darabszam: darabszam
      }]);
      
      if (error) throw error;

      await loadCompetition(competitionId);
      
      setNagyhalaInput('');
      setAprohalaInput('');
      setDarabszamInput('');
      setEditingId(null);
    } catch (error) {
      alert('Hiba: ' + error.message);
    }
  };

  const results = useMemo(() => {
    const top3Nagyhal = competitors
      .filter(c => c.biggestNagyhal > 0)
      .sort((a, b) => b.biggestNagyhal - a.biggestNagyhal)
      .slice(0, 3);

    const top6Mindosszesen = competitors
      .filter(c => c.mindosszesen > 0)
      .sort((a, b) => b.mindosszesen - a.mindosszesen)
      .slice(0, 6);

    return { top3Nagyhal, top6Mindosszesen };
  }, [competitors]);
if (showCompetitionList) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FolderOpen className="w-8 h-8 text-blue-600" />
                {user ? 'Versenyek Kezelése' : 'Korábbi Versenyek'}
              </h2>
              <button onClick={() => setShowCompetitionList(false)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
            </div>

            {user && (
              <button onClick={createNewCompetition} className="w-full mb-6 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2">
                <Plus className="w-6 h-6" />
                Új Verseny Indítása
              </button>
            )}

            <div className="space-y-3">
              {competitions.map((comp) => {
                const date = new Date(comp.created_at);
                const dateStr = date.getFullYear() + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + String(date.getDate()).padStart(2, '0');
                const isActive = comp.id === competitionId;
                return (
                  <div key={comp.id} className={isActive ? 'border-2 rounded-lg p-4 flex justify-between items-center border-green-500 bg-green-50' : 'border-2 rounded-lg p-4 flex justify-between items-center border-gray-200 bg-white'}>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{comp.title}</h3>
                      <p className="text-gray-600 text-sm">{dateStr}</p>
                      {isActive && <span className="inline-block mt-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">Aktuális</span>}
                    </div>
                    <div className="flex gap-2">
                      {!isActive && (
                        <button onClick={() => loadCompetition(comp.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                          Megnyitás
                        </button>
                      )}
                      {user && (
                        <button onClick={() => deleteCompetition(comp.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
                          Törlés
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-2xl text-gray-600">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-lg shadow-xl mb-6">
          <div className="flex items-center gap-3">
            <Fish className="w-10 h-10" />
            {user ? (
              <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); saveTitle(e.target.value); }} className="text-4xl font-bold bg-transparent border-b-2 border-transparent hover:border-white focus:border-white focus:outline-none text-white placeholder-green-200 flex-1" placeholder="Verseny címe..." />
            ) : (
              <h1 className="text-4xl font-bold">{title}</h1>
            )}
          </div>
          <p className="mt-2 text-green-100">
            45 versenyző • Korlátlan mérés • Nagyhal + Apróhal + Darabszám
            {user && <span> • Admin: {user.email}</span>}
          </p>
        </div>

        <div className="flex gap-3 mb-6">
          <button onClick={() => setShowCompetitionList(true)} className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 font-semibold flex items-center gap-2 shadow-md">
            <FolderOpen className="w-5 h-5" />
            Versenyek
          </button>
          <button onClick={() => loadCompetition(competitionId)} className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 font-semibold flex items-center gap-2 shadow-md">
            <RefreshCw className="w-5 h-5" />
            Frissítés
          </button>
          {user ? (
            <button onClick={handleLogout} className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold flex items-center gap-2 shadow-md">
              <LogOut className="w-5 h-5" />
              Kilépés
            </button>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2 shadow-md">
              <Lock className="w-5 h-5" />
              Admin
            </button>
          )}
        </div>

        {showLoginModal && !user && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Admin Bejelentkezés</h2>
                <button onClick={() => setShowLoginModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email cím</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="admin@example.com" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Jelszó</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="••••••••" required />
                </div>
                {loginError && (
                  <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg">{loginError}</div>
                )}
                <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400">
                  {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
                </button>
              </form>
            </div>
          </div>
        )}

        {user && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Versenyző Hozzáadása</h2>
            <div className="flex gap-3">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addCompetitor()} placeholder="Versenyző neve..." className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" disabled={competitors.length >= 45} />
              <button onClick={addCompetitor} disabled={competitors.length >= 45} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2 font-semibold">
                <Plus className="w-5 h-5" />
                Hozzáad ({competitors.length}/45)
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Versenyzők és Fogások</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-center font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Név</th>
                  {user && (
                    <React.Fragment>
                      <th className="px-4 py-3 text-center font-semibold">Nagyhal (g)</th>
                      <th className="px-4 py-3 text-center font-semibold">Apróhal (g)</th>
                      <th className="px-4 py-3 text-center font-semibold">Darabszám</th>
                    </React.Fragment>
                  )}
                  <th className="px-4 py-3 text-center font-semibold">Mind összesen (g)</th>
                  <th className="px-4 py-3 text-center font-semibold">Összes darabszám</th>
                  {user && (
                    <React.Fragment>
                      <th className="px-4 py-3 text-center font-semibold">Mérés rögzítés</th>
                      <th className="px-4 py-3 text-center font-semibold">Művelet</th>
                    </React.Fragment>
                  )}
                </tr>
              </thead>
              <tbody>
                {competitors.map((competitor, index) => (
                  <tr key={competitor.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-center font-bold text-gray-600">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{competitor.name}</td>
                    {user && (
                      <React.Fragment>
                        {editingId === competitor.id ? (
                          <React.Fragment>
                            <td className="px-4 py-3">
                              <input type="number" step="1" value={nagyhalaInput} onChange={(e) => setNagyhalaInput(e.target.value)} placeholder="0" className="w-20 px-2 py-1 border-2 border-blue-500 rounded focus:outline-none text-center" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" step="1" value={aprohalaInput} onChange={(e) => setAprohalaInput(e.target.value)} placeholder="0" className="w-20 px-2 py-1 border-2 border-blue-500 rounded focus:outline-none text-center" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" step="1" value={darabszamInput} onChange={(e) => setDarabszamInput(e.target.value)} placeholder="0" className="w-20 px-2 py-1 border-2 border-blue-500 rounded focus:outline-none text-center" />
                            </td>
                          </React.Fragment>
                        ) : (
                          <React.Fragment>
                            <td className="px-4 py-3 text-center text-gray-400">-</td>
                            <td className="px-4 py-3 text-center text-gray-400">-</td>
                            <td className="px-4 py-3 text-center text-gray-400">-</td>
                          </React.Fragment>
                        )}
                      </React.Fragment>
                    )}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-bold">
                        {competitor.mindosszesen} g
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
                        {competitor.totalDarabszam} db
                      </span>
                    </td>
                    {user && (
                      <React.Fragment>
                        <td className="px-4 py-3 text-center">
                          {editingId === competitor.id ? (
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => addMeasurement(competitor.id)} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold">
                                Mentés
                              </button>
                              <button onClick={() => { setEditingId(null); setNagyhalaInput(''); setAprohalaInput(''); setDarabszamInput(''); }} className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm font-semibold">
                                Mégse
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setEditingId(competitor.id)} className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold">
                              Rögzít
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => deleteCompetitor(competitor.id)} className="text-red-600 hover:text-red-800">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </React.Fragment>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {competitors.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Fish className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Még nincsenek versenyzők.</p>
              </div>
            )}
          </div>
        </div>

        {!user && competitors.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Részletes Mérések</h2>
            <div className="space-y-6">
              {competitors.map((competitor, index) => (
                <div key={competitor.id} className="border-2 border-gray-200 rounded-lg p-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">
                    {index + 1}. {competitor.name}
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Nagyhal</p>
                      <p className="text-2xl font-bold text-green-700">{competitor.totalNagyhal} g</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Apróhal</p>
                      <p className="text-2xl font-bold text-blue-700">{competitor.totalAprohal} g</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Darabszám</p>
                      <p className="text-2xl font-bold text-purple-700">{competitor.totalDarabszam} db</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
<div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-green-700 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Top 3 Legnagyobb Hal
            </h3>
            {results.top3Nagyhal.length > 0 ? (
              <div className="space-y-3">
                {results.top3Nagyhal.map((c, i) => (
                  <div key={c.id} className={i === 0 ? 'flex justify-between items-center p-4 rounded bg-yellow-100 border-2 border-yellow-400' : i === 1 ? 'flex justify-between items-center p-4 rounded bg-gray-100 border-2 border-gray-400' : 'flex justify-between items-center p-4 rounded bg-orange-100 border-2 border-orange-400'}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-gray-600">{i + 1}.</span>
                      <span className="font-semibold text-lg">{c.name}</span>
                    </div>
                    <span className="font-bold text-green-700 text-xl">{c.biggestNagyhal} g</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">Még nincs rögzített nagyhal</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-blue-700 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-blue-500" />
              Top 6 Mind Összesen
            </h3>
            {results.top6Mindosszesen.length > 0 ? (
              <div className="space-y-2">
                {results.top6Mindosszesen.map((c, i) => (
                  <div key={c.id} className={i < 3 ? 'flex justify-between items-center p-3 rounded bg-blue-50 border border-blue-300' : 'flex justify-between items-center p-3 rounded bg-gray-50'}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-600">{i + 1}.</span>
                      <span className="font-semibold">{c.name}</span>
                    </div>
                    <span className="font-bold text-blue-700 text-lg">{c.mindosszesen} g</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">Még nincs rögzített mérés</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
