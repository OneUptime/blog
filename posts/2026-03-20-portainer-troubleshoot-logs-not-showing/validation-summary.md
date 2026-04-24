# Validation Summary: How to Troubleshoot Container Logs Not Showing in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine logging drivers and `docker logs`
- Docker CLI (`docker inspect`, `docker logs`, `docker run`)
- Docker Compose logging configuration
- Python stdout buffering and logging
- Node.js process stdout/stderr
- PHP output buffering
- Ruby IO sync mode

## Sources Consulted
- Portainer Docs: View container logs - https://docs.portainer.io/user/docker/containers/logs
- Portainer Docs: Install Portainer Agent on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/agent
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: Use docker logs with remote logging drivers - https://docs.docker.com/engine/logging/dual-logging/
- Docker Docs: View container logs - https://docs.docker.com/engine/logging/
- Docker Docs: Local file logging driver - https://docs.docker.com/engine/logging/drivers/local/
- Docker Docs: `docker inspect` reference - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: `docker container logs` reference - https://docs.docker.com/reference/cli/docker/container/logs/
- Python 3.12 docs: `sys` - https://docs.python.org/3.12/library/sys.html
- Python 3.12 docs: `io.TextIOWrapper.reconfigure` - https://docs.python.org/3.12/library/io.html
- Node.js docs: `process.stdout` and process I/O - https://nodejs.org/api/process.html
- PHP manual: Output control runtime configuration - https://www.php.net/manual/en/outcontrol.configuration.php
- PHP manual: `ob_implicit_flush` - https://www.php.net/manual/en/function.ob-implicit-flush.php
- Ruby docs: `IO#sync` / `IO#sync=` - https://docs.ruby-lang.org/en/3.1/IO.html

## Issues Found
- The post incorrectly stated that Portainer only supports `json-file` and `journald`. Portainer shows Docker logs, and Docker can also read `local` logs directly; remote drivers may also work when Docker's dual logging cache is enabled. I corrected the explanation, summary flow, and conclusion to reflect current Docker behavior.
- Several `docker inspect` examples relied on `jq` even though Docker provides native `--format` output for the exact fields used. I replaced those commands with Docker's documented `--format` forms to remove the undeclared `jq` dependency and align with official CLI usage.
- The `/etc/docker/daemon.json` example contained a `//` comment inside a JSON code block, which would make the file invalid JSON if copied as-is. I moved the file path reference outside the JSON snippet.
- The buffering section had multiple inaccurate runtime examples. `PYTHONDONTWRITEBYTECODE` does not disable output buffering, `process.stdout.setDefaultEncoding()` does not affect Node.js log flushing, `PHP_OUTPUT_BUFFERING` is not a standard PHP setting, and `RUBY_STDOUT_SYNC` is not a standard Ruby environment variable. I removed or replaced those with documented settings and APIs.
- The Portainer UI guidance said the default line count was `100` and suggested switching to `All`. Portainer's current documentation says the default is `1000`, and the docs only describe adjusting the line limit and date picker. I updated that section accordingly.
- The Portainer Agent socket check used `docker exec ... ls /var/run/docker.sock`, which depends on utilities inside the agent image. I changed it to inspect mounts through Docker instead, which is more reliable.
- The known-good test container used `$(date)` inside double quotes passed to `docker run`, which would expand on the host before the container starts. I fixed the quoting so `date` is evaluated inside the container.
- The on-disk log inspection assumed the legacy `json-file` path layout under `/var/lib/docker/containers/...`. I changed it to use Docker's documented `.LogPath` field and scoped the step to the `json-file` driver.

## Review Notes
- Docker's current docs recommend the `local` logging driver for general use because it rotates logs by default and is more disk-efficient, but `json-file` remains a valid concrete example for a Portainer troubleshooting guide.
- Docker warns against manually interacting with `local` driver storage files, so the post now keeps direct file inspection scoped to `json-file`.
