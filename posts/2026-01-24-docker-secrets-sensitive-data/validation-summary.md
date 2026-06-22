# Validation Summary: How to Use Docker Secrets for Sensitive Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Swarm secrets
- Docker Compose secrets
- Docker BuildKit build secrets
- Dockerfile syntax
- Python
- Node.js
- HashiCorp Vault Agent
- AWS Secrets Manager and AWS CLI
- Linux file permissions and inotify tools

## Sources Consulted
- Docker Docs: Manage sensitive data with Docker secrets - https://docs.docker.com/engine/swarm/secrets/
- Docker Docs: Manage secrets securely in Docker Compose - https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Docs: Build secrets - https://docs.docker.com/build/building/secrets/
- Docker Docs: Dockerfile reference, `RUN --mount=type=secret` - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Compose file reference, services `command` and `depends_on` - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose `version` top-level element obsolete - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI help from local Docker 29.4.2 for `docker secret create`, `docker service create --secret`, and `docker build --secret`
- HashiCorp Vault Docs: Vault Agent - https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent
- HashiCorp Vault Docs: Vault Agent AppRole auto-auth - https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/approle
- AWS CLI Command Reference: `secretsmanager get-secret-value` - https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/get-secret-value.html

## Issues Found
- The first `docker secret create` example was labeled "from a file" while it reads from standard input using `-`. Changed the comment to "from standard input" to match Docker CLI behavior.
- Compose snippets used the obsolete top-level `version: '3.8'` field. Removed those lines because Docker Compose now treats `version` as informative only and warns that it is obsolete.
- The BuildKit npm example mounted `$HOME/.npmrc` but read it as an `NPM_TOKEN` environment value. Changed it to mount the `.npmrc` file directly at `/root/.npmrc` with `RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci`, matching Docker's secret mount behavior and npm's config-file expectations.
- The Vault Agent Compose example used Kubernetes auto-auth in a non-Kubernetes Compose sidecar. Changed the example to use AppRole auto-auth with role ID and secret ID files mounted into the Vault Agent container.
- The AWS Secrets Manager Compose example used shell redirection in `command` without explicitly running a shell. Added `entrypoint: ["/bin/sh", "-c"]` and changed the command to call `aws secretsmanager get-secret-value ... > /secrets/config.json`.
- The AWS section heading called the helper an init container, which is a Kubernetes term. Changed it to "Startup Service" to match Docker Compose semantics.
- The Python logging redaction snippet used `os.environ` without importing `os` and included an empty-string pattern when `API_KEY` was unset. Added `import os`, filtered empty patterns, and reset `record.args` after replacing the formatted message.

## Review Notes
- Verified representative Compose snippets with `docker compose config`.
- Verified Python examples parse with `python3` and the Node.js example parses with Node.js.
- Docker Compose file-based secrets for local development are useful but are not equivalent to Swarm's encrypted-at-rest secret store; the post's wording distinguishes Swarm secrets from local Compose file-based secrets.
