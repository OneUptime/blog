# Validation Summary: How to Fix 'Error: CERT_HAS_EXPIRED' in Node.js

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Node.js HTTPS and TLS APIs
- Node.js built-in fetch and Undici
- OpenSSL
- Certbot and Let's Encrypt certificate renewal
- Linux and macOS CA certificate stores
- Docker Node.js images
- Kubernetes hostPath volumes
- node-cron

## Sources Consulted
- Node.js HTTPS documentation: https://nodejs.org/api/https.html
- Node.js TLS documentation: https://nodejs.org/api/tls.html
- Node.js Fetch with Undici guide: https://nodejs.org/learn/getting-started/fetch
- Undici Agent documentation: https://github.com/nodejs/undici/blob/main/docs/docs/api/Agent.md
- Undici Client documentation: https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md
- Certbot user guide: https://eff-certbot.readthedocs.io/en/latest/using.html
- Kubernetes volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Node.js releases page: https://nodejs.org/en/about/previous-releases
- Docker Node official image documentation: https://hub.docker.com/_/node
- node-cron getting started documentation: https://www.nodecron.com/getting-started.html

## Issues Found
- The built-in `fetch` examples passed an `https.Agent` via `{ agent }`, which is not how Node.js built-in fetch customizes TLS. Updated those examples to use Undici's `Agent` as a `dispatcher` with `connect` TLS options.
- The retry example checked only `error.code`, but Node.js built-in fetch reports TLS failures such as `CERT_HAS_EXPIRED` on `error.cause.code`. Updated the check to handle both `error.code` and `error.cause?.code`.
- Several CommonJS-style examples used top-level `await`, which is not syntactically valid in a normal CommonJS script. Wrapped those usage examples in async IIFEs.
- The Dockerfile used `node:18-alpine`, but Node.js 18 is end-of-life as of the review date. Updated the base image to `node:lts-alpine`.
- The Kubernetes YAML was a partial Deployment fragment but was introduced as if it were a complete manifest. Clarified that it is a pod-template fragment and added an ellipsis comment.

## Review Notes
The advice to disable certificate validation remains technically possible but risky; the post correctly limits it to temporary, trusted internal-service scenarios. The Kubernetes `hostPath` example is valid as a fragment, but production clusters should prefer safer certificate distribution mechanisms where possible.
