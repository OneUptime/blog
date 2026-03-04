# How to Enable and Use PostgreSQL Extensions in Azure Database for PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PostgreSQL, Extensions, PostGIS, pg_stat_statements, Flexible Server, Database Features

Description: A guide to enabling and using PostgreSQL extensions in Azure Database for PostgreSQL Flexible Server including PostGIS, pg_stat_statements, and more.

---

One of PostgreSQL's greatest strengths is its extension ecosystem. Extensions let you add functionality to your database without forking the source code or writing custom C modules. Need geospatial queries? PostGIS. Full-text search in multiple languages? pg_trgm. Query performance tracking? pg_stat_statements. Azure Database for PostgreSQL Flexible Server supports a wide range of these extensions, and enabling them is straightforward.

This post covers which extensions are available, how to enable them, and practical examples of the most useful ones.

## How Extensions Work in Flexible Server

In a managed service, you cannot install arbitrary extensions from source. Azure whitelists a curated set of extensions that are tested and supported. To use an extension, you typically need to:

1. Allowlist it in the server parameters (for some extensions).
2. Run `CREATE EXTENSION` in the database where you want to use it.

Some extensions are preloaded automatically, while others need to be added to the `shared_preload_libraries` parameter and require a server restart.

## Listing Available Extensions

Connect to your server and check what is available:

```sql
-- List all available extensions and their versions
SELECT name, default_version, installed_version, comment
FROM pg_available_extensions
ORDER BY name;
```

To see only installed extensions:

```sql
-- List currently installed extensions
SELECT extname, extversion
FROM pg_extension
ORDER BY extname;
```

## Commonly Used Extensions

Here are the extensions I find myself enabling on almost every PostgreSQL deployment.

### pg_stat_statements - Query Performance Tracking

This is the single most useful extension for performance monitoring. It tracks execution statistics for all SQL statements.

First, add it to shared preload libraries:

```bash
# Add pg_stat_statements to shared_preload_libraries
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name shared_preload_libraries \
  --value pg_stat_statements
```

This requires a server restart:

```bash
# Restart the server to load the library
az postgres flexible-server restart \
  --resource-group myResourceGroup \
  --name my-pg-server
```

Then enable it in your database:

```sql
-- Create the extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

Now you can query performance statistics:

```sql
-- Find the top 10 queries by total execution time
SELECT
    substring(query, 1, 100) AS short_query,
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Find queries with the worst average execution time
SELECT
    substring(query, 1, 100) AS short_query,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_time_ms
FROM pg_stat_statements
WHERE calls > 100  -- Only queries called more than 100 times
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### PostGIS - Geospatial Queries

PostGIS adds geographic object support and spatial functions to PostgreSQL. Essential for any application that works with location data.

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create a table with a geography column
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    location GEOGRAPHY(POINT, 4326)  -- WGS84 coordinate system
);

-- Insert a store location (longitude, latitude)
INSERT INTO stores (name, location)
VALUES ('Downtown Store', ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326));

-- Find all stores within 5 km of a point
SELECT name, ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(-73.9800, 40.7500), 4326)::geography
) AS distance_meters
FROM stores
WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(-73.9800, 40.7500), 4326)::geography,
    5000  -- 5000 meters = 5 km
)
ORDER BY distance_meters;
```

### uuid-ossp - UUID Generation

For generating UUIDs as primary keys:

```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Use it in table definitions
CREATE TABLE events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert without specifying ID - UUID is generated automatically
INSERT INTO events (event_name) VALUES ('user_signup');
```

PostgreSQL 13+ also has the built-in `gen_random_uuid()` function, but uuid-ossp gives you more UUID version options.

### pgcrypto - Cryptographic Functions

For hashing passwords or encrypting data:

```sql
-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash a password with bcrypt
SELECT crypt('my_password', gen_salt('bf', 12));

-- Verify a password against a hash
SELECT (crypt('my_password', stored_hash) = stored_hash) AS password_valid
FROM users
WHERE username = 'alice';

-- Generate a random token
SELECT encode(gen_random_bytes(32), 'hex') AS api_token;
```

### pg_trgm - Trigram Matching for Fuzzy Search

Enables similarity-based text search:

```sql
-- Enable trigram matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a trigram index for fast similarity searches
CREATE INDEX idx_products_name_trgm
ON products USING GIN (name gin_trgm_ops);

-- Find products with names similar to a search term
-- Handles typos and partial matches
SELECT name, similarity(name, 'postgrsql') AS sim
FROM products
WHERE similarity(name, 'postgrsql') > 0.3
ORDER BY sim DESC;

-- Use the % operator for trigram similarity
SELECT name FROM products
WHERE name % 'postgrsql';
```

### hstore - Key-Value Storage

For storing key-value pairs in a single column:

```sql
-- Enable hstore
CREATE EXTENSION IF NOT EXISTS hstore;

-- Create a table with an hstore column
CREATE TABLE product_attributes (
    product_id INT,
    attrs HSTORE
);

-- Insert key-value data
INSERT INTO product_attributes
VALUES (1, 'color => red, size => large, weight => 2.5kg');

-- Query specific keys
SELECT attrs -> 'color' AS color
FROM product_attributes
WHERE product_id = 1;

-- Find products with a specific attribute
SELECT product_id
FROM product_attributes
WHERE attrs ? 'color'
  AND attrs -> 'color' = 'red';
```

### pg_partman - Automated Table Partitioning

For managing time-based or serial-based partitions:

```sql
-- Enable pg_partman
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- Create a partitioned table
CREATE TABLE events (
    id BIGSERIAL,
    event_type VARCHAR(50),
    payload JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Set up automatic monthly partitioning
SELECT partman.create_parent(
    p_parent_table := 'public.events',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := '1 month',
    p_premake := 3  -- Create 3 future partitions
);
```

## Allowlisting Extensions

Some extensions need to be explicitly allowed before you can create them. Check the `azure.extensions` parameter:

```bash
# View currently allowed extensions
az postgres flexible-server parameter show \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name azure.extensions

# Add extensions to the allowlist
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name azure.extensions \
  --value "pg_stat_statements,postgis,uuid-ossp,pgcrypto,pg_trgm,hstore"
```

## Extensions Requiring shared_preload_libraries

Some extensions must be loaded at server startup. These require adding them to `shared_preload_libraries` and restarting the server:

- `pg_stat_statements`
- `pg_cron`
- `pg_partman_bgw`
- `auto_explain`
- `pg_qs` (Query Store)

```bash
# Add multiple libraries to shared_preload_libraries
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name shared_preload_libraries \
  --value "pg_stat_statements,pg_cron,auto_explain"

# Restart required
az postgres flexible-server restart \
  --resource-group myResourceGroup \
  --name my-pg-server
```

## Updating Extensions

When Azure supports a new version of an extension, you can update:

```sql
-- Check available update versions
SELECT name, installed_version, default_version
FROM pg_available_extensions
WHERE installed_version IS NOT NULL
  AND installed_version != default_version;

-- Update an extension to the latest available version
ALTER EXTENSION pg_stat_statements UPDATE;
ALTER EXTENSION postgis UPDATE;
```

## Removing Extensions

If you no longer need an extension:

```sql
-- Remove an extension and all objects that depend on it
DROP EXTENSION postgis CASCADE;

-- Or remove only if nothing depends on it
DROP EXTENSION pgcrypto;
```

Be careful with `CASCADE` - it will drop any objects (tables, columns, functions) that depend on the extension.

## Extensions Not Available

Some PostgreSQL extensions are not available in the managed service:

- Extensions that require superuser privileges or file system access.
- Custom C extensions that are not in the Azure whitelist.
- Some system-level extensions like `pg_repack` (available in some regions).

If you need an extension that is not available, check the Azure documentation for updates - the list of supported extensions grows regularly.

## Summary

PostgreSQL extensions transform a general-purpose database into a specialized tool for your exact use case. Azure Database for PostgreSQL Flexible Server supports the most popular extensions, and enabling them is a matter of a parameter change and a CREATE EXTENSION statement. Start with pg_stat_statements for performance monitoring - it is useful on every deployment. Then add domain-specific extensions like PostGIS, pg_trgm, or pgcrypto based on your application needs. The extension ecosystem is one of the strongest reasons to choose PostgreSQL, and the managed service makes it easy to take advantage of.
