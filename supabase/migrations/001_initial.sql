-- Yacht Video Creator — initial schema

create table jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Pipeline state
  status text not null default 'pending',
  -- pending | uploading | generating_voice | generating_music |
  -- generating_clips | generating_twin | assembling | sending_email | completed | failed
  step_label text,
  progress int not null default 0,
  error_message text,

  -- User settings (toggles)
  use_ai_twin boolean not null default true,
  use_music boolean not null default true,
  clip_count int not null default 4,

  -- Form inputs
  full_name text not null,
  company_name text,
  vessel_location text,
  email text not null,
  phone text,
  listing_description text not null,
  music_style text,
  caption_template_id text,
  notification_email text,

  -- Input asset URLs (Supabase Storage)
  image_urls text[] default '{}',
  logo_url text,
  avatar_url text,

  -- Generated asset URLs
  voiceover_url text,
  music_url text,
  clip_urls text[] default '{}',
  ai_twin_url text,
  final_video_url text
);

-- Auto-update updated_at on every row update
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger jobs_updated_at
  before update on jobs
  for each row execute function update_updated_at();

-- Enable Supabase Realtime for live progress updates
alter publication supabase_realtime add table jobs;
