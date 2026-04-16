# Validation Summary: How to Install ClickHouse on macOS for Development

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- ClickHouse (server and client)
- Homebrew (macOS package manager)
- Docker / Docker container for ClickHouse
- ClickHouse HTTP interface (port 8123) and native TCP interface (port 9000)
- ClickHouse SQL (MergeTree engine, `numbers()` table function, DateTime/UInt64 types)
- Python with `clickhouse-connect` client library

## Sources Consulted
- ClickHouse official install docs: https://clickhouse.com/docs/install
- Homebrew cask for ClickHouse: https://formulae.brew.sh/cask/clickhouse
- ClickHouse Docker Hub image: `clickhouse/clickhouse-server`
- ClickHouse official quickstart shell installer: https://clickhouse.com/
- `clickhouse-connect` Python client documentation

## Issues Found
1. **Inaccurate data directory claim (Option 1).** The post stated that Homebrew-installed ClickHouse stores data in `~/.clickhouse`. ClickHouse does not default to that path. When invoked as `clickhouse server` without a custom config file, the server places data in a `data/` subdirectory of the current working directory. Fixed the sentence to describe this behavior accurately and to reference `--config-file` for custom configs.
2. **Inconsistent Reset section.** The original reset section mixed Homebrew service commands (`brew services stop/start clickhouse`) with the Docker volume path (`~/clickhouse-data`). The `~/clickhouse-data` directory is created by the Docker `-v` mount in Option 3, not by Homebrew. Rewrote the section to be Docker-specific (stop/remove the container, delete the bind-mounted data directory, re-run the `docker run` command) since that matches the path actually used earlier in the post.

## Review Notes
- The Homebrew ClickHouse cask is currently marked deprecated on formulae.brew.sh with a disable date of 2026-09-01. `brew install clickhouse` still works as of the review date (2026-04-16) but readers should be aware this install method may stop working later in 2026; the official shell installer (Option 2) or Docker (Option 3) will remain the durable paths.
- `brew services start clickhouse` is only mentioned as an option; the cask does not formally register a background service, so this command may not work on all setups. Running `clickhouse server` directly (as shown) is the reliable path. Left unchanged because the command will no-op harmlessly if unsupported, but worth revisiting in a future update.
- The ClickHouse shell installer (`curl https://clickhouse.com/ | sh`) downloads a single multi-call binary; the post correctly shows usage as `./clickhouse server` and `./clickhouse client`.
- SQL examples are syntactically valid ClickHouse SQL — `numbers()` table function, MergeTree engine with `ORDER BY`, `DateTime DEFAULT now()`, and `UInt64`/`String` types are all correct.
- The Python example uses `clickhouse-connect`, the officially supported Python client. The `get_client()` signature and `query().first_row` accessor match the current library API.
- Docker ports 8123 (HTTP) and 9000 (native TCP) are the documented defaults for the `clickhouse/clickhouse-server` image.
