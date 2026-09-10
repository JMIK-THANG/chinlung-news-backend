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
      'Business'
    )
  ),
  author VARCHAR(100) NOT NULL,
  image_url TEXT,
  image_alt VARCHAR(250),
  status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (
    status IN ('draft', 'published')
  ),
  is_top_story BOOLEAN NOT NULL DEFAULT FALSE,
  views INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
