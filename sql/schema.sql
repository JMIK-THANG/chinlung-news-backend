CREATE TABLE IF NOT EXISTS news_articles (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug VARCHAR(180) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(40) NOT NULL CHECK (
    category IN (
      'Chin News',
      'Myanmar News',
      'International News',
      'Sports',
      'Business',
      'Articles',
      'News Article',
      'Cahram'
    )
  ),
  author VARCHAR(100) NOT NULL,
  image_url TEXT,
  image_public_id TEXT,
  image_alt VARCHAR(250),
  status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (
    status IN ('draft', 'published')
  ),
  is_top_story BOOLEAN NOT NULL DEFAULT FALSE,
  is_editor_pick BOOLEAN NOT NULL DEFAULT FALSE,
  content_type VARCHAR(20) NOT NULL DEFAULT 'news' CHECK (content_type IN ('news', 'article')),
  views INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS image_public_id TEXT;

ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) NOT NULL DEFAULT 'news';

ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS is_editor_pick BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS news_articles_editor_pick_index
  ON news_articles (is_editor_pick, published_at DESC);

ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_category_check;
ALTER TABLE news_articles ADD CONSTRAINT news_articles_category_check CHECK (
  category IN ('Chin News', 'Myanmar News', 'International News', 'Sports', 'Business', 'Articles', 'News Article', 'Cahram')
);

CREATE INDEX IF NOT EXISTS news_articles_published_at_index
  ON news_articles (published_at DESC);

CREATE INDEX IF NOT EXISTS news_articles_category_index
  ON news_articles (category);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS explainers (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug VARCHAR(180) UNIQUE NOT NULL,
  source_article_id INTEGER REFERENCES news_articles(id) ON DELETE SET NULL,
  question VARCHAR(250) NOT NULL,
  category VARCHAR(40) NOT NULL,
  read_time VARCHAR(30) NOT NULL DEFAULT '5 min read',
  introduction TEXT NOT NULL,
  takeaway TEXT NOT NULL,
  what_happened TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  what_to_watch TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS explainers_featured_index ON explainers (is_featured);

UPDATE news_articles SET
  title = REPLACE(REPLACE(REPLACE(title, 'HOLH', 'TONG'), 'Holh', 'Tong'), 'holh', 'tong'),
  summary = REPLACE(REPLACE(REPLACE(summary, 'HOLH', 'TONG'), 'Holh', 'Tong'), 'holh', 'tong'),
  content = REPLACE(REPLACE(REPLACE(content, 'HOLH', 'TONG'), 'Holh', 'Tong'), 'holh', 'tong'),
  image_alt = REPLACE(REPLACE(REPLACE(image_alt, 'HOLH', 'TONG'), 'Holh', 'Tong'), 'holh', 'tong')
WHERE title ILIKE '%holh%' OR summary ILIKE '%holh%' OR content ILIKE '%holh%' OR image_alt ILIKE '%holh%';

UPDATE explainers SET
  question = REPLACE(REPLACE(REPLACE(question, 'HOLH', 'TONG'), 'Holh', 'Tong'), 'holh', 'tong'),
  introduction = REPLACE(REPLACE(REPLACE(introduction, 'HOLH', 'TONG'), 'Holh', 'Tong'), 'holh', 'tong'),
  takeaway = REPLACE(REPLACE(REPLACE(takeaway, 'HOLH', 'TONG'), 'Holh', 'Tong'), 'holh', 'tong'),
  what_happened = REPLACE(REPLACE(REPLACE(what_happened, 'HOLH', 'TONG'), 'Holh', 'Tong'), 'holh', 'tong'),
  why_it_matters = REPLACE(REPLACE(REPLACE(why_it_matters, 'HOLH', 'TONG'), 'Holh', 'Tong'), 'holh', 'tong'),
  what_to_watch = REPLACE(REPLACE(REPLACE(what_to_watch, 'HOLH', 'TONG'), 'Holh', 'Tong'), 'holh', 'tong'),
  sections = REPLACE(REPLACE(REPLACE(sections::text, 'HOLH', 'TONG'), 'Holh', 'Tong'), 'holh', 'tong')::jsonb,
  sources = REPLACE(REPLACE(REPLACE(sources::text, 'HOLH', 'TONG'), 'Holh', 'Tong'), 'holh', 'tong')::jsonb
WHERE question ILIKE '%holh%' OR introduction ILIKE '%holh%' OR takeaway ILIKE '%holh%'
  OR what_happened ILIKE '%holh%' OR why_it_matters ILIKE '%holh%' OR what_to_watch ILIKE '%holh%'
  OR sections::text ILIKE '%holh%' OR sources::text ILIKE '%holh%';
