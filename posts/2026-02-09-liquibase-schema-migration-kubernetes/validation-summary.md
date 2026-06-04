# Validation Summary: How to Configure Database Schema Migration Jobs Using Liquibase on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Jobs, ConfigMaps, Secrets, init containers, and kubectl
- Liquibase changelogs and CLI commands
- Docker container images
- PostgreSQL readiness checks
- GitLab CI/CD

## Sources Consulted
- Liquibase update command documentation: https://docs.liquibase.com/commands/update/update.html
- Liquibase rollback-count command documentation: https://docs.liquibase.com/commands/rollback/rollback-count.html
- Liquibase status command documentation: https://docs.liquibase.com/commands/change-tracking/status.html
- Liquibase validate command documentation: https://docs.liquibase.com/commands/utility/validate.html
- Liquibase command parameter documentation: https://docs.liquibase.com/parameters/working-with-command-parameters.html
- Liquibase defaults-file parameter documentation: https://docs.liquibase.com/reference-guide/parameters/defaults-file
- Liquibase log-level parameter documentation: https://docs.liquibase.com/reference-guide/parameters/log-level
- Liquibase Docker documentation: https://docs.liquibase.com/pro/integration-guide/using-liquibase-and-docker
- Kubernetes Job API documentation: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes container command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/

## Issues Found
- The examples used `liquibase/liquibase:4.25`, while current Liquibase Docker guidance recommends the official 4.27+ image stream for current 4.x usage. Updated the examples to `liquibase:4.33`.
- The ConfigMap stored `username` and `password` placeholders and was not mounted or passed to the Job, so the Job ignored the properties file. Removed credential placeholders from the ConfigMap, changed the properties to current documented keys, mounted the ConfigMap into the Job, and passed it with `--defaults-file`.
- The Job passed the global `--defaults-file` parameter after the `update` command. Moved it before `update`, matching Liquibase command syntax.
- The GitLab validation command omitted a database URL, even though Liquibase `validate` documents `--url` as required. Added `--url=offline:postgresql` for syntax validation without a live database connection.
- The rollback example used legacy `rollbackCount` with a positional count. Updated it to the documented `rollback-count --count=1` syntax.
- The GitLab deploy branch filter used `master`. Updated it to `main` to avoid baking in the older default branch name.

## Review Notes
The remaining examples are representative and depend on environment-specific resources existing, such as `postgres-service`, `database-credentials`, `database-migration-sa`, and GitLab Kubernetes credentials. For a production hardening pass, consider avoiding database passwords in process arguments and using mounted secret files or Liquibase-supported secret-management integrations.
