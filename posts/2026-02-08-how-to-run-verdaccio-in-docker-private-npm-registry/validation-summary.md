# Validation Summary: How to Run Verdaccio in Docker (Private npm Registry)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Verdaccio 6
- Docker
- Docker Compose
- npm
- Node.js
- Yarn
- pnpm
- GitHub Actions
- Nginx reverse proxy
- YAML, JSON, JavaScript, and `.npmrc` configuration

## Sources Consulted
- Verdaccio Docker documentation: https://www.verdaccio.org/docs/docker/
- Verdaccio configuration documentation: https://www.verdaccio.org/docs/configuration/
- Verdaccio logger documentation: https://www.verdaccio.org/docs/logger/
- Verdaccio npm setup documentation: https://www.verdaccio.org/docs/setup-npm/
- Verdaccio Yarn setup documentation: https://www.verdaccio.org/docs/setup-yarn/
- Verdaccio pnpm setup documentation: https://www.verdaccio.org/docs/setup-pnpm/
- Verdaccio package access documentation: https://www.verdaccio.org/docs/packages/
- Verdaccio uplinks documentation: https://www.verdaccio.org/docs/uplinks/
- Verdaccio reverse proxy documentation: https://www.verdaccio.org/docs/reverse-proxy/
- npm `adduser` documentation: https://docs.npmjs.com/cli/v11/commands/npm-adduser/
- npm config documentation: https://docs.npmjs.com/cli/using-npm/config/
- Yarn config documentation: https://yarnpkg.com/cli/config/set
- GitHub Actions `setup-node` documentation: https://github.com/actions/setup-node

## Issues Found
- The post said the Verdaccio web UI shows hosted and cached packages. Verdaccio's web UI is documented as displaying private packages, so the statement was changed to say it shows published private packages.
- The Verdaccio configuration used the older `logs` key. Verdaccio renamed this key to `log` in v5.22.0; `logs` is still compatible with v6 but not recommended and may be removed. The snippet now uses `log`.
- The npm login instructions used `npm adduser` without `--auth-type=legacy`. Current npm defaults to web auth, which Verdaccio does not support, and Verdaccio documents legacy auth for npm 9 and newer. The command now uses `npm adduser --registry http://localhost:4873 --auth-type=legacy`.
- The Verdaccio config labeled `middlewares.audit` as rate limiting. That middleware enables audit support, not rate limiting. The comment now says "Audit middleware."
- The Yarn/pnpm section implied `.npmrc` works with all package managers and used a Yarn Classic registry command for all Yarn versions. Verdaccio and Yarn document that Yarn modern uses `npmRegistryServer` and does not recognize `.npmrc`. The section now distinguishes Yarn Classic, Yarn modern, and npm/pnpm/Yarn Classic `.npmrc` behavior.

## Review Notes
- The Docker image tag `verdaccio/verdaccio:6`, `/verdaccio/storage`, `/verdaccio/conf`, and `/verdaccio/plugins` volume paths are consistent with Verdaccio's Docker documentation.
- The package access, uplink, `max_body_size`, `listen`, `server.keepAliveTimeout`, and reverse proxy examples are consistent with Verdaccio documentation.
- The GitHub Actions examples use `actions/setup-node@v4`, which remains a valid action version, although the current upstream README also documents newer examples with later action versions.
- A Verdaccio service started inside a single CI job provides only job-local caching unless storage is persisted outside that job.
