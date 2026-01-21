# How to Use PostgreSQL Extensions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Extensions, PostGIS, pg_stat_statements, uuid-ossp, Modules

Description: A comprehensive guide to PostgreSQL extensions, covering installation, configuration, and practical usage of popular extensions like PostGIS, pg_stat_statements, and pgcrypto.

---

PostgreSQL extensions add powerful functionality to your database without modifying core code. This guide covers essential extensions, installation procedures, and practical usage examples.

## Prerequisites

- PostgreSQL 12+ installed
- Superuser access for extension installation
- Understanding of your specific needs

## Managing Extensions

### List Available Extensions

```sql
-- Show all available extensions
SELECT * FROM pg_available_extensions ORDER BY name;

-- Show installed extensions
SELECT * FROM pg_extension;

-- Detailed extension info
\dx
```

### Install Extension

```sql
-- Basic installation
CREATE EXTENSION extension_name;

-- Install in specific schema
CREATE EXTENSION extension_name SCHEMA myschema;

-- Install specific version
CREATE EXTENSION extension_name VERSION '1.2';

-- Update extension
ALTER EXTENSION extension_name UPDATE TO '1.3';

-- Remove extension
DROP EXTENSION extension_name;

-- Remove with dependent objects
DROP EXTENSION extension_name CASCADE;
```

### Install from OS Package

```bash
# Ubuntu/Debian - Install contrib extensions
sudo apt install postgresql-contrib-16

# Install specific extension package
sudo apt install postgresql-16-postgis-3
sudo apt install postgresql-16-pgvector

# RHEL/CentOS
sudo dnf install postgresql16-contrib
sudo dnf install postgis34_16
```

## Essential Extensions

### pg_stat_statements

Query performance monitoring:

```sql
-- Install
CREATE EXTENSION pg_stat_statements;

-- Configure in postgresql.conf
-- shared_preload_libraries = 'pg_stat_statements'
-- pg_stat_statements.track = all

-- Top queries by total time
SELECT
    substring(query, 1, 80) AS query,
    calls,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Reset statistics
SELECT pg_stat_statements_reset();
```

### uuid-ossp

UUID generation:

```sql
-- Install
CREATE EXTENSION "uuid-ossp";

-- Generate UUIDs
SELECT uuid_generate_v4();  -- Random UUID
SELECT uuid_generate_v1();  -- Time-based UUID

-- Use as default
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255)
);
```

### pgcrypto

Cryptographic functions:

```sql
-- Install
CREATE EXTENSION pgcrypto;

-- Hash passwords
SELECT crypt('my_password', gen_salt('bf'));

-- Verify password
SELECT (password_hash = crypt('my_password', password_hash)) AS valid
FROM users WHERE email = 'user@example.com';

-- Encrypt data
SELECT pgp_sym_encrypt('sensitive data', 'encryption_key');

-- Decrypt data
SELECT pgp_sym_decrypt(encrypted_column, 'encryption_key')
FROM secure_data;

-- Generate random bytes
SELECT gen_random_bytes(16);
SELECT gen_random_uuid();  -- PostgreSQL 13+
```

### hstore

Key-value store:

```sql
-- Install
CREATE EXTENSION hstore;

-- Create table with hstore column
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    attributes HSTORE
);

-- Insert data
INSERT INTO products (name, attributes)
VALUES ('Laptop', 'brand => "Dell", ram => "16GB", storage => "512GB SSD"');

-- Query by key
SELECT * FROM products WHERE attributes -> 'brand' = 'Dell';

-- Check key exists
SELECT * FROM products WHERE attributes ? 'ram';

-- Get keys/values
SELECT akeys(attributes), avals(attributes) FROM products;

-- Create index
CREATE INDEX idx_products_attr ON products USING GIN(attributes);
```

### citext

Case-insensitive text:

```sql
-- Install
CREATE EXTENSION citext;

-- Create table with citext column
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email CITEXT UNIQUE
);

-- Case-insensitive queries
INSERT INTO users (email) VALUES ('User@Example.com');
SELECT * FROM users WHERE email = 'user@example.com';  -- Matches!
```

### pg_trgm

Trigram similarity for fuzzy search:

```sql
-- Install
CREATE EXTENSION pg_trgm;

-- Similarity search
SELECT name, similarity(name, 'Postgresql') AS sim
FROM products
WHERE name % 'Postgresql'
ORDER BY sim DESC;

-- Create index for fast similarity search
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);

-- Word similarity
SELECT word_similarity('post', 'PostgreSQL database');

-- Configure threshold
SET pg_trgm.similarity_threshold = 0.3;
```

### tablefunc

Crosstab (pivot) queries:

```sql
-- Install
CREATE EXTENSION tablefunc;

-- Sample data
CREATE TABLE sales (
    product VARCHAR(50),
    quarter VARCHAR(10),
    amount NUMERIC
);

INSERT INTO sales VALUES
    ('Widget', 'Q1', 100),
    ('Widget', 'Q2', 150),
    ('Gadget', 'Q1', 200),
    ('Gadget', 'Q2', 180);

-- Pivot query
SELECT * FROM crosstab(
    'SELECT product, quarter, amount FROM sales ORDER BY 1, 2',
    'SELECT DISTINCT quarter FROM sales ORDER BY 1'
) AS ct(product VARCHAR, q1 NUMERIC, q2 NUMERIC);
```

### btree_gist

GiST index for B-tree types:

```sql
-- Install
CREATE EXTENSION btree_gist;

-- Useful for exclusion constraints
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    room_id INTEGER,
    during TSRANGE,
    EXCLUDE USING GIST (room_id WITH =, during WITH &&)
);

-- Prevents overlapping reservations for same room
INSERT INTO reservations (room_id, during)
VALUES (1, '[2025-01-21 10:00, 2025-01-21 12:00)');

INSERT INTO reservations (room_id, during)
VALUES (1, '[2025-01-21 11:00, 2025-01-21 13:00)');
-- Error: conflicting key value
```

## Specialized Extensions

### PostGIS

Geospatial support:

```sql
-- Install
CREATE EXTENSION postgis;

-- Create table with geometry
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    geom GEOMETRY(Point, 4326)
);

-- Insert point
INSERT INTO locations (name, geom)
VALUES ('Office', ST_SetSRID(ST_MakePoint(-73.935242, 40.730610), 4326));

-- Find nearby locations
SELECT name, ST_Distance(
    geom::geography,
    ST_SetSRID(ST_MakePoint(-73.94, 40.73), 4326)::geography
) AS distance_meters
FROM locations
ORDER BY distance_meters
LIMIT 10;

-- Create spatial index
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);
```

### pgvector

Vector similarity search (AI/ML):

```sql
-- Install
CREATE EXTENSION vector;

-- Create table with vector column
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding VECTOR(1536)  -- OpenAI embedding size
);

-- Insert embedding
INSERT INTO documents (content, embedding)
VALUES ('Sample text', '[0.1, 0.2, ...]');  -- 1536 dimensions

-- Similarity search
SELECT content, embedding <=> '[0.1, 0.2, ...]' AS distance
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'
LIMIT 10;

-- Create index
CREATE INDEX idx_docs_embedding ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### pg_cron

Job scheduling:

```sql
-- Install (requires shared_preload_libraries)
CREATE EXTENSION pg_cron;

-- Schedule job
SELECT cron.schedule('nightly-cleanup', '0 3 * * *',
    'DELETE FROM logs WHERE created_at < NOW() - INTERVAL ''30 days''');

-- List jobs
SELECT * FROM cron.job;

-- View job runs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Unschedule job
SELECT cron.unschedule('nightly-cleanup');
```

### pg_partman

Automatic partition management:

```sql
-- Install
CREATE EXTENSION pg_partman;

-- Create parent table
CREATE TABLE events (
    id BIGSERIAL,
    event_type VARCHAR(50),
    event_data JSONB,
    created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

-- Configure partitioning
SELECT partman.create_parent(
    'public.events',
    'created_at',
    'native',
    'monthly'
);

-- Run maintenance
SELECT partman.run_maintenance();

-- Schedule maintenance
SELECT cron.schedule('partition-maintenance', '0 1 * * *',
    'SELECT partman.run_maintenance()');
```

## Creating Custom Extensions

### Simple Extension

```sql
-- File: myext--1.0.sql
-- Custom function
CREATE OR REPLACE FUNCTION my_custom_function(text)
RETURNS text AS $$
    SELECT 'Hello, ' || $1;
$$ LANGUAGE SQL IMMUTABLE;
```

```ini
# File: myext.control
comment = 'My custom extension'
default_version = '1.0'
relocatable = true
```

```bash
# Install files to PostgreSQL extension directory
sudo cp myext--1.0.sql /usr/share/postgresql/16/extension/
sudo cp myext.control /usr/share/postgresql/16/extension/
```

```sql
-- Install custom extension
CREATE EXTENSION myext;
SELECT my_custom_function('World');
```

## Extension Dependencies

### Managing Dependencies

```sql
-- Install extension with dependencies
CREATE EXTENSION postgis_topology;  -- Requires postgis

-- Check dependencies
SELECT e.extname, d.refobjid::regclass
FROM pg_extension e
JOIN pg_depend d ON d.objid = e.oid
WHERE e.extname = 'postgis_topology';
```

## Best Practices

1. **Install in schema** - Organize extensions in dedicated schema
2. **Version control** - Track extension versions
3. **Test upgrades** - Test extension updates in staging
4. **Monitor performance** - Some extensions add overhead
5. **Review security** - Understand extension capabilities
6. **Documentation** - Document which extensions are used and why

## Common Extension Commands

```sql
-- Check extension version
SELECT extversion FROM pg_extension WHERE extname = 'postgis';

-- Check if extension is installed
SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp');

-- List extension objects
SELECT pg_describe_object(classid, objid, 0) AS object
FROM pg_depend
WHERE refclassid = 'pg_extension'::regclass
AND refobjid = (SELECT oid FROM pg_extension WHERE extname = 'pgcrypto')
LIMIT 20;
```

## Conclusion

PostgreSQL extensions provide powerful additional functionality:

1. **Query analysis** - pg_stat_statements
2. **Cryptography** - pgcrypto
3. **Geospatial** - PostGIS
4. **AI/ML** - pgvector
5. **Scheduling** - pg_cron
6. **Partitioning** - pg_partman

Choose extensions based on your specific needs and always test in a non-production environment first.
