# Validation Summary: How to Configure Infisical for Secret Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Infisical self-hosting
- Infisical CLI
- Infisical Node.js SDK
- Infisical Python SDK
- Docker Compose
- Nginx and Certbot
- PostgreSQL and Redis
- Kubernetes and Helm
- Infisical Kubernetes Secrets Operator
- systemd

## Sources Consulted
- Infisical Docker Compose self-hosting documentation: https://infisical.com/docs/self-hosting/deployment-options/docker-compose
- Infisical cloud/self-hosted deployment model documentation: https://infisical.com/docs/documentation/getting-started/concepts/deployment-models
- Infisical self-hosted environment variables documentation: https://infisical.com/docs/self-hosting/configuration/envars
- Infisical CLI getting started documentation: https://infisical.com/docs/documentation/getting-started/cli
- Infisical CLI usage and domain configuration documentation: https://infisical.com/docs/cli/usage
- Infisical CLI secrets command documentation: https://infisical.com/docs/cli/commands/secrets
- Infisical project config documentation: https://infisical.com/docs/cli/project-config
- Infisical Node.js guide: https://infisical.com/docs/documentation/guides/node
- Infisical Python guide: https://infisical.com/docs/documentation/guides/python
- Infisical Python SDK documentation: https://infisical.com/docs/sdks/languages/python
- Infisical Kubernetes Operator documentation: https://infisical.com/docs/integrations/platforms/kubernetes
- Infisical InfisicalSecret CRD documentation: https://infisical.com/docs/integrations/platforms/kubernetes/infisical-secret-crd
- Infisical audit logs documentation: https://infisical.com/docs/documentation/platform/audit-logs
- Infisical audit logs API reference: https://infisical.com/docs/api-reference/endpoints/audit-logs/export-audit-log
- Official Infisical docker-compose.prod.yml: https://raw.githubusercontent.com/Infisical/infisical/main/docker-compose.prod.yml
- Official Infisical .env.example: https://raw.githubusercontent.com/Infisical/infisical/main/.env.example

## Issues Found
- The Docker Compose deployment flow used a cloned repository, `.env.example`, and `docker compose up -d` without the production compose file. Updated it to download `docker-compose.prod.yml` and `.env`, protect `.env`, and run `docker compose -f docker-compose.prod.yml ...`.
- The post said self-hosting provides the full platform without qualification. Updated this to reflect that the open-source core is available for self-hosting while some enterprise features require a commercial license.
- The environment variable example used obsolete JWT secret names and omitted required `AUTH_SECRET`, `DB_CONNECTION_URI`, and `REDIS_URL`. Replaced the JWT variables with the current required settings.
- The host Nginx setup conflicted with the default Docker Compose `80:8080` port mapping. Added a note to bind the backend to `127.0.0.1:8080:8080` when using host Nginx.
- Several examples used `production` as the environment slug. Updated examples to use Infisical's current `prod` slug.
- The Debian/Ubuntu CLI repository URL used the older Cloudsmith path. Updated it to the current `artifacts-cli.infisical.com` setup script and added `apt-get update`.
- The Node.js SDK example used the old `InfisicalClient`/token API and top-level `await` in CommonJS. Updated it to `InfisicalSDK`, Universal Auth, `client.secrets().getSecret`, `secretPath`, and a syntactically valid async wrapper.
- The Python SDK example used the wrong package/import and older client API. Updated it to `infisicalsdk`, `InfisicalSDKClient`, Universal Auth, and `get_secret_by_name`.
- The Kubernetes Operator chart name and CRD fields were outdated. Updated the chart to `secrets-operator`, added `helm repo update`, added the Kubernetes service-token Secret command, moved scope under `authentication.serviceToken.secretsScope`, added `hostAPI`, and replaced deprecated `managedSecretReference` with `managedKubeSecretReferences`.
- The audit log section implied audit logs are always available and used the wrong API path/query parameter. Added the plan/license caveat and changed the API endpoint to `/api/v1/organization/audit-logs?projectId=...`.
- Backup and restore commands referenced a non-existent `infisical-postgres` container for the current compose file. Updated them to use `docker compose -f docker-compose.prod.yml exec -T db`.

## Review Notes
- The guide is technically relevant and remains a valid self-hosted Infisical tutorial after corrections.
- For larger production deployments, Infisical's own Docker Compose documentation notes that the compose setup is not intended for high-availability production scenarios; Kubernetes or external managed PostgreSQL/Redis should be considered for that use case.
