# Validation Summary: How to Use Database Schema Migrations in CI/CD Pipelines for Cloud SQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL
- Google Cloud Build
- Cloud SQL Auth Proxy
- Secret Manager
- Flyway
- PostgreSQL
- MySQL
- Docker
- Artifact Registry

## Sources Consulted
- Google Cloud SQL: Connect from Cloud Build: https://cloud.google.com/sql/docs/postgres/connect-build
- Google Cloud SQL: Connect using the Cloud SQL Auth Proxy: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Google Cloud Build: Configuring build step order: https://docs.cloud.google.com/build/docs/configuring-builds/configure-build-step-order
- Google Cloud Build: Use secrets from Secret Manager: https://cloud.google.com/build/docs/securing-builds/use-secrets
- Redgate Flyway command documentation: https://documentation.red-gate.com/flyway/reference/commands
- Redgate Flyway migration transaction handling: https://documentation.red-gate.com/flyway/flyway-concepts/migrations/migration-transaction-handling
- MySQL Reference Manual: Statements That Cause an Implicit Commit: https://dev.mysql.com/doc/refman/9.7/en/implicit-commit.html
- Docker Hub Flyway image documentation: https://hub.docker.com/r/flyway/flyway

## Issues Found
- The original Cloud Build proxy example used a long-running proxy as a separate foreground step and then set `waitFor: ['proxy']` on the readiness step. Cloud Build waits for dependency steps to finish, so the readiness step would not run while the proxy was still active. I changed the example to follow Google's documented pattern of putting the Cloud SQL Auth Proxy in the same build step as the migration command, using a small migration image that contains both Flyway and the proxy.
- The original Secret Manager examples passed `-password=$$DB_PASSWORD` directly as a Flyway container argument. Without a shell, that environment variable would be passed literally rather than expanded. I changed the examples to run Flyway through `sh -c` so Cloud Build can expose the secret and the shell can expand it.
- The original text implied Cloud Build could not access private IP Cloud SQL instances and that the proxy alone solved that. Google documents that private IP access requires Cloud Build to run in a private pool on the same VPC; I clarified the public IP and private IP paths.
- The original snippets used the older `gcr.io/${PROJECT_ID}/...` image path for the application image. Since Container Registry is deprecated, I updated the example to use an Artifact Registry style image path.
- The original proxy image tag was old. I updated the example proxy image reference to `gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.22.0`, matching the current Google documentation consulted during review.

## Review Notes
The PostgreSQL and MySQL migration failure discussion is directionally correct: Flyway can roll back failed migrations on databases with transactional DDL support, while MySQL DDL commonly causes implicit commits and may require cleanup. Future improvements could expand the permissions section with default privileges for tables created after the application user is granted access.
