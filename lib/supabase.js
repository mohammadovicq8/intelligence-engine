import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const getUserProfile = async (userId) => {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
};

export const incrementAnalysisCount = async (userId) => {
  const { data } = await supabaseAdmin.from('profiles').select('analysis_count').eq('id', userId).single();
  await supabaseAdmin.from('profiles').update({ analysis_count: (data?.analysis_count || 0) + 1 }).eq('id', userId);
};

export const saveAnalysis = async (userId, analysisData) => {
  const { data, error } = await supabaseAdmin.from('analyses').insert([{ user_id: userId, ...analysisData }]).select().single();
  if (error) return null;
  return data;
};

export const getUserAnalyses = async (userId) => {
  const { data, error } = await supabaseAdmin.from('analyses').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) return [];
  return data;
};

export const FREE_LIMIT = 3;

export const canRunAnalysis = async (userId) => {
  const profile = await getUserProfile(userId);
  if (!profile) return false;
  if (profile.tier === 'pro' || profile.tier === 'elite') return true;
  return profile.analysis_count < FREE_LIMIT;
};
