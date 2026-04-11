# Validation Summary: How to Use Redis CLI with TLS Connections

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (server and CLI)
- TLS/SSL encryption
- OpenSSL (for certificate verification)
- Bash scripting (wrapper script)

## Sources Consulted
- Redis source code (`src/redis-cli.c`) for CLI flag verification (`--tls`, `--cacert`, `--cert`, `--key`, `--insecure`, `--pass`)
- Redis `TLS.md` documentation for build instructions (`make BUILD_TLS=yes`)
- Redis source code (`src/server.c`) for `redis-server --version` output format and `INFO server` fields
- Redis source code (`src/cli_common.c`) for `rediss://` URI scheme handling

## Issues Found

1. **Incorrect build flag syntax**: The post used `--BUILD_TLS=yes` but the correct syntax is `BUILD_TLS=yes` (a Make variable, not a CLI flag with dashes). Fixed to `BUILD_TLS=yes`.

2. **Ineffective TLS verification commands**: The post suggested `redis-cli INFO server | grep redis_build_id` and `redis-server --version` to verify TLS support. Neither of these actually indicates TLS support — `redis_build_id` is an opaque hash, and `redis-server --version` does not include TLS information in its output. Replaced with `redis-cli --help 2>&1 | grep "\-\-tls"`, which checks whether the `--tls` flag is available in the compiled binary.

3. **Non-existent CLI flag**: The post referenced `--tls-no-verify` for skipping certificate verification, but this flag does not exist in redis-cli. The correct flag is `--insecure`. Fixed accordingly.

## Review Notes
- All other redis-cli TLS flags (`--tls`, `--cacert`, `--cert`, `--key`) are correct.
- The `rediss://` URI scheme (double s) for TLS is correctly documented and verified against the Redis source.
- The `--pass` long form for `-a` is a valid alias, confirmed in the source code.
- Port 6380 as the conventional TLS port is a reasonable convention, though Redis does not mandate a specific port for TLS.
- The OpenSSL verification command is correct and useful.
- The wrapper script pattern is sound and practical.
