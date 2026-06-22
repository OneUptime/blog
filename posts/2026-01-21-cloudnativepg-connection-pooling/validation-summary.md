# Validation Summary: How to Configure Connection Pooling in CloudNativePG

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CloudNativePG
- Kubernetes
- PostgreSQL
- PgBouncer
- Prometheus Operator
- PromQL

## Sources Consulted
- CloudNativePG 1.29 Connection Pooling documentation: https://cloudnative-pg.io/docs/1.29/connection_pooling/
- CloudNativePG 1.29 API Reference: https://cloudnative-pg.io/docs/1.29/cloudnative-pg.v1/
- CloudNativePG 1.30 Connection Pooling documentation: https://cloudnative-pg.io/docs/1.30/connection_pooling/
- CloudNativePG 1.30 API Reference: https://cloudnative-pg.io/docs/1.30/cloudnative-pg.v1/
- PgBouncer configuration documentation: https://www.pgbouncer.org/config.html
- Kubernetes dependent environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/

## Issues Found
- The basic example incorrectly configured a `pooler` block under a `Cluster` resource. CloudNativePG documents poolers as separate `Pooler` custom resources, so the example was changed to a valid `Pooler`.
- The pooler type table omitted the supported `r` type. Added the `r` type for traffic to any PostgreSQL instance.
- The post described automatic credential sync. Updated the wording to describe CloudNativePG's built-in PgBouncer password authentication integration through `auth_user`, `auth_query`, and `auth_dbname`.
- The production and authentication examples used deprecated `authQuerySecret` guidance and a direct `pg_shadow` grant. Removed the deprecated production fields and replaced the custom authentication example with current certificate-secret guidance and a safer `SECURITY DEFINER` lookup function pattern.
- The static user list example used `passthroughSecretList`, which is not a field in the current CloudNativePG `PgBouncerSpec`. Replaced it with a note that static PgBouncer user lists are not exposed through the `Pooler` API.
- The Kubernetes deployment example referenced `$(DB_USER)` and `$(DB_PASS)` before defining them. Moved `DB_USER` and `DB_PASS` before the dependent database URL variables because Kubernetes env var expansion is order-dependent.
- The anti-affinity pod template omitted the required `containers` field. Added `containers: []` for the scheduling-only override.
- The monitoring section used generic PgBouncer exporter metric names and a `ServiceMonitor`. CloudNativePG exposes `cnpg_pgbouncer_*` metrics on pooler pods and documents `PodMonitor`, so the metric names, port-forward command, monitor resource, and alert expressions were updated.
- The troubleshooting commands used port `6432` against localhost. Updated them to use the PgBouncer admin database without the incorrect hard-coded port.
- The best-practices table claimed prepared statements require session pooling. Updated the wording to focus on session state such as `LISTEN/NOTIFY`, since PgBouncer has current prepared-statement support depending on configuration.
- The conclusion said to enable the pooler in the cluster spec. Updated it to say to create a `Pooler` resource for the cluster.

## Review Notes
The sizing values remain illustrative and should be tuned per workload. CloudNativePG 1.30 documentation was checked for forward-looking changes, but it is marked unreleased; the validation primarily follows the current latest stable 1.29 API while avoiding guidance that is already deprecated or invalid in current docs.
