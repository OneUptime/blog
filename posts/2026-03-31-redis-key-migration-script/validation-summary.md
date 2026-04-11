# Validation Summary: How to Write a Redis Key Migration Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (MIGRATE, DUMP, RESTORE, SCAN commands)
- Bash scripting (redis-cli usage)
- Python 3 (redis-py library)

## Sources Consulted
- Redis MIGRATE command documentation: https://redis.io/docs/latest/commands/migrate/
- Redis DUMP command documentation: https://redis.io/docs/latest/commands/dump/
- Redis RESTORE command documentation: https://redis.io/docs/latest/commands/restore/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis PTTL command documentation: https://redis.io/docs/latest/commands/pttl/
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found
No technical issues found.

## Review Notes
- The MIGRATE command syntax is correct in all three demonstrated forms (basic, AUTH, COPY). The optional flags after `timeout` can appear in any order per Redis documentation.
- The bash script correctly parses `redis-cli SCAN` output (cursor on first line, keys on subsequent lines) and handles the SCAN cursor iteration loop properly.
- The Python script correctly uses `decode_responses=False` which is essential for DUMP/RESTORE since DUMP returns binary serialized data.
- The `pttl` handling (`ttl if ttl > 0 else 0`) correctly maps both -1 (no expiry) and -2 (key not found) to 0 (no expiry in RESTORE), which is the right behavior.
- The `replace=True` parameter in `dst.restore()` correctly maps to the REPLACE modifier of the RESTORE command.
- The post states "For cross-version migrations where MIGRATE may not work, use DUMP/RESTORE." Since MIGRATE internally uses DUMP/RESTORE, cross-version serialization format issues would affect both equally. However, the Python DUMP/RESTORE approach has real advantages: it works when instances lack direct network connectivity, provides per-key error handling, and allows data transformation during migration. The framing is slightly imprecise but the advice itself is sound.
- The `pattern.encode()` call in the Python `scan()` is technically redundant (redis-py handles string encoding internally even with `decode_responses=False`) but is not incorrect.
