# Validation Summary: How to Use ClickHouse CLI (clickhouse-client)

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse (database)
- clickhouse-client (CLI)
- SQL
- Bash / shell scripting
- Output formats: TSV, CSV, CSVWithNames, JSON, JSONEachRow, Vertical, Parquet, TabSeparated
- XML client configuration
- Native TCP protocol (port 9000)

## Sources Consulted
- ClickHouse official CLI documentation: https://clickhouse.com/docs/interfaces/cli
- ClickHouse GitHub repository (ClientBase.cpp, docs/en/interfaces/cli.md): https://github.com/ClickHouse/ClickHouse
- Altinity Knowledge Base on clickhouse-client: https://kb.altinity.com/altinity-kb-interfaces/altinity-kb-clickhouse-client/

## Issues Found
1. **Incorrect interactive backslash command `\t`**: The Query Profiling section stated that typing `\t` inside interactive mode toggles timing. This is not a documented clickhouse-client command. The only standard interactive backslash commands are `\G` (render result in Vertical format, similar to MySQL) and `\` (line continuation). Replaced the `\t` claim with accurate information about `\G` and kept the `--send_logs_level` example.

## Review Notes
- The default config file path `~/.clickhouse-client/config.xml` is correct; additional valid locations include `./clickhouse-client.xml` and `/etc/clickhouse-client/conf.d/user.xml`, but only one is needed for the example.
- Default ports (9000 native TCP, 8123 HTTP) and all the documented flags (`--host`, `--port`, `--user`, `--password`, `--database`, `--query`/`-q`, `--format`, `--queries-file`, `--multiline`, `--time`, `--send_logs_level`, `--compression`) are accurate.
- `system.replicas` column references (`database`, `table`, `is_leader`, `queue_size`, `absolute_delay`) are correct.
- The `--multiline --query "..."` example is technically redundant (multiline queries work fine with `--query` without the flag), but not incorrect.
- The "heredoc" label for the multiline scripting example is a slight terminology stretch (the example is a quoted multiline string, not a true bash heredoc), but the code works as shown.
- The macOS Homebrew pitfall (binary named `clickhouse`, client invoked as `clickhouse client`) is a useful caveat; some Homebrew installations may also create a `clickhouse-client` symlink.
- Version string shown in the interactive-mode example (24.3.1) is illustrative and not tied to any specific current release, which is fine for a tutorial.
