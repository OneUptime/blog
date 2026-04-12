# Validation Summary: How to Implement GitOps for MySQL Schema Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- Flyway 10 (migration tool)
- GitHub Actions (CI/CD)
- Docker
- GitOps workflow

## Sources Consulted
- Flyway Docker Quickstart: https://documentation.red-gate.com/fd/quickstart-docker-205226373.html
- Flyway Environment Variables: https://documentation.red-gate.com/flyway/reference/environment-variables
- Flyway Command-line Parameters: https://documentation.red-gate.com/flyway/reference/command-line-parameters
- Flyway Configuration Files: https://documentation.red-gate.com/flyway/reference/configuration/configuration-files
- GitHub Actions Service Containers: https://docs.github.com/en/actions/using-containerized-services/about-service-containers
- MySQL ALTER TABLE Documentation: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html

## Issues Found

### 1. Incorrect Docker volume mount in validate workflow
**What was wrong:** The volume mount `-v $(pwd)/db:/flyway/sql` mapped the entire `db/` directory into `/flyway/sql`, placing migration files at `/flyway/sql/migrations/V1__*.sql`. Flyway's Docker image expects migration files directly in `/flyway/sql/`.
**What was changed:** Fixed to `-v $(pwd)/db/migrations:/flyway/sql` so migration files are placed directly in the expected location.

### 2. Non-standard environment variables in validate workflow
**What was wrong:** The Docker commands passed custom environment variables (`MYSQL_HOST`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`) that Flyway does not recognize natively. Without a mounted `flyway.conf` to reference them via `${}` substitution, Flyway would have no connection details and would fail.
**What was changed:** Replaced with Flyway's native environment variables (`FLYWAY_URL`, `FLYWAY_USER`, `FLYWAY_PASSWORD`) which Flyway automatically picks up without any config file.

### 3. Missing volume mount in validate info step
**What was wrong:** The "Verify migration status" step did not mount the migrations directory, so Flyway could not locate migration files for the `info` command.
**What was changed:** Added `-v $(pwd)/db/migrations:/flyway/sql` to the info step.

### 4. Deploy workflow used bare `flyway migrate` without Flyway installed
**What was wrong:** Both deploy jobs called `flyway migrate` directly on the runner, but Flyway is not pre-installed on GitHub Actions `ubuntu-latest` runners. The commands would fail with "command not found".
**What was changed:** Replaced bare `flyway migrate` with Docker-based execution using `flyway/flyway:10`, consistent with the validate workflow.

### 5. Production deploy job missing secrets
**What was wrong:** The production deploy job only set `MYSQL_HOST` in env but was missing `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD`. The migration would fail due to missing connection credentials.
**What was changed:** Added all required secrets (`PROD_MYSQL_DB`, `PROD_MYSQL_USER`, `PROD_MYSQL_PASSWORD`) using Flyway's native environment variables.

## Review Notes
- The `flyway.conf` file in the repository structure uses `${MYSQL_HOST}` style variable substitution which is valid for Flyway's config file format, but is not used by the CI workflows (they use Docker with native Flyway env vars). This is fine for local development use.
- The Flyway naming convention (`V{version}__{description}.sql` with double underscores) is correctly demonstrated throughout.
- The `flyway_schema_history` tracking table name is correct (changed from `schema_version` in Flyway 5+).
