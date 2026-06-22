# Validation Summary: How to Migrate Redis Data Between Servers

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Redis
- Redis CLI
- Redis replication
- Redis RDB persistence
- Redis MIGRATE, DUMP, RESTORE, REPLICAOF, PTTL, INFO, and CONFIG commands
- Python with redis-py
- Node.js with ioredis
- Bash, SSH, and SCP

## Sources Consulted
- Redis MIGRATE command documentation: https://redis.io/docs/latest/commands/migrate/
- Redis DUMP command documentation: https://redis.io/docs/latest/commands/dump/
- Redis RESTORE command documentation: https://redis.io/docs/latest/commands/restore/
- Redis REPLICAOF command documentation: https://redis.io/docs/latest/commands/replicaof/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis PTTL command documentation: https://redis.io/docs/latest/commands/pttl/
- Redis redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- Redis ioredis migration/client behavior documentation: https://redis.io/docs/latest/develop/clients/nodejs/migration/
- ioredis README/API documentation: https://github.com/redis/ioredis

## Issues Found
- The Python MIGRATE example verified the migration after moving keys from the source by default. Because Redis MIGRATE deletes the source key unless COPY is used, the verification sample could be empty or misleading. I added `copy` and `replace` parameters to `migrate_pattern()` and changed the usage example to pass `copy=True` before running verification.
- The replication migration manager executed the cutover callback before promoting the target. A Redis replica is normally read-only, so switching applications before `REPLICAOF NO ONE` can send writes to a replica. I changed the sequence to promote the target first, then run the cutover callback.
- The Node.js ioredis DUMP/RESTORE example used `dump()`, which returns string data and can corrupt Redis serialized binary payloads. I changed it to use `dumpBuffer()` for binary-safe DUMP payload handling.
- The Node.js batched migration counted every scanned key as migrated even when DUMP/PTTL failed, DUMP returned no payload, or RESTORE failed. I changed the counters to track skipped, failed, and successfully restored keys from pipeline results.
- The Node.js replication helper used `slaveof()`, which maps to Redis' deprecated SLAVEOF command. I changed it to call the modern `REPLICAOF` command directly.
- The zero-downtime checklist omitted target promotion in the cutover step. I updated that step to include promoting the target before cutover.

## Review Notes
- Embedded Python and JavaScript code blocks were syntax-checked locally. The snippets still require running Redis instances and the relevant client packages to execute end-to-end.
- ioredis is still usable, but Redis documentation now recommends node-redis for new Node.js projects.
