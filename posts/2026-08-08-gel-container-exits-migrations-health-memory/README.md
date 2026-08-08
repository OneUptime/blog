# Diagnose a Gel Container That Exits After Migrations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, Docker, Migration, Health Check, Memory, Troubleshooting

Description: Separate migration failures, intentional bootstrap exits, signals, bad health checks, and memory kills when a Gel container stops.

---

A Gel container that stops near a migration message has not necessarily been stopped by the migration. The official image performs entrypoint work before or around server startup, `docker inspect` reports the current or final state without by itself identifying the initiating cause, and an orchestrator may stop a healthy process because of a deployment or health-check decision.

Diagnose in this order: exact container state, complete logs, configured command and environment, migration behavior, host or runtime events, then resource pressure. Do not enable an unconditional restart loop until the first failure has been preserved.

## Capture the State Before Recreating Anything

Start with commands that do not mutate the container:

```bash
docker compose ps -a
docker compose logs --no-color --timestamps gel
docker inspect gel
```

If Compose generated the container name, get it first:

```bash
docker compose ps -a -q gel
```

Inspect the fields that distinguish process exit from health state:

```bash
docker inspect --format \
  'status={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}} error={{json .State.Error}}' \
  gel
```

Also record start and finish timestamps, restart count, image ID, and the resolved Compose configuration:

```bash
docker compose config
docker inspect --format '{{.Image}} {{.RestartCount}} {{.State.StartedAt}} {{.State.FinishedAt}}' gel
```

Names vary by project, so substitute the actual container ID if `gel` is not its name.

An exit code is evidence, not a complete cause. For example, 137 commonly means the process received `SIGKILL`, but `.State.OOMKilled`, kernel or platform events, and resource metrics distinguish an out-of-memory kill from an administrator or orchestrator kill. Preserve all of them.

## Read the Logs From the Beginning

The last line can be misleading. Search earlier output for:

- bootstrap or data-directory initialization;
- TLS certificate and password configuration errors;
- migration file names and the first EdgeQL error;
- migration hash or history mismatch;
- inability to read `/dbschema` or write the data directory;
- address or port binding failures;
- backend PostgreSQL connection errors;
- a clean shutdown request; and
- a Python, Rust, PostgreSQL, or entrypoint error before the final exit.

Temporarily increase the documented image entrypoint verbosity if needed:

```yaml
services:
  gel:
    environment:
      GEL_DOCKER_LOG_LEVEL: debug
```

Reproduce only after saving the original logs and state. Debug output can contain operational detail, so treat it as sensitive.

## Check for an Intentional One-shot Configuration

`GEL_SERVER_BOOTSTRAP_ONLY` tells Gel to initialize the database cluster and exit. It is appropriate for a one-shot job and wrong for the long-running database service. A leftover setting can produce a successful-looking bootstrap followed by a clean stop.

Inspect the resolved environment rather than only the source YAML:

```bash
docker compose config
docker inspect --format '{{json .Config.Env}}' gel
```

Also check whether Compose overrides the image `command` or `entrypoint`. A command that only runs `gel migrate` is a migration job, not a database server. Keep one-shot jobs and the server as separate services with different names and restart behavior.

## Understand Automatic Migration Application

When a derived image or mount supplies `/dbschema/migrations`, the official Gel image attempts to apply those migrations unless:

```yaml
GEL_DOCKER_APPLY_MIGRATIONS: never
```

By default, migration application is enabled. Therefore, a bad committed migration can prevent normal startup. Look for the first migration error rather than the later entrypoint abort.

Common causes include:

- the database migration history is ahead of or diverged from the mounted files;
- an applied migration file was edited and its content hash no longer matches;
- existing data cannot satisfy a new required property or constraint;
- the container mounted a wrong branch or revision whose migration history conflicts with the database; or
- two deployment actors are applying incompatible revisions.

Do not solve history disagreement by deleting the persistent volume. Compare `gel migration status` and database versus filesystem migration logs against a restored copy first. Production data is not disposable migration cache.

If deployment policy uses a dedicated migration job, set automatic application to `never` on the server and run one reviewed migration task before starting dependents. Ensure only one task owns that operation.

## Distinguish Health From Process Lifetime

Gel exposes two HTTP status endpoints:

```text
/server/status/alive
/server/status/ready
```

Both return HTTP 200 and `OK` when their respective condition passes. Use readiness for applications that require the instance to accept queries. Use aliveness to decide whether a running process has become unrecoverable.

A failed Docker health check marks a running container unhealthy; Docker Engine does not inherently turn that into a process exit. A higher-level platform or custom supervisor may replace unhealthy containers, so inspect that platform's events.

Compose starts dependencies when they are running unless long-form `depends_on` uses `condition: service_healthy`. A robust application dependency looks conceptually like:

```yaml
services:
  app:
    depends_on:
      gel:
        condition: service_healthy
```

Define the health check with a client actually present in the selected image, account for TLS mode, and give first bootstrap and migrations a realistic `start_period`. A check that calls plain HTTP against a TLS-only endpoint or relies on a missing `curl` binary diagnoses the check, not Gel.

## Investigate Signals and Shutdown Timing

Docker Compose sends `SIGTERM` by default and then waits the configured stop grace period before using `SIGKILL`. The default grace period is 10 seconds. Database shutdown can take longer under load or during recovery.

Set a deliberate grace period:

```yaml
services:
  gel:
    stop_grace_period: 1m
```

Then correlate container timestamps with:

- `docker compose stop`, `down`, or recreate operations;
- host shutdown and Docker daemon restart;
- deployment rollouts;
- autoscaler or platform eviction events;
- configuration-management activity; and
- operator shell history or audit logs.

The image starts and then shuts down a temporary server while bootstrapping or applying migrations, so first distinguish that expected shutdown from the final server. A graceful shutdown of the final server immediately after readiness often points to an external stop request, not an internal crash.

## Confirm Memory Before Calling It an OOM

Gel's deployment overview gives 1 GB RAM as a rule-of-thumb minimum for the Docker container and warns that smaller environments can behave unexpectedly during startup. Compilation, migrations, PostgreSQL, and index creation can create startup peaks above steady-state use.

During a controlled reproduction, collect live usage samples; `docker stats --no-stream` captures only one instant. After exit, inspect the termination state:

```bash
docker stats --no-stream gel
docker inspect --format '{{.State.OOMKilled}}' gel
```

On Linux, inspect kernel logs or cgroup events using the host's approved observability tooling. In Kubernetes or a managed container platform, inspect pod termination reason and node events.

If memory is the cause:

- raise the hard memory limit based on measured peaks and tune the reservation from the expected working set;
- avoid starting many compiler-heavy services simultaneously;
- review `GEL_SERVER_COMPILER_POOL_MODE` and `GEL_SERVER_COMPILER_POOL_SIZE` against current documentation;
- avoid large concurrent index builds and migrations during a tight startup window;
- configure PostgreSQL-related memory settings with aggregate concurrency in mind; and
- reproduce with production-like data, not an empty branch.

Do not disable the OOM killer or add swap blindly. That can convert a clear container termination into host-wide latency or failure.

## Add Restart Policy Last

A restart policy improves recovery from transient failures:

```yaml
services:
  gel:
    restart: unless-stopped
```

It does not fix a deterministic migration, permission, certificate, or configuration error. Docker also suppresses restart policy behavior in some manual-stop situations, and a fast loop can rotate away the first useful logs.

Before enabling it, make failures observable, keep logs outside the container, alert on restart count, and ensure a failed migration does not run indefinitely.

## Official Documentation

- [Running Gel with Docker](https://docs.geldata.com/reference/running/deployment/docker)
- [Gel server configuration](https://docs.geldata.com/reference/running/configuration)
- [Gel health and metrics HTTP API](https://docs.geldata.com/reference/running/http)
- [Gel deployment requirements](https://docs.geldata.com/reference/running/deployment)
- [Docker Compose service configuration](https://docs.docker.com/reference/compose-file/services/)
- [Docker restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/)
- [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/)

## Conclusion

First prove whether the Gel process failed, exited intentionally, was killed, or was replaced after a bad health decision. Then investigate migration history, bootstrap-only settings, signals, and measured memory. Readiness checks, sufficient startup time, persistent logs, graceful shutdown, and an evidence-based memory limit prevent a restart policy from merely hiding the original fault.
