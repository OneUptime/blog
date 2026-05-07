# Validation Summary: How to Export Podman Events to External Systems

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Bash
- JSON Lines / NDJSON
- jq
- SQLite
- netcat
- Redis
- curl
- systemd user services

## Sources Consulted
- Podman `podman-events` documentation: https://docs.podman.io/en/latest/markdown/podman-events.1.html
- SQLite `CREATE TABLE` documentation: https://www.sqlite.org/lang_createtable.html
- SQLite `INSERT` documentation: https://www.sqlite.org/lang_insert.html
- SQLite expression and string literal documentation: https://www.sqlite.org/lang_expr.html
- Redis `PUBLISH` command documentation: https://redis.io/docs/latest/commands/publish/
- Redis `LPUSH` command documentation: https://redis.io/docs/latest/commands/lpush/
- systemd service unit documentation: https://www.man7.org/linux/man-pages/man5/systemd.service.5.html
- Local OpenBSD netcat help output (`nc -h`)
- Local systemctl help output (`systemctl --user --help`)

## Issues Found
- The SQLite exporter used Docker-style event JSON paths (`.Actor.ID`, `.Actor.Attributes.name`, `.Actor.Attributes.image`) and a lowercase `.time` field. Podman documents JSON Lines output with top-level fields such as `.Time`, `.Type`, `.Status`, `.Name`, `.ID`, and `.Image`, so the exporter was updated to read those fields.
- The SQLite exporter escaped only the raw JSON value before building the SQL `INSERT`. Other fields could break the statement if they contained a single quote, so the example now escapes all inserted string values.
- The query example searched for `status='die'`, but Podman documents the container event status as `died` and notes that Docker-compatible `die` filters map to `died`. The query was changed to `status='died'`.
- The network exporter section was titled "TCP/UDP" while the example sends over TCP only. The heading was changed to "TCP Endpoint" to match the implementation.
- The Redis exporter also used Docker-style `.Actor.Attributes.name`; it now reads the documented Podman `.Name` field.

## Review Notes
- Podman was not installed in the local environment, so Podman-specific validation was performed against the current official Podman documentation.
- `sqlite3` and `redis-cli` were not installed locally, so their examples were validated against official SQLite and Redis documentation rather than executed end to end.
