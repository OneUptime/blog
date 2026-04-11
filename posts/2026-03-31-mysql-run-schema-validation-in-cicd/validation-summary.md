# Validation Summary: How to Run MySQL Schema Validation in CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- sqlfluff (SQL linter)
- Flyway (database migration tool)
- pt-online-schema-change (Percona Toolkit)
- GitHub Actions (CI/CD)
- mysqldump

## Sources Consulted
- sqlfluff official documentation and PyPI registry — confirmed `sqlfluff-templater-jinja` does not exist as a package; Jinja templater is built into sqlfluff core
- Flyway CLI documentation (https://documentation.red-gate.com/flyway/reference/command-line-parameters) — verified single-dash parameter syntax (`-url`, `-user`, `-password`, `-locations`)
- Percona Toolkit documentation for pt-online-schema-change — verified `--alter`, `--dry-run`, DSN format (`D=,t=`), and standalone flags (`--host`, `--user`, `--password`)
- GitHub Actions documentation for service containers
- MySQL Docker image documentation for environment variables (`MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`)

## Issues Found

1. **`sqlfluff-templater-jinja` is not a real PyPI package.** The pip install command included `sqlfluff-templater-jinja`, which does not exist on PyPI. The Jinja templater is built into sqlfluff core (alongside `raw`, `python`, and `placeholder`). Only external integrations like `sqlfluff-templater-dbt` are separate packages. Fixed by removing the non-existent package from the install command.

2. **`.sqlfluff` configuration block was tagged as `yaml`.** The `.sqlfluff` config file uses Python ConfigParser (INI-style) format with `[section]` headers and `key = value` pairs, not YAML. Fixed by changing the code fence language identifier from `yaml` to `ini`.

3. **Missing Flyway installation step in GitHub Actions workflow.** The `migration-test` job ran `flyway migrate` and `flyway validate` commands without ever installing Flyway. This would cause the workflow to fail with a "command not found" error. Fixed by adding a step to download and install the Flyway CLI before running migrations.

## Review Notes
- The Schema Diff Validation section's second `mysqldump` command (`mysqldump --no-data schema_test`) omits connection credentials (`-h`, `-u`, `-p`), while the first command includes them. This is not technically wrong (it would use defaults or prompt), but readers following along in a CI context would need to add credentials. Left as-is since it's a standalone example.
- The MySQL service health check could benefit from `--health-start-period` and `--health-timeout` flags for robustness, but the current configuration (5 retries at 10s intervals) works in practice.
- The "Branch protection rule" YAML snippet is illustrative rather than a real configuration file format. Branch protection is configured via GitHub UI or API (or the probot/settings app with a different schema). This is acceptable as pseudocode.
- The Flyway installation step uses version 10.0.0 as an example; readers should check for the latest version at the time of use.
