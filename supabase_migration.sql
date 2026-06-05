-- ============================================================
-- KOLLEGE KATTA — Flawless PostgreSQL & Supabase Migration Script
-- Copy-paste this ENTIRE script into Supabase Dashboard > SQL Editor
-- Every table name, foreign key, and column is strictly lowercase.
-- ============================================================

-- ============================================================
-- 1. CLEAN DROP & TABLE CREATION
-- Drop existing structures safely in reverse dependency order
-- ============================================================

DROP TABLE IF EXISTS bazaar_listings CASCADE;
DROP TABLE IF EXISTS crush_meter CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS katta_passes CASCADE;
DROP TABLE IF EXISTS colleges CASCADE;
DROP FUNCTION IF EXISTS increment_likes(INT);

-- A. Colleges Table
CREATE TABLE colleges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    accent_color VARCHAR(7) DEFAULT '#00FF41'
);

-- B. Katta Passes Table
CREATE TABLE katta_passes (
    id SERIAL PRIMARY KEY,
    kollege_id INT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    pass_key VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- C. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kollege_id INT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    alias_name VARCHAR(100) NOT NULL,
    kollege_year VARCHAR(20) NOT NULL,
    relationship_status VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- D. Posts Table (Discussion Feed)
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kollege_id INT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('rants', 'ideas', 'gossips')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- E. Crush Meter Table (The Hotlist)
CREATE TABLE crush_meter (
    id SERIAL PRIMARY KEY,
    kollege_id INT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    target_insta_id VARCHAR(100) NOT NULL,
    anonymous_likes_count INT DEFAULT 0,
    UNIQUE(kollege_id, target_insta_id)
);

-- F. Bazaar Listings Table (Marketplace)
CREATE TABLE bazaar_listings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kollege_id INT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    item_title VARCHAR(255) NOT NULL,
    price VARCHAR(50) NOT NULL,
    contact_link TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. ATOMIC PROCEDURES
-- Optimistic real-time like increments routing
-- ============================================================

CREATE OR REPLACE FUNCTION increment_likes(row_id INT)
RETURNS VOID AS $$
BEGIN
  UPDATE crush_meter
  SET anonymous_likes_count = anonymous_likes_count + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. EXPLICIT SECURITY BYPASS
-- Disable Row Level Security globally for all entities
-- ============================================================

ALTER TABLE colleges DISABLE ROW LEVEL SECURITY;
ALTER TABLE katta_passes DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE crush_meter DISABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_listings DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. CORE DATA INJECTION
-- Baseline seed data to immediately unlock onboarding flow
-- ============================================================

INSERT INTO colleges (name, accent_color) VALUES 
('VIT Pune', '#00FF41'),
('COEP Pune', '#FF3366'),
('IIT Bombay', '#FFDD00')
ON CONFLICT DO NOTHING;

INSERT INTO katta_passes (kollege_id, pass_key, is_active) VALUES 
(1, 'vit-cygcy-66', true),
(1, 'VIT-BUNK-69', true),
(2, 'COEP-JUGAAD-01', true)
ON CONFLICT DO NOTHING;
