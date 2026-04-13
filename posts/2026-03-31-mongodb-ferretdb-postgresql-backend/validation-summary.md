# Validation Summary: How to Set Up FerretDB with PostgreSQL Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- FerretDB (open-source MongoDB-compatible proxy)
- PostgreSQL 16
- Docker and Docker Compose
- MongoDB shell (mongosh)
- PyMongo (Python MongoDB driver)

## Sources Consulted
- FerretDB Configuration Flags documentation — https://docs.ferretdb.io/configuration/flags/
- FerretDB Docker Installation Guide — https://docs.ferretdb.io/installation/ferretdb/docker/
- FerretDB Pre-Migration Testing documentation — https://docs.ferretdb.io/migration/premigration-testing/
- FerretDB GitHub Repository — https://github.com/FerretDB/FerretDB

## Issues Found

### 1. Connection strings missing authentication credentials
**What was wrong:** The `mongosh` and PyMongo connection strings used `mongodb://localhost:27017/mydb` without credentials. FerretDB enables authentication by default, so connections without credentials will fail.
**What was changed:** Updated both connection strings to include the PostgreSQL username and password that FerretDB uses for auth: `mongodb://ferretdb:ferretdbpassword@localhost:27017/mydb` for mongosh and `mongodb://ferretdb:ferretdbpassword@localhost:27017/` for PyMongo.
**Why:** The official FerretDB Docker guide shows credentials in all mongosh connection examples (e.g., `mongodb://username:password@127.0.0.1/`).

### 2. `FERRETDB_LOG_FORMAT` environment variable does not exist
**What was wrong:** The logging configuration section included `FERRETDB_LOG_FORMAT: json`, but this environment variable is not a supported FerretDB configuration flag.
**What was changed:** Removed the `FERRETDB_LOG_FORMAT: json` line from the logging configuration snippet.
**Why:** The FerretDB configuration flags documentation lists `FERRETDB_LOG_LEVEL` and `FERRETDB_TELEMETRY` but does not include `FERRETDB_LOG_FORMAT`.

### 3. Fabricated compatibility test command
**What was wrong:** The post showed `docker run --rm ghcr.io/ferretdb/ferretdb-dev:latest --test.run TestCompat --postgresql-url ...` as a way to run a compatibility test suite. This command and the `ferretdb-dev` image with `--test.run` flags are not documented and do not correspond to any real FerretDB feature.
**What was changed:** Replaced with FerretDB's actual pre-migration testing approach using `--mode=diff-normal`, which proxies requests through FerretDB and compares responses against a real MongoDB instance to identify incompatibilities.
**Why:** The FerretDB pre-migration testing documentation describes `diff-normal` and `diff-proxy` operation modes as the official way to test compatibility.

## Review Notes
- The official FerretDB Docker guide now recommends `ghcr.io/ferretdb/postgres-documentdb` (PostgreSQL with Amazon DocumentDB extensions) instead of standard `postgres:16`. Standard PostgreSQL still works but offers fewer MongoDB-compatible features. The post uses `postgres:16` which is functional but may not support all MongoDB operations that the DocumentDB-enhanced image supports.
- The `version: "3.9"` key in the Docker Compose file is ignored by Docker Compose V2 and is considered obsolete. It still works but is unnecessary.
- The SQL query example (`SELECT _jsonb->>'name' FROM ferretdb.mydb."users"`) uses a three-part name (database.schema.table) which is valid in PostgreSQL only when connected to the `ferretdb` database. The internal table naming convention used by FerretDB may vary across versions.
