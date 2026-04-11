# Validation Summary: How to Use Redis with Kong API Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7
- Kong API Gateway 3.5
- Docker Compose
- Kong rate-limiting plugin
- Kong proxy-cache plugin
- Python (redis-py client)

## Sources Consulted
- Kong Gateway declarative configuration documentation (https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/)
- Kong rate-limiting plugin documentation (https://docs.konghq.com/hub/kong-inc/rate-limiting/configuration/)
- Kong proxy-cache plugin documentation (https://docs.konghq.com/hub/kong-inc/proxy-cache/configuration/)
- Redis CLI documentation (https://redis.io/docs/latest/develop/tools/cli/)
- Docker Compose file reference (https://docs.docker.com/reference/compose-file/)

## Issues Found
No technical issues found.

## Review Notes
- The Python monitoring script assumes a Redis key format of `ratelimit:{ip}:minute:{epoch_minute}`. Kong's actual internal key format is an implementation detail that may differ or change between versions. The script is reasonable as an illustrative example, but readers should use `redis-cli KEYS "ratelimit:*"` first to discover the actual key format in their environment.
- The `grep X-Cache` command in the testing section will work, but Kong's proxy-cache plugin specifically sets the `X-Cache-Status` header (with values like `Hit`, `Miss`, `Bypass`). A more precise grep would be `grep X-Cache-Status`.
- The `version: "3.8"` field in the Docker Compose file is ignored by Docker Compose v2 (which is now the default). It still works but is considered obsolete. This is a cosmetic concern and does not affect functionality.
- The post does not cover Redis authentication (password/TLS), which would be required in production. This is acceptable for a tutorial-focused post.
- The flat Redis config parameters (`redis_host`, `redis_port`, etc.) used in the rate-limiting plugin are correct for Kong 3.5, but Kong 3.6+ is transitioning to a nested `redis` configuration block for this plugin as well. Readers using newer Kong versions should consult updated documentation.
