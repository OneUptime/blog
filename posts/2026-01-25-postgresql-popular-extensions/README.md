# How to Extend PostgreSQL with Popular Extensions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Extensions, PostGIS, pg_stat_statements, TimescaleDB, Performance

Description: Discover the most useful PostgreSQL extensions for production databases. This guide covers essential extensions for monitoring, full-text search, geographic data, time-series, and more with practical examples.

---

PostgreSQL's extensibility is one of its greatest strengths. Extensions add capabilities that would otherwise require separate specialized databases. Need geographic queries? There is PostGIS. Time-series data? TimescaleDB. Full-text search? Built in, but extensions make it better. Here are the extensions every PostgreSQL administrator should know.

## Managing Extensions

### Installing Extensions

```sql
-- List available extensions
SELECT * FROM pg_available_extensions ORDER BY name;

-- Install an extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Check installed extensions
SELECT extname, extversion FROM pg_extension;

-- Upgrade extension to latest version
ALTER EXTENSION pg_stat_statements UPDATE;

-- Remove extension
DROP EXTENSION pg_stat_statements;
```

### Extension Location

Extensions must be installed at the OS level before `CREATE EXTENSION` works.

```bash
# Debian/Ubuntu
sudo apt-get install postgresql-16-postgis-3

# RHEL/CentOS
sudo dnf install postgis34_16

# Then in psql
CREATE EXTENSION postgis;
```

## pg_stat_statements: Query Performance Analysis

This is the single most important extension for performance tuning.

```sql
-- Enable in postgresql.conf
-- shared_preload_libraries = 'pg_stat_statements'

CREATE EXTENSION pg_stat_statements;

-- Find slowest queries
SELECT
    substring(query, 1, 80) AS query,
    calls,
    ROUND(total_exec_time::numeric / 1000, 2) AS total_sec,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND((100.0 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS pct
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Find queries with most I/O
SELECT
    substring(query, 1, 80) AS query,
    calls,
    shared_blks_read + shared_blks_hit AS total_blocks,
    ROUND(100.0 * shared_blks_hit / NULLIF(shared_blks_read + shared_blks_hit, 0), 2) AS hit_pct
FROM pg_stat_statements
ORDER BY shared_blks_read DESC
LIMIT 20;

-- Reset statistics
SELECT pg_stat_statements_reset();
```

## pgcrypto: Encryption Functions

Essential for handling sensitive data.

```sql
CREATE EXTENSION pgcrypto;

-- Generate secure random bytes
SELECT encode(gen_random_bytes(32), 'hex') AS api_key;

-- Generate UUID v4
SELECT gen_random_uuid();

-- Hash passwords with bcrypt
INSERT INTO users (email, password_hash)
VALUES ('user@example.com', crypt('password123', gen_salt('bf', 10)));

-- Verify password
SELECT *
FROM users
WHERE email = 'user@example.com'
  AND password_hash = crypt('password123', password_hash);

-- Symmetric encryption
-- Encrypt
SELECT encode(
    encrypt('sensitive data', 'secret_key', 'aes'),
    'base64'
) AS encrypted;

-- Decrypt
SELECT convert_from(
    decrypt(
        decode('encrypted_base64_string', 'base64'),
        'secret_key',
        'aes'
    ),
    'UTF8'
) AS decrypted;
```

## uuid-ossp: UUID Generation

Standard UUID generation (though `pgcrypto` has `gen_random_uuid()` for v4).

```sql
CREATE EXTENSION "uuid-ossp";

-- Generate different UUID versions
SELECT uuid_generate_v1();    -- Time-based
SELECT uuid_generate_v4();    -- Random
SELECT uuid_generate_v1mc();  -- Time-based with random MAC

-- Use as primary key
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    total DECIMAL(10,2)
);
```

## PostGIS: Geographic Data

The most powerful open-source GIS database extension.

```sql
CREATE EXTENSION postgis;

-- Create table with geography column
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326)
);

-- Insert location data
INSERT INTO stores (name, location)
VALUES
    ('Downtown Store', ST_MakePoint(-122.4194, 37.7749)),
    ('Airport Store', ST_MakePoint(-122.3750, 37.6213));

-- Find stores within 10km of a point
SELECT name,
       ST_Distance(
           location,
           ST_MakePoint(-122.4000, 37.7800)::geography
       ) / 1000 AS distance_km
FROM stores
WHERE ST_DWithin(
    location,
    ST_MakePoint(-122.4000, 37.7800)::geography,
    10000  -- 10km in meters
)
ORDER BY distance_km;

-- Create spatial index
CREATE INDEX idx_stores_location ON stores USING gist(location);
```

## pg_trgm: Fuzzy Text Search

Trigram-based similarity search for typo-tolerant queries.

```sql
CREATE EXTENSION pg_trgm;

-- Create index for similarity searches
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- Find similar product names (handles typos)
SELECT name, similarity(name, 'Laptop') AS sim
FROM products
WHERE similarity(name, 'Laptop') > 0.3
ORDER BY sim DESC;

-- Fuzzy search with LIKE acceleration
SELECT name
FROM products
WHERE name ILIKE '%lapt%';

-- Word similarity (matches word boundaries better)
SELECT name, word_similarity('laptop', name) AS sim
FROM products
WHERE word_similarity('laptop', name) > 0.4;
```

## hstore: Key-Value Storage

Flexible key-value pairs within a column.

```sql
CREATE EXTENSION hstore;

-- Create table with hstore column
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    attributes HSTORE
);

-- Insert data
INSERT INTO products (name, attributes)
VALUES (
    'Laptop',
    'brand => "Dell", ram => "16GB", storage => "512GB SSD"'
);

-- Query by key
SELECT name, attributes -> 'brand' AS brand
FROM products
WHERE attributes -> 'ram' = '16GB';

-- Check if key exists
SELECT name
FROM products
WHERE attributes ? 'storage';

-- Index hstore columns
CREATE INDEX idx_products_attrs ON products USING gin(attributes);
```

## citext: Case-Insensitive Text

No more LOWER() comparisons everywhere.

```sql
CREATE EXTENSION citext;

-- Use citext for email addresses
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email CITEXT UNIQUE NOT NULL
);

INSERT INTO users (email) VALUES ('User@Example.com');

-- Case-insensitive lookup without LOWER()
SELECT * FROM users WHERE email = 'user@example.com';  -- Matches!
```

## pg_cron: Scheduled Jobs

Run scheduled tasks directly in PostgreSQL.

```sql
-- Requires shared_preload_libraries = 'pg_cron'
CREATE EXTENSION pg_cron;

-- Schedule vacuum at 3 AM daily
SELECT cron.schedule('nightly-vacuum', '0 3 * * *', 'VACUUM ANALYZE');

-- Delete old audit logs weekly
SELECT cron.schedule(
    'cleanup-audit',
    '0 4 * * 0',  -- 4 AM every Sunday
    $$DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days'$$
);

-- Refresh materialized view every hour
SELECT cron.schedule(
    'refresh-stats',
    '0 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY daily_stats'
);

-- List scheduled jobs
SELECT * FROM cron.job;

-- Remove a scheduled job
SELECT cron.unschedule('cleanup-audit');
```

## pg_repack: Online Table Reorganization

Reclaim space without locking the table.

```bash
# Install
sudo apt-get install postgresql-16-repack
```

```sql
CREATE EXTENSION pg_repack;
```

```bash
# Reorganize a bloated table without downtime
pg_repack -d mydb -t orders

# Reorganize specific index
pg_repack -d mydb -i idx_orders_date

# Reorganize entire database
pg_repack -d mydb
```

## TimescaleDB: Time-Series Data

Turns PostgreSQL into a time-series powerhouse.

```sql
-- Install and enable
CREATE EXTENSION timescaledb;

-- Create regular table first
CREATE TABLE metrics (
    time TIMESTAMPTZ NOT NULL,
    device_id TEXT NOT NULL,
    cpu_usage DOUBLE PRECISION,
    memory_usage DOUBLE PRECISION
);

-- Convert to hypertable (partitioned by time automatically)
SELECT create_hypertable('metrics', 'time', chunk_time_interval => INTERVAL '1 day');

-- Insert data normally
INSERT INTO metrics VALUES (NOW(), 'server-1', 45.2, 67.8);

-- Query with time-series functions
SELECT
    time_bucket('1 hour', time) AS hour,
    device_id,
    AVG(cpu_usage) AS avg_cpu,
    MAX(memory_usage) AS max_memory
FROM metrics
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY hour, device_id
ORDER BY hour DESC;

-- Automatic data retention
SELECT add_retention_policy('metrics', INTERVAL '30 days');

-- Compression policy
SELECT add_compression_policy('metrics', INTERVAL '7 days');
```

## postgres_fdw: Foreign Data Wrapper

Query other PostgreSQL databases as if they were local tables.

```sql
CREATE EXTENSION postgres_fdw;

-- Create server connection
CREATE SERVER remote_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'remote.example.com', dbname 'analytics', port '5432');

-- Create user mapping
CREATE USER MAPPING FOR local_user
    SERVER remote_server
    OPTIONS (user 'remote_user', password 'password');

-- Import foreign table
CREATE FOREIGN TABLE remote_orders (
    id INTEGER,
    customer_id INTEGER,
    total DECIMAL(10,2),
    created_at TIMESTAMPTZ
)
SERVER remote_server
OPTIONS (schema_name 'public', table_name 'orders');

-- Query remote data as if local
SELECT * FROM remote_orders WHERE created_at > '2026-01-01';
```

## pgvector: Vector Similarity Search

Essential for AI/ML applications and semantic search.

```sql
CREATE EXTENSION vector;

-- Create table with vector column
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding VECTOR(1536)  -- OpenAI embedding dimension
);

-- Create index for fast similarity search
CREATE INDEX idx_documents_embedding ON documents
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Find similar documents
SELECT id, content,
       1 - (embedding <=> query_embedding) AS similarity
FROM documents, (SELECT embedding AS query_embedding FROM documents WHERE id = 1) q
ORDER BY embedding <=> query_embedding
LIMIT 10;

-- Semantic search with embedding from application
SELECT id, content
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

## Extension Compatibility Matrix

| Extension | Min PG Version | Use Case |
|-----------|----------------|----------|
| pg_stat_statements | 9.4 | Query performance |
| pgcrypto | 8.4 | Encryption |
| PostGIS | 9.6 | Geographic data |
| pg_trgm | 8.4 | Fuzzy search |
| TimescaleDB | 12 | Time-series |
| pgvector | 11 | AI/ML embeddings |
| pg_cron | 10 | Scheduled jobs |

## Checking Extension Impact

```sql
-- Memory usage by extension
SELECT
    e.extname,
    pg_size_pretty(sum(pg_relation_size(c.oid))) AS size
FROM pg_extension e
JOIN pg_depend d ON d.refobjid = e.oid
JOIN pg_class c ON c.oid = d.objid
WHERE c.relkind IN ('r', 'i')
GROUP BY e.extname
ORDER BY sum(pg_relation_size(c.oid)) DESC;
```

---

PostgreSQL extensions transform a general-purpose database into a specialized tool for your exact needs. Start with `pg_stat_statements` for performance visibility, add domain-specific extensions as needed, and you will have a database that rivals purpose-built alternatives while keeping everything in one place.
