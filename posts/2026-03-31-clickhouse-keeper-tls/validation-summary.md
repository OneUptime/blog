# Validation Summary: How to Configure ClickHouse Keeper with TLS

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse Keeper
- ClickHouse server
- OpenSSL (CLI for cert generation; `<openSSL>` config block)
- Raft consensus protocol (Keeper inter-node)
- TLS / X.509 certificates

## Sources Consulted
- ClickHouse Keeper operations docs: https://clickhouse.com/docs/operations/clickhouse-keeper
- SSL/TLS for ZooKeeper/Keeper connections: https://clickhouse.com/docs/operations/ssl-zookeeper
- `system.zookeeper_connection` system table: https://clickhouse.com/docs/operations/system-tables/zookeeper_connection
- `clickhouse-keeper-client` source (`programs/keeper-client/KeeperClient.cpp` in the ClickHouse repository) for actual CLI flag names

## Issues Found

1. **Misleading "Default port assignments" section.** The post listed `9281` (TLS client port) and `9444` (TLS Raft port) as defaults. Per the official docs, `tcp_port_secure` has no documented default, and there is no separate TLS port for Raft at all — Raft TLS reuses the same `<port>` with `<secure>true</secure>` enabled at the quorum level. Rewrote the bullet list as "Port reference used in this guide", clarified `9281` is a convention, removed the bogus `9444` entry, and added an explanatory sentence about how Raft TLS works.

2. **Mermaid diagram showed a separate `Raft TLS Port 9444`.** Updated to `Raft Port 9234 TLS` to reflect that TLS reuses the same Raft port.

3. **`<openssl>` element name had wrong casing.** The official documented element is `<openSSL>` (camelCase). Corrected in both the Keeper config and the ClickHouse server config.

4. **Raft TLS configuration was wrong.** The post implied per-server Raft TLS via a separate `9444` port and described the `<openSSL><client>` block as configuring TLS for Raft peer connections. Replaced with the correct approach: a single `<secure>true</secure>` element directly inside `<raft_configuration>`, with `<port>` set back to `9234` (the standard example port). Also rewrote the explanatory paragraph after the config block to accurately describe what `<openSSL><server>` and `<openSSL><client>` are used for.

5. **`clickhouse-keeper-client` CLI flags were wrong.** The post used `--client-certificate-file`, `--client-certificate-private-key-file`, `--CA-file`, and `--secure 1`. The actual flags (per `KeeperClient.cpp`) are `--tls-cert-file`, `--tls-key-file`, `--tls-ca-file`, and `--secure` (a bare boolean flag, not `--secure 1`). Updated all four.

6. **Non-existent `secured` column on `system.zookeeper_connection`.** The post claimed a `secured` column shows whether TLS is in use. The documented schema has no such column. Replaced the SQL example with a query against existing columns and added guidance on confirming TLS via the configured port and the server log.

7. **Summary paragraph** updated to reflect the corrected `<openSSL>` casing, the Raft `<secure>true</secure>` requirement, and the bare `--secure` flag.

## Review Notes

- The `openssl req -new -x509 ...` and `openssl x509 -req ...` certificate generation steps are syntactically correct and produce a working self-signed CA and signed leaf cert.
- The `<verificationMode>relaxed</verificationMode>` value chosen by the author is one of the four valid Poco SSL verification modes (`none`, `relaxed`, `strict`, `once`). For production deployments, `strict` would be the more conservative choice; `relaxed` is acceptable but worth flagging as a future hardening opportunity.
- `requireTLSv1_2` is shown only on the server side. ClickHouse also supports `requireTLSv1_3` (and the deprecated 1.0/1.1 toggles). For new deployments, requiring TLS 1.3 where possible would be an additional hardening step.
- The certificate-rotation workflow described is essentially correct in spirit (bundle CAs in `caConfig`, roll leaf certs one node at a time), but real rotation typically also requires reloading or restarting Keeper on each node — Keeper does pick up some `config.d` changes on SIGHUP, but TLS material reload behavior can be version-dependent. Worth verifying against the specific ClickHouse version in use before relying on rolling restarts alone.
- The `ruok` / `imok` four-letter command works through `clickhouse-keeper-client` in recent versions and is fine as shown.
