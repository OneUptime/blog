# Validation Summary: How to Implement Certificate Pinning for ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse server and `clickhouse-client`
- OpenSSL / Poco NetSSL (ClickHouse's TLS layer)
- ClickHouse server `<openSSL>` XML configuration
- `clickhouse-connect` (Python client)
- `clickhouse-go` v2 driver (Go client)
- X.509 certificates, CA pinning, certificate rotation

## Sources Consulted
- ClickHouse SSL/TLS configuration docs: https://clickhouse.com/docs/operations/server-configuration-parameters/settings (openSSL section)
- ClickHouse command-line client docs: https://clickhouse.com/docs/interfaces/cli
- Poco NetSSL `Context::Params`: https://pocoproject.org/docs/Poco.Net.Context.html
- `clickhouse-connect` Python client docs: https://clickhouse.com/docs/integrations/python and https://github.com/ClickHouse/clickhouse-connect
- `clickhouse-go` v2 driver: https://github.com/ClickHouse/clickhouse-go
- OpenSSL `x509` command manpage (for fingerprint extraction)

## Issues Found

1. **Invalid server TLS option `<requireTLSv1_2>`** (server config snippet)
   - **Problem:** ClickHouse's documented `<openSSL>` XML config keys do not include `requireTLSv1_2`. While Poco's underlying `Context::Params` struct has this field, ClickHouse's SSLManager XML parser does not expose it as a recognized key.
   - **Fix:** Replaced with `<disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>`, which is explicitly documented and achieves the same effect (restricting to TLS 1.2+).

2. **Incorrect `clickhouse_connect.get_client()` parameter usage** (Python code)
   - **Problem:** The code passed `verify='/etc/ssl/certs/internal-ca.crt'`, but in `clickhouse-connect` `verify` is a strict boolean (default `True`) — the path to a CA bundle must be supplied via the separate `ca_cert` parameter. Passing a path to `verify` silently fails to configure the CA.
   - **Fix:** Changed to `verify=True, ca_cert='/etc/ssl/certs/internal-ca.crt'`.

3. **Non-existent `--openssl-config` flag on `clickhouse-client`** (verification step)
   - **Problem:** `clickhouse-client` has no `--openssl-config` command-line flag. Running that command would fail with an unknown-option error before even attempting TLS negotiation, masking what the example is trying to demonstrate. Real TLS-related flags are `--secure`, `--no-secure`, `--accept-invalid-certificate`, and `--config-file`.
   - **Fix:** Replaced with `--config-file /etc/clickhouse-client/untrusted-ca-config.xml`, which is the correct way to point the client at an alternate client XML config that references a different (untrusted) CA.

## Review Notes
- The Python example still instantiates an `ssl.SSLContext` that it does not pass to `get_client()`. It is not incorrect (the `ca_cert`/`verify` kwargs drive the actual behavior), but the `ssl_context` variable is effectively dead code and may mislead readers into thinking it is wired in. Left as-is to honor the "only fix technical errors" scope.
- The Go snippet uses an undefined helper `loadCACert(...)` as shorthand for loading a PEM file into an `*x509.CertPool`. This is conventional pseudocode in tutorials; left unchanged.
- `cipherList` value `TLSv1.3:HIGH:!aNULL:!MD5` — OpenSSL treats `TLSv1.3` as a protocol group here; for TLS 1.3 suites the idiomatic option is `Ciphersuites`, but `cipherList` with this string still parses without error and the `HIGH:!aNULL:!MD5` portion is a reasonable TLS 1.2 baseline. Non-blocking.
- Port 8443 is used for the HTTPS interface and 9440 for the native TLS interface — both correct in their respective examples.
- The fingerprint-extraction `openssl x509 -noout -fingerprint -sha256` command is correct.
- Certificate rotation workflow (sign new leaf cert with same internal CA, replace file, `systemctl reload clickhouse-server`) is accurate; ClickHouse supports hot certificate reload on `reload`/SIGHUP.
