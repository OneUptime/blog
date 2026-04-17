# How to Create Named Collections in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Named Collection, Configuration, Security

Description: Learn how to use CREATE NAMED COLLECTION in ClickHouse to store reusable credentials and configuration for table functions and engines securely.

---

Named collections in ClickHouse let you store a set of key-value pairs - typically connection credentials and configuration - under a single name. This avoids hardcoding sensitive information in SQL statements and makes it easy to share connection details across multiple tables or queries.

## CREATE NAMED COLLECTION Syntax

```sql
CREATE NAMED COLLECTION [IF NOT EXISTS] name
    [ON CLUSTER cluster]
    AS
    key1 = value1 [OVERRIDABLE | NOT OVERRIDABLE],
    key2 = value2 [OVERRIDABLE | NOT OVERRIDABLE],
    ...
```

The `OVERRIDABLE` keyword allows callers to override a key's value at query time. `NOT OVERRIDABLE` locks the value and prevents any override.

## Basic Examples

```sql
-- S3 credentials
CREATE NAMED COLLECTION my_s3
AS
    access_key_id     = 'AKIAIOSFODNN7EXAMPLE'  NOT OVERRIDABLE,
    secret_access_key = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' NOT OVERRIDABLE,
    region            = 'us-east-1' OVERRIDABLE;

-- PostgreSQL connection
CREATE NAMED COLLECTION my_postgres
AS
    host     = 'pg.internal.example.com' NOT OVERRIDABLE,
    port     = '5432'                    NOT OVERRIDABLE,
    database = 'analytics'               OVERRIDABLE,
    user     = 'clickhouse_reader'       NOT OVERRIDABLE,
    password = 'secret'                  NOT OVERRIDABLE;
```

## Using Named Collections in Table Functions

Once a named collection is defined, pass its name as the first argument to a table function:

```sql
-- Use named collection in the s3() table function
SELECT count()
FROM s3(my_s3, url = 's3://my-bucket/data/2024/*.parquet', format = 'Parquet');

-- Override an OVERRIDABLE key at query time
SELECT *
FROM s3(my_s3, url = 's3://other-bucket/file.csv', format = 'CSV', region = 'eu-west-1');

-- Use named collection in postgresql() table function
SELECT *
FROM postgresql(my_postgres, table = 'orders');
```

## Using Named Collections in Table Engines

Named collections work with CREATE TABLE when using engines like S3, PostgreSQL, MySQL, and others:

```sql
-- S3 table engine with named collection
CREATE TABLE raw_events
ENGINE = S3(my_s3, url = 's3://events-bucket/raw/*.parquet', format = 'Parquet');

-- PostgreSQL engine with named collection
CREATE TABLE pg_orders
ENGINE = PostgreSQL(my_postgres, table = 'orders');

-- MySQL engine with named collection
CREATE NAMED COLLECTION my_mysql
AS
    host     = 'mysql.internal.example.com' NOT OVERRIDABLE,
    port     = '3306'                        NOT OVERRIDABLE,
    database = 'store'                       OVERRIDABLE,
    user     = 'reader'                      NOT OVERRIDABLE,
    password = 'pass'                        NOT OVERRIDABLE;

CREATE TABLE mysql_products
ENGINE = MySQL(my_mysql, table = 'products');
```

## ACCESS MANAGEMENT and Permissions

Named collection access is controlled by ClickHouse's access management system. Grant or revoke rights to named collections:

```sql
-- Grant a user the ability to use a named collection
GRANT NAMED COLLECTION ON my_s3 TO alice;

-- Grant access to all named collections
GRANT NAMED COLLECTION ON * TO etl_role;

-- Revoke access
REVOKE NAMED COLLECTION ON my_s3 FROM alice;

-- Allow a user to manage (create/drop/alter) named collections
GRANT CREATE NAMED COLLECTION ON * TO admin_user;
GRANT DROP NAMED COLLECTION ON * TO admin_user;
```

## Altering Named Collections

```sql
-- Add or update keys
ALTER NAMED COLLECTION my_s3
    SET region = 'ap-southeast-1' OVERRIDABLE;

-- Remove keys
ALTER NAMED COLLECTION my_postgres
    DELETE database;
```

## Viewing Named Collections

```sql
-- List all named collections (values are hidden)
SHOW NAMED COLLECTIONS;

-- Show definition including keys (requires privilege)
SHOW CREATE NAMED COLLECTION my_s3;

-- Query the system table
SELECT name, collection
FROM system.named_collections;
```

## Dropping Named Collections

```sql
DROP NAMED COLLECTION IF EXISTS my_s3;
DROP NAMED COLLECTION IF EXISTS my_postgres;
```

## Complete Practical Example

```sql
-- Create a named collection for a remote ClickHouse cluster
CREATE NAMED COLLECTION remote_ch
AS
    host     = 'clickhouse-replica.example.com' NOT OVERRIDABLE,
    port     = '9000'                            NOT OVERRIDABLE,
    database = 'default'                         OVERRIDABLE,
    user     = 'sync_user'                       NOT OVERRIDABLE,
    password = 'sync_pass'                       NOT OVERRIDABLE;

-- Use in remoteSecure() table function
SELECT count()
FROM remoteSecure(remote_ch, database = 'logs', table = 'events');

-- Create a Kafka named collection
CREATE NAMED COLLECTION kafka_prod
AS
    kafka_broker_list         = 'kafka1:9092,kafka2:9092' NOT OVERRIDABLE,
    kafka_topic_list          = 'app_events'              OVERRIDABLE,
    kafka_group_name          = 'clickhouse_consumer'     OVERRIDABLE,
    kafka_format              = 'JSONEachRow'              OVERRIDABLE;

CREATE TABLE kafka_app_events
ENGINE = Kafka(kafka_prod, kafka_topic_list = 'app_events', kafka_group_name = 'ch_group');
```

## Summary

Named collections centralize connection credentials and configuration as reusable, named objects. They reduce credential sprawl across DDL statements, support fine-grained access control via `GRANT`/`REVOKE`, and let administrators lock sensitive keys with `NOT OVERRIDABLE` while allowing flexible keys to be overridden at query time. They are supported by S3, PostgreSQL, MySQL, Kafka, and other engines and table functions.
