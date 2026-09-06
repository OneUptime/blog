# OneUptime Docker Compose Won’t Start: Diagnose Common Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, Docker Compose, Troubleshooting, PostgreSQL, ClickHouse

Description: Diagnose OneUptime Compose startup failures by checking rendered configuration, container health, ports, storage, and persisted credentials.

---

A failed `docker compose up` is only the final symptom. OneUptime's application services wait for PostgreSQL, ClickHouse, and Redis health checks, so one unhealthy dependency can make much of the stack appear broken. Diagnose the first failing layer rather than restarting everything repeatedly.

These commands and service assumptions match OneUptime 12.0.33.

## Validate configuration before containers

Start with the directory that contains OneUptime's Compose files and `config.env`:

```bash
docker compose --env-file config.env config --quiet
docker compose --env-file config.env config --services
```

The first command catches invalid YAML and invalid Compose configuration. Unset interpolation variables without defaults can produce warnings and become empty strings without making validation fail, so review warnings and check required values too. Inspect the fully rendered configuration if a port, image, volume, or environment value looks wrong:

```bash
docker compose --env-file config.env config > /tmp/oneuptime-compose.yaml
```

Treat that output as sensitive because it can contain credentials. Delete the temporary copy after diagnosis and never attach it to a public issue without redaction.

## Find the first unhealthy service

List stopped containers as well as running ones:

```bash
docker compose --env-file config.env ps --all
docker compose --env-file config.env logs --tail=200 postgres
docker compose --env-file config.env logs --tail=200 clickhouse
docker compose --env-file config.env logs --tail=200 redis
```

In the 12.0.33 stack, the core checks use `pg_isready` for PostgreSQL, `SELECT 1` for ClickHouse, and `redis-cli` for Redis. If one is unhealthy, inspect its health history:

```bash
docker inspect --format '{{json .State.Health}}' CONTAINER_NAME
```

Replace `CONTAINER_NAME` with the exact database container name from `docker compose ps`. Names vary with the Compose project name. The health output distinguishes an application that is still initializing from one that is continuously failing.

## Check ports and host capacity

The public HTTP port is controlled by `ONEUPTIME_HTTP_PORT`. The 12.0.33 root Compose file also publishes PostgreSQL on host port 5400 for backups, and `STATUS_PAGE_HTTPS_PORT` defaults to 443. Inspect the rendered `ports` entries, then check whether another process already owns any of them. The example below checks the default ports; adjust the port numbers to match your rendered configuration:

```bash
ss -ltnp | grep -E ':(80|443|5400) '
docker ps --format 'table {{.Names}}\t{{.Ports}}'
df -h
docker system df
```

On macOS, run `lsof -nP -iTCP:PORT -sTCP:LISTEN` for each rendered port instead of `ss`. Do not remove volumes as a troubleshooting shortcut. PostgreSQL and ClickHouse volumes contain the state you are trying to preserve.

Memory pressure can also produce misleading restarts. Check the host's memory and Docker daemon allocation, then inspect container exit codes:

```bash
docker inspect --format '{{.State.ExitCode}} {{.State.OOMKilled}} {{.State.Error}}' CONTAINER_NAME
```

OneUptime documents 8 GB RAM, four CPU cores, and 20 GB disk as a homelab minimum, with substantially larger production recommendations. A machine below that floor may start inconsistently or fail as telemetry grows.

## Separate new-install secrets from persisted credentials

OneUptime's example configuration requires randomized secrets such as `ONEUPTIME_SECRET`, `DATABASE_PASSWORD`, `CLICKHOUSE_PASSWORD`, `REDIS_PASSWORD`, and `ENCRYPTION_SECRET`. Empty placeholders or accidental whitespace can break initialization.

There is a different trap on an existing deployment: changing a password in `config.env` does not necessarily rewrite the password stored inside an already initialized database volume. If PostgreSQL logs authentication failures immediately after a configuration edit, compare against the previous secret and perform an explicit, planned database password rotation. Do not keep cycling arbitrary values.

Likewise, changing encryption material can make previously encrypted values unreadable. Restore the known-good value unless you are following a supported rotation procedure.

## Recreate containers without destroying data

After correcting configuration, recreate containers while retaining named volumes:

```bash
docker compose --env-file config.env up --remove-orphans -d
docker compose --env-file config.env ps
```

`--remove-orphans` removes containers for services no longer present in the current Compose model. It does not mean delete database volumes. Avoid `docker compose down -v`: the `-v` option removes named volumes and can destroy OneUptime data.

## Read the failure in dependency order

Use this sequence:

1. Confirm `docker compose --env-file config.env config --quiet` succeeds and review interpolation warnings and required values.
2. Confirm sufficient disk, memory, and free ports.
3. Make PostgreSQL, ClickHouse, and Redis healthy.
4. Inspect migrations and application service logs.
5. Test OneUptime's ingress locally, then the public reverse proxy.

This order prevents secondary connection errors from hiding the database, secret, or capacity problem that caused them.

## Conclusion

OneUptime Compose failures become manageable when reduced to configuration, host resources, dependency health, application startup, and ingress. Preserve volumes, inspect the earliest unhealthy service, and be especially cautious with secrets on a previously initialized deployment.

## Official Documentation

- [OneUptime Docker Compose installation](https://oneuptime.com/docs/en/installation/docker-compose)
- [OneUptime deployment sizing](https://oneuptime.com/docs/en/installation/sizing)
- [OneUptime 12.0.33 Compose configuration](https://github.com/OneUptime/oneuptime/blob/12.0.33/docker-compose.yml)
- [Docker Compose troubleshooting commands](https://docs.docker.com/reference/cli/docker/compose/)
- [Docker container health checks](https://docs.docker.com/reference/dockerfile/#healthcheck)
