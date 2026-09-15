# Validation Summary: How to Cap Django Replica Growth Using a PostgreSQL Connection Budget

## Status
validated

## Post Type
Technical capacity-planning guide

## Technologies Covered
- Django 5.2
- PostgreSQL
- psycopg 3 and psycopg pool
- Kubernetes Deployments and rolling updates
- Kubernetes Horizontal Pod Autoscaler
- WSGI and ASGI application deployments

## Sources Consulted
- [Django 5.2 database documentation](https://docs.djangoproject.com/en/5.2/ref/databases/)
- [Django 5.2 PostgreSQL backend implementation](https://github.com/django/django/blob/stable/5.2.x/django/db/backends/postgresql/base.py)
- [PostgreSQL connection and authentication settings](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [PostgreSQL 16 connection and authentication settings](https://www.postgresql.org/docs/16/runtime-config-connection.html)
- [PostgreSQL activity statistics documentation](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW)
- [Kubernetes Deployment documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes rolling-update task documentation](https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/)

## Issues Found
No technical issues found.

## Review Notes
- `reserved_connections` and the `pg_use_reserved_connections` role are available in PostgreSQL 16 and later; the post correctly tells readers on older versions to omit that setting and account for supported reservation mechanisms.
- The six-replica result and all displayed arithmetic were checked and are correct for the stated 300-connection budget, 20 connections per replica, 25% rounded-up surge, and terminating-Pod allowance of one desired generation.
- The terminating-Pod allowance is intentionally conservative and depends on the post's stated assumptions about serialized rollouts and the absence of repeated scaling cycles.
- Django 5.2 supports PostgreSQL 14 and later, recommends psycopg 3, requires the psycopg pooling dependency for `OPTIONS["pool"]`, and rejects a nonzero `CONN_MAX_AGE` when that pool is enabled, as stated.
- The `pg_stat_activity` query is syntactically valid and correctly restricts the aggregation to client backends. Visibility of other sessions requires suitable privileges, which the post notes.
