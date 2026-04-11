# Validation Summary: How to Use FUNCTION DUMP and RESTORE in Redis for Function Backup

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis 7.0+ (FUNCTION DUMP, FUNCTION RESTORE, FUNCTION LIST, FUNCTION FLUSH)
- redis-cli (command-line interface flags: --raw, -x, --no-auth-warning)
- RDB serialization (binary payload format)

## Sources Consulted
- Redis official documentation for FUNCTION DUMP: https://redis.io/docs/latest/commands/function-dump/
- Redis official documentation for FUNCTION RESTORE: https://redis.io/docs/latest/commands/function-restore/
- Redis CLI documentation: https://redis.io/docs/latest/develop/connect/cli/

## Issues Found

1. **Missing `--raw` flag on FUNCTION DUMP commands**: The dump commands (`redis-cli FUNCTION DUMP > file`) did not include the `--raw` flag, which is needed to ensure binary output is written without redis-cli formatting. Added `--raw` to all dump commands.

2. **`$(cat functions_backup.rdb)` is not binary-safe**: The restore command used shell command substitution `"$(cat functions_backup.rdb)"` to pass the binary payload. Shell command substitution strips null bytes and can mangle binary data, making this approach unreliable. Replaced with the `-x` flag which reads binary data from stdin safely: `redis-cli -x FUNCTION RESTORE < file.bin`.

3. **`--pipe-mode` is not a valid redis-cli flag**: The post referenced `redis-cli --pipe-mode` which does not exist. The actual flag is `--pipe`, but even `--pipe` is designed for mass insertion of RESP-formatted data, not for passing binary payloads to a single command. Replaced with the correct `-x` flag approach, and added a note about using a Redis client library for restore with conflict policies.

4. **Broken base64 backup/restore pipeline**: The full backup example (`cat functions_b64.txt | base64 -d | redis-cli -h staging-redis --pipe FUNCTION RESTORE - REPLACE`) had multiple issues: `--pipe` expects RESP protocol input, the `-` argument is not valid for FUNCTION RESTORE, and the pipeline structure wouldn't deliver the binary payload correctly. Replaced with working examples using `--raw` for dump and `-x` for restore, including a direct instance-to-instance pipe.

5. **RDB snapshot incorrectly listed as not on-demand**: The comparison table stated RDB snapshots are "No (scheduled)" for on-demand. RDB snapshots can be triggered on-demand using BGSAVE or SAVE commands. Changed to "Yes (BGSAVE)".

## Review Notes
- The post correctly describes FUNCTION DUMP/RESTORE as available since Redis 7.0.0 (implicitly, by discussing Redis Functions which were introduced in 7.0).
- The conflict policy table (FLUSH, APPEND, REPLACE) and default APPEND behavior are accurate per official docs.
- The REPLACE policy has a subtle nuance not mentioned in the post: it only prevents library name collisions, not function name collisions across libraries. This is a minor omission but not an error in what is stated.
- The redis-cli `-x` flag has a limitation: it always places stdin content as the last argument. Since FUNCTION RESTORE expects the payload before the optional policy argument, you cannot use `-x` with REPLACE/FLUSH policies directly. The post now correctly documents this limitation and recommends using FUNCTION FLUSH as a workaround or a Redis client library for more control.
- The post refers to the serialized output as "RDB payload/format." While the official docs simply say "serialized binary payload," Redis does use RDB encoding internally for this, so the characterization is reasonable.
