# Validation Summary: How to Set Up PgBouncer Connection Pooling with IPv4 Backend Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- PgBouncer
- PostgreSQL
- `psql`
- Linux service management with `systemctl`
- Linux socket inspection with `ss`
- IPv4 database connectivity
- PgBouncer authentication with `auth_file`

## Sources Consulted
- PgBouncer configuration reference: https://www.pgbouncer.org/config
- PgBouncer usage and admin console documentation: https://www.pgbouncer.org/usage
- PgBouncer feature and pooling mode documentation: https://www.pgbouncer.org/features.html
- PostgreSQL connection model documentation: https://www.postgresql.org/docs/current/connect-estab.html
- PostgreSQL `psql` documentation: https://www.postgresql.org/docs/18/app-psql.html

## Issues Found
- The admin console example used `-U pgbouncer` over TCP without configuring `admin_users` or `stats_users`. PgBouncer only allows console access for users listed in those settings, except for a special Unix-socket case. I added `admin_users = appuser` and updated the `SHOW POOLS;` example to use `appuser`.
- The `userlist.txt` section implied MD5 hashes were the general solution. PgBouncer's documentation notes that MD5 hashes can only be used for backend logins when the PostgreSQL server uses MD5 authentication, while plain-text passwords work with MD5 or SCRAM backends. I changed the example to plain-text credentials and kept MD5 generation as a conditional note.
- The `min_pool_size` comment overstated the behavior. PgBouncer only enforces `min_pool_size` for pools that are in use or have a forced user, so I changed the comment to describe it as pre-warming connections once the pool is in use.
- The final takeaway saying transaction pooling gives the "best performance" for web backends was too absolute. PgBouncer documents statement pooling as the most aggressive mode, so I changed the takeaway to describe transaction pooling as the best balance of performance and compatibility for stateless web apps.

## Review Notes
- `listen_port = 5432` is technically valid if PgBouncer is the process bound to that address and port. On hosts that also run PostgreSQL locally, a separate listener such as `6432` is often used to avoid conflicts.
- The command syntax for `apt`, `systemctl`, and `ss` was checked locally. `dnf` and `psql` were not installed in this review environment, so those examples were validated against official documentation rather than executed here.
