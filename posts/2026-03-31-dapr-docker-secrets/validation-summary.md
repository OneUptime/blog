# Validation Summary: How to Use Docker Secrets with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (v1.13.0)
- Docker Swarm / Docker Secrets
- Redis (7.x Alpine)
- Python
- Docker Compose / Docker Stack

## Sources Consulted
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis Docker image secrets support discussion: https://github.com/redis/docker-library-redis/issues/268
- Dapr local file secret store component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/file-secret-store/
- Dapr component secrets documentation: https://docs.dapr.io/operations/components/component-secrets/
- Dapr daprd CLI reference (flag changes in 1.11+): https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found

1. **Invalid Redis `--requirepass_file` flag (line 114):** Redis does not support a `--requirepass_file` command-line option. This flag does not exist in any Redis version. The official Redis Docker image also does not support `_FILE` suffixed environment variables (unlike MySQL/PostgreSQL images). Fixed by replacing the array-style command with a shell command that reads the secret file using command substitution: `sh -c "redis-server --requirepass $$(cat /run/secrets/redis_password)"`.

2. **Deprecated `--components-path` flag (line 105):** The `--components-path` flag for `daprd` was renamed to `--resources-path` in Dapr 1.11. Since the blog post uses `daprio/daprd:1.13.0`, the deprecated flag name was updated to `--resources-path` to match current Dapr conventions.

## Review Notes
- The `version: "3.9"` field in the Docker Compose file is technically deprecated in Docker Compose v2 but is still recognized by `docker stack deploy`, which is the deployment method used in this post. This is acceptable.
- The blog creates individual Docker secrets (`redis_password`, `external_api_key`) but the Docker Stack file references a `dapr_secrets_file` secret that would need to be a combined JSON file. The blog does not show how to create this combined secret (e.g., `docker secret create dapr_secrets_file ./dapr-secrets.json`). This is a narrative gap but not a technical error.
- The `auth` block in the statestore component YAML is placed at the root level (same level as `spec`), which is consistent with the Dapr component schema and official documentation examples.
- The Python code example is syntactically correct and uses a sound pattern for reading Docker secrets from the filesystem.
