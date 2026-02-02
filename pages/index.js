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
