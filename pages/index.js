import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Trash2, Plus, Trophy, Fish, RefreshCw, LogOut, FolderOpen, Lock } from 'lucide-react';

const supabaseUrl = 'https://scijtstwpbgxtsdqzowc.supabase.co';
const supabaseKey = 'sb_publishable_jVuKo_UCsRvxdGbmYvGo-Q_cib0YWVv';
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
  const [expandedAdminId, setExpandedAdminId] = useState(null);
  const [editingMeasurementId, setEditingMeasurementId] = useState(null);
  const [editNagyhal, setEditNagyhal] = useState('');
  const [editAprohal, setEditAprohal] = useState('');
  const [editDarabszam, setEditDarabszam] = useState('');

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
          const biggestNagyhal = measurements.length > 0 ? Math.max(...measurements.map(m => m.nagyhal).filter(v => v > 0)) : 0;
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

  const deleteMeasurement = async (measurementId) => {
    try {
      const { error } = await supabase.from('measurements').delete().eq('id', measurementId);
      if (error) throw error;
      await loadCompetition(competitionId);
    } catch (error) {
      alert('Hiba: ' + error.message);
    }
  };
  const updateMeasurement = async (measurementId) => {
    try {
      const { error } = await supabase.from('measurements').update({
        nagyhal: parseInt(editNagyhal) || 0,
        aprohal: parseInt(editAprohal) || 0,
        darabszam: parseInt(editDarabszam) || 0
      }).eq('id', measurementId);

      if (error) throw error;
      await loadCompetition(competitionId);
      setEditingMeasurementId(null);
      setEditNagyhal('');
      setEditAprohal('');
      setEditDarabszam('');
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
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <FolderOpen className="w-7 h-7 text-blue-600" />
                {user ? 'Versenyek Kezelése' : 'Korábbi Versenyek'}
              </h2>
              <button onClick={() => setShowCompetitionList(false)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
            </div>
            {user && (
              <button onClick={createNewCompetition} className="w-full mb-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
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
                      <h3 className="text-lg font-bold text-gray-800">{comp.title}</h3>
                      <p className="text-gray-500 text-sm">{dateStr}</p>
                      {isActive && <span className="inline-block mt-1 bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold">Aktuális</span>}
                    </div>
                    <div className="flex gap-2">
                      {!isActive && <button onClick={() => loadCompetition(comp.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">Megnyitás</button>}
                      {user && <button onClick={() => deleteCompetition(comp.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold">Törlés</button>}
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
        <div className="text-xl text-gray-600">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Fejléc */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-5 rounded-lg shadow-xl mb-4">
          <div className="flex items-center gap-3">
            <Fish className="w-8 h-8" />
            {user ? (
              <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); saveTitle(e.target.value); }} className="text-3xl font-bold bg-transparent border-b-2 border-transparent hover:border-white focus:border-white focus:outline-none text-white placeholder-green-200 flex-1" placeholder="Verseny címe..." />
            ) : (
              <h1 className="text-3xl font-bold">{title}</h1>
            )}
          </div>
          <p className="mt-1 text-green-100 text-sm">
            45 versenyző • Korlátlan mérés • Nagyhal + Apróhal + Darabszám
            {user && <span> • Admin: {user.email}</span>}
          </p>
        </div>

        {/* Gombok sor - fejléc alatt balra */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setShowCompetitionList(true)} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-semibold flex items-center gap-2 shadow-md">
            <FolderOpen className="w-4 h-4" />
            Versenyek
          </button>
          <button onClick={() => loadCompetition(competitionId)} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-semibold flex items-center gap-2 shadow-md">
            <RefreshCw className="w-4 h-4" />
            Frissítés
          </button>
          {user ? (
            <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold flex items-center gap-2 shadow-md">
              <LogOut className="w-4 h-4" />
              Kilépés
            </button>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold flex items-center gap-2 shadow-md">
              <Lock className="w-4 h-4" />
              Admin
            </button>
          )}
        </div>

        {/* Login Modal */}
        {showLoginModal && !user && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Admin Bejelentkezés</h2>
                <button onClick={() => setShowLoginModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email cím</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="admin@example.com" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Jelszó</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="••••••••" required />
                </div>
                {loginError && <div className="bg-red-100 border-2 border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">{loginError}</div>}
                <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400">
                  {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Versenyző hozzáadás - Admin */}
        {user && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Versenyző Hozzáadása</h2>
            <div className="flex gap-3">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addCompetitor()} placeholder="Versenyző neve..." className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm" disabled={competitors.length >= 45} />
              <button onClick={addCompetitor} disabled={competitors.length >= 45} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2 text-sm font-semibold">
                <Plus className="w-4 h-4" />
                Hozzáad ({competitors.length}/45)
              </button>
            </div>
          </div>
        )}

{/* ADMIN NÉZET */}
        {user && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Versenyzők és Fogások</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="px-2 py-2 text-center font-semibold">#</th>
                    <th className="px-2 py-2 text-left font-semibold">Név</th>
                    <th className="px-2 py-2 text-center font-semibold">Nagyhal (g)</th>
                    <th className="px-2 py-2 text-center font-semibold">Apróhal (g)</th>
                    <th className="px-2 py-2 text-center font-semibold">Darab</th>
                    <th className="px-2 py-2 text-center font-semibold">Összesen (g)</th>
                    <th className="px-2 py-2 text-center font-semibold">Darabszám</th>
                    <th className="px-2 py-2 text-center font-semibold">Rögzít</th>
                    <th className="px-2 py-2 text-center font-semibold">Törlés</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((competitor, index) => {
                    const lastMeasurement = competitor.measurements.length > 0 ? competitor.measurements[competitor.measurements.length - 1] : null;
                    const isExpanded = expandedAdminId === competitor.id;
                    const isEditing = editingId === competitor.id;
                    const isEditingMeasurement = editingMeasurementId !== null;
                    return (
                      <React.Fragment key={competitor.id}>
                        {/* Utolsó mérés + Összesen sor */}
                        <tr className={index % 2 === 0 ? 'bg-white border-b border-gray-200' : 'bg-blue-50 border-b border-gray-200'}>
                          <td className="px-2 py-2 text-center font-bold text-gray-700">{index + 1}</td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
                              <span 
                                className="font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
                                onClick={() => setExpandedAdminId(isExpanded ? null : competitor.id)}
                              >
                                {competitor.name}
                              </span>
                              {competitor.measurements.length > 0 && (
                                <span 
                                  className="text-xs text-blue-600 cursor-pointer"
                                  onClick={() => setExpandedAdminId(isExpanded ? null : competitor.id)}
                                >
                                  {isExpanded ? '▲' : '▼'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {isEditing ? (
                              <input type="number" step="1" value={nagyhalaInput} onChange={(e) => setNagyhalaInput(e.target.value)} placeholder="0" className="w-16 px-1 py-0.5 border-2 border-blue-500 rounded focus:outline-none text-center text-sm" />
                            ) : (
                              <div>
                                <span className="font-bold text-green-700">{competitor.totalNagyhal} g</span>
                                {lastMeasurement && lastMeasurement.nagyhal > 0 && <p className="text-xs text-gray-400">(utolsó: {lastMeasurement.nagyhal}g)</p>}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {isEditing ? (
                              <input type="number" step="1" value={aprohalaInput} onChange={(e) => setAprohalaInput(e.target.value)} placeholder="0" className="w-16 px-1 py-0.5 border-2 border-blue-500 rounded focus:outline-none text-center text-sm" />
                            ) : (
                              <div>
                                <span className="font-bold text-blue-700">{competitor.totalAprohal} g</span>
                                {lastMeasurement && lastMeasurement.aprohal > 0 && <p className="text-xs text-gray-400">(utolsó: {lastMeasurement.aprohal}g)</p>}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {isEditing ? (
                              <input type="number" step="1" value={darabszamInput} onChange={(e) => setDarabszamInput(e.target.value)} placeholder="0" className="w-16 px-1 py-0.5 border-2 border-blue-500 rounded focus:outline-none text-center text-sm" />
                            ) : (
                              <div>
                                <span className="font-bold text-purple-700">{competitor.totalDarabszam} db</span>
                                {lastMeasurement && lastMeasurement.darabszam > 0 && <p className="text-xs text-gray-400">(utolsó: {lastMeasurement.darabszam})</p>}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold text-sm">{competitor.mindosszesen} g</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold text-sm">{competitor.totalDarabszam} db</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {isEditing ? (
                              <div className="flex gap-1 justify-center">
                                <button onClick={() => addMeasurement(competitor.id)} className="px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold">Ment</button>
                                <button onClick={() => { setEditingId(null); setNagyhalaInput(''); setAprohalaInput(''); setDarabszamInput(''); }} className="px-2 py-0.5 bg-gray-400 text-white rounded hover:bg-gray-500 text-xs font-semibold">Nem</button>
                              </div>
                            ) : (
                              <button onClick={() => setEditingId(competitor.id)} className="px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold">Rögzít</button>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => deleteCompetitor(competitor.id)} className="text-red-600 hover:text-red-800">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {/* Kinyitható mérések rész */}
                        {isExpanded && competitor.measurements.length > 0 && (
                          <tr>
                            <td colSpan={9} className="p-0">
                              <div className="bg-green-50 border-t border-b border-green-200 px-4 py-3">
                                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Korábbi Mérések</p>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-500 border-b border-green-200">
                                      <th className="text-left py-1 font-semibold">#</th>
                                      <th className="text-left py-1 font-semibold">Időpont</th>
                                      <th className="text-center py-1 font-semibold">Nagyhal (g)</th>
                                      <th className="text-center py-1 font-semibold">Apróhal (g)</th>
                                      <th className="text-center py-1 font-semibold">Darabszám</th>
                                      <th className="text-center py-1 font-semibold">Sor összesen (g)</th>
                                      <th className="text-center py-1 font-semibold">Szerk.</th>
                                      <th className="text-center py-1 font-semibold">Törlés</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {competitor.measurements.map((m, mIndex) => {
                                      const date = new Date(m.created_at);
                                      const timeStr = String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
                                      const dateStr = date.getFullYear() + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + String(date.getDate()).padStart(2, '0');
                                      const isEditingThis = editingMeasurementId === m.id;
                                      return (
                                        <tr key={m.id} className="border-b border-green-100 last:border-b-0">
                                          <td className="py-1 text-gray-500">{mIndex + 1}.</td>
                                          <td className="py-1 text-gray-500">{dateStr + ' ' + timeStr}</td>
                                          <td className="py-1 text-center">
                                            {isEditingThis ? (
                                              <input type="number" value={editNagyhal} onChange={(e) => setEditNagyhal(e.target.value)} className="w-14 px-1 py-0.5 border border-green-400 rounded text-center" />
                                            ) : (
                                              m.nagyhal > 0 ? <span className="text-green-700 font-bold">{m.nagyhal} g</span> : <span className="text-gray-300">-</span>
                                            )}
                                          </td>
                                          <td className="py-1 text-center">
                                            {isEditingThis ? (
                                              <input type="number" value={editAprohal} onChange={(e) => setEditAprohal(e.target.value)} className="w-14 px-1 py-0.5 border border-blue-400 rounded text-center" />
                                            ) : (
                                              m.aprohal > 0 ? <span className="text-blue-700 font-bold">{m.aprohal} g</span> : <span className="text-gray-300">-</span>
                                            )}
                                          </td>
                                          <td className="py-1 text-center">
                                            {isEditingThis ? (
                                              <input type="number" value={editDarabszam} onChange={(e) => setEditDarabszam(e.target.value)} className="w-14 px-1 py-0.5 border border-purple-400 rounded text-center" />
                                            ) : (
                                              m.darabszam > 0 ? <span className="text-purple-700 font-bold">{m.darabszam} db</span> : <span className="text-gray-300">-</span>
                                            )}
                                          </td>
                                          <td className="py-1 text-center">
                                            {isEditingThis ? (
                                              <span className="text-yellow-700 font-bold">{(parseInt(editNagyhal) || 0) + (parseInt(editAprohal) || 0)} g</span>
                                            ) : (
                                              <span className="text-yellow-700 font-bold">{m.nagyhal + m.aprohal} g</span>
                                            )}
                                          </td>
                                          <td className="py-1 text-center">
                                            {isEditingThis ? (
                                              <div className="flex gap-1 justify-center">
                                                <button onClick={() => updateMeasurement(m.id)} className="px-2 py-0.5 bg-green-600 text-white rounded text-xs font-semibold">Ment</button>
                                                <button onClick={() => { setEditingMeasurementId(null); }} className="px-2 py-0.5 bg-gray-400 text-white rounded text-xs font-semibold">Nem</button>
                                              </div>
                                            ) : (
                                              <button onClick={() => { setEditingMeasurementId(m.id); setEditNagyhal(m.nagyhal); setEditAprohal(m.aprohal); setEditDarabszam(m.darabszam); }} className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-semibold hover:bg-blue-600">Szerk.</button>
                                            )}
                                          </td>
                                          <td className="py-1 text-center">
                                            <button onClick={() => deleteMeasurement(m.id)} className="text-red-400 hover:text-red-600">
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t-2 border-green-300 font-bold text-gray-700">
                                      <td colSpan={2} className="py-1">Összesen:</td>
                                      <td className="py-1 text-center text-green-700">{competitor.totalNagyhal} g</td>
                                      <td className="py-1 text-center text-blue-700">{competitor.totalAprohal} g</td>
                                      <td className="py-1 text-center text-purple-700">{competitor.totalDarabszam} db</td>
                                      <td className="py-1 text-center text-yellow-700">{competitor.mindosszesen} g</td>
                                      <td colSpan={2}></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              {competitors.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Fish className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Még nincsenek versenyzők.</p>
                </div>
              )}
            </div>
          </div>
        )}

{/* FELHASZNÁLÓI NÉZET */}
        {!user && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Versenyzők és Fogások</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="px-2 py-2 text-center font-semibold">#</th>
                    <th className="px-2 py-2 text-left font-semibold">Név</th>
                    <th className="px-2 py-2 text-center font-semibold">Nagyhal (g)</th>
                    <th className="px-2 py-2 text-center font-semibold">Apróhal (g)</th>
                    <th className="px-2 py-2 text-center font-semibold">Összesen (g)</th>
                    <th className="px-2 py-2 text-center font-semibold">Darabszám</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((competitor, index) => (
                    <React.Fragment key={competitor.id}>
                      {/* Fő sor - Névre kattintható */}
                      <tr 
                        className={index % 2 === 0 ? 'bg-white hover:bg-green-50 cursor-pointer' : 'bg-gray-50 hover:bg-green-50 cursor-pointer'}
                        onClick={() => setEditingId(editingId === competitor.id ? null : competitor.id)}
                      >
                        <td className="px-2 py-2 text-center font-bold text-gray-600">{index + 1}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">{competitor.name}</span>
                            {competitor.measurements.length > 0 && (
                              <span className="text-xs text-blue-600">
                                {editingId === competitor.id ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="font-bold text-green-700">{competitor.totalNagyhal} g</span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="font-bold text-blue-700">{competitor.totalAprohal} g</span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">{competitor.mindosszesen} g</span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">{competitor.totalDarabszam} db</span>
                        </td>
                      </tr>
                      {/* Kinyitható részlet - mérések */}
                      {editingId === competitor.id && competitor.measurements.length > 0 && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <div className="bg-green-50 border-t border-b border-green-200 px-4 py-3">
                              <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Mérések history</p>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500 border-b border-green-200">
                                    <th className="text-left py-1 font-semibold">#</th>
                                    <th className="text-left py-1 font-semibold">Időpont</th>
                                    <th className="text-center py-1 font-semibold">Nagyhal (g)</th>
                                    <th className="text-center py-1 font-semibold">Apróhal (g)</th>
                                    <th className="text-center py-1 font-semibold">Darabszám</th>
                                    <th className="text-center py-1 font-semibold">Sor összesen (g)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {competitor.measurements.map((m, mIndex) => {
                                    const date = new Date(m.created_at);
                                    const timeStr = String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
                                    const dateStr = date.getFullYear() + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + String(date.getDate()).padStart(2, '0');
                                    return (
                                      <tr key={m.id} className="border-b border-green-100 last:border-b-0">
                                        <td className="py-1 text-gray-500">{mIndex + 1}.</td>
                                        <td className="py-1 text-gray-500">{dateStr + ' ' + timeStr}</td>
                                        <td className="py-1 text-center">{m.nagyhal > 0 ? <span className="text-green-700 font-bold">{m.nagyhal} g</span> : <span className="text-gray-300">-</span>}</td>
                                        <td className="py-1 text-center">{m.aprohal > 0 ? <span className="text-blue-700 font-bold">{m.aprohal} g</span> : <span className="text-gray-300">-</span>}</td>
                                        <td className="py-1 text-center">{m.darabszam > 0 ? <span className="text-purple-700 font-bold">{m.darabszam} db</span> : <span className="text-gray-300">-</span>}</td>
                                        <td className="py-1 text-center"><span className="text-yellow-700 font-bold">{m.nagyhal + m.aprohal} g</span></td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-green-300 font-bold text-gray-700">
                                    <td colSpan={2} className="py-1">Összesen:</td>
                                    <td className="py-1 text-center text-green-700">{competitor.totalNagyhal} g</td>
                                    <td className="py-1 text-center text-blue-700">{competitor.totalAprohal} g</td>
                                    <td className="py-1 text-center text-purple-700">{competitor.totalDarabszam} db</td>
                                    <td className="py-1 text-center text-yellow-700">{competitor.mindosszesen} g</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              {competitors.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Fish className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Még nincsenek versenyzők.</p>
                </div>
              )}
            </div>
          </div>
        )}
<div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-bold mb-3 text-green-700 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Top 3 Legnagyobb Hal
            </h3>
            {results.top3Nagyhal.length > 0 ? (
              <div className="space-y-2">
                {results.top3Nagyhal.map((c, i) => (
                  <div key={c.id} className={i === 0 ? 'flex justify-between items-center p-3 rounded bg-yellow-100 border-2 border-yellow-400' : i === 1 ? 'flex justify-between items-center p-3 rounded bg-gray-100 border-2 border-gray-400' : 'flex justify-between items-center p-3 rounded bg-orange-100 border-2 border-orange-400'}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-600">{i + 1}.</span>
                      <span className="font-semibold">{c.name}</span>
                    </div>
                    <span className="font-bold text-green-700 text-lg">{c.biggestNagyhal} g</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-6 text-sm">Még nincs rögzített nagyhal</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-bold mb-3 text-blue-700 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-blue-500" />
              Top 6 Mind Összesen
            </h3>
            {results.top6Mindosszesen.length > 0 ? (
              <div className="space-y-2">
                {results.top6Mindosszesen.map((c, i) => (
                  <div key={c.id} className={i === 0 ? 'flex justify-between items-center p-2 rounded bg-yellow-100 border-2 border-yellow-400' : i === 1 ? 'flex justify-between items-center p-2 rounded bg-gray-100 border-2 border-gray-400' : i === 2 ? 'flex justify-between items-center p-2 rounded bg-orange-100 border-2 border-orange-400' : 'flex justify-between items-center p-2 rounded bg-gray-50'}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-600">{i + 1}.</span>
                      <span className="font-semibold">{c.name}</span>
                    </div>
                    <span className="font-bold text-blue-700 text-lg">{c.mindosszesen} g</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-6 text-sm">Még nincs rögzített mérés</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
