# Validation Summary: How to Use ClickHouse with Gin (Go)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Go
- Gin (github.com/gin-gonic/gin)
- clickhouse-go/v2 native driver (github.com/ClickHouse/clickhouse-go/v2)

## Sources Consulted
- clickhouse-go repo and source: https://github.com/ClickHouse/clickhouse-go
- Options / Auth / Compression structs: https://github.com/ClickHouse/clickhouse-go/blob/main/clickhouse_options.go
- Driver interfaces (`driver.Conn`, `Rows`): https://github.com/ClickHouse/clickhouse-go/blob/main/lib/driver/driver.go
- Official SSL example (confirms TLS uses secure port, not 9000): https://github.com/ClickHouse/clickhouse-go/blob/main/examples/clickhouse_api/ssl.go
- ClickHouse Go integration docs: https://clickhouse.com/docs/en/integrations/go
- Gin framework docs: https://gin-gonic.com/docs/

## Issues Found
- **TLS config with plaintext port**: The original `db/clickhouse.go` set `Addr: []string{"localhost:9000"}` together with `TLS: &tls.Config{InsecureSkipVerify: true}`. Port 9000 is the plaintext native TCP port; TLS native TCP uses port 9440. Combining TLS config with port 9000 causes the driver to attempt a TLS handshake against a plaintext listener, which fails. Fix: removed the `TLS` block (and the now-unused `crypto/tls` import) so the localhost example connects over plaintext 9000 as intended. If the reader wants TLS, they should change the port to 9440 and configure TLS separately.

## Review Notes
- `clickhouse.Open`, `clickhouse.Options`, `clickhouse.Auth`, `clickhouse.Settings`, `clickhouse.Compression{Method: clickhouse.CompressionLZ4}`, and the `driver.Conn` return type all match the current clickhouse-go/v2 API.
- Positional `?` placeholders are supported by the driver, so `INTERVAL ? DAY` with the `days` argument is valid.
- `rows.Next()`, `rows.Scan(...)`, and `rows.Close()` match the `driver.Rows` interface.
- Minor style note (not fixed, not a technical error): `r.Run(":8080")` returns an error that is ignored; production code would typically log/handle it. Left as-is to preserve the author's tutorial-style brevity.
- `InsecureSkipVerify: true` is dropped along with the TLS block; if reintroduced for TLS, readers should be aware this disables certificate verification and is unsuitable for production.
