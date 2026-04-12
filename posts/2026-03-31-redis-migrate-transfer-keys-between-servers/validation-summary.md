# Validation Summary: How to Use MIGRATE in Redis to Transfer Keys Between Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (MIGRATE command)
- Redis Cluster (resharding with MIGRATE)
- redis-cli (scripted migration and cluster resharding)
- Bash scripting (migration automation)

## Sources Consulted
- Official Redis MIGRATE command documentation: https://redis.io/docs/latest/commands/migrate/
- Official Redis RESTORE command documentation (for BUSYKEY error behavior): https://redis.io/docs/latest/commands/restore/

## Issues Found
1. **IOERR description incorrectly claimed keys could be lost.** Line 98 stated that an IOERR "may leave key on both or neither instance." Per the official Redis documentation, it is impossible to lose a key during MIGRATE — on an I/O error, the key may exist on both instances or only on the source, but never on neither. Changed "may leave key on both or neither instance" to "key may exist on both instances or only on the source."

## Review Notes
- The syntax block shows AUTH and AUTH2 as separate optional clauses, while the official docs present them as mutually exclusive alternatives (`[AUTH password | AUTH2 username password]`). This is not technically wrong but could suggest to readers that both can be used simultaneously.
- The post describes MIGRATE as "atomic," which is accurate for single-key transfers. However, multi-key transfers using the KEYS option use pipelining internally and are not strictly all-or-nothing. This nuance is not mentioned but is a minor point for a tutorial-level post.
- MIGRATE blocks both the source and destination instances for the duration of the transfer. This is not mentioned and could be important for readers performing large migrations.
- The official Redis docs note that MIGRATE is not available on Redis Cloud or Redis Software (managed offerings). This compatibility caveat is not mentioned.
- The scripted migration example uses the `KEYS` command pattern scan, which is known to block the server on large datasets. A production migration script would typically use `SCAN` instead, but this is acceptable for a tutorial example.
