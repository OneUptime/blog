# Validation Summary: How to Deploy Infisical Secrets Manager via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Infisical
- Docker
- Docker Compose
- Kubernetes
- Python
- Node.js

## Sources Consulted
- Infisical self-hosting with Docker Compose: https://infisical.com/docs/self-hosting/deployment-options/docker-compose
- Infisical standalone Docker deployment: https://infisical.com/docs/self-hosting/deployment-options/standalone-infisical
- Infisical self-hosted environment variables: https://infisical.com/docs/self-hosting/configuration/envars
- Infisical CLI install overview: https://infisical.com/docs/cli/overview
- Infisical CLI login command: https://infisical.com/docs/cli/commands/login
- Infisical CLI run command: https://infisical.com/docs/cli/commands/run
- Infisical CLI export command: https://infisical.com/docs/cli/commands/export
- Infisical Docker integration overview: https://infisical.com/docs/integrations/platforms/docker-intro
- Infisical Docker run pattern: https://infisical.com/docs/integrations/platforms/docker-pass-envs
- Infisical Docker entrypoint pattern: https://infisical.com/docs/integrations/platforms/docker
- Infisical Kubernetes Agent Injector: https://infisical.com/docs/integrations/platforms/kubernetes-injector
- Infisical Node.js SDK: https://infisical.com/docs/sdks/languages/node
- Infisical Python SDK: https://infisical.com/docs/sdks/languages/python
- Docker Docs: Set environment variables with Compose `env_file`: https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- Docker Docs: Compose file reference: https://docs.docker.com/compose/compose-file/

## Issues Found
- The self-hosted Portainer stack was based on an older Infisical architecture using MongoDB. Current Infisical self-hosting uses PostgreSQL plus Redis, and the server expects `DB_CONNECTION_URI` rather than `MONGO_URL`, so I replaced the stack example accordingly.
- The original stack did not wait for the database to become healthy before starting Infisical. I updated `depends_on` and added the PostgreSQL health check to match current deployment guidance.
- The Alpine CLI installation commands used an outdated repository bootstrap script. I replaced them with the current Infisical CLI install flow from the CLI documentation.
- The self-hosted CLI setup omitted domain configuration, which would cause subsequent CLI commands to target US Cloud by default. I added `INFISICAL_API_URL` before `infisical login`.
- The post used `infisical secrets --export`, but the current CLI uses `infisical export` for exporting secrets. I corrected those commands.
- The `infisical run -- docker run ...` example would not inject secrets into the container as written because `docker run` does not automatically pass the parent process environment through. I replaced it with the documented `docker run --env-file <(infisical export --format=dotenv)` pattern.
- The `docker-compose` command is legacy, and the example also implied Compose services would receive secrets directly from `infisical run`. I removed that incorrect pattern and replaced it with a valid container startup approach that assumes the image runs `infisical run` internally.
- The Kubernetes example used `infisical/infisical:latest` as an init container and invoked `infisical agent` directly, which does not match current Kubernetes guidance. I replaced it with the current Infisical Agent Injector pattern using pod annotations plus a ConfigMap.
- The Kubernetes Deployment snippet was also incomplete as Kubernetes YAML because it lacked a selector and labels. I added the required fields.
- The Python SDK example used the wrong package import and outdated client/method names. I updated it to the current `infisical_sdk` client and current secrets API.
- The Node.js SDK example used an outdated class and method names. I updated it to the current `InfisicalSDK` client and current authentication and secrets APIs.
- The Portainer pipeline example attempted to populate `env_file` from a mounted container path, but Compose resolves `env_file` paths relative to the Compose file on the host. I replaced that pattern with a valid Compose service definition that passes `INFISICAL_TOKEN` into an image that starts via `infisical run`.

## Review Notes
- The post still uses `:latest` tags for Infisical and application images. These tags are valid, but Infisical recommends pinning specific versions in production.
- The Docker `--env-file <(infisical export ...)` pattern requires a shell that supports process substitution and does not work well for multiline secrets; that is a limitation of Docker's `--env-file` handling rather than Infisical itself.
- The updated Node.js SDK snippet reflects the current `@infisical/sdk` API, whose v5 line requires Node.js 20 or newer.
