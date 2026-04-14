# Validation Summary: How to Use SQLite for Local Development with Dapr State Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- SQLite (state store component)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr CLI
- GitHub Actions (CI/CD integration)
- Go (Makefile examples)
- Node.js (application code example)

## Sources Consulted
- Dapr SQLite state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-sqlite/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr CLI installation guide: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr state management how-to guide: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr shared state documentation (key prefix format): https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/
- SQLite URI filename documentation: https://www.sqlite.org/uri.html
- Dapr components-contrib SQLite source code: https://github.com/dapr/components-contrib/blob/master/state/sqlite/sqlite_dbaccess.go

## Issues Found

### 1. Invalid SQLite URI parameters in connection string
- **What was wrong:** The connection string `file:/tmp/dapr-state.db?mode=rwc&_journal=WAL&_timeout=5000` included `_journal=WAL` and `_timeout=5000`. These are parameters specific to the `mattn/go-sqlite3` Go driver and are not valid standard SQLite URI query parameters. Dapr's SQLite component uses the `modernc.org/sqlite` pure-Go driver, which follows standard SQLite URI syntax. The only recognized SQLite URI query parameters are: `mode`, `cache`, `immutable`, `modeof`, `nolock`, `psow`, and `vfs`.
- **What was changed:** Simplified the connection string to `file:/tmp/dapr-state.db?mode=rwc`. WAL mode is already correctly controlled via the `disableWAL: "false"` metadata field, and busy timeout is controllable via the `busyTimeout` metadata field.
- **Why:** Using unrecognized URI parameters could be silently ignored or cause unexpected behavior. The post already configures WAL via the proper `disableWAL` metadata field, making the URI parameter redundant and incorrect.

### 2. Incorrect column name `updatetime` in SQL query
- **What was wrong:** The SQL query used `SELECT key, etag, updatetime FROM state;` but the actual column name in Dapr's SQLite state table is `update_time` (with an underscore).
- **What was changed:** Corrected to `SELECT key, etag, update_time FROM state;`.
- **Why:** The query would fail with a "no such column: updatetime" error against an actual Dapr SQLite state database.

### 3. Incorrect column name `expiredate` in SQL query
- **What was wrong:** The SQL query used `SELECT key, expiredate FROM state WHERE expiredate IS NOT NULL;` but the actual column name is `expiration_time`.
- **What was changed:** Corrected both occurrences to use `expiration_time`.
- **Why:** The query would fail with a "no such column: expiredate" error against an actual Dapr SQLite state database.

## Review Notes
- The Dapr JavaScript SDK's `DaprClient()` constructor is used with no arguments, which works for local development since it defaults to `localhost` on the standard Dapr ports. This is appropriate for the local dev context of this post.
- The GitHub Actions workflow snippet omits the `on:` trigger, which is common in blog post examples and acceptable since it's illustrative rather than a complete copy-paste workflow.
- The key prefix format `order-service||order:001` shown in the SQL inspection section is correct — Dapr uses `||` (double pipe) as the separator between the app-id and the key name by default.
- The `cleanupInterval` is set to `1h` in the example, which is a reasonable choice for local development. The default is `0` (disabled), so the post is making an active configuration choice rather than relying on the default.
- The Dapr CLI install script URL (`https://raw.githubusercontent.com/dapr/cli/master/install/install.sh`) is correct per official documentation.
