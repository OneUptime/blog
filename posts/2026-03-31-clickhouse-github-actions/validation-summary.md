# Validation Summary: How to Set Up ClickHouse in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (versions 24.3, 24.8, 25.1)
- GitHub Actions (service containers, matrix strategy, caching)
- Docker (service container health checks)
- Python (pytest, pip)
- ClickHouse client (apt package)

## Sources Consulted
- GitHub Actions docs on service containers: https://docs.github.com/en/actions/using-containerized-services/about-service-containers
- GitHub Actions workflow syntax (`services`, `options`, `strategy.matrix`): https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- Docker `--health-*` options reference: https://docs.docker.com/reference/cli/docker/container/run/
- Official `clickhouse/clickhouse-server` Docker image: https://hub.docker.com/r/clickhouse/clickhouse-server (env vars `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, default ports 8123 HTTP / 9000 native TCP)
- ClickHouse Linux installation docs (apt signed-by approach): https://clickhouse.com/docs/install
- ClickHouse release history to confirm 24.3 (LTS), 24.8 (LTS), and 25.1 tags exist on Docker Hub
- actions/checkout@v4, actions/setup-python@v5, actions/cache@v4 — verified current stable majors

## Issues Found
- **Deprecated `apt-key add` in the ClickHouse client install step.** The original snippet piped the repo GPG key through `sudo apt-key add -` and used a `deb https://packages.clickhouse.com/deb lts main` source line. `apt-key` has been deprecated since Debian 11 / Ubuntu 22.04, and on current `ubuntu-latest` (Ubuntu 24.04) it emits warnings and is slated for removal. Replaced with the modern `gpg --dearmor` into `/usr/share/keyrings/clickhouse-keyring.gpg` plus a `signed-by=...` clause on the deb source line, matching ClickHouse's current official installation instructions. Also switched `lts main` to `stable main` to match the current docs (both distributions exist, but `stable` is the documented default and pairs with the key URL used).

## Review Notes
- The health check uses `wget -qO- http://localhost:8123/ping` — `wget` is present in the `clickhouse/clickhouse-server` image, so this runs correctly inside the container. `curl` would also work since it is included as well.
- Ports 8123 (HTTP) and 9000 (native TCP) are the default ClickHouse listening ports and are exposed in the official image.
- `CLICKHOUSE_USER: default` with `CLICKHOUSE_PASSWORD: ""` is redundant (that is the default) but harmless and makes intent explicit.
- The matrix example omits `--health-timeout` and `--health-start-period`; this is acceptable because Docker applies defaults, but callers relying on slow-starting builds may want to re-add `--health-start-period`.
- Version tags 24.3 and 24.8 are LTS; 25.1 is a regular release. Pinning to LTS tags for CI is a reasonable practice; readers may want to note that non-LTS tags move faster.
- `actions/cache@v4`, `actions/setup-python@v5`, and `actions/checkout@v4` are the current stable majors as of the post date.
