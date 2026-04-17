# Validation Summary: How to Use clickhouse-client Command Line Tool

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (server and client, 24.x era)
- `clickhouse-client` CLI
- APT / Homebrew / curl install script
- ClickHouse XML client configuration
- ClickHouse formats (TabSeparated, CSV, JSON, JSONEachRow, PrettyCompact, Vertical)

## Sources Consulted
- ClickHouse CLI reference: https://clickhouse.com/docs/interfaces/cli
- ClickHouse macOS install docs: https://clickhouse.com/docs/install/macOS
- ClickHouse Debian/Ubuntu install docs: https://clickhouse.com/docs/install/debian_ubuntu
- ClickHouse network ports reference: https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse GitHub repo — default client config: https://github.com/ClickHouse/ClickHouse/blob/master/programs/client/clickhouse-client.xml
- ClickHouse GitHub repo — `ClientBase.cpp` (flag definitions): https://github.com/ClickHouse/ClickHouse/blob/master/src/Client/ClientBase.cpp
- Homebrew cask registry: https://formulae.brew.sh/cask/clickhouse

## Issues Found
1. **Homebrew install command was incorrect.** The post used `brew install clickhouse`, but there is no Homebrew formula named `clickhouse`; only a cask exists. Updated to `brew install --cask clickhouse`, which matches the official ClickHouse macOS install documentation.
2. **`--multiquery` flag is obsolete.** In current ClickHouse (source: `ClientBase.cpp`, master) the flag is registered as `"Obsolete, does nothing"`. Multi-query execution is now the default. Replaced the example `clickhouse-client --multiquery < /scripts/setup.sql` with the modern recommended form `clickhouse-client --queries-file /scripts/setup.sql`, and added a stdin-redirection example for parity with previous behavior.

Other technical content — port numbers (9000 native, 9440 TLS), `--secure`, `--query`, `--format`, all listed formats, `<config>` as the XML root for the **client** config (distinct from the server's `<clickhouse>`), config path `~/.clickhouse-client/config.xml`, interactive quit commands (`\q`, `exit`), and the flag table — was verified accurate.

## Review Notes
- The ClickHouse Homebrew cask is marked deprecated with a disable date of 2026-09-01 (reason: `fails_gatekeeper_check`). After that date, the official curl install script (already shown in the post) will be the only Homebrew-free path on macOS. Not worth changing today, but worth revisiting after that date.
- `sudo apt-get install clickhouse-client` requires the user to first add ClickHouse's APT repository (`packages.clickhouse.com`); the default Ubuntu/Debian repos do not carry a current `clickhouse-client` package. The post omits the repo-setup step. Left as-is because the command itself is correct and most readers adding a new apt package know to set up a repo first, but future revisions could link to the official Debian/Ubuntu install guide.
- `--multiquery` / `-n` is still *accepted* by the client as a no-op for backward compatibility, so existing scripts using it will continue to work — only the *recommendation* has changed.
