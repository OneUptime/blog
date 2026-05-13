# Validation Summary: How to Handle Database Schema Migrations in Flux CD Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomizations
- Kubernetes Jobs and init containers
- PostgreSQL readiness checks
- Flyway database migrations
- Liquibase database migrations
- Kubernetes ConfigMaps and Secrets

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- PostgreSQL `pg_isready` documentation: https://www.postgresql.org/docs/16/app-pg-isready.html
- Flyway Docker image documentation: https://hub.docker.com/r/flyway/flyway
- Liquibase Docker image documentation: https://hub.docker.com/_/liquibase

## Issues Found
- The Flyway and Liquibase Job examples used `ttlSecondsAfterFinished` while the Flux Kustomization continued to reference the Jobs in `healthChecks`. Kubernetes TTL cleanup deletes finished Jobs after the TTL, which can conflict with later Flux health checks or cause the Jobs to be recreated. Removed the TTL fields and added a comment explaining that the completed Job is kept for Flux health checking.
- The Liquibase example used a relative `--changeLogFile=changelog.xml` while mounting the changelog at `/liquibase/changelog`. Updated it to the documented absolute path `/liquibase/changelog/changelog.xml`.
- The best-practice and conclusion wording said Flyway or Liquibase make migrations idempotent. These tools track and checksum migrations and avoid reapplying completed migrations, but they do not make arbitrary migration statements inherently idempotent. Reworded those claims.
- The pruning guidance implied Flux deleting completed Jobs would make schema history untrackable. The durable migration history is maintained by the migration tool in the database; Flux pruning affects managed Kubernetes resources and auditability of retained Job objects. Reworded the guidance accordingly.

## Review Notes
The Kubernetes and Flux API fields shown are current for the versions discussed. The examples intentionally omit production hardening details such as resource requests, security contexts, service accounts, and network policy; these are outside the scope of the post but would be useful in a future hardening-focused article.
