# Validation Summary: How to Fix 'Error: DEPTH_ZERO_SELF_SIGNED_CERT'

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Node.js HTTPS and TLS
- Node.js native fetch / Undici
- Axios
- PostgreSQL node-postgres
- MongoDB Node.js driver
- MySQL / mysql2
- Redis / ioredis
- OpenSSL
- Docker
- Kubernetes

## Sources Consulted
- Node.js TLS documentation: https://nodejs.org/api/tls.html
- Node.js command-line documentation for NODE_EXTRA_CA_CERTS: https://nodejs.org/api/cli.html#node_extra_ca_certsfile
- Node.js enterprise network configuration: https://nodejs.org/learn/http/enterprise-network-configuration
- Node.js global fetch documentation: https://nodejs.org/api/globals.html#fetch
- Undici documentation: https://undici.nodejs.org/
- Axios documentation: https://axios-js.com/docs/index.html
- node-postgres SSL documentation: https://node-postgres.com/features/ssl
- MongoDB Node.js driver TLS documentation: https://www.mongodb.com/docs/drivers/node/current/security/tls/
- MySQL encrypted connections documentation: https://dev.mysql.com/doc/en/using-encrypted-connections.html
- ioredis TLS documentation: https://github.com/redis/ioredis
- OpenSSL x509 documentation: https://docs.openssl.org/3.2/man1/openssl-x509/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The native `fetch` example used an `https.Agent` through an `agent` option. Node's global `fetch` uses Undici and expects a compatible `dispatcher`, so the example was changed to use an Undici `Agent` with TLS options passed under `connect`.
- The Axios/fetch example redeclared `const response` in the same scope and used top-level `await` with CommonJS `require()`. The example was wrapped in an async function and the response variables were renamed.
- The development-only Axios example used top-level `await` with CommonJS `require()`. It was wrapped in an async function.
- The programmatic certificate extraction example used top-level `await` with CommonJS `require()`. The usage example was changed to a promise chain.
- The Docker example installed the CA into the Alpine system certificate store but did not configure Node.js to use that additional CA. Since Node.js uses bundled CAs by default unless configured otherwise, the Dockerfile now sets `NODE_EXTRA_CA_CERTS` to the copied CA certificate.

## Review Notes
- The per-request `ca` examples are technically correct, but Node.js replaces the default CA list when the `ca` option is explicitly specified. If an application needs both public roots and a private CA in the same custom TLS context, it should include all required CAs.
