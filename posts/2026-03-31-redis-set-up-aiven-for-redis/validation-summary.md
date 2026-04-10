# Validation Summary: How to Set Up Aiven for Redis

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Aiven for Valkey (formerly Aiven for Redis / Aiven for Caching)
- Redis / Valkey
- redis-cli
- Node.js with ioredis
- Python with redis-py
- Aiven CLI (`avn`)
- TLS/SSL certificate configuration

## Sources Consulted
- Aiven official documentation: https://aiven.io/docs/products/valkey
- Aiven blog on Redis to Caching rebrand: https://aiven.io/blog/aiven-for-redis-becomes-aiven-for-caching
- Aiven end-of-life reference: https://aiven.io/docs/platform/reference/end-of-life (Aiven for Caching EOL March 31, 2025, migrated to Aiven for Valkey)
- Aiven CLI docs: https://aiven.io/docs/tools/cli/service/user and https://aiven.io/docs/tools/cli/service-cli
- Aiven pricing: https://aiven.io/pricing
- ioredis documentation: https://github.com/redis/ioredis
- redis-py documentation: https://github.com/redis/redis-py

## Issues Found

1. **Outdated product name "Aiven for Redis"**: Aiven rebranded from "Aiven for Redis" to "Aiven for Caching" in May 2024, and then migrated all remaining services to "Aiven for Valkey" when Aiven for Caching reached end-of-life on March 31, 2025. Updated body text references to "Aiven for Valkey" and noted it is a Redis-compatible service. The H1 title was left unchanged as it is tied to the post URL/path.

2. **Hobbyist plan described as free (line 18)**: The Aiven Hobbyist plan is a paid tier, not free. Aiven offers a separate "Free" plan for Valkey. Changed `Hobbyist` to `Free` plan reference.

3. **Service type selection (line 16)**: The Aiven Console now shows "Valkey" not "Redis" as the service type. Changed "choose **Redis**" to "choose **Valkey**".

4. **Incorrect redis-cli prompt (lines 54-59)**: The prompt showed `127.0.0.1:port>` which is wrong when connecting to a remote Aiven host via `-h <host>`. Changed to `<host>:<port>>` to match the placeholder style used elsewhere in the post.

5. **Unused `import ssl` in Python example (line 95)**: The `ssl` module was imported but never used in the code. The `redis.Redis()` constructor handles SSL internally via the `ssl=True` parameter. Removed the unused import.

## Review Notes
- The Python `client.get("greeting")` call returns bytes (`b'hello from aiven'`) by default. Adding `decode_responses=True` to the `redis.Redis()` constructor would return strings instead, which may be less surprising for readers. Not changed as the code is technically correct.
- The `avn service user-creds-download` command uses `--project` as a flag, which works as a global Aiven CLI flag but is not specifically documented for this subcommand. The canonical approach is to set the project context via `avn project switch` first. Not changed as the command works in practice.
- The `avn` CLI configuration parameter names (e.g., `redis_maxmemory_policy`) may eventually be renamed with a `valkey_` prefix as the Valkey transition matures. Currently the `redis_` prefixed names still work.
