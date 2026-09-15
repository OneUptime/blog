# Validation Summary: How to Reach Drone Services: Hostnames, Ports, Health Checks, and Networks

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
- The explanation incorrectly described double-dollar escaping as necessary for every inline shell expansion. Clarified that it is optional for unbraced variables and arithmetic, while braced runtime expressions must be escaped. The original double-dollar commands are valid and remain unchanged.

## Review Notes
- Tested the actual `drone/envsubst` v1.0.3 implementation and executed six resulting shell cases: plain and double-dollar variables, command substitution, and arithmetic all behave correctly. Braced expressions without escaping are expanded during configuration processing; `$${NAME}` reaches the runtime shell as `${NAME}`. Verified the [escape scanner](https://github.com/drone/envsubst/blob/0351a447dc0531882e15ce0a2367c9f797927a10/parse/scan.go#L120-L188) and the [Docker runner's v1.0.3 dependency](https://github.com/drone-runners/drone-runner-docker/blob/58f896ddd9292ecc8eb03ed93d1e1cdb23002c25/go.mod#L11).
- The floating `postgres:17-bookworm` and `postgres:17-alpine` tags are currently available and appropriate for a major-version example, but they can move to newer PostgreSQL 17 minor releases and newer base-image revisions.
- `PGPASSWORD` is suitable here only because the post explicitly scopes the credentials to a disposable test database. PostgreSQL advises against this environment variable for sensitive long-lived credentials on systems where process environments may be observable.
