import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Trash2, Plus, Trophy, Fish, RefreshCw, LogOut, FolderOpen, Lock, Archive, Share2, CheckCircle } from 'lucide-react';

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
  const [showAllResults, setShowAllResults] = useState(false);
  // ÚJ STATE-EK
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name } - versenyző törlés megerősítés
  const [showArchived, setShowArchived] = useState(false);
  const [archivedCompetition, setArchivedCompetition] = useState(null);
  const [archivedCompetitors, setArchivedCompetitors] = useState([]);
  const [archivedExpandedId, setArchivedExpandedId] = useState(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [pageViews, setPageViews] = useState({ today: 0, week: 0, total: 0 });

  useEffect(() => {
    trackVisit();
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadCompetitions();
    });
    return () => { authListener?.subscription?.unsubscribe(); };
  }, []);

  const trackVisit = async () => {
    try {
      const device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobil' : 'PC';
      await supabase.from('page_views').insert([{ device }]);
      await loadPageViews();
    } catch (err) { console.error('Látogatás rögzítési hiba:', err); }
  };

  const loadPageViews = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
      const [{ count: total }, { count: today }, { count: week }, { count: mobilTotal }, { count: pcTotal }] = await Promise.all([
        supabase.from('page_views').select('*', { count: 'exact', head: true }),
        supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('visited_at', todayStart),
        supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('visited_at', weekStart),
        supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('device', 'mobil'),
        supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('device', 'pc'),
      ]);
      setPageViews({ today: today || 0, week: week || 0, total: total || 0, mobil: mobilTotal || 0, pc: pcTotal || 0 });
    } catch (err) { console.error('Látogatók betöltési hiba:', err); }
  };

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      await loadCompetitions();
    } catch (err) {
      console.error('Auth hiba:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e && e.preventDefault && e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user);
      setShowLoginModal(false);
      setEmail(''); setPassword('');
    } catch {
      setLoginError('Hibás email vagy jelszó');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); setUser(null); } catch (err) { console.error(err); }
  };

  // Versenyzők betöltése - nagyhals tömb MINDEN mérés nagyhala
  const buildCompetitors = async (competitionDbId) => {
    const { data: competitorsData, error: ce } = await supabase
      .from('competitors').select('*').eq('competition_id', competitionDbId).order('sort_order', { ascending: true });
    if (ce) throw ce;
    return Promise.all((competitorsData || []).map(async (c) => {
      const { data: meas, error: me } = await supabase
        .from('measurements').select('*').eq('competitor_id', c.id).order('created_at', { ascending: true });
      if (me) throw me;
      const totalNagyhal = meas.reduce((s, m) => s + m.nagyhal, 0);
      const totalAprohal = meas.reduce((s, m) => s + m.aprohal, 0);
      const totalDarabszam = meas.reduce((s, m) => s + m.darabszam, 0);
      const mindosszesen = totalNagyhal + totalAprohal;
      // FIX: MINDEN nagyhal érték belekerül a tömbbe (nem csak a max)
      const nagyhals = meas.filter(m => m.nagyhal > 0).map(m => m.nagyhal);
      return { ...c, measurements: meas, totalNagyhal, totalAprohal, totalDarabszam, mindosszesen, nagyhals };
    }));
  };

  const loadCompetitions = async () => {
    try {
      const { data, error } = await supabase.from('competitions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCompetitions(data || []);
      // Első AKTÍV verseny betöltése
      const active = (data || []).find(c => !c.archived);
      if (active) await loadCompetition(active.id, data);
      else if (data && data.length > 0) await loadCompetition(data[0].id, data);
    } catch (err) { console.error('Versenyek betöltési hiba:', err); }
  };

  const loadCompetition = async (compId, allComps) => {
    try {
      setLoading(true);
      const { data: comp, error: ce } = await supabase.from('competitions').select('*').eq('id', compId).single();
      if (ce) throw ce;
      setCompetitionId(comp.id);
      setTitle(comp.title);
      const built = await buildCompetitors(comp.id);
      setCompetitors(built);
      setShowCompetitionList(false);
      if (allComps) setCompetitions(allComps);
    } catch (err) { console.error('Betöltési hiba:', err); }
    finally { setLoading(false); }
  };

  const loadArchivedCompetition = async (compId) => {
    try {
      setLoading(true);
      const { data: comp, error: ce } = await supabase.from('competitions').select('*').eq('id', compId).single();
      if (ce) throw ce;
      setArchivedCompetition(comp);
      const built = await buildCompetitors(comp.id);
      setArchivedCompetitors(built);
      setShowArchived(true);
      setShowCompetitionList(false);
    } catch (err) { console.error('Archív betöltési hiba:', err); }
    finally { setLoading(false); }
  };

  // FIX: Verseny lezárása → archived = true (Supabase-ben)
  const archiveCompetition = async () => {
    if (!competitionId) return;
    if (!window.confirm('Biztosan lezárod és áthelyezed a "Korábbi Versenyek" közé?\nEz után az admin visszaállíthatja ha szükséges.')) return;
    try {
      const { error } = await supabase.from('competitions').update({ archived: true }).eq('id', competitionId);
      if (error) throw error;
      await loadCompetitions();
    } catch (err) { alert('Hiba: ' + err.message); }
  };

  const unarchiveCompetition = async (compId) => {
    try {
      const { error } = await supabase.from('competitions').update({ archived: false }).eq('id', compId);
      if (error) throw error;
      setShowArchived(false);
      setArchivedCompetition(null);
      await loadCompetitions();
    } catch (err) { alert('Hiba: ' + err.message); }
  };

  const createNewCompetition = async () => {
    try {
      const now = new Date();
      const dateStr = now.getFullYear() + '.' + String(now.getMonth()+1).padStart(2,'0') + '.' + String(now.getDate()).padStart(2,'0');
      const { data, error } = await supabase.from('competitions').insert([{ title: 'Horgászverseny - ' + dateStr, archived: false }]).select();
      if (error) throw error;
      setCompetitionId(data[0].id);
      setTitle(data[0].title);
      setCompetitors([]);
      await loadCompetitions();
      setShowCompetitionList(false);
    } catch (err) { alert('Hiba: ' + err.message); }
  };

  const deleteCompetition = async (compId) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a versenyt? Ez nem visszavonható!')) return;
    try {
      const { error } = await supabase.from('competitions').delete().eq('id', compId);
      if (error) throw error;
      await loadCompetitions();
    } catch (err) { alert('Hiba: ' + err.message); }
  };

  const saveTitle = async (newTitle) => {
    if (!competitionId) return;
    try {
      const { error } = await supabase.from('competitions').update({ title: newTitle }).eq('id', competitionId);
      if (error) throw error;
      setCompetitions(prev => prev.map(c => c.id === competitionId ? { ...c, title: newTitle } : c));
    } catch (err) { console.error('Cím mentési hiba:', err); }
  };

  const addCompetitor = async () => {
    if (!newName.trim() || competitors.length >= 45 || !competitionId) return;
    try {
      const { data, error } = await supabase.from('competitors').insert([{
        competition_id: competitionId, name: newName.trim(), sort_order: competitors.length + 1
      }]).select();
      if (error) throw error;
      setCompetitors(prev => [...prev, { ...data[0], measurements: [], totalNagyhal: 0, totalAprohal: 0, totalDarabszam: 0, mindosszesen: 0, nagyhals: [] }]);
      setNewName('');
    } catch (err) { alert('Hiba: ' + err.message); }
  };

  // FIX: Versenyző törlés - MINDIG a modal megerősítésen át megy
  const confirmDeleteCompetitor = (id, name) => {
    setDeleteConfirm({ id, name });
  };

  const executeDeleteCompetitor = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase.from('competitors').delete().eq('id', deleteConfirm.id);
      if (error) throw error;
      setCompetitors(prev => prev.filter(c => c.id !== deleteConfirm.id));
    } catch (err) { alert('Hiba: ' + err.message); }
    finally { setDeleteConfirm(null); }
  };

  const addMeasurement = async (competitorId) => {
    const nagyhal = parseInt(nagyhalaInput) || 0;
    const aprohal = parseInt(aprohalaInput) || 0;
    const darabszam = parseInt(darabszamInput) || 0;
    if (nagyhal === 0 && aprohal === 0 && darabszam === 0) { alert('Adj meg legalább egy értéket'); return; }
    try {
      const { error } = await supabase.from('measurements').insert([{ competitor_id: competitorId, nagyhal, aprohal, darabszam }]);
      if (error) throw error;
      await loadCompetition(competitionId);
      setNagyhalaInput(''); setAprohalaInput(''); setDarabszamInput('');
      setEditingId(null);
    } catch (err) { alert('Hiba: ' + err.message); }
  };

  const deleteMeasurement = async (mId) => {
    try {
      const { error } = await supabase.from('measurements').delete().eq('id', mId);
      if (error) throw error;
      await loadCompetition(competitionId);
    } catch (err) { alert('Hiba: ' + err.message); }
  };

  const updateMeasurement = async (mId) => {
    try {
      const { error } = await supabase.from('measurements').update({
        nagyhal: parseInt(editNagyhal) || 0,
        aprohal: parseInt(editAprohal) || 0,
        darabszam: parseInt(editDarabszam) || 0
      }).eq('id', mId);
      if (error) throw error;
      await loadCompetition(competitionId);
      setEditingMeasurementId(null); setEditNagyhal(''); setEditAprohal(''); setEditDarabszam('');
    } catch (err) { alert('Hiba: ' + err.message); }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title, url });
    else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => { setShowShareToast(true); setTimeout(() => setShowShareToast(false), 3000); });
    } else alert('Másold ki a böngésző címsorából az URL-t!');
  };

  // FIX: TOP 3 - minden egyes mérés nagyhal értéke ÖNÁLLÓAN versenyez
  const results = useMemo(() => {
    const allEntries = [];
    competitors.forEach(c => {
      (c.nagyhals || []).forEach(w => allEntries.push({ name: c.name, weight: w }));
    });
    const top3Nagyhal = allEntries.sort((a, b) => b.weight - a.weight).slice(0, 3);
    const top6Mindosszesen = [...competitors].filter(c => c.mindosszesen > 0).sort((a, b) => b.mindosszesen - a.mindosszesen);
    return { top3Nagyhal, top6Mindosszesen };
  }, [competitors]);

  const archivedResults = useMemo(() => {
    const allEntries = [];
    archivedCompetitors.forEach(c => {
      (c.nagyhals || []).forEach(w => allEntries.push({ name: c.name, weight: w }));
    });
    const top3Nagyhal = allEntries.sort((a, b) => b.weight - a.weight).slice(0, 3);
    const top6Mindosszesen = [...archivedCompetitors].filter(c => c.mindosszesen > 0).sort((a, b) => b.mindosszesen - a.mindosszesen);
    return { top3Nagyhal, top6Mindosszesen };
  }, [archivedCompetitors]);

  const activeCompetitions = competitions.filter(c => !c.archived);
  const archivedList = competitions.filter(c => c.archived);

  const placeStyle = (i) => i === 0
    ? 'flex justify-between items-center p-3 rounded bg-yellow-100 border-2 border-yellow-400'
    : i === 1 ? 'flex justify-between items-center p-3 rounded bg-gray-100 border-2 border-gray-400'
    : 'flex justify-between items-center p-3 rounded bg-orange-100 border-2 border-orange-400';

  // ── ARCHÍV VERSENY NÉZET ─────────────────────────────────────────────
  if (showArchived && archivedCompetition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-gray-600 to-gray-800 text-white p-5 rounded-lg shadow-xl mb-4">
            <div className="flex items-center gap-3">
              <Archive className="w-8 h-8" />
              <h1 className="text-3xl font-bold">{archivedCompetition.title}</h1>
            </div>
            <p className="mt-1 text-gray-300 text-sm">Korábbi verseny — Lezárt eredmények</p>
          </div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => { setShowArchived(false); setArchivedCompetition(null); }} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-semibold shadow-md">← Vissza</button>
            {user && (
              <button onClick={() => unarchiveCompetition(archivedCompetition.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold flex items-center gap-2 shadow-md">
                <RefreshCw className="w-4 h-4" />Visszaállítás Aktuálisba
              </button>
            )}
          </div>
          {/* Archív versenyzők */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Versenyzők és Fogások</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="px-2 py-2 text-center">#</th>
                    <th className="px-2 py-2 text-left">Név</th>
                    <th className="px-2 py-2 text-center">Nagyhal (g)</th>
                    <th className="px-2 py-2 text-center">Apróhal (g)</th>
                    <th className="px-2 py-2 text-center">Összesen (g)</th>
                    <th className="px-2 py-2 text-center">Darabszám</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedCompetitors.map((c, idx) => (
                    <React.Fragment key={c.id}>
                      <tr className={idx % 2 === 0 ? 'bg-white hover:bg-green-50 cursor-pointer' : 'bg-gray-50 hover:bg-green-50 cursor-pointer'}
                        onClick={() => setArchivedExpandedId(archivedExpandedId === c.id ? null : c.id)}>
                        <td className="px-2 py-2 text-center font-bold text-gray-600">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{c.name}</span>
                            {c.measurements.length > 0 && <span className="text-xs text-blue-600">{archivedExpandedId === c.id ? '▲' : '▼'}</span>}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center"><span className="font-bold text-green-700">{c.totalNagyhal} g</span></td>
                        <td className="px-2 py-2 text-center"><span className="font-bold text-blue-700">{c.totalAprohal} g</span></td>
                        <td className="px-2 py-2 text-center"><span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">{c.mindosszesen} g</span></td>
                        <td className="px-2 py-2 text-center"><span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">{c.totalDarabszam} db</span></td>
                      </tr>
                      {archivedExpandedId === c.id && c.measurements.length > 0 && (
                        <tr><td colSpan={6} className="p-0">
                          <div className="bg-green-50 border-t border-b border-green-200 px-4 py-3">
                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Mérések</p>
                            <table className="w-full text-xs">
                              <thead><tr className="text-gray-500 border-b border-green-200">
                                <th className="text-left py-1">#</th><th className="text-left py-1">Időpont</th>
                                <th className="text-center py-1">Nagyhal</th><th className="text-center py-1">Apróhal</th>
                                <th className="text-center py-1">Darab</th><th className="text-center py-1">Sor összesen</th>
                              </tr></thead>
                              <tbody>
                                {c.measurements.map((m, mi) => {
                                  const d = new Date(m.created_at);
                                  return (
                                    <tr key={m.id} className="border-b border-green-100">
                                      <td className="py-1 text-gray-500">{mi+1}.</td>
                                      <td className="py-1 text-gray-500">{d.getFullYear()}.{String(d.getMonth()+1).padStart(2,'0')}.{String(d.getDate()).padStart(2,'0')} {String(d.getHours()).padStart(2,'0')}:{String(d.getMinutes()).padStart(2,'0')}</td>
                                      <td className="py-1 text-center">{m.nagyhal > 0 ? <span className="text-green-700 font-bold">{m.nagyhal} g</span> : <span className="text-gray-300">-</span>}</td>
                                      <td className="py-1 text-center">{m.aprohal > 0 ? <span className="text-blue-700 font-bold">{m.aprohal} g</span> : <span className="text-gray-300">-</span>}</td>
                                      <td className="py-1 text-center">{m.darabszam > 0 ? <span className="text-purple-700 font-bold">{m.darabszam} db</span> : <span className="text-gray-300">-</span>}</td>
                                      <td className="py-1 text-center"><span className="text-yellow-700 font-bold">{m.nagyhal + m.aprohal} g</span></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Archív eredmények */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold mb-3 text-green-700 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" />Top 3 Legnagyobb Hal</h3>
              {archivedResults.top3Nagyhal.length > 0
                ? <div className="space-y-2">{archivedResults.top3Nagyhal.map((e, i) => (<div key={i} className={placeStyle(i)}><div className="flex items-center gap-2"><span className="text-xl font-bold text-gray-600">{i+1}.</span><span className="font-semibold">{e.name}</span></div><span className="font-bold text-green-700 text-lg">{e.weight} g</span></div>))}</div>
                : <p className="text-gray-400 text-center py-6 text-sm">Nincs adat</p>}
            </div>
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold mb-3 text-blue-700 flex items-center gap-2"><Trophy className="w-5 h-5 text-blue-500" />Mind Összesen Eredmények</h3>
              {archivedResults.top6Mindosszesen.length > 0
                ? <div className="space-y-2">{archivedResults.top6Mindosszesen.map((c, i) => (<div key={c.id} className={placeStyle(Math.min(i,2))}><div className="flex items-center gap-2"><span className="text-xl font-bold text-gray-600">{i+1}.</span><span className="font-semibold">{c.name}</span></div><span className="font-bold text-blue-700 text-lg">{c.mindosszesen} g</span></div>))}</div>
                : <p className="text-gray-400 text-center py-6 text-sm">Nincs adat</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── VERSENY LISTA NÉZET ──────────────────────────────────────────────
  if (showCompetitionList) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><FolderOpen className="w-7 h-7 text-blue-600" />Versenyek</h2>
              <button onClick={() => setShowCompetitionList(false)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
            </div>
            {user && (
              <button onClick={createNewCompetition} className="w-full mb-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />Új Verseny Indítása
              </button>
            )}
            {/* Aktív versenyek */}
            <h3 className="text-base font-bold text-green-700 mb-2 flex items-center gap-2"><Fish className="w-4 h-4" />Aktuális Versenyek</h3>
            <div className="space-y-3 mb-6">
              {activeCompetitions.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Nincs aktív verseny</p>}
              {activeCompetitions.map(comp => {
                const d = new Date(comp.created_at);
                const ds = d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');
                const isActive = comp.id === competitionId;
                return (
                  <div key={comp.id} className={isActive ? 'border-2 rounded-lg p-4 flex justify-between items-center border-green-500 bg-green-50' : 'border-2 rounded-lg p-4 flex justify-between items-center border-gray-200'}>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">{comp.title}</h3>
                      <p className="text-gray-500 text-sm">{ds}</p>
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
            {/* Korábbi versenyek */}
            <h3 className="text-base font-bold text-gray-600 mb-2 flex items-center gap-2"><Archive className="w-4 h-4" />Korábbi Versenyek</h3>
            <div className="space-y-3">
              {archivedList.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Még nincsenek lezárt versenyek</p>}
              {archivedList.map(comp => {
                const d = new Date(comp.created_at);
                const ds = d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');
                return (
                  <div key={comp.id} className="border-2 rounded-lg p-4 flex justify-between items-center border-gray-200 bg-gray-50">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-700">{comp.title}</h3>
                      <p className="text-gray-400 text-sm">{ds}</p>
                      <span className="inline-block mt-1 bg-gray-400 text-white px-2 py-0.5 rounded-full text-xs font-semibold">Lezárt</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => loadArchivedCompetition(comp.id)} className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-semibold">Megtekintés</button>
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

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="text-xl text-gray-600">Betöltés...</div>
    </div>
  );

  // ── FŐ NÉZET ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Share toast */}
        {showShareToast && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />Link másolva a vágólapra!
          </div>
        )}

        {/* FIX: Versenyző törlés megerősítő modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full"><Trash2 className="w-6 h-6 text-red-600" /></div>
                <h2 className="text-lg font-bold text-gray-800">Versenyző törlése</h2>
              </div>
              <p className="text-gray-600 mb-2">Biztosan törlöd ezt a versenyzőt?</p>
              <p className="text-red-700 font-bold text-center bg-red-50 rounded-lg py-2 px-3 mb-3">„{deleteConfirm.name}"</p>
              <p className="text-gray-500 text-xs mb-5 text-center">Az összes mérési adatával együtt törlődik!<br/>Ez a művelet <strong>nem visszavonható</strong>.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold">Mégse</button>
                <button onClick={executeDeleteCompetitor} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />Törlés
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fejléc */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-5 rounded-lg shadow-xl mb-4">
          <div className="flex items-center gap-3">
            <Fish className="w-8 h-8" />
            {user
              ? <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); saveTitle(e.target.value); }} className="text-3xl font-bold bg-transparent border-b-2 border-transparent hover:border-white focus:border-white focus:outline-none text-white flex-1" placeholder="Verseny címe..." />
              : <h1 className="text-3xl font-bold">{title}</h1>}
          </div>
          <p className="mt-1 text-green-100 text-sm">
            45 versenyző • Korlátlan mérés • Nagyhal + Apróhal + Darabszám
            {user && <span> • Admin: {user.email}</span>}
          </p>
        </div>

        {/* Gombok */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setShowCompetitionList(true)} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-semibold flex items-center gap-2 shadow-md">
            <FolderOpen className="w-4 h-4" />Versenyek
          </button>
          <button onClick={handleShare} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-semibold flex items-center gap-2 shadow-md">
            <Share2 className="w-4 h-4" />Megosztás
          </button>
          <button onClick={() => loadCompetition(competitionId)} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-semibold flex items-center gap-2 shadow-md">
            <RefreshCw className="w-4 h-4" />Frissítés
          </button>
          {user && (
            <button onClick={archiveCompetition} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-semibold flex items-center gap-2 shadow-md">
              <Archive className="w-4 h-4" />Verseny Lezárása
            </button>
          )}
          {user
            ? <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold flex items-center gap-2 shadow-md"><LogOut className="w-4 h-4" />Kilépés</button>
            : <button onClick={() => setShowLoginModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold flex items-center gap-2 shadow-md"><Lock className="w-4 h-4" />Admin</button>}
        </div>

        {/* Login Modal */}
        {showLoginModal && !user && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Admin Bejelentkezés</h2>
                <button onClick={() => setShowLoginModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email cím</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="admin@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Jelszó</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="••••••••" />
                </div>
                {loginError && <div className="bg-red-100 border-2 border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">{loginError}</div>}
                <button onClick={handleLogin} disabled={loading} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400">
                  {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
                </button>
              </div>
            </div>
          </div>
        )}
      
        {/* Versenyző hozzáadás */}
        {user && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Versenyző Hozzáadása</h2>
            <div className="flex gap-3">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addCompetitor()} placeholder="Versenyző neve..." className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm" disabled={competitors.length >= 45} />
              <button onClick={addCompetitor} disabled={competitors.length >= 45} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2 text-sm font-semibold">
                <Plus className="w-4 h-4" />Hozzáad ({competitors.length}/45)
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
                    <th className="px-2 py-2 text-center">#</th>
                    <th className="px-2 py-2 text-left">Név</th>
                    <th className="px-2 py-2 text-center">Nagyhal (g)</th>
                    <th className="px-2 py-2 text-center">Apróhal (g)</th>
                    <th className="px-2 py-2 text-center">Darab</th>
                    <th className="px-2 py-2 text-center">Összesen (g)</th>
                    <th className="px-2 py-2 text-center">Darabszám</th>
                    <th className="px-2 py-2 text-center">Rögzít</th>
                    <th className="px-2 py-2 text-center">Törlés</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c, idx) => {
                    const last = c.measurements.length > 0 ? c.measurements[c.measurements.length - 1] : null;
                    const isExp = expandedAdminId === c.id;
                    const isEdit = editingId === c.id;
                    return (
                      <React.Fragment key={c.id}>
                        <tr className={idx % 2 === 0 ? 'bg-white border-b border-gray-200' : 'bg-blue-50 border-b border-gray-200'}>
                          <td className="px-2 py-2 text-center font-bold text-gray-700">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800 cursor-pointer hover:text-blue-600" onClick={() => setExpandedAdminId(isExp ? null : c.id)}>{c.name}</span>
                              {c.measurements.length > 0 && <span className="text-xs text-blue-600 cursor-pointer" onClick={() => setExpandedAdminId(isExp ? null : c.id)}>{isExp ? '▲' : '▼'}</span>}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {isEdit ? <input type="number" step="1" value={nagyhalaInput} onChange={(e) => setNagyhalaInput(e.target.value)} placeholder="0" className="w-16 px-1 py-0.5 border-2 border-blue-500 rounded text-center text-sm" />
                              : <div><span className="font-bold text-green-700">{c.totalNagyhal} g</span>{last && last.nagyhal > 0 && <p className="text-xs text-gray-400">(utolsó: {last.nagyhal}g)</p>}</div>}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {isEdit ? <input type="number" step="1" value={aprohalaInput} onChange={(e) => setAprohalaInput(e.target.value)} placeholder="0" className="w-16 px-1 py-0.5 border-2 border-blue-500 rounded text-center text-sm" />
                              : <div><span className="font-bold text-blue-700">{c.totalAprohal} g</span>{last && last.aprohal > 0 && <p className="text-xs text-gray-400">(utolsó: {last.aprohal}g)</p>}</div>}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {isEdit ? <input type="number" step="1" value={darabszamInput} onChange={(e) => setDarabszamInput(e.target.value)} placeholder="0" className="w-16 px-1 py-0.5 border-2 border-blue-500 rounded text-center text-sm" />
                              : <div><span className="font-bold text-purple-700">{c.totalDarabszam} db</span>{last && last.darabszam > 0 && <p className="text-xs text-gray-400">(utolsó: {last.darabszam})</p>}</div>}
                          </td>
                          <td className="px-2 py-2 text-center"><span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold text-sm">{c.mindosszesen} g</span></td>
                          <td className="px-2 py-2 text-center"><span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold text-sm">{c.totalDarabszam} db</span></td>
                          <td className="px-2 py-2 text-center">
                            {isEdit
                              ? <div className="flex gap-1 justify-center">
                                  <button onClick={() => addMeasurement(c.id)} className="px-2 py-0.5 bg-green-600 text-white rounded text-xs font-semibold">Ment</button>
                                  <button onClick={() => { setEditingId(null); setNagyhalaInput(''); setAprohalaInput(''); setDarabszamInput(''); }} className="px-2 py-0.5 bg-gray-400 text-white rounded text-xs font-semibold">Nem</button>
                                </div>
                              : <button onClick={() => setEditingId(c.id)} className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-semibold">Rögzít</button>}
                          </td>
                          {/* FIX: törlés gomb -> confirmDeleteCompetitor */}
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => confirmDeleteCompetitor(c.id, c.name)} className="text-red-600 hover:text-red-800">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {isExp && c.measurements.length > 0 && (
                          <tr><td colSpan={9} className="p-0">
                            <div className="bg-green-50 border-t border-b border-green-200 px-4 py-3">
                              <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Korábbi Mérések</p>
                              <table className="w-full text-xs">
                                <thead><tr className="text-gray-500 border-b border-green-200">
                                  <th className="text-left py-1">#</th><th className="text-left py-1">Időpont</th>
                                  <th className="text-center py-1">Nagyhal (g)</th><th className="text-center py-1">Apróhal (g)</th>
                                  <th className="text-center py-1">Darabszám</th><th className="text-center py-1">Sor összesen</th>
                                  <th className="text-center py-1">Szerk.</th><th className="text-center py-1">Törlés</th>
                                </tr></thead>
                                <tbody>
                                  {c.measurements.map((m, mi) => {
                                    const d = new Date(m.created_at);
                                    const ts = d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
                                    const isEditM = editingMeasurementId === m.id;
                                    return (
                                      <tr key={m.id} className="border-b border-green-100 last:border-b-0">
                                        <td className="py-1 text-gray-500">{mi+1}.</td>
                                        <td className="py-1 text-gray-500">{ts}</td>
                                        <td className="py-1 text-center">{isEditM ? <input type="number" value={editNagyhal} onChange={(e) => setEditNagyhal(e.target.value)} className="w-14 px-1 py-0.5 border border-green-400 rounded text-center" /> : m.nagyhal > 0 ? <span className="text-green-700 font-bold">{m.nagyhal} g</span> : <span className="text-gray-300">-</span>}</td>
                                        <td className="py-1 text-center">{isEditM ? <input type="number" value={editAprohal} onChange={(e) => setEditAprohal(e.target.value)} className="w-14 px-1 py-0.5 border border-blue-400 rounded text-center" /> : m.aprohal > 0 ? <span className="text-blue-700 font-bold">{m.aprohal} g</span> : <span className="text-gray-300">-</span>}</td>
                                        <td className="py-1 text-center">{isEditM ? <input type="number" value={editDarabszam} onChange={(e) => setEditDarabszam(e.target.value)} className="w-14 px-1 py-0.5 border border-purple-400 rounded text-center" /> : m.darabszam > 0 ? <span className="text-purple-700 font-bold">{m.darabszam} db</span> : <span className="text-gray-300">-</span>}</td>
                                        <td className="py-1 text-center">{isEditM ? <span className="text-yellow-700 font-bold">{(parseInt(editNagyhal)||0)+(parseInt(editAprohal)||0)} g</span> : <span className="text-yellow-700 font-bold">{m.nagyhal+m.aprohal} g</span>}</td>
                                        <td className="py-1 text-center">
                                          {isEditM
                                            ? <div className="flex gap-1 justify-center"><button onClick={() => updateMeasurement(m.id)} className="px-2 py-0.5 bg-green-600 text-white rounded text-xs">Ment</button><button onClick={() => setEditingMeasurementId(null)} className="px-2 py-0.5 bg-gray-400 text-white rounded text-xs">Nem</button></div>
                                            : <button onClick={() => { setEditingMeasurementId(m.id); setEditNagyhal(m.nagyhal); setEditAprohal(m.aprohal); setEditDarabszam(m.darabszam); }} className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">Szerk.</button>}
                                        </td>
                                        <td className="py-1 text-center"><button onClick={() => deleteMeasurement(m.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-green-300 font-bold text-gray-700">
                                    <td colSpan={2} className="py-1">Összesen:</td>
                                    <td className="py-1 text-center text-green-700">{c.totalNagyhal} g</td>
                                    <td className="py-1 text-center text-blue-700">{c.totalAprohal} g</td>
                                    <td className="py-1 text-center text-purple-700">{c.totalDarabszam} db</td>
                                    <td className="py-1 text-center text-yellow-700">{c.mindosszesen} g</td>
                                    <td colSpan={2}></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </td></tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              {competitors.length === 0 && <div className="text-center py-8 text-gray-400"><Fish className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="text-sm">Még nincsenek versenyzők.</p></div>}
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
                    <th className="px-2 py-2 text-center">#</th>
                    <th className="px-2 py-2 text-left">Név</th>
                    <th className="px-2 py-2 text-center">Nagyhal (g)</th>
                    <th className="px-2 py-2 text-center">Apróhal (g)</th>
                    <th className="px-2 py-2 text-center">Összesen (g)</th>
                    <th className="px-2 py-2 text-center">Darabszám</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c, idx) => (
                    <React.Fragment key={c.id}>
                      <tr className={idx % 2 === 0 ? 'bg-white hover:bg-green-50 cursor-pointer' : 'bg-gray-50 hover:bg-green-50 cursor-pointer'}
                        onClick={() => setEditingId(editingId === c.id ? null : c.id)}>
                        <td className="px-2 py-2 text-center font-bold text-gray-600">{idx + 1}</td>
                        <td className="px-2 py-2"><div className="flex items-center gap-2"><span className="font-semibold">{c.name}</span>{c.measurements.length > 0 && <span className="text-xs text-blue-600">{editingId === c.id ? '▲' : '▼'}</span>}</div></td>
                        <td className="px-2 py-2 text-center"><span className="font-bold text-green-700">{c.totalNagyhal} g</span></td>
                        <td className="px-2 py-2 text-center"><span className="font-bold text-blue-700">{c.totalAprohal} g</span></td>
                        <td className="px-2 py-2 text-center"><span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">{c.mindosszesen} g</span></td>
                        <td className="px-2 py-2 text-center"><span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">{c.totalDarabszam} db</span></td>
                      </tr>
                      {editingId === c.id && c.measurements.length > 0 && (
                        <tr><td colSpan={6} className="p-0">
                          <div className="bg-green-50 border-t border-b border-green-200 px-4 py-3">
                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Mérések history</p>
                            <table className="w-full text-xs">
                              <thead><tr className="text-gray-500 border-b border-green-200">
                                <th className="text-left py-1">#</th><th className="text-left py-1">Időpont</th>
                                <th className="text-center py-1">Nagyhal</th><th className="text-center py-1">Apróhal</th>
                                <th className="text-center py-1">Darab</th><th className="text-center py-1">Sor összesen</th>
                              </tr></thead>
                              <tbody>
                                {c.measurements.map((m, mi) => {
                                  const d = new Date(m.created_at);
                                  return (
                                    <tr key={m.id} className="border-b border-green-100 last:border-b-0">
                                      <td className="py-1 text-gray-500">{mi+1}.</td>
                                      <td className="py-1 text-gray-500">{d.getFullYear()}.{String(d.getMonth()+1).padStart(2,'0')}.{String(d.getDate()).padStart(2,'0')} {String(d.getHours()).padStart(2,'0')}:{String(d.getMinutes()).padStart(2,'0')}</td>
                                      <td className="py-1 text-center">{m.nagyhal > 0 ? <span className="text-green-700 font-bold">{m.nagyhal} g</span> : <span className="text-gray-300">-</span>}</td>
                                      <td className="py-1 text-center">{m.aprohal > 0 ? <span className="text-blue-700 font-bold">{m.aprohal} g</span> : <span className="text-gray-300">-</span>}</td>
                                      <td className="py-1 text-center">{m.darabszam > 0 ? <span className="text-purple-700 font-bold">{m.darabszam} db</span> : <span className="text-gray-300">-</span>}</td>
                                      <td className="py-1 text-center"><span className="text-yellow-700 font-bold">{m.nagyhal+m.aprohal} g</span></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-green-300 font-bold text-gray-700">
                                  <td colSpan={2} className="py-1">Összesen:</td>
                                  <td className="py-1 text-center text-green-700">{c.totalNagyhal} g</td>
                                  <td className="py-1 text-center text-blue-700">{c.totalAprohal} g</td>
                                  <td className="py-1 text-center text-purple-700">{c.totalDarabszam} db</td>
                                  <td className="py-1 text-center text-yellow-700">{c.mindosszesen} g</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              {competitors.length === 0 && <div className="text-center py-8 text-gray-400"><Fish className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="text-sm">Még nincsenek versenyzők.</p></div>}
            </div>
          </div>
        )}

        {/* EREDMÉNYEK */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
            <h3 className="text-lg font-bold mb-3 text-green-700 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" />Top 3 Legnagyobb Hal</h3>
            {results.top3Nagyhal.length > 0
              ? <div className="space-y-2">{results.top3Nagyhal.map((e, i) => (
                  <div key={i} className={placeStyle(i)}>
                    <div className="flex items-center gap-2"><span className="text-xl font-bold text-gray-600">{i+1}.</span><span className="font-semibold">{e.name}</span></div>
                    <span className="font-bold text-green-700 text-lg">{e.weight} g</span>
                  </div>))}</div>
              : <p className="text-gray-400 text-center py-6 text-sm">Még nincs rögzített nagyhal</p>}
          </div>
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-bold mb-3 text-blue-700 flex items-center gap-2"><Trophy className="w-5 h-5 text-blue-500" />Mind Összesen Eredmények</h3>
            {results.top6Mindosszesen.length > 0 ? (
              <div>
                <div className="space-y-2">
                  {results.top6Mindosszesen.slice(0, 6).map((c, i) => (
                    <div key={c.id} className={i < 3 ? placeStyle(i) : 'flex justify-between items-center p-2 rounded bg-gray-50'}>
                      <div className="flex items-center gap-2"><span className="text-xl font-bold text-gray-600">{i+1}.</span><span className="font-semibold">{c.name}</span></div>
                      <span className="font-bold text-blue-700 text-lg">{c.mindosszesen} g</span>
                    </div>
                  ))}
                </div>
                {results.top6Mindosszesen.length > 6 && (
                  <div className="mt-3">
                    <button onClick={() => setShowAllResults(!showAllResults)} className="w-full py-2 text-sm text-blue-600 font-semibold hover:bg-blue-50 rounded border border-blue-200">
                      {showAllResults ? '▲ Kevesebbet mutass' : '▼ Több eredmény (' + (results.top6Mindosszesen.length - 6) + ' több)'}
                    </button>
                    {showAllResults && (
                      <div className="space-y-1 mt-2 border-t border-gray-200 pt-2">
                        {results.top6Mindosszesen.slice(6).map((c, i) => (
                          <div key={c.id} className="flex justify-between items-center p-2 rounded bg-gray-50 hover:bg-gray-100">
                            <div className="flex items-center gap-2"><span className="text-sm font-bold text-gray-500">{i+7}.</span><span className="text-sm font-semibold text-gray-700">{c.name}</span></div>
                            <span className="font-bold text-blue-600 text-sm">{c.mindosszesen} g</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : <p className="text-gray-400 text-center py-6 text-sm">Még nincs rögzített mérés</p>}
         </div>
        )}
      </div>
    </div>
  );
}

        {/* LÁTOGATÓSZÁMLÁLÓ - oldal alján, adminnak */}
        {user && (
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold mb-3 text-gray-800 flex items-center gap-2">
              👁️ Látogatók Statisztikája
              <button onClick={loadPageViews} className="ml-auto px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />Frissítés
              </button>
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{pageViews.today}</p>
                <p className="text-xs text-blue-500 font-semibold mt-1">Mai látogatás</p>
              </div>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{pageViews.week}</p>
                <p className="text-xs text-green-500 font-semibold mt-1">Elmúlt 7 nap</p>
              </div>
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">{pageViews.total}</p>
                <p className="text-xs text-purple-500 font-semibold mt-1">Összes látogatás</p>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Eszköz szerinti bontás</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">📱 {pageViews.mobil}</p>
                  <p className="text-xs text-orange-500 font-semibold mt-1">Mobil látogatás</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pageViews.total > 0 ? Math.round((pageViews.mobil / pageViews.total) * 100) : 0}%</p>
                </div>
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-600">💻 {pageViews.pc}</p>
                  <p className="text-xs text-gray-500 font-semibold mt-1">PC látogatás</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pageViews.total > 0 ? Math.round((pageViews.pc / pageViews.total) * 100) : 0}%</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
