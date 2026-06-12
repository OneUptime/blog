# Validation Summary: How to Secure NATS Connections

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- NATS Server
- NATS TLS and mutual TLS
- NATS NKey authentication
- NATS JWT operator/account/user authentication
- NSC and nk command-line tools
- NATS account resolver configuration
- JetStream encryption at rest
- nats.js
- nats.py
- nats.go
- OpenSSL certificate generation

## Sources Consulted
- NATS TLS configuration: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/tls
- NATS TLS mutual authentication: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/tls_mutual_auth
- NATS NKey authentication: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/nkey_auth
- NATS JWT authentication: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/jwt
- NATS account resolver configuration: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/jwt/resolver
- NATS authorization and response permissions: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/authorization
- NATS account isolation/imports/exports: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/accounts
- NATS clustering configuration: https://docs.nats.io/running-a-nats-service/configuration/clustering/cluster_config
- NATS OCSP stapling: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/ocsp
- NATS JetStream encryption at rest: https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/encryption_at_rest
- nats.py API documentation: https://nats-io.github.io/nats.py/modules.html
- nats.go package documentation: https://pkg.go.dev/github.com/nats-io/nats.go
- NATS Server v2.14.2 release binary and `nats-server -t`
- NSC v2.15.0 CLI help output
- nk v0.4.15 CLI help output
- nats.js 2.29.3 package type definitions

## Issues Found
- The certificate-generation section created only CA and server certificates, but later examples required mutual TLS client certificates. Added client key, CSR, clientAuth extension, and client certificate signing commands.
- The TLS server config comment said `verify_and_map: false` rejected clients without certificates. Corrected the comment because `verify: true` enforces client cert verification, while `verify_and_map` maps certificate identity to a NATS user.
- The TLS `curve_preferences` example used `P-256`, which `nats-server` does not accept. Changed it to `CurveP256`.
- Several example public NKeys were invalid. Replaced them with valid-format user public NKeys and updated the sample generated key pair.
- The Python NKey example imported `nats.nkeys`, passed a seed string through `nkeys_seed`, used sync callbacks where async callbacks are expected, and passed a dict as `tls`. Updated it to use `ssl.SSLContext`, `nkeys_seed_str`, and async callbacks.
- The NSC operator setup created no system account while later configs referenced one. Updated the operator creation command to use `--generate-signing-key --sys`.
- The account export example described a stream/pub-sub export but created a service export. Removed `--service` so it creates a stream export.
- JWT TLS wording said TLS was mandatory for JWT authentication. Changed it to strongly recommended, because JWT authentication is supported independently but should be protected with TLS in production.
- The complete production config used `verify_and_map: true` alongside JWT auth. Changed it to `false` so client cert verification remains mTLS validation rather than certificate identity mapping.
- The cluster route authentication example used an unsupported `nkey` field. Replaced it with username/password route authentication.
- Explicit cluster route URLs omitted credentials even though explicit routes require credentials in the URL. Added route credentials to the route URLs.
- The monitoring example labeled `stats.inMsgs` as `connections`. Removed the incorrect connection metric and kept message/byte/reconnect counters.

## Review Notes
- JavaScript and Python snippets were syntax-checked locally.
- NATS configuration snippets were validated with `nats-server v2.14.2 -t` after substituting temporary valid certificate and JWT paths.
- Go snippets were reviewed against `nats.go` documentation, but Go compilation was not run because Go is not installed in this environment.
