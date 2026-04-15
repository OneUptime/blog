# Validation Summary: How to Use ClickHouse Native Protocol vs HTTP Protocol

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- ClickHouse (native TCP protocol and HTTP interface)
- clickhouse-driver (Python native protocol client)
- clickhouse-connect (Python HTTP-based client)
- clickhouse-sqlalchemy (SQLAlchemy dialect for ClickHouse)
- curl (HTTP interface usage)
- Python requests library

## Sources Consulted
- [ClickHouse Network Ports documentation](https://clickhouse.com/docs/guides/sre/network-ports) — verified default ports 9000 (native), 8123 (HTTP), 8443 (HTTPS)
- [ClickHouse Native Interface (TCP) documentation](https://clickhouse.com/docs/interfaces/tcp) — verified native protocol features and progress notifications
- [ClickHouse HTTP Interface documentation](https://clickhouse.com/docs/interfaces/http) — verified HTTP interface features and supported formats
- [ClickHouse Server Packets (Native Protocol)](https://clickhouse.com/docs/native-protocol/server) — verified Progress packet support
- [ClickHouse Formats documentation](https://clickhouse.com/docs/interfaces/formats) — verified JSON, CSV, TSV, Parquet support
- [clickhouse-driver documentation](https://clickhouse-driver.readthedocs.io/) — verified Client API, execute() return values with with_column_types
- [clickhouse-connect documentation](https://clickhouse.com/docs/integrations/python) — verified get_client() API, compress parameter, secure parameter
- [clickhouse-connect PyPI](https://pypi.org/project/clickhouse-connect/) — confirmed HTTP-only transport
- [clickhouse-sqlalchemy documentation](https://clickhouse-sqlalchemy.readthedocs.io/) — verified clickhouse+http and clickhouse+native dialect URLs
- [clickhouse-sqlalchemy connection configuration](https://clickhouse-sqlalchemy.readthedocs.io/en/latest/connection.html) — verified URL scheme format

## Issues Found

1. **Stray import in native protocol code block**: The native protocol Python example (line 24) contained `import clickhouse_connect`, which is unrelated to the `clickhouse_driver` code being demonstrated. This unused import would confuse readers into thinking `clickhouse_connect` is needed for native protocol usage. **Fixed**: Removed the stray import line.

2. **Inaccurate compression comment**: The comment on the `compress=True` parameter stated "enables LZ4 compression over HTTP". In reality, `compress=True` enables LZ4 compression for inserts but the server typically responds with zstd for query results. **Fixed**: Updated comment to "enables compression over HTTP (LZ4 for inserts, zstd for query responses)".

## Review Notes
- All port numbers (9000 native, 8123 HTTP, 8443 HTTPS) are correct per official ClickHouse documentation.
- The native protocol progress notification claim is accurate — the native protocol specification includes a dedicated Progress server packet.
- The clickhouse-driver `execute()` return value with `with_column_types=True` correctly returns a 2-tuple of (rows, column_info).
- The SQLAlchemy dialect URLs (`clickhouse+http` and `clickhouse+native`) are correct per clickhouse-sqlalchemy documentation.
- The `compress=True` parameter in clickhouse-connect is actually the default value, so it doesn't strictly need to be set explicitly, but showing it is fine for educational purposes.
- The post does not mention port 9440 (secure native TCP with TLS), which is the TLS counterpart to port 9000, analogous to how 8443 is the TLS counterpart to 8123. This could be a useful addition in a future update but is not an error.
