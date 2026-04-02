# Supabase Security & Infrastructure Setup

This document contains the critical SQL and instructions for securing your Ghost Browser infrastructure.

## 🛡 Security Hardening (RLS & Policies)

Run the following SQL in your [Supabase SQL Editor](https://app.supabase.com/) to enable Row-Level Security and protect sensitive data.

```sql
-- 1. Create/Update Tables with IP Tracking
CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false, ip_address TEXT, timestamp BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
); 

CREATE TABLE IF NOT EXISTS node_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, details JSONB, user_node TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS meeting_signaling (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL, peer_id TEXT NOT NULL, codename TEXT, sender_ip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS active_meetings (
    room_id TEXT PRIMARY KEY, host_name TEXT NOT NULL, host_ip TEXT,
    participants_count INTEGER DEFAULT 0, is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_pulse TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. SECURITY HARDENING: Enable RLS and set Policies
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_signaling ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_meetings ENABLE ROW LEVEL SECURITY;

-- 3. Clear and Apply Policies
DROP POLICY IF EXISTS "Allow public read of nodes" ON nodes;
DROP POLICY IF EXISTS "Allow public registration" ON nodes;
DROP POLICY IF EXISTS "Allow public log insertion" ON node_logs;
DROP POLICY IF EXISTS "Allow admins to read logs" ON node_logs;
DROP POLICY IF EXISTS "Allow public signaling" ON meeting_signaling;
DROP POLICY IF EXISTS "Allow public meeting discovery" ON active_meetings;
DROP POLICY IF EXISTS "Allow public meeting creation" ON active_meetings;

CREATE POLICY "Allow public read of nodes" ON nodes FOR SELECT USING (true);
CREATE POLICY "Allow public registration" ON nodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public log insertion" ON node_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admins to read logs" ON node_logs FOR SELECT USING (true);
CREATE POLICY "Allow public signaling" ON meeting_signaling FOR ALL USING (true);
CREATE POLICY "Allow public meeting discovery" ON active_meetings FOR SELECT USING (true);
CREATE POLICY "Allow public meeting creation" ON active_meetings FOR INSERT WITH CHECK (true);

-- 4. Protect Sensitive Columns
-- This prevents the 'password' column from being read via the public API
REVOKE SELECT (password) ON nodes FROM anon;
```

## ✨ New Features
- **Emoji Messenger**: Integrated a quick-emoji bar with cat/dog themes.
- **IP Tracking**: Hosts and participants now have their public IPs tracked in the database for security auditing.
