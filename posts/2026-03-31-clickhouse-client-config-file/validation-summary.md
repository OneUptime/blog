# Validation Summary: How to Use clickhouse-client with Config File

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server)
- `clickhouse-client` CLI
- XML and YAML configuration formats
- Poco OpenSSL configuration (TLS certificate handling)
- Bash scripting / shell aliases

## Sources Consulted
- ClickHouse client config-path resolver: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/Config/getClientConfigPath.cpp
- Default `clickhouse-client.xml`: https://github.com/ClickHouse/ClickHouse/blob/master/programs/client/clickhouse-client.xml
- Client option parsing (`Client.cpp`): https://github.com/ClickHouse/ClickHouse/blob/master/programs/client/Client.cpp
- Connection parameters (`ConnectionParameters.cpp`): https://github.com/ClickHouse/ClickHouse/blob/master/src/Client/ConnectionParameters.cpp
- Default port constants (`Defines.h`): https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Defines.h
- ClickHouse configuration files docs: https://clickhouse.com/docs/operations/configuration-files
- `system.settings` table docs: https://clickhouse.com/docs/operations/system-tables/settings
- YAML config support PR (#21858, merged 2021-05-22, shipped in 21.6): https://github.com/ClickHouse/ClickHouse/pull/21858

## Issues Found

1. **Config file search order and locations were inaccurate.**
   - Original post listed `/etc/clickhouse-client/config.xml`, `~/.config/clickhouse-client/config.xml`, `./config.xml`, and claimed "later files override earlier ones."
   - In reality, `getClientConfigPath` searches: `./clickhouse-client.{xml,yaml,yml}` (note the basename is `clickhouse-client`, not `config`), then `$XDG_CONFIG_HOME/clickhouse-client/config.{xml,yaml,yml}`, then `~/.clickhouse-client/config.{xml,yaml,yml}`, then `/etc/clickhouse-client/config.{xml,yaml,yml}`. Only the first match is loaded — there is no merging across these locations.
   - Fixed: rewrote the section with the correct order, basename, and "first match wins" semantics. Also mentioned the `-C` short form of `--config-file`.

2. **YAML support version was wrong.** Post claimed "ClickHouse 22.4+". YAML config support was actually added in PR #21858 and shipped in **21.6** (June 2021). Fixed to "21.6+".

3. **`<verify>` is not a valid clickhouse-client config key.**
   - The post documented `<verify>true</verify>` and a top-level `<caConfig>` element. Neither is recognised by the client.
   - Correct keys live under `<openSSL><client>...`: `verificationMode` (`strict` / `relaxed` / `none`), `loadDefaultCAFile`, `caConfig`. There is also an `<accept-invalid-certificate>` shorthand and matching CLI flag.
   - Fixed: rewrote the TLS/HTTPS section to nest TLS options under `<openSSL><client>` (in both XML and YAML examples), removed the bogus `<verify>` rows, and added a sentence about the `--accept-invalid-certificate` shorthand.

4. **`max_threads` was listed as a client config key and shown at the top level of `<config>`.** It is a server/query setting, not part of the client config schema. To apply it per-session through the config, it must live inside a `<settings>` block.
   - Fixed: removed `max_threads` from the keys table (replaced with `accept-invalid-certificate` and a note that any server setting can go inside `<settings>`), and wrapped the example in `<settings>...</settings>`.

## Review Notes
- The `<config>` root element used throughout the post is correct for clickhouse-client config files. The server config uses `<clickhouse>` (with legacy `<yandex>` accepted) — the post does not conflate the two.
- Default ports 9000 (native TCP) and 9440 (native TCP + TLS) are correct.
- The `system.settings` query (`SELECT name, value FROM system.settings WHERE changed = 1`) is valid; note it shows session-level settings the user has overridden, not necessarily everything the config sets.
- `--config-file` also has an alias `--config` (`-c`, lowercase). Not strictly necessary to mention, but useful trivia.
- The post does not cover the `<connections_credentials>` named-connection feature added in more recent ClickHouse versions, which is the modern way to manage multiple environments inside a single config. Could be a future enhancement.
