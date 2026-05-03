# Validation Summary: How to Deploy Infisical Secrets Manager via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Infisical (self-hosted secrets manager)
- Portainer (Docker container management UI)
- Docker / Docker Compose
- PostgreSQL 14
- Redis 7
- Infisical CLI (npm and Debian/Cloudsmith installation)
- Infisical Python SDK (`infisicalsdk`)
- Node.js (used as the example application runtime)

## Sources Consulted
- Infisical self-hosting environment variables: https://infisical.com/docs/self-hosting/configuration/envars
- Official Infisical `docker-compose.prod.yml`: https://raw.githubusercontent.com/Infisical/infisical/main/docker-compose.prod.yml
- Infisical Docker Hub: https://hub.docker.com/r/infisical/infisical
- Infisical CLI overview: https://infisical.com/docs/cli/overview
- Infisical CLI npm package: https://www.npmjs.com/package/@infisical/cli
- Infisical Python SDK (PyPI): https://pypi.org/project/infisicalsdk/
- Infisical Python SDK source: https://github.com/Infisical/python-sdk-official
- Infisical Python SDK docs: https://infisical.com/docs/sdks/languages/python

## Issues Found
1. **Incorrect `AUTH_SECRET` generation command.** The post originally said `# generate with: openssl rand -hex 32`, but the official Infisical docs specify `openssl rand -base64 32`. Updated the comment to use `-base64 32`.
2. **Outdated Python SDK API.** The post used the legacy `infisical_client` package with `ClientSettings`, `InfisicalClient`, `GetSecretOptions`, and a `client.getSecret(...)` camelCase method. The current official Python SDK is `infisicalsdk` (import name `infisical_sdk`) and exposes `InfisicalSDKClient(host=...)`, machine-identity login via `client.auth.universal_auth.login(client_id=..., client_secret=...)`, and secret retrieval via `client.secrets.get_secret_by_name(secret_name=..., project_id=..., environment_slug=..., secret_path=...)`. Rewrote Step 5 to use the current SDK while keeping the example minimal and matching the post's tone.

## Review Notes
- The Docker image reference `infisical/infisical:latest` is technically valid, but Infisical's official compose file recommends pinning to a specific tag for production use. Left as-is to preserve the post's structure, but readers should consider pinning to a released tag.
- `infisical secrets --projectId your-project-id --env dev` and `infisical run --projectId ... --env ... --domain ... -- node server.js` use `--projectId` (camelCase), which matches the actual CLI flag names; this looked unusual but is correct.
- The Cloudsmith `setup.deb.sh` URL and the npm package `@infisical/cli` are both valid official distribution channels.
- `postgres:14` and `redis:7-alpine` are acceptable; the official compose uses `postgres:14-alpine` and an unpinned `redis`. No correctness issue.
- The post mentions environments `Development/Staging/Production` in the UI; Infisical's default environment slugs are `dev`, `staging`, `prod` — slugs in CLI/SDK calls were updated/kept consistent (`prod` in the Python example aligns with the default `prod` slug).
