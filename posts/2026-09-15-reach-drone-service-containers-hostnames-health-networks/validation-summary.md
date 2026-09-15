# Validation Summary: How to Reach Service Containers from Drone Steps: Hostnames, Ports, Health Checks, and Networks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Drone Docker pipelines
- Drone Kubernetes pipelines
- Docker service-container networking
- Kubernetes pod networking
- PostgreSQL 17 and libpq/psql
- POSIX shell
- GNU coreutils `timeout`

## Sources Consulted
- Drone Docker pipeline services documentation: https://docs.drone.io/pipeline/docker/syntax/services/
- Drone Kubernetes pipeline services documentation: https://docs.drone.io/pipeline/kubernetes/syntax/services/
- Drone environment substitution documentation: https://docs.drone.io/pipeline/environment/substitution/
- Drone `envsubst` source and tests: https://github.com/drone/envsubst
- PostgreSQL libpq environment-variable documentation: https://www.postgresql.org/docs/current/libpq-envars.html
- PostgreSQL Docker Official Image documentation and supported tags: https://hub.docker.com/_/postgres
- GNU coreutils `timeout` documentation: https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html
- Kubernetes pod documentation: https://kubernetes.io/docs/concepts/workloads/pods/

## Issues Found
- The retry loop used `$$((attempts + 1))` and `$$attempts`. Drone's configuration substitution recognizes braced `${...}` expressions; it does not turn these unbraced double-dollar forms into ordinary shell expansions. The arithmetic assignment would therefore be invalid shell syntax, and `$$attempts` would represent the shell PID followed by text. Changed them to `$((attempts + 1))` and `$attempts`.
- The accompanying explanation stated that double-dollar escaping was necessary for the loop's inline shell expansions. Revised it to explain that Drone escaping is needed for braced inline expressions such as `${NAME}`, written as `$${NAME}`, but not for `$name` or `$((...))`.

## Review Notes
- The floating `postgres:17-bookworm` and `postgres:17-alpine` tags are currently available and appropriate for a major-version example, but they can move to newer PostgreSQL 17 minor releases and newer base-image revisions.
- `PGPASSWORD` is suitable here only because the post explicitly scopes the credentials to a disposable test database. PostgreSQL advises against this environment variable for sensitive long-lived credentials on systems where process environments may be observable.
