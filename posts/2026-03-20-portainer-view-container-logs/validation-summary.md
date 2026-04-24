# Validation Summary: How to View Container Logs in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Docker logging drivers
- `jq`
- Python logging
- Node.js logging

## Sources Consulted
- Portainer Documentation, "View container logs": https://docs.portainer.io/user/docker/containers/logs
- Docker Docs, "View container logs": https://docs.docker.com/engine/logging/
- Docker Docs, "`docker container logs`": https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs, "`docker compose logs`": https://docs.docker.com/reference/cli/docker/compose/logs/
- Docker Docs, "Configure logging drivers": https://docs.docker.com/engine/logging/configure/
- Docker Docs, "Use docker logs with remote logging drivers": https://docs.docker.com/engine/logging/dual-logging/
- Docker Docs, "JSON File logging driver": https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs, "Journald logging driver": https://docs.docker.com/engine/logging/drivers/journald/
- Docker Docs, "Define services in Docker Compose": https://docs.docker.com/reference/compose-file/services/
- Python 3.12 docs, "`datetime` — Basic date and time types": https://docs.python.org/3.12/library/datetime.html
- Python 3.12 docs, "What’s New In Python 3.12": https://docs.python.org/3.12/whatsnew/3.12.html

## Issues Found
- The prerequisites and troubleshooting sections incorrectly stated that Portainer only supports `json-file` and `journald` logs. Updated this to match Docker's current behavior: logs are available when Docker can read them, including direct support for `local`, `json-file`, and `journald`, while remote drivers depend on Docker's dual logging cache.
- The Portainer option description used `Auto-Scroll`, but Portainer's documentation describes this control as `Auto refresh`. Updated the wording to match the documented behavior.
- The search description implied the search box itself filters lines. Portainer documents search and filtering as separate controls, so the wording was corrected.
- The article claimed the `jq` examples parsed logs "in the browser console" even though the examples are host-side shell commands. Updated the text to describe host-side `jq` usage accurately.
- The Docker Compose `--since` example omitted a timezone offset. Updated the example to use an explicit UTC timestamp (`Z`) for clarity.
- The timezone example implied `TZ` always changes container log timestamps. Corrected the wording to note that this depends on the image/application honoring `TZ`, while Docker's own timestamp remains UTC.
- The Python example used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)`.
- The Node.js example referenced `err.message` without defining `err`. Added a concrete `Error` object so the example runs as written.
- The line-count section listed specific values and an `All` option that were not confirmed in Portainer's documentation. Reworded this to the documented behavior: Portainer limits displayed lines and defaults to 1000.

## Review Notes
- Portainer's current documentation confirms search, filtered search results, date selection, timestamps, line numbers, wrapping, auto refresh, copy, download, and full-screen support in the log viewer.
- Docker recommends the `local` logging driver for many non-Kubernetes cases because it rotates logs by default, but the post's retained `json-file` rotation example is still valid and documented.
