# Validation Summary: How to Fix 'Error: SELF_SIGNED_CERT_IN_CHAIN'

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Node.js TLS and HTTPS
- Node.js built-in fetch / Undici
- Axios
- PostgreSQL node-postgres
- MongoDB Node.js driver
- MySQL2
- OpenSSL
- Docker / Alpine Linux
- Windows certificate store

## Sources Consulted
- Node.js TLS documentation: https://nodejs.org/api/tls.html
- Node.js CLI documentation for `NODE_EXTRA_CA_CERTS` and `NODE_USE_SYSTEM_CA`: https://nodejs.org/api/cli.html
- Node.js fetch with Undici guide: https://nodejs.org/learn/getting-started/fetch
- Undici Agent and Client documentation: https://github.com/nodejs/undici/blob/main/docs/docs/api/Agent.md and https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md
- Axios request config documentation: https://axios-js.com/docs/req_config
- node-postgres SSL documentation: https://node-postgres.com/features/ssl
- MongoDB Node.js driver TLS documentation: https://www.mongodb.com/docs/drivers/node/current/security/tls/
- MySQL2 connection documentation: https://sidorares.github.io/node-mysql2/docs/examples/connections/create-connection
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL `verify` documentation: https://docs.openssl.org/1.1.1/man1/verify/
- Docker CA certificates documentation: https://docs.docker.com/engine/network/ca-certs/
- RFC 8446, TLS 1.3 certificate message: https://datatracker.ietf.org/doc/html/rfc8446

## Issues Found
- The original built-in `fetch` example passed an `https.Agent` via `{ agent }`, which is not how Node's built-in fetch is customized. Updated it to use an Undici `Agent` passed as the `dispatcher`.
- The first JavaScript example redeclared `const response` twice and used top-level `await` with CommonJS `require()`. Wrapped the example in an async function and used distinct response variable names.
- The `NODE_EXTRA_CA_CERTS` description said it applies to all Node.js requests. Node.js ignores the default and extra CA stores when a TLS/HTTPS client explicitly sets `ca`, so the wording was narrowed.
- The certificate extraction section claimed the last certificate returned by `openssl s_client -showcerts` is the root CA. TLS servers commonly omit root certificates, so the text now says to ask an administrator for the root CA and treats the last sent certificate as often being an intermediate.
- The raw `tls.connect()` inspection snippet did not set SNI. Added `servername: host`, matching Node.js documentation that `tls.connect()` does not enable SNI by default.
- The Docker system trust-store example implied updating Alpine's CA store alone would make Node trust the CA. Added `NODE_EXTRA_CA_CERTS` so Node extends its own default CA set.
- The Windows note implied adding a CA to the Windows system store is sufficient for Node.js. Clarified that Node should still use explicit CA configuration or `NODE_EXTRA_CA_CERTS`, with `NODE_USE_SYSTEM_CA=1` only on Node.js versions that support it.

## Review Notes
The database client snippets use documented TLS/SSL option names. The `ca` option on Node.js TLS clients replaces the default CA list for that connection context; `NODE_EXTRA_CA_CERTS` is often better when the goal is to extend Node's default trust set across an application.
