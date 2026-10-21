-- ====================================================================
-- PRO CRICKET 3D: SUPABASE DATABASE ARCHITECTURE & SCHEMA
-- ====================================================================

-- 1. PROFILES (Cloud Save, Currency, Progression)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    gamer_tag TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    level INT DEFAULT 1,
    experience_points INT DEFAULT 0,
    coins BIGINT DEFAULT 2500,
    gems INT DEFAULT 50,
    trophies INT DEFAULT 0,
    matches_played INT DEFAULT 0,
    matches_won INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CRICKETER CARDS (Roster Master Database)
CREATE TABLE IF NOT EXISTS public.cricketer_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    role TEXT CHECK (role IN ('Batsman', 'FastBowler', 'SpinBowler', 'AllRounder', 'WicketKeeper')),
    batting_rating INT CHECK (batting_rating BETWEEN 40 AND 99),
    bowling_rating INT CHECK (bowling_rating BETWEEN 40 AND 99),
    stamina INT DEFAULT 85,
    rarity TEXT CHECK (rarity IN ('Common', 'Rare', 'Epic', 'Legendary')),
    avatar_image TEXT
);

-- 3. USER INVENTORY (Collected & Upgraded Cricketer Cards)
CREATE TABLE IF NOT EXISTS public.user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_id UUID REFERENCES public.cricketer_cards(id) ON DELETE CASCADE,
    card_level INT DEFAULT 1,
    duplicate_shards INT DEFAULT 0,
    is_in_active_xi BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, card_id)
);

-- 4. GLOBAL LEADERBOARDS
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rank INT,
    trophies INT NOT NULL,
    total_runs INT DEFAULT 0,
    total_wickets INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (season_id, user_id)
);

-- 5. MATCH HISTORY
CREATE TABLE IF NOT EXISTS public.match_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    opponent_name TEXT NOT NULL,
    match_format TEXT CHECK (match_format IN ('2OverBlitz', '5OverSuper', 'T20Tournament')),
    user_runs INT NOT NULL,
    user_wickets INT NOT NULL,
    opponent_runs INT NOT NULL,
    opponent_wickets INT NOT NULL,
    result TEXT CHECK (result IN ('Won', 'Lost', 'Tied')),
    coins_rewarded INT DEFAULT 0,
    trophies_delta INT DEFAULT 0,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

-- Simple Policies
CREATE POLICY "Public profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
