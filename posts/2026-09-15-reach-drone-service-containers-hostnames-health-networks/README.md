# How to Reach Service Containers from Drone Steps: Hostnames, Ports, Health Checks, and Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Docker, Kubernetes, Networking, Troubleshooting

Description: Connect Drone steps to service containers with the correct runner-specific address and a bounded application readiness check.

The correct address for a Drone service depends on the pipeline type. Docker steps connect to the service name. Kubernetes steps connect through the shared pod network, usually at `127.0.0.1`. Mixing those two models is a common reason a test works on one runner and fails on another.

Drone documents these separately for [Docker services](https://docs.drone.io/pipeline/docker/syntax/services/) and [Kubernetes services](https://docs.drone.io/pipeline/kubernetes/syntax/services/).

## Use the container port and an explicit hostname

This complete Docker pipeline starts PostgreSQL and checks a real authenticated query before continuing:

```yaml
kind: pipeline
type: docker
name: database-test

steps:
  - name: query
    image: postgres:17-bookworm
    environment:
      PGHOST: database
      PGPORT: "5432"
      PGUSER: ci
      PGPASSWORD: disposable-test-password
      PGDATABASE: ci
      PGCONNECT_TIMEOUT: "2"
    commands:
      - |
        attempts=0
        until timeout --signal=TERM --kill-after=1s 5s psql -v ON_ERROR_STOP=1 -c 'SELECT 1' >/dev/null 2>&1; do
          attempts=$((attempts + 1))
          if [ "$attempts" -ge 30 ]; then
            echo 'database did not become ready' >&2
            exit 1
          fi
          sleep 1
        done
      - timeout --signal=TERM --kill-after=1s 5s psql -v ON_ERROR_STOP=1 -c 'SELECT current_database()'

services:
  - name: database
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: ci
      POSTGRES_PASSWORD: disposable-test-password
      POSTGRES_DB: ci
```

These credentials belong only to the temporary test database. They should not match a shared or production account.

`PGHOST` uses the service name and `PGPORT` uses PostgreSQL's port inside the container. You do not need to publish a host port to connect two containers in the pipeline network. The PostgreSQL client documents these connection settings in its [environment variable reference](https://www.postgresql.org/docs/current/libpq-envars.html).

Drone's configuration substitution processes braced expressions such as `${NAME}` before parsing the YAML. Write ordinary shell forms such as `$attempts` and `$((attempts + 1))` as shown above; if an inline command needs a braced shell expansion, escape it as `$${NAME}` so the shell receives `${NAME}`. This escaping is unnecessary if the same shell code lives in a checked-in script. See [Drone environment substitution](https://docs.drone.io/pipeline/environment/substitution/).

## Make readiness a bounded application check

Starting a service container does not mean the database is ready for authenticated queries. A fixed sleep wastes time on fast runs and still fails under slow initialization. The loop above tries a query at most 30 times. `PGCONNECT_TIMEOUT` bounds connection establishment, while GNU `timeout` bounds the whole client process, including a query that connects but hangs. It sends TERM after five seconds and KILL one second later if necessary; these are process deadlines, not real-time scheduling guarantees. The query step uses the Debian-based PostgreSQL image for GNU coreutils. See the [GNU timeout manual](https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html).

A listening port is a weaker check than the operation your test needs. For PostgreSQL, a successful `SELECT 1` checks connectivity, credentials, and database selection. For an HTTP service, probe an endpoint that verifies the relevant dependencies. Set a request deadline so an accepted TCP connection cannot hold the loop forever.

Drone ignores a service container's exit code when determining pipeline success. Keep the readiness check and real assertions in a normal step so the build fails if the service crashes or never becomes usable.

## Adapt the address for Kubernetes

For a Kubernetes runner, change `type` to `kubernetes` and `PGHOST` to `127.0.0.1`. The containers in one build pod share networking. A service named `database` in the Drone YAML does not automatically create a Kubernetes Service object with that DNS name.

The shared network also means two services cannot both bind the same address and port. If a test needs two database instances in one pod, configure distinct listening ports or redesign the test into separate pipelines.

## Diagnose the first failing layer

| Symptom | First evidence to inspect |
| --- | --- |
| Name resolution fails | Pipeline type, service name, and runner DNS/network configuration |
| Connection refused | Service startup logs and listening address/port |
| Connection times out | Network reachability, network policy, and connection deadline |
| Authentication fails | Username, database, and initialization settings |
| Intermittent early failures | Whether readiness tests an actual application operation |

Read service logs before repeatedly increasing the timeout. Invalid initialization options will never become healthy after a longer wait. If a runner attaches containers to additional networks, inspect those settings too; a local hostname that resolves on the runner host does not necessarily resolve inside its step containers.

Keep test services private to the build wherever possible. After the test completes, verify that the runner removes its temporary containers or pod. Reliable startup and reliable cleanup are both part of making integration tests repeatable.
