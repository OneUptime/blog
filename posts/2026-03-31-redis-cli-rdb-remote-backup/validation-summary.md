# Validation Summary: How to Use Redis CLI --rdb for Remote RDB Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (server and CLI)
- redis-cli `--rdb` flag
- RDB persistence format
- rdbtools (Python package for RDB inspection)
- Bash scripting and cron scheduling
- TLS/SSL for Redis connections

## Sources Consulted
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis persistence (RDB) documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- rdbtools GitHub repository: https://github.com/sripathikrishnan/redis-rdb-tools
- redis-cli source code (sendSync implementation)

## Issues Found
No technical issues found.

## Review Notes
- The post states redis-cli --rdb "Sends the `SYNC` command (same as a replica)". Modern replicas actually use PSYNC2 for partial resynchronization, while redis-cli --rdb specifically sends the legacy SYNC command for a full synchronization. This is a minor simplification that does not affect the reader's understanding or the correctness of the instructions.
- The Limitations section mentions needing "REPLICATION privilege" for Redis ACL. Redis ACL does not have a named "REPLICATION" privilege; the relevant permissions are `+sync`, `+psync`, `+replconf`, or the `+@admin` category. The intent is clear enough for the target audience, but could be more precise.
- The `pip install rdbtools` package (rdbtools by sripathikrishnan) has not been actively maintained in recent years. It may not fully support RDB version 11 (Redis 7.2+) files. Users working with newer Redis versions may want to consider alternative tools like `redis-rdb-cli` (Java-based).
- The systemctl service name `redis` may vary by distribution (e.g., `redis-server` on Debian/Ubuntu). The post uses a general example, which is acceptable for a tutorial.
