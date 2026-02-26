import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Trash2, Plus, Trophy, Fish, RefreshCw, LogOut, FolderOpen, Lock,
  Archive, Share2, CheckCircle, Home, AlertTriangle, Save, Users,
  ChevronDown, ChevronUp, Camera, MapPin, ClipboardList, Calendar,
  Edit2, X, ImageIcon
} from 'lucide-react';

const supabaseUrl = 'https://scijtstwpbgxtsdqzowc.supabase.co';
const supabaseKey = 'sb_publishable_jVuKo_UCsRvxdGbmYvGo-Q_cib0YWVv';
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Segédfüggvények ───────────────────────────────────────────────────
const safeField = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (s === '' || s === 'nullable' || s === 'nullable::text') return '';
  return s;
};
const formatDate = (s) => {
  if (!s) return '';
  const d = new Date(s);
  return d.getFullYear() + '. ' +
    ['január','február','március','április','május','június',
     'július','augusztus','szeptember','október','november','december'][d.getMonth()] +
    ' ' + d.getDate() + '.';
};
const formatDateTime = (s) => {
  const d = new Date(s);
  return d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' +
    String(d.getDate()).padStart(2,'0') + ' ' +
    String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
};
const placeStyle = (i) =>
  i === 0 ? 'flex justify-between items-center p-3 rounded bg-yellow-100 border-2 border-yellow-400'
  : i === 1 ? 'flex justify-between items-center p-3 rounded bg-gray-100 border-2 border-gray-400'
  : 'flex justify-between items-center p-3 rounded bg-orange-100 border-2 border-orange-400';

// Szektorokhoz szín
const sectorColor = (title) => {
  const t = (title || '').toUpperCase();
  if (t.includes('" A"') || t.endsWith(' A') || t.includes('A SZEK') || t.includes('- A')) return { bg: 'from-blue-600 to-blue-700', badge: 'bg-blue-500', text: 'A', light: 'bg-blue-50 border-blue-300' };
  if (t.includes('" B"') || t.endsWith(' B') || t.includes('B SZEK') || t.includes('- B')) return { bg: 'from-emerald-600 to-emerald-700', badge: 'bg-emerald-500', text: 'B', light: 'bg-emerald-50 border-emerald-300' };
  if (t.includes('" C"') || t.endsWith(' C') || t.includes('C SZEK') || t.includes('- C')) return { bg: 'from-purple-600 to-purple-700', badge: 'bg-purple-500', text: 'C', light: 'bg-purple-50 border-purple-300' };
  return { bg: 'from-green-600 to-blue-600', badge: 'bg-green-500', text: '🎣', light: 'bg-green-50 border-green-300' };
};

// ── KÜLSŐ komponensek ─────────────────────────────────────────────────

const DbErrorBanner = ({ dbError, setDbError }) => {
  if (!dbError) return null;
  return (
    <div className="bg-red-50 border-2 border-red-400 rounded-lg p-3 mb-4 flex items-start gap-2">
      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-red-700 font-semibold text-sm">Adatbázis hiba</p>
        <p className="text-red-600 text-xs mt-0.5">{dbError}</p>
      </div>
      <button onClick={() => setDbError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
    </div>
  );
};

const VisitorStats = ({ pageViews, loadPageViews }) => (
  <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
    <h2 className="text-lg font-bold mb-3 text-gray-800 flex items-center gap-2">
      👁️ Látogatók
      <button onClick={loadPageViews} className="ml-auto px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs flex items-center gap-1">
        <RefreshCw className="w-3 h-3" />Frissítés
      </button>
    </h2>
    <div className="grid grid-cols-3 gap-3 mb-3">
      {[['Mai', pageViews.today, 'blue'], ['7 nap', pageViews.week, 'green'], ['Összes', pageViews.total, 'purple']].map(([lbl, val, c]) => (
        <div key={lbl} className={`bg-${c}-50 border-2 border-${c}-200 rounded-lg p-3 text-center`}>
          <p className={`text-2xl font-bold text-${c}-700`}>{val}</p>
          <p className={`text-xs text-${c}-500 font-semibold mt-1`}>{lbl}</p>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 text-center">
        <p className="text-xl font-bold text-orange-600">📱 {pageViews.mobil}</p>
        <p className="text-xs text-orange-500 mt-1">Mobil — {pageViews.total > 0 ? Math.round(pageViews.mobil / pageViews.total * 100) : 0}%</p>
      </div>
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 text-center">
        <p className="text-xl font-bold text-gray-600">💻 {pageViews.pc}</p>
        <p className="text-xs text-gray-500 mt-1">PC — {pageViews.total > 0 ? Math.round(pageViews.pc / pageViews.total * 100) : 0}%</p>
      </div>
    </div>
  </div>
);

const ResultsPanel = ({ res, showAllResults, setShowAllResults }) => (
  <div className="grid md:grid-cols-2 gap-4 mb-4">
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-bold mb-3 text-green-700 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" />Top 3 Legnagyobb Hal</h3>
      {res.top3Nagyhal.length > 0
        ? <div className="space-y-2">{res.top3Nagyhal.map((e, i) => (
            <div key={i} className={placeStyle(i)}>
              <div className="flex items-center gap-2"><span className="text-xl font-bold text-gray-600">{i + 1}.</span><span className="font-semibold">{e.name}</span></div>
              <span className="font-bold text-green-700 text-lg">{e.weight} g</span>
            </div>))}</div>
        : <p className="text-gray-400 text-center py-6 text-sm">Nincs adat</p>}
    </div>
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-bold mb-3 text-blue-700 flex items-center gap-2"><Trophy className="w-5 h-5 text-blue-500" />Összesített Eredmények</h3>
      {res.top6Mindosszesen.length > 0 ? (
        <div>
          <div className="space-y-2">
            {res.top6Mindosszesen.slice(0, 6).map((c, i) => (
              <div key={c.id} className={i < 3 ? placeStyle(i) : 'flex justify-between items-center p-2 rounded bg-gray-50'}>
                <div className="flex items-center gap-2"><span className="text-xl font-bold text-gray-600">{i + 1}.</span><span className="font-semibold">{c.name}</span></div>
                <span className="font-bold text-blue-700 text-lg">{c.mindosszesen} g</span>
              </div>
            ))}
          </div>
          {res.top6Mindosszesen.length > 6 && (
            <div className="mt-3">
              <button onClick={() => setShowAllResults(!showAllResults)} className="w-full py-2 text-sm text-blue-600 font-semibold hover:bg-blue-50 rounded border border-blue-200">
                {showAllResults ? '▲ Kevesebbet' : `▼ Még ${res.top6Mindosszesen.length - 6} versenyző`}
              </button>
              {showAllResults && (
                <div className="space-y-1 mt-2 border-t border-gray-200 pt-2">
                  {res.top6Mindosszesen.slice(6).map((c, i) => (
                    <div key={c.id} className="flex justify-between items-center p-2 rounded bg-gray-50 hover:bg-gray-100">
                      <div className="flex items-center gap-2"><span className="text-sm font-bold text-gray-500">{i + 7}.</span><span className="text-sm font-semibold text-gray-700">{c.name}</span></div>
                      <span className="font-bold text-blue-600 text-sm">{c.mindosszesen} g</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : <p className="text-gray-400 text-center py-6 text-sm">Nincs adat</p>}
    </div>
  </div>
);

// ── Versenyesemény kártya a főoldalon ─────────────────────────────────
// Egy esemény = egy kiírás kártya. Ha több szektor van (event_group),
// egyetlen kártyán jelenik meg — szektorokról itt szó sincs.
const EventCard = ({ eventName, competitions, onGoToResults, isArchived, user, onRegister }) => {
  const [expanded, setExpanded] = useState(true);

  // Az elsődleges adatokat abból a versenyből vesszük, amelyikben van kiírás
  const primary = competitions.find(c =>
    safeField(c.description) || safeField(c.location) || safeField(c.notes) || safeField(c.image_url)
  ) || competitions[0];

  const desc     = safeField(primary?.description);
  const loc      = safeField(primary?.location);
  const nts      = safeField(primary?.notes);
  const imgUrl   = safeField(primary?.image_url);
  const evDate   = safeField(primary?.event_date) || safeField(competitions[0]?.event_date);

  // Közös jelentkezési lista az összes szektorból összegyűjtve
  const allRegs = competitions
    .flatMap(c => (c.registrations || []).map(r => ({ ...r, _compId: c.id })))
    .filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i);

  const registrationTargetId = primary?.id;

  return (
    <div className={`rounded-2xl shadow-md overflow-hidden mb-4 border-2 ${isArchived ? 'border-gray-200' : 'border-green-300'}`}>

      {/* Fejléc */}
      <div
        className={`px-5 py-4 cursor-pointer select-none ${isArchived
          ? 'bg-gradient-to-r from-gray-500 to-gray-700'
          : 'bg-gradient-to-r from-green-600 to-teal-600'} text-white`}
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              {isArchived
                ? <Archive className="w-5 h-5 opacity-70" />
                : <span className="block w-3 h-3 rounded-full bg-green-300 animate-pulse" />}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                {isArchived ? 'Korábbi verseny' : 'Aktuális verseny'}
                {evDate ? ` · ${evDate}` : ''}
              </span>
              <h2 className="text-lg font-bold leading-snug truncate">{eventName}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {allRegs.length > 0 && (
              <span className="text-xs bg-white bg-opacity-25 font-bold px-2 py-1 rounded-full">
                {allRegs.length} jelentkező
              </span>
            )}
            {expanded ? <ChevronUp className="w-5 h-5 opacity-70" /> : <ChevronDown className="w-5 h-5 opacity-70" />}
          </div>
        </div>
      </div>

      {/* Tartalom */}
      {expanded && (
        <div className="bg-white">
          {/* Kép */}
          {imgUrl && (
            <div className="overflow-hidden">
              <img src={imgUrl} alt="Verseny" className="w-full object-contain bg-gray-50"
                onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
            </div>
          )}

          <div className="px-5 py-4 space-y-4">

            {/* Kiírás szövege */}
            {(desc || loc || nts) ? (
              <div className="space-y-3">
                {desc && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" />Verseny kiírás
                    </p>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{desc}</p>
                  </div>
                )}
                {loc && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-700 text-sm">{loc}</p>
                  </div>
                )}
                {nts && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-700 mb-1">⚠️ Fontos tudnivalók</p>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{nts}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic text-center py-2">
                {isArchived ? '' : 'A verseny kiírása hamarosan megjelenik.'}
              </p>
            )}

            {/* Jelentkezők listája */}
            {(allRegs.length > 0 || !isArchived) && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Jelentkezők
                  {allRegs.length > 0 && (
                    <span className="ml-1 bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">
                      {allRegs.length}
                    </span>
                  )}
                </p>

                {allRegs.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {allRegs.map((r) => (
                      <div key={r.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
                        <span className="text-sm font-semibold text-blue-800">{r.team_name}</span>
                        {user && (
                          <button
                            onClick={() => onRegister('delete', r._compId, r.id)}
                            className="text-red-300 hover:text-red-600 ml-0.5 transition-colors"
                            title="Törlés">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mb-3 italic">
                    Még nincs jelentkező — légy az első!
                  </p>
                )}

                {/* Jelentkezés gomb */}
                {!isArchived && (
                  <button
                    onClick={() => onRegister('open', registrationTargetId, null)}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-2 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />Jelentkezés versenyre
                  </button>
                )}
              </div>
            )}

            {/* Link az eredményekhez */}
            <div className="border-t border-gray-100 pt-3 flex justify-end">
              <button
                onClick={onGoToResults}
                className="text-xs font-bold text-gray-400 hover:text-green-700 flex items-center gap-1 transition-colors">
                <Trophy className="w-3 h-3" />Verseny eredmények →
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
// ── REGISZTRÁCIÓS MODAL ───────────────────────────────────────────────
const RegistrationModal = ({ competitionId, onClose, onSubmit }) => {
  const [teamName, setTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!teamName.trim()) { setError('Add meg a csapat nevét!'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(competitionId, teamName.trim());
      onClose();
    } catch (err) {
      setError('Hiba a jelentkezés során: ' + err.message);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Fish className="w-5 h-5 text-blue-600" />Jelentkezés versenyre
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">A neved megjelenik a verseny kiírásában a többi jelentkező között.</p>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="pl.: Pontyos Pál"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-sm mb-2"
          autoFocus
        />
        {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold text-sm">Mégse</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm disabled:bg-gray-400">
            {submitting ? 'Küldés...' : 'Jelentkezés ✓'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── FŐ KOMPONENS ──────────────────────────────────────────────────────
export default function FishingCompetition() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [view, setView] = useState('home');
  const [dbError, setDbError] = useState(null);

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
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [archivedCompetition, setArchivedCompetition] = useState(null);
  const [archivedCompetitors, setArchivedCompetitors] = useState([]);
  const [archivedExpandedId, setArchivedExpandedId] = useState(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [pageViews, setPageViews] = useState({ today: 0, week: 0, total: 0, mobil: 0, pc: 0 });

  // Verseny info mezők
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [eventGroup, setEventGroup] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [showCompetitionInfo, setShowCompetitionInfo] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  // Regisztráció
  const [registrationModal, setRegistrationModal] = useState(null); // competitionId vagy null

  const saveTimers = useRef({});
  const competitionIdRef = useRef(null);

  useEffect(() => { competitionIdRef.current = competitionId; }, [competitionId]);

  useEffect(() => {
    trackVisit();
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
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
    } catch (err) { console.error('Auth hiba:', err); }
    finally { setLoading(false); }
  };

  // Betölti az összes versenyt + a hozzájuk tartozó regisztrációkat
  const loadCompetitions = async () => {
    try {
      setDbError(null);
      const { data, error } = await supabase.from('competitions').select('*').order('created_at', { ascending: false });
      if (error) { setDbError('Versenyek betöltése sikertelen: ' + error.message); return; }
      const comps = data || [];

      // Regisztrációk betöltése
      const { data: regsData } = await supabase.from('registrations').select('*').order('created_at', { ascending: true });
      const regs = regsData || [];

      // Regisztrációkat hozzárendeli a versenyekhez
      const compsWithRegs = comps.map(c => ({
        ...c,
        registrations: regs.filter(r => r.competition_id === c.id)
      }));

      setCompetitions(compsWithRegs);

      // Aktív verseny alapértékeinek betöltése az admin szerkesztőhöz
      const active = compsWithRegs.find(c => !c.archived);
      if (active) {
        setCompetitionId(active.id);
        competitionIdRef.current = active.id;
        setTitle(safeField(active.title) || 'Horgászverseny');
        setDescription(safeField(active.description));
        setLocation(safeField(active.location));
        setNotes(safeField(active.notes));
        setImageUrl(safeField(active.image_url));
        setEventGroup(safeField(active.event_group));
        setEventDate(safeField(active.event_date));
      }
    } catch (err) { setDbError('Váratlan hiba: ' + err.message); }
  };

  const handleLogin = async () => {
    setLoginError(''); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user); setShowLoginModal(false); setEmail(''); setPassword('');
      await loadCompetitions();
    } catch { setLoginError('Hibás email vagy jelszó'); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); setUser(null); setView('home'); setCompetitors([]); }
    catch (err) { console.error(err); }
  };

  const buildCompetitors = async (competitionDbId) => {
    const { data: competitorsData, error: ce } = await supabase
      .from('competitors').select('*').eq('competition_id', competitionDbId).order('sort_order', { ascending: true });
    if (ce) throw ce;
    return Promise.all((competitorsData || []).map(async (c) => {
      const { data: meas, error: me } = await supabase
        .from('measurements').select('*').eq('competitor_id', c.id).order('created_at', { ascending: true });
      if (me) throw me;
      const totalNagyhal = meas.reduce((s, m) => s + (m.nagyhal || 0), 0);
      const totalAprohal = meas.reduce((s, m) => s + (m.aprohal || 0), 0);
      const totalDarabszam = meas.reduce((s, m) => s + (m.darabszam || 0), 0);
      const mindosszesen = totalNagyhal + totalAprohal;
      const nagyhals = meas.filter(m => m.nagyhal > 0).map(m => m.nagyhal);
      return { ...c, measurements: meas, totalNagyhal, totalAprohal, totalDarabszam, mindosszesen, nagyhals };
    }));
  };

  const loadCompetition = async (compId) => {
    try {
      setLoading(true); setDbError(null);
      const { data: comp, error: ce } = await supabase.from('competitions').select('*').eq('id', compId).single();
      if (ce) throw ce;
      setCompetitionId(comp.id); competitionIdRef.current = comp.id;
      setTitle(safeField(comp.title) || 'Horgászverseny');
      setDescription(safeField(comp.description));
      setLocation(safeField(comp.location));
      setNotes(safeField(comp.notes));
      setImageUrl(safeField(comp.image_url));
      setEventGroup(safeField(comp.event_group));
      setEventDate(safeField(comp.event_date));
      const built = await buildCompetitors(comp.id);
      setCompetitors(built);
      setView('competition');
    } catch (err) { setDbError('Verseny betöltése sikertelen: ' + err.message); }
    finally { setLoading(false); }
  };

  const loadArchivedCompetition = async (compId) => {
    try {
      setLoading(true); setDbError(null);
      const { data: comp, error: ce } = await supabase.from('competitions').select('*').eq('id', compId).single();
      if (ce) throw ce;
      setArchivedCompetition(comp);
      const built = await buildCompetitors(comp.id);
      setArchivedCompetitors(built);
      setView('archived');
    } catch (err) { setDbError('Archív verseny betöltése sikertelen: ' + err.message); }
    finally { setLoading(false); }
  };

  const goHome = async () => {
    setView('home'); setCompetitors([]); setArchivedCompetition(null); setArchivedCompetitors([]);
    await loadCompetitions();
  };

  const archiveCompetition = async () => {
    if (!competitionId) return;
    if (!window.confirm('Biztosan lezárod ezt a versenyt?')) return;
    try {
      const { error } = await supabase.from('competitions').update({ archived: true }).eq('id', competitionId);
      if (error) throw error;
      await goHome();
    } catch (err) { alert('Hiba: ' + err.message); }
  };

  const unarchiveCompetition = async (compId) => {
    try {
      const { error } = await supabase.from('competitions').update({ archived: false }).eq('id', compId);
      if (error) throw error;
      await goHome();
    } catch (err) { alert('Hiba: ' + err.message); }
  };

  const createNewCompetition = async () => {
    try {
      const now = new Date();
      const dateStr = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
      const { data, error } = await supabase.from('competitions')
        .insert([{ title: 'Horgászverseny - ' + dateStr, archived: false }]).select('*');
      if (error) throw error;
      const comp = data[0];
      setCompetitionId(comp.id); competitionIdRef.current = comp.id;
      setTitle(safeField(comp.title));
      setDescription(''); setLocation(''); setNotes(''); setImageUrl(''); setEventGroup(''); setEventDate('');
      setCompetitors([]);
      await loadCompetitions();
      setView('competition');
    } catch (err) { alert('Hiba: ' + err.message); }
  };

  const deleteCompetition = async (compId) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a versenyt? Ez nem visszavonható!')) return;
    try {
      const { error } = await supabase.from('competitions').delete().eq('id', compId);
      if (error) throw error;
      if (compId === competitionId) { setView('home'); setCompetitors([]); }
      await loadCompetitions();
    } catch (err) { alert('Hiba: ' + err.message); }
  };

  const saveFieldToDb = useCallback(async (field, value) => {
    const cid = competitionIdRef.current;
    if (!cid) { setDbError('Nincs aktív verseny!'); setSaveStatus('error'); return; }
    setSaveStatus('saving');
    try {
      const { error } = await supabase.from('competitions').update({ [field]: value }).eq('id', cid);
      if (error) { setDbError('Mentési hiba (' + field + '): ' + error.message); setSaveStatus('error'); }
      else {
        setDbError(null); setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        // Frissíti a competitions listát is
        setCompetitions(prev => prev.map(c => c.id === cid ? { ...c, [field]: value } : c));
      }
    } catch (err) { setDbError('Mentési hiba: ' + err.message); setSaveStatus('error'); }
  }, []);

  const handleInfoChange = (field, value, setter) => {
    setter(value);
    setSaveStatus('saving');
    if (saveTimers.current[field]) clearTimeout(saveTimers.current[field]);
    saveTimers.current[field] = setTimeout(() => saveFieldToDb(field, value), 500);
  };

  const handleInfoBlur = (field, value) => {
    if (saveTimers.current[field]) { clearTimeout(saveTimers.current[field]); saveTimers.current[field] = null; }
    saveFieldToDb(field, value);
  };

  // Verseny cím mentése
  const saveTitle = async (newTitle) => {
    if (!competitionIdRef.current) return;
    try {
      await supabase.from('competitions').update({ title: newTitle }).eq('id', competitionIdRef.current);
      setCompetitions(prev => prev.map(c => c.id === competitionIdRef.current ? { ...c, title: newTitle } : c));
    } catch (err) { console.error('Cím mentési hiba:', err); }
  };

  // Regisztráció kezelése
  const handleRegistration = async (action, compId, regId) => {
    if (action === 'open') {
      setRegistrationModal(compId);
    } else if (action === 'delete') {
      if (!window.confirm('Biztosan törlöd ezt a jelentkezőt?')) return;
      try {
        const { error } = await supabase.from('registrations').delete().eq('id', regId);
        if (error) throw error;
        await loadCompetitions();
      } catch (err) { alert('Hiba: ' + err.message); }
    }
  };

  const submitRegistration = async (compId, teamName) => {
    const { error } = await supabase.from('registrations').insert([{ competition_id: compId, team_name: teamName }]);
    if (error) throw error;
    await loadCompetitions();
  };

  // Versenyzők
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

  const confirmDeleteCompetitor = (id, name) => setDeleteConfirm({ id, name });
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
      setNagyhalaInput(''); setAprohalaInput(''); setDarabszamInput(''); setEditingId(null);
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

  const results = useMemo(() => {
    const allEntries = [];
    competitors.forEach(c => { (c.nagyhals || []).forEach(w => allEntries.push({ name: c.name, weight: w })); });
    const top3Nagyhal = allEntries.sort((a, b) => b.weight - a.weight).slice(0, 3);
    const top6Mindosszesen = [...competitors].filter(c => c.mindosszesen > 0).sort((a, b) => b.mindosszesen - a.mindosszesen);
    return { top3Nagyhal, top6Mindosszesen };
  }, [competitors]);

  const archivedResults = useMemo(() => {
    const allEntries = [];
    archivedCompetitors.forEach(c => { (c.nagyhals || []).forEach(w => allEntries.push({ name: c.name, weight: w })); });
    const top3Nagyhal = allEntries.sort((a, b) => b.weight - a.weight).slice(0, 3);
    const top6Mindosszesen = [...archivedCompetitors].filter(c => c.mindosszesen > 0).sort((a, b) => b.mindosszesen - a.mindosszesen);
    return { top3Nagyhal, top6Mindosszesen };
  }, [archivedCompetitors]);

  // Versenyeket csoportosítja event_group szerint (fallback: event_date)
  const groupedCompetitions = useMemo(() => {
    const active = competitions.filter(c => !c.archived);
    const archived = competitions.filter(c => c.archived);

    const normalize = (s) => safeField(s).toLowerCase().replace(/\s+/g, ' ').trim();

    const groupBy = (list) => {
      const groups = {};
      list.forEach(c => {
        const grp   = normalize(c.event_group);
        const dated = normalize(c.event_date);
        // Kulcs: event_group ha van, különben event_date ha van, különben saját id
        const key   = grp || dated || c.id;
        const name  = safeField(c.event_group) || safeField(c.event_date) || safeField(c.title) || 'Horgászverseny';
        if (!groups[key]) groups[key] = { name, comps: [] };
        groups[key].comps.push(c);
      });
      return Object.values(groups);
    };

    return { active: groupBy(active), archived: groupBy(archived) };
  }, [competitions]);

  const activeCompetitions = competitions.filter(c => !c.archived);
  const archivedList = competitions.filter(c => c.archived);

  // Mentés státusz
  const SaveIndicator = () => {
    if (saveStatus === 'idle') return null;
    if (saveStatus === 'saving') return <span className="text-xs text-blue-500 flex items-center gap-1 animate-pulse"><Save className="w-3 h-3" />Mentés...</span>;
    if (saveStatus === 'saved') return <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Mentve ✓</span>;
    if (saveStatus === 'error') return <span className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Mentési hiba!</span>;
    return null;
  };

  // Admin info szerkesztő — kiválasztott versenyhez
  const renderAdminInfoEditor = () => (
    <div className="bg-white rounded-xl shadow-lg p-4 mb-4 border-2 border-amber-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-gray-800">⚙️ Verseny Szerkesztése</h2>
          <SaveIndicator />
        </div>
        <button onClick={() => setShowCompetitionInfo(!showCompetitionInfo)}
          className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-semibold">
          {showCompetitionInfo ? '▲ Bezár' : '▼ Megnyit'}
        </button>
      </div>

      {/* Aktív verseny választó */}
      {activeCompetitions.length > 1 && (
        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Szerkesztett verseny</label>
          <select
            value={competitionId || ''}
            onChange={(e) => loadCompetition(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none">
            {activeCompetitions.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      )}

      {showCompetitionInfo && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cím</label>
              <input type="text" value={title}
                onChange={(e) => { setTitle(e.target.value); handleInfoChange('title', e.target.value, setTitle); }}
                onBlur={(e) => handleInfoBlur('title', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Verseny dátuma</label>
              <input type="text" value={eventDate}
                onChange={(e) => handleInfoChange('event_date', e.target.value, setEventDate)}
                onBlur={(e) => handleInfoBlur('event_date', e.target.value)}
                placeholder="pl. 2026.02.28"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Eseménycsoport neve <span className="text-gray-400 font-normal">(azonos névvel csoportosítja a szektorokat)</span>
            </label>
            <input type="text" value={eventGroup}
              onChange={(e) => handleInfoChange('event_group', e.target.value, setEventGroup)}
              onBlur={(e) => handleInfoBlur('event_group', e.target.value)}
              placeholder="pl. 2026.02.28 Tavirózsa-tó Verseny"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Verseny leírása</label>
            <textarea value={description}
              onChange={(e) => handleInfoChange('description', e.target.value, setDescription)}
              onBlur={(e) => handleInfoBlur('description', e.target.value)}
              placeholder="Verseny kiírás, szabályok..."
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" rows="3" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Helyszín</label>
            <input type="text" value={location}
              onChange={(e) => handleInfoChange('location', e.target.value, setLocation)}
              onBlur={(e) => handleInfoBlur('location', e.target.value)}
              placeholder="Halastó neve, cím..."
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Fontos tudnivalók</label>
            <textarea value={notes}
              onChange={(e) => handleInfoChange('notes', e.target.value, setNotes)}
              onBlur={(e) => handleInfoBlur('notes', e.target.value)}
              placeholder="Tiltott csalik, díjazás, egyéb szabályok..."
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" rows="2" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />Verseny képe
            </label>
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
                <img src={imageUrl} alt="Verseny kép" className="w-full object-contain bg-gray-50 max-h-64"
                  onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                <button
                  onClick={() => { setImageUrl(''); saveFieldToDb('image_url', ''); }}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg hover:bg-red-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${imageUploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'}`}>
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  {imageUploading ? (
                    <>
                      <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="text-xs text-blue-600 font-semibold">Feltöltés folyamatban...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-600 font-semibold">Kattints a kép feltöltéséhez</span>
                      <span className="text-xs text-gray-400">JPG, PNG, WebP · max 5 MB</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={imageUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { alert('A kép túl nagy, maximum 5 MB!'); return; }
                    const cid = competitionIdRef.current;
                    if (!cid) { alert('Nincs aktív verseny kiválasztva!'); return; }
                    setImageUploading(true);
                    try {
                      const ext = file.name.split('.').pop().toLowerCase();
                      const path = cid + '/' + Date.now() + '.' + ext;
                      const { error: upErr } = await supabase.storage
                        .from('verseny-kepek')
                        .upload(path, file, { upsert: true });
                      if (upErr) throw upErr;
                      const { data: urlData } = supabase.storage
                        .from('verseny-kepek')
                        .getPublicUrl(path);
                      const publicUrl = urlData.publicUrl;
                      setImageUrl(publicUrl);
                      await saveFieldToDb('image_url', publicUrl);
                    } catch (err) {
                      alert('Feltöltési hiba: ' + err.message);
                    } finally {
                      setImageUploading(false);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-400 italic">💡 Mező elhagyásakor automatikusan ment.</p>
        </div>
      )}
    </div>
  );

  const AuthButton = () => user
    ? <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold flex items-center gap-2 shadow-md"><LogOut className="w-4 h-4" />Kilépés</button>
    : <button onClick={() => setShowLoginModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold flex items-center gap-2 shadow-md"><Lock className="w-4 h-4" />Admin</button>;

  const DeleteModal = () => deleteConfirm ? (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-3">Versenyző törlése</h2>
        <p className="text-red-700 font-bold text-center bg-red-50 rounded-lg py-2 px-3 mb-3">„{deleteConfirm.name}"</p>
        <p className="text-gray-500 text-xs mb-5 text-center">Az összes mérési adatával együtt törlődik. Ez nem visszavonható.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold">Mégse</button>
          <button onClick={executeDeleteCompetitor} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-semibold">Törlés</button>
        </div>
      </div>
    </div>
  ) : null;

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Fish className="w-12 h-12 text-green-500 animate-pulse" />
        <p className="text-gray-600 font-semibold">Betöltés...</p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // NÉZET: ARCHÍV VERSENY
  // ══════════════════════════════════════════════════════════════════════
  if (view === 'archived' && archivedCompetition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="max-w-7xl mx-auto">
          <DeleteModal />
          {showShareToast && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2"><CheckCircle className="w-5 h-5" />Link másolva!</div>}
          <DbErrorBanner dbError={dbError} setDbError={setDbError} />
          <div className="bg-gradient-to-r from-gray-600 to-gray-800 text-white p-5 rounded-xl shadow-xl mb-4">
            <div className="flex items-center gap-3"><Archive className="w-7 h-7" /><div><h1 className="text-2xl font-bold">{archivedCompetition.title}</h1><p className="text-gray-300 text-sm mt-0.5">Lezárt verseny · {formatDate(archivedCompetition.created_at)}</p></div></div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={goHome} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-semibold flex items-center gap-2 shadow"><Home className="w-4 h-4" />Főoldal</button>
            <button onClick={() => setView('list')} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-semibold flex items-center gap-2 shadow"><FolderOpen className="w-4 h-4" />Versenyek</button>
            {user && <button onClick={() => unarchiveCompetition(archivedCompetition.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold flex items-center gap-2 shadow"><RefreshCw className="w-4 h-4" />Visszaállítás</button>}
            <AuthButton />
          </div>

          {safeField(archivedCompetition.image_url) && (
            <div className="mb-4 rounded-xl overflow-hidden shadow-lg">
              <img src={archivedCompetition.image_url} alt="Verseny" className="w-full object-contain bg-gray-50" />
            </div>
          )}

          {(safeField(archivedCompetition.description) || safeField(archivedCompetition.location) || safeField(archivedCompetition.notes)) && (
            <div className="bg-white rounded-xl shadow p-4 mb-4">
              {safeField(archivedCompetition.description) && <div className="mb-3"><h3 className="text-xs font-bold text-gray-500 uppercase mb-1">📋 Kiírás</h3><p className="text-gray-700 text-sm whitespace-pre-wrap">{archivedCompetition.description}</p></div>}
              {safeField(archivedCompetition.location) && <div className="mb-3"><h3 className="text-xs font-bold text-gray-500 uppercase mb-1">📍 Helyszín</h3><p className="text-gray-700 text-sm">{archivedCompetition.location}</p></div>}
              {safeField(archivedCompetition.notes) && <div><h3 className="text-xs font-bold text-amber-600 uppercase mb-1">⚠️ Tudnivalók</h3><p className="text-gray-700 text-sm whitespace-pre-wrap">{archivedCompetition.notes}</p></div>}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Versenyzők és Fogások</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-2 py-2 text-center">#</th><th className="px-2 py-2 text-left">Név</th>
                  <th className="px-2 py-2 text-center">Nagyhal</th><th className="px-2 py-2 text-center">Apróhal</th>
                  <th className="px-2 py-2 text-center">Összesen</th><th className="px-2 py-2 text-center">Db</th>
                </tr></thead>
                <tbody>
                  {archivedCompetitors.map((c, idx) => (
                    <React.Fragment key={c.id}>
                      <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-green-50 cursor-pointer`} onClick={() => setArchivedExpandedId(archivedExpandedId === c.id ? null : c.id)}>
                        <td className="px-2 py-2 text-center font-bold text-gray-600">{idx + 1}</td>
                        <td className="px-2 py-2 font-semibold">{c.name} {c.measurements.length > 0 && <span className="text-xs text-blue-500">{archivedExpandedId === c.id ? '▲' : '▼'}</span>}</td>
                        <td className="px-2 py-2 text-center font-bold text-green-700">{c.totalNagyhal} g</td>
                        <td className="px-2 py-2 text-center font-bold text-blue-700">{c.totalAprohal} g</td>
                        <td className="px-2 py-2 text-center"><span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">{c.mindosszesen} g</span></td>
                        <td className="px-2 py-2 text-center"><span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">{c.totalDarabszam} db</span></td>
                      </tr>
                      {archivedExpandedId === c.id && c.measurements.length > 0 && (
                        <tr><td colSpan={6} className="p-0">
                          <div className="bg-green-50 border-t border-b border-green-200 px-4 py-3">
                            <table className="w-full text-xs"><thead><tr className="text-gray-500 border-b border-green-200">
                              <th className="text-left py-1">#</th><th className="py-1">Időpont</th>
                              <th className="text-center py-1">Nagyhal</th><th className="text-center py-1">Apróhal</th>
                              <th className="text-center py-1">Db</th><th className="text-center py-1">Sor össz.</th>
                            </tr></thead><tbody>
                              {c.measurements.map((m, mi) => (
                                <tr key={m.id} className="border-b border-green-100">
                                  <td className="py-1 text-gray-500">{mi + 1}.</td>
                                  <td className="py-1 text-gray-500">{formatDateTime(m.created_at)}</td>
                                  <td className="py-1 text-center">{m.nagyhal > 0 ? <span className="text-green-700 font-bold">{m.nagyhal} g</span> : '-'}</td>
                                  <td className="py-1 text-center">{m.aprohal > 0 ? <span className="text-blue-700 font-bold">{m.aprohal} g</span> : '-'}</td>
                                  <td className="py-1 text-center">{m.darabszam > 0 ? <span className="text-purple-700 font-bold">{m.darabszam}</span> : '-'}</td>
                                  <td className="py-1 text-center font-bold text-yellow-700">{m.nagyhal + m.aprohal} g</td>
                                </tr>
                              ))}
                            </tbody></table>
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <ResultsPanel res={archivedResults} showAllResults={showAllResults} setShowAllResults={setShowAllResults} />
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // NÉZET: VERSENY LISTA
  // ══════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="max-w-4xl mx-auto">
          <DbErrorBanner dbError={dbError} setDbError={setDbError} />
          <div className="bg-white rounded-xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><FolderOpen className="w-7 h-7 text-blue-600" />Versenyek</h2>
              <button onClick={goHome} className="text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center gap-1"><Home className="w-4 h-4" />Főoldal</button>
            </div>
            {user && (
              <button onClick={createNewCompetition} className="w-full mb-5 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-bold flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />Új Verseny Indítása
              </button>
            )}
            <h3 className="text-sm font-bold text-green-700 mb-2 uppercase">Aktív versenyek</h3>
            <div className="space-y-3 mb-5">
              {activeCompetitions.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Nincs aktív verseny</p>}
              {activeCompetitions.map(comp => (
                <div key={comp.id} className="border-2 rounded-xl p-4 flex justify-between items-center border-green-200 hover:border-green-400 transition-colors">
                  <div><p className="font-bold text-gray-800">{comp.title}</p><p className="text-gray-400 text-xs">{formatDate(comp.created_at)}</p></div>
                  <div className="flex gap-2">
                    <button onClick={() => loadCompetition(comp.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold">Megnyitás</button>
                    {user && <button onClick={() => deleteCompetition(comp.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold">Törlés</button>}
                  </div>
                </div>
              ))}
            </div>
            <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase">Korábbi versenyek</h3>
            <div className="space-y-3">
              {archivedList.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Nincs lezárt verseny</p>}
              {archivedList.map(comp => (
                <div key={comp.id} className="border-2 rounded-xl p-4 flex justify-between items-center border-gray-200 bg-gray-50">
                  <div><p className="font-bold text-gray-700">{comp.title}</p><p className="text-gray-400 text-xs">{formatDate(comp.created_at)} · Lezárt</p></div>
                  <div className="flex gap-2">
                    <button onClick={() => loadArchivedCompetition(comp.id)} className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm font-semibold">Megtekintés</button>
                    {user && <button onClick={() => deleteCompetition(comp.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold">Törlés</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // NÉZET: AKTÍV VERSENY (Admin táblázat)
  // ══════════════════════════════════════════════════════════════════════
  if (view === 'competition') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="max-w-7xl mx-auto">
          <DeleteModal />
          {showShareToast && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2"><CheckCircle className="w-5 h-5" />Link másolva!</div>}
          <DbErrorBanner dbError={dbError} setDbError={setDbError} />

          {/* Fejléc */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-5 rounded-xl shadow-xl mb-4">
            <div className="flex items-center gap-3">
              <Fish className="w-8 h-8" />
              {user
                ? <input type="text" value={title}
                    onChange={(e) => { setTitle(e.target.value); handleInfoChange('title', e.target.value, setTitle); }}
                    onBlur={(e) => handleInfoBlur('title', e.target.value)}
                    className="text-2xl font-bold bg-transparent border-b-2 border-transparent hover:border-white focus:border-white focus:outline-none text-white flex-1" />
                : <h1 className="text-2xl font-bold">{title}</h1>}
            </div>
            <p className="mt-1 text-green-100 text-sm">45 versenyző · Korlátlan mérés{user ? ' · Admin: ' + user.email : ''}</p>
          </div>

          {/* Nav */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={goHome} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-semibold flex items-center gap-2 shadow"><Home className="w-4 h-4" />Főoldal</button>
            <button onClick={() => setView('list')} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-semibold flex items-center gap-2 shadow"><FolderOpen className="w-4 h-4" />Versenyek</button>
            <button onClick={handleShare} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-semibold flex items-center gap-2 shadow"><Share2 className="w-4 h-4" />Megosztás</button>
            <button onClick={() => loadCompetition(competitionId)} className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-semibold flex items-center gap-2 shadow"><RefreshCw className="w-4 h-4" />Frissítés</button>
            {user && <button onClick={archiveCompetition} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-semibold flex items-center gap-2 shadow"><Archive className="w-4 h-4" />Lezárás</button>}
            <AuthButton />
          </div>

          {user && renderAdminInfoEditor()}

          {/* Versenyző hozzáadás */}
          {user && (
            <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
              <h2 className="text-base font-bold mb-3 text-gray-800">Versenyző Hozzáadása</h2>
              <div className="flex gap-3">
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCompetitor()}
                  placeholder="Versenyző neve..."
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  disabled={competitors.length >= 45} />
                <button onClick={addCompetitor} disabled={competitors.length >= 45}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2 text-sm font-semibold">
                  <Plus className="w-4 h-4" />Hozzáad ({competitors.length}/45)
                </button>
              </div>
            </div>
          )}

          {/* Admin táblázat */}
          {user && (
            <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
              <h2 className="text-base font-bold mb-3 text-gray-800">Versenyzők és Fogások</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="px-2 py-2 text-center">#</th><th className="px-2 py-2 text-left">Név</th>
                    <th className="px-2 py-2 text-center">Nagyhal (g)</th><th className="px-2 py-2 text-center">Apróhal (g)</th>
                    <th className="px-2 py-2 text-center">Darab</th><th className="px-2 py-2 text-center">Összesen</th>
                    <th className="px-2 py-2 text-center">Rögzít</th><th className="px-2 py-2 text-center">Törlés</th>
                  </tr></thead>
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
                              <span className="font-semibold cursor-pointer hover:text-blue-600" onClick={() => setExpandedAdminId(isExp ? null : c.id)}>
                                {c.name} {c.measurements.length > 0 && <span className="text-xs text-blue-500">{isExp ? '▲' : '▼'}</span>}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isEdit ? <input type="number" value={nagyhalaInput} onChange={(e) => setNagyhalaInput(e.target.value)} placeholder="0" className="w-16 px-1 py-0.5 border-2 border-blue-500 rounded text-center" />
                                : <span className="font-bold text-green-700">{c.totalNagyhal} g</span>}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isEdit ? <input type="number" value={aprohalaInput} onChange={(e) => setAprohalaInput(e.target.value)} placeholder="0" className="w-16 px-1 py-0.5 border-2 border-blue-500 rounded text-center" />
                                : <span className="font-bold text-blue-700">{c.totalAprohal} g</span>}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isEdit ? <input type="number" value={darabszamInput} onChange={(e) => setDarabszamInput(e.target.value)} placeholder="0" className="w-16 px-1 py-0.5 border-2 border-blue-500 rounded text-center" />
                                : <span className="font-bold text-purple-700">{c.totalDarabszam}</span>}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">{c.mindosszesen} g</span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              {isEdit
                                ? <div className="flex gap-1 justify-center">
                                    <button onClick={() => addMeasurement(c.id)} className="px-2 py-0.5 bg-green-600 text-white rounded text-xs">Ment</button>
                                    <button onClick={() => { setEditingId(null); setNagyhalaInput(''); setAprohalaInput(''); setDarabszamInput(''); }} className="px-2 py-0.5 bg-gray-400 text-white rounded text-xs">✕</button>
                                  </div>
                                : <button onClick={() => setEditingId(c.id)} className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs">Rögzít</button>}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button onClick={() => confirmDeleteCompetitor(c.id, c.name)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                          {isExp && c.measurements.length > 0 && (
                            <tr><td colSpan={8} className="p-0">
                              <div className="bg-green-50 border-t border-b border-green-200 px-4 py-3">
                                <table className="w-full text-xs"><thead><tr className="text-gray-500 border-b border-green-200">
                                  <th className="text-left py-1">#</th><th className="py-1">Időpont</th>
                                  <th className="text-center py-1">Nagyhal</th><th className="text-center py-1">Apróhal</th>
                                  <th className="text-center py-1">Db</th><th className="text-center py-1">Összesen</th>
                                  <th className="text-center py-1">Szerk.</th><th className="text-center py-1">Törl.</th>
                                </tr></thead><tbody>
                                  {c.measurements.map((m, mi) => {
                                    const isEditM = editingMeasurementId === m.id;
                                    return (
                                      <tr key={m.id} className="border-b border-green-100">
                                        <td className="py-1 text-gray-500">{mi + 1}.</td>
                                        <td className="py-1 text-gray-500">{formatDateTime(m.created_at)}</td>
                                        <td className="py-1 text-center">{isEditM ? <input type="number" value={editNagyhal} onChange={(e) => setEditNagyhal(e.target.value)} className="w-14 px-1 border border-green-400 rounded text-center" /> : m.nagyhal > 0 ? <span className="text-green-700 font-bold">{m.nagyhal} g</span> : '-'}</td>
                                        <td className="py-1 text-center">{isEditM ? <input type="number" value={editAprohal} onChange={(e) => setEditAprohal(e.target.value)} className="w-14 px-1 border border-blue-400 rounded text-center" /> : m.aprohal > 0 ? <span className="text-blue-700 font-bold">{m.aprohal} g</span> : '-'}</td>
                                        <td className="py-1 text-center">{isEditM ? <input type="number" value={editDarabszam} onChange={(e) => setEditDarabszam(e.target.value)} className="w-14 px-1 border border-purple-400 rounded text-center" /> : m.darabszam > 0 ? <span className="text-purple-700 font-bold">{m.darabszam}</span> : '-'}</td>
                                        <td className="py-1 text-center font-bold text-yellow-700">{isEditM ? (parseInt(editNagyhal)||0)+(parseInt(editAprohal)||0) : m.nagyhal + m.aprohal} g</td>
                                        <td className="py-1 text-center">
                                          {isEditM
                                            ? <div className="flex gap-1 justify-center">
                                                <button onClick={() => updateMeasurement(m.id)} className="px-2 bg-green-600 text-white rounded text-xs">Ment</button>
                                                <button onClick={() => setEditingMeasurementId(null)} className="px-2 bg-gray-400 text-white rounded text-xs">✕</button>
                                              </div>
                                            : <button onClick={() => { setEditingMeasurementId(m.id); setEditNagyhal(m.nagyhal); setEditAprohal(m.aprohal); setEditDarabszam(m.darabszam); }} className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs">Szerk.</button>}
                                        </td>
                                        <td className="py-1 text-center">
                                          <button onClick={() => deleteMeasurement(m.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot><tr className="border-t-2 border-green-300 font-bold text-gray-700">
                                  <td colSpan={2} className="py-1">Összesen:</td>
                                  <td className="py-1 text-center text-green-700">{c.totalNagyhal} g</td>
                                  <td className="py-1 text-center text-blue-700">{c.totalAprohal} g</td>
                                  <td className="py-1 text-center text-purple-700">{c.totalDarabszam}</td>
                                  <td className="py-1 text-center text-yellow-700">{c.mindosszesen} g</td>
                                  <td colSpan={2}></td>
                                </tr></tfoot>
                              </table>
                            </div>
                            </td></tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                {competitors.length === 0 && <div className="text-center py-8 text-gray-400"><Fish className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">Még nincsenek versenyzők.</p></div>}
              </div>
            </div>
          )}

          {/* Felhasználói tábla */}
          {!user && (
            <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
              <h2 className="text-base font-bold mb-3">Versenyzők Eredményei</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="px-2 py-2 text-center">#</th><th className="px-2 py-2 text-left">Név</th>
                    <th className="px-2 py-2 text-center">Nagyhal</th><th className="px-2 py-2 text-center">Apróhal</th>
                    <th className="px-2 py-2 text-center">Összesen</th><th className="px-2 py-2 text-center">Db</th>
                  </tr></thead>
                  <tbody>
                    {competitors.map((c, idx) => (
                      <React.Fragment key={c.id}>
                        <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-green-50 cursor-pointer`} onClick={() => setEditingId(editingId === c.id ? null : c.id)}>
                          <td className="px-2 py-2 text-center font-bold text-gray-600">{idx + 1}</td>
                          <td className="px-2 py-2 font-semibold">{c.name} {c.measurements.length > 0 && <span className="text-xs text-blue-500">{editingId === c.id ? '▲' : '▼'}</span>}</td>
                          <td className="px-2 py-2 text-center font-bold text-green-700">{c.totalNagyhal} g</td>
                          <td className="px-2 py-2 text-center font-bold text-blue-700">{c.totalAprohal} g</td>
                          <td className="px-2 py-2 text-center"><span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">{c.mindosszesen} g</span></td>
                          <td className="px-2 py-2 text-center"><span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">{c.totalDarabszam} db</span></td>
                        </tr>
                        {editingId === c.id && c.measurements.length > 0 && (
                          <tr><td colSpan={6} className="p-0">
                            <div className="bg-green-50 border-t border-b border-green-200 px-4 py-3">
                              <table className="w-full text-xs"><thead><tr className="text-gray-500 border-b border-green-200">
                                <th className="text-left py-1">#</th><th>Időpont</th>
                                <th className="text-center py-1">Nagyhal</th><th className="text-center py-1">Apróhal</th>
                                <th className="text-center py-1">Db</th><th className="text-center py-1">Sor össz.</th>
                              </tr></thead><tbody>
                                {c.measurements.map((m, mi) => (
                                  <tr key={m.id} className="border-b border-green-100">
                                    <td className="py-1 text-gray-500">{mi + 1}.</td>
                                    <td className="py-1 text-gray-500">{formatDateTime(m.created_at)}</td>
                                    <td className="py-1 text-center">{m.nagyhal > 0 ? <span className="text-green-700 font-bold">{m.nagyhal} g</span> : '-'}</td>
                                    <td className="py-1 text-center">{m.aprohal > 0 ? <span className="text-blue-700 font-bold">{m.aprohal} g</span> : '-'}</td>
                                    <td className="py-1 text-center">{m.darabszam > 0 ? <span className="text-purple-700 font-bold">{m.darabszam}</span> : '-'}</td>
                                    <td className="py-1 text-center font-bold text-yellow-700">{m.nagyhal + m.aprohal} g</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot><tr className="border-t-2 border-green-300 font-bold">
                                <td colSpan={2} className="py-1">Összesen:</td>
                                <td className="py-1 text-center text-green-700">{c.totalNagyhal} g</td>
                                <td className="py-1 text-center text-blue-700">{c.totalAprohal} g</td>
                                <td className="py-1 text-center text-purple-700">{c.totalDarabszam}</td>
                                <td className="py-1 text-center text-yellow-700">{c.mindosszesen} g</td>
                              </tr></tfoot>
                            </table>
                          </div>
                          </td></tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                {competitors.length === 0 && <div className="text-center py-8 text-gray-400"><Fish className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">Még nincsenek versenyzők.</p></div>}
              </div>
            </div>
          )}

          <ResultsPanel res={results} showAllResults={showAllResults} setShowAllResults={setShowAllResults} />
          {user && <VisitorStats pageViews={pageViews} loadPageViews={loadPageViews} />}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // NÉZET: FŐOLDAL
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      {/* Regisztrációs modal */}
      {registrationModal && (
        <RegistrationModal
          competitionId={registrationModal}
          onClose={() => setRegistrationModal(null)}
          onSubmit={submitRegistration}
        />
      )}

      {/* Login modal */}
      {showLoginModal && !user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Admin Bejelentkezés</h2>
              <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email cím</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none" placeholder="admin@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Jelszó</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none" placeholder="••••••••" />
              </div>
              {loginError && <div className="bg-red-100 border-2 border-red-400 text-red-700 px-3 py-2 rounded-xl text-sm">{loginError}</div>}
              <button onClick={handleLogin} disabled={loading}
                className="w-full bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 font-bold disabled:bg-gray-400">
                {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareToast && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2"><CheckCircle className="w-5 h-5" />Link másolva!</div>}

      {/* Hero sáv */}
      <div className="bg-gradient-to-r from-green-700 to-teal-600 text-white px-4 py-6 shadow-xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 rounded-full p-2">
                <Fish className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Horgászverseny</h1>
                <p className="text-green-200 text-xs mt-0.5">Eredmények és versenykiírások</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleShare} className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"><Share2 className="w-4 h-4" /></button>
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5">
        <DbErrorBanner dbError={dbError} setDbError={setDbError} />

        {user && renderAdminInfoEditor()}

        {/* Admin: Új verseny gomb */}
        {user && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => setView('list')} className="flex-1 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:border-gray-300 shadow-sm">
              <FolderOpen className="w-4 h-4" />Versenyek kezelése
            </button>
            <button onClick={createNewCompetition} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 shadow">
              <Plus className="w-4 h-4" />Új verseny
            </button>
          </div>
        )}

        {/* Aktív versenyek csoportosítva */}
        {groupedCompetitions.active.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Aktuális versenyek</h2>
            </div>
            {groupedCompetitions.active.map((group, gi) => (
              <EventCard
                key={gi}
                eventName={group.name}
                competitions={group.comps}
                onGoToResults={() => setView('list')}
                isArchived={false}
                user={user}
                onRegister={handleRegistration}
              />
            ))}
          </div>
        )}

        {/* Korábbi versenyek csoportosítva */}
        {groupedCompetitions.archived.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 mt-2">
              <Archive className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Korábbi versenyek</h2>
            </div>
            {groupedCompetitions.archived.map((group, gi) => (
              <EventCard
                key={gi}
                eventName={group.name}
                competitions={group.comps}
                onGoToResults={() => setView('list')}
                isArchived={true}
                user={user}
                onRegister={handleRegistration}
              />
            ))}
          </div>
        )}

        {competitions.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <Fish className="w-14 h-14 mx-auto mb-4 text-green-300" />
            <p className="text-gray-500">Hamarosan indul a következő verseny!</p>
          </div>
        )}

        {user && <VisitorStats pageViews={pageViews} loadPageViews={loadPageViews} />}
      </div>
    </div>
  );
}
