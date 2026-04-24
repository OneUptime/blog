# Validation Summary: How to Use Portainer Environment Variables for Secrets - Environment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- Docker Compose
- Docker Swarm
- Docker secrets
- Environment variables
- Podman

## Sources Consulted
- Portainer Docs: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docs: Environment Variable Management in Docker: .env vs. stack.env - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Portainer Docs: API documentation - https://docs.portainer.io/api/docs
- Portainer API schema (CE 2.39.1) - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Docs: Encrypting the Portainer database - https://docs.portainer.io/advanced/db-encryption
- Docker Docs: Interpolation - https://docs.docker.com/reference/compose-file/interpolation/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Best practices for working with environment variables in Docker Compose - https://docs.docker.com/compose/how-tos/environment-variables/best-practices/
- Docker Docs: Manage sensitive data with Docker secrets - https://docs.docker.com/engine/swarm/secrets/

## Issues Found
- The post claimed Portainer supports host-level environment variables for all stacks and showed a `PUT /api/endpoints/1` payload with an `Env` field. The current Portainer API schema for `/endpoints/{id}` does not support that field, so I replaced this section with Portainer's documented `stack.env` and `env_file` workflow for Docker Standalone and Podman.
- The description and introduction referred to "environment-level" secrets. I corrected that wording to match Portainer's documented stack-scoped environment variable features.
- The post stated that stack environment variable values are stored encrypted in Portainer's database. Portainer documents database encryption as an optional feature, so I changed this to say the values are stored in Portainer's database and added the correct note about enabling database encryption for encryption at rest.
- The "Masking Variables in Portainer" section described functionality that is not reflected in the documented stack API payload. I renamed the section to accurately describe creating a stack with environment variables through the API.
- The API example used `StackFileContent: "..."`, which would not deploy. I replaced it with a minimal valid Compose payload string.
- The Compose examples used the top-level `version` field. Docker now documents that field as obsolete, so I removed it from the examples.
- The auditing script iterated with `s.get('Env', [])`, which still returns `None` when the `Env` key is present but null. I changed it to `s.get('Env') or []` so the example works with Portainer's API responses.
- The mixed YAML and shell example in "Preventing Secret Leakage" was labeled as `bash`. I relabeled it as `text` so the snippet is not presented as a directly executable shell script.

## Review Notes
- Docker's current guidance is still to use secrets for sensitive values when possible; environment variables remain a practical compromise rather than the preferred mechanism for high-sensitivity production data.
- `env_file: - stack.env` is documented for Docker Standalone and Podman, but not for Docker Swarm because `docker stack deploy` does not support `env_file`.
