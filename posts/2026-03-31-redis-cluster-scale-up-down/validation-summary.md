# Validation Summary: How to Scale Redis Cluster Up and Down

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Redis Cluster
- redis-cli --cluster subcommands (add-node, reshard, del-node, check)
- Redis configuration (cluster-enabled, cluster-config-file, cluster-node-timeout, appendonly)
- MIGRATE command (internal to resharding)
- SHUTDOWN command

## Sources Consulted
- Redis Cluster Specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis Cluster Scaling Tutorial: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis SHUTDOWN command reference: https://redis.io/docs/latest/commands/shutdown/
- Redis MIGRATE command reference: https://redis.io/docs/latest/commands/migrate/
- redis-cli --cluster help output for flag verification

## Issues Found
1. **Bash syntax error in scale-down reshard command (line 97)**: The line `--cluster-slots 5461 \  # however many slots it owns` had a comment placed after a backslash line continuation. In bash, the `\` must be the very last character on a line for continuation to work; any characters after it (including comments) break the continuation and produce a malformed command. Fixed by moving the comment to a separate line after the command block.

## Review Notes
- The `--cluster-slave` flag used in Step 4 of Scaling Up is technically correct and works in all Redis versions. Redis 5.0+ also accepts `--cluster-replica` as an alias. The post uses "replica" terminology in prose but `--cluster-slave` in the CLI command, which is a minor inconsistency but not a technical error since both flags work.
- The `--cluster-from all` value in the reshard command is a valid shorthand that distributes slot sourcing across all existing nodes proportionally.
- The 16384 total hash slot count is correct (CRC16 mod 16384).
- The claim that resharding uses MIGRATE internally is accurate.
- All redis.conf configuration directives are valid and current.
