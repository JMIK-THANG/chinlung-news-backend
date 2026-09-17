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
      'Articles'
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

ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_category_check;
ALTER TABLE news_articles ADD CONSTRAINT news_articles_category_check CHECK (
  category IN ('Chin News', 'Myanmar News', 'International News', 'Sports', 'Business', 'Articles')
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
