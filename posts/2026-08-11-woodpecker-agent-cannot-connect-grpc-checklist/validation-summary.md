# Validation Summary: Woodpecker Agent Cannot Connect to the Server: A gRPC Address, Token, and TLS Checklist

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Woodpecker CI 3.17 server and agent
- gRPC over HTTP/2 and cleartext HTTP/2 (h2c)
- TLS, X.509 certificate verification, SNI, and ALPN
- Docker Compose service networking, secrets, and persistent volumes
- Caddy and Traefik reverse proxies
- Linux DNS and TCP diagnostics
- OpenSSL certificate and random-secret commands
- Woodpecker system-agent tokens, per-agent tokens, agent identity, and gRPC JWT signing

## Sources Consulted
- [Woodpecker 3.17 agent configuration](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/docs/docs/30-administration/10-configuration/30-agent.md)
- [Woodpecker 3.17 server configuration](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/docs/docs/30-administration/10-configuration/10-server.md)
- Woodpecker 3.17 tagged implementation for the [agent flags](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cmd/agent/core/flags.go), [agent startup and registration flow](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cmd/agent/core/agent.go), [gRPC dial and TLS configuration](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/agent/rpc/dial.go), and [agent config-file persistence](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cmd/agent/core/config.go)
- Woodpecker 3.17 tagged implementation for [agent authentication](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/rpc/auth_server.go), [gRPC JWT signing](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/rpc/jwt_manager.go), and [server gRPC startup](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cmd/server/grpc_server.go)
- Woodpecker 3.17 tagged implementation for the [agent health endpoint](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cmd/agent/core/health.go), [local health state](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/agent/state.go), and [gRPC protocol](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/rpc/proto/woodpecker.proto)
- [Woodpecker migration guide](https://woodpecker-ci.org/migrations#next), the [`GRPC_SKIP_VERIFY` rename change](https://github.com/woodpecker-ci/woodpecker/commit/26a6818973d73cc449a3c9cc3861fcd3e11afc98), and the [Woodpecker 3.17.0 release](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0)
- [Woodpecker Docker Compose installation](https://woodpecker-ci.org/docs/administration/installation/docker-compose), [container-image variants](https://woodpecker-ci.org/docs/administration/general#container-images), and the [v3.17 scratch agent Dockerfile](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/docker/Dockerfile.agent.multiarch)
- [Woodpecker reverse-proxy examples](https://woodpecker-ci.org/docs/administration/configuration/server#reverse-proxy), [Caddy `reverse_proxy` documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), and [RFC 9113 HTTP/2 connection establishment](https://www.rfc-editor.org/rfc/rfc9113.html#name-starting-http-2)
- [Docker Compose secrets reference](https://docs.docker.com/reference/compose-file/secrets/) and [Compose networking documentation](https://docs.docker.com/compose/how-tos/networking/)
- [`urfave/cli` v3.10.1 value-source precedence](https://github.com/urfave/cli/blob/v3.10.1/value_source.go), the version pinned by Woodpecker 3.17
- [OpenSSL `s_client` documentation](https://docs.openssl.org/3.5/man1/openssl-s_client/) and [OpenSSL `rand` documentation](https://docs.openssl.org/3.5/man1/openssl-rand/)
- Go standard-library documentation for [`tls.Config.InsecureSkipVerify`](https://pkg.go.dev/crypto/tls#Config) and [`x509.Certificate.VerifyHostname`](https://pkg.go.dev/crypto/x509#Certificate.VerifyHostname)

## Issues Found
- The TLS examples stated that stable 3.17 `WOODPECKER_GRPC_VERIFY=true` verifies the server certificate. The tagged implementation passes that value directly to Go's `tls.Config.InsecureSkipVerify`, so `true` disables both chain and hostname verification and `false` enables them. All stable examples, prose, the checklist, and the conclusion now use `WOODPECKER_GRPC_VERIFY=false`. The post also now warns that the 3.17 default is the insecure value `true`.
- The `next` migration was described as inverting both the setting's name and truth value. The migration only changes the misleading name to `WOODPECKER_GRPC_SKIP_VERIFY`; the boolean behavior remains the same. The comparison now correctly says that `false` verifies under both names and `true` skips verification.
- The original `openssl s_client` command advertised SNI and ALPN but did not enforce hostname matching and would continue after certificate-chain errors. It now includes `-verify_hostname` and `-verify_return_error`, and it explicitly requires the diagnostic environment to use the same CA trust store as the agent.
- The certificate checklist allowed the subject or SAN to contain the hostname. Woodpecker uses Go TLS verification, which ignores the legacy Common Name. The checklist now requires a matching DNS SAN.
- The secret troubleshooting list said a direct `WOODPECKER_AGENT_SECRET` could override `WOODPECKER_AGENT_SECRET_FILE`. In 3.17, both the agent and server put the file source first in an ordered `urfave/cli` value-source chain. The post now says a readable file wins and warns that a bad file path can fall back to a stale direct value.
- The post said a read-only or unwritable agent-config mount could prevent registration from completing. The 3.17 agent logs config-write failures but continues registration. The text now correctly says the current registration can succeed while the registered ID remains unpersisted.
- The post broadly recommended tuning the documented gRPC keepalive settings. In 3.17, the flags are declared as `keepalive-time` and `keepalive-timeout`, but the connection setup reads nonexistent `grpc-keepalive-time` and `grpc-keepalive-timeout` names, so user-supplied values are not applied. The section now records that version-specific wiring bug and tells readers not to rely on those settings until their release fixes it.
- The DNS, TCP, and OpenSSL commands could not be run inside the stock `v3.17.0` scratch agent image because it has no shell or diagnostic programs. The post now directs readers to the agent network namespace or a diagnostic container on the same network. It also replaces application-level "streaming connections" wording with the more precise long-lived gRPC requests and HTTP/2 connections; the 3.17 protocol defines unary, sometimes blocking RPCs rather than streaming RPC methods.

## Review Notes
- The Woodpecker 3.17 agent reference page itself describes `WOODPECKER_GRPC_VERIFY` as though `true` enabled verification. The tagged code and the project's own `next` migration note explicitly establish the opposite behavior, so the implementation and migration were used for this security-sensitive correction.
- The exact Docker Compose excerpt validates successfully. Its service-name DNS, secret mounts, `command: agent`, gRPC port, and later persistent agent-config volume are valid.
- The default HTTP port 8000, gRPC port 9000, `WOODPECKER_SERVER` host-and-port format, `unix://` support, plaintext/TLS selection, Caddy h2c target, and Traefik h2c service configuration are correct for 3.17.
- The system-token and per-agent-token registration models, agent ID persistence, health endpoint behavior, initial connection retry settings, reconnect timeout, server-only gRPC signing secret, HA sharing requirement, and signing-secret rotation behavior all match the tagged implementation.
- Server and agent releases do not require exact SemVer equality; the agent checks Woodpecker's numeric gRPC protocol version. Pinning both images to 3.17.0 remains sound operational guidance.
- All seven links in the post's Official Documentation section returned HTTP 200 and pointed to the intended resources during review.
