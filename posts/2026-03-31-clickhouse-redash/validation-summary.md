# Validation Summary: How to Use ClickHouse with Redash

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (analytical database)
- Redash (open-source BI / visualization tool)
- Docker / Docker Compose (deployment)
- PostgreSQL (Redash metadata store)
- Redis (Redash task queue / caching)
- Python (Redash API access example)

## Sources Consulted
- Redash official Docker Compose setup: https://github.com/getredash/setup
- Redash documentation on data sources and ClickHouse integration
- ClickHouse documentation on CREATE USER, GRANT, CREATE SETTINGS PROFILE syntax: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse documentation on SummingMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse documentation on settings profiles: https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile
- ClickHouse documentation on functions (randCanonical, toYYYYMM, numbers): https://clickhouse.com/docs/en/sql-reference/functions
- Redash API documentation for query results and embedding
- Cross-referenced with other validated ClickHouse blog posts in this repository (clickhouse-streamlit-dashboards, clickhouse-create-settings-profile, clickhouse-users-access-control)

## Issues Found

### 1. Missing Celery worker service in Docker Compose
- **What was wrong:** The `worker` service in the Docker Compose file used `command: scheduler`, which only starts the Celery beat scheduler (periodic task triggering). There was no actual Celery worker service to execute queued tasks. Without a worker, scheduled queries and ad-hoc query executions would pile up in the Redis queue but never run.
- **What was changed:** Renamed the existing service from `worker` to `scheduler` (matching its actual role), and added a new `worker` service with `command: worker` to process query execution tasks.
- **Why:** A functional Redash deployment requires both `scheduler` (Celery beat for periodic tasks) and `worker` (Celery worker for task execution).

### 2. Incorrect ClickHouse data source URL for Docker setup
- **What was wrong:** The ClickHouse data source URL was configured as `http://localhost:8123`. Since Redash runs inside a Docker container, `localhost` refers to the Redash container itself, not the ClickHouse container or the host machine. This would cause a connection failure.
- **What was changed:** Updated the URL from `http://localhost:8123` to `http://clickhouse:8123`, using the Docker Compose service name for proper inter-container networking.
- **Why:** Docker Compose services communicate via their service names on the shared Docker network. The ClickHouse service is named `clickhouse` in the compose file, so Redash must use that hostname.

## Review Notes
- The blog uses `IDENTIFIED WITH plaintext_password` for the ClickHouse user, which is fine for a tutorial but should use `sha256_password` in production environments for security.
- The `docker-compose` CLI command (hyphenated) is used throughout. Modern Docker installations use `docker compose` (space-separated) as a subcommand. Both work, but users on newer Docker versions may prefer the latter.
- The `SummingMergeTree` engine sums `duration_s` (Float32), which aggregates total duration rather than average session duration. This is a data modeling choice, not a technical error, but readers should be aware that the summed value represents total seconds, not average.
- All ClickHouse SQL syntax (CREATE USER, GRANT, CREATE SETTINGS PROFILE, SummingMergeTree, array indexing, randCanonical, toYYYYMM) was verified as correct.
- The Redash API access pattern (authorization header format, response JSON structure) and embedding URL pattern are correct.
- Parameterized query syntax using `{{ parameter_name }}` is correct Redash syntax.
