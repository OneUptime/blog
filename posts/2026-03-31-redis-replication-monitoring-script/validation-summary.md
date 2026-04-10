# Validation Summary: How to Write a Redis Replication Monitoring Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (replication, INFO command)
- Bash scripting
- redis-cli
- Cron scheduling

## Sources Consulted
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- redis-cli documentation: https://redis.io/docs/latest/develop/connect/cli/

## Issues Found
- **Summary claimed Slack alerting that doesn't exist in the script.** The `SLACK_WEBHOOK` variable is defined but never used anywhere in the script. The `alert()` function only calls `log()` (writing to stdout) and does not send any Slack notifications. The summary paragraph incorrectly stated "with Slack alerting on degradation." Fixed by removing "Slack" from the summary to accurately reflect the script's actual behavior.

## Review Notes
- The `|| echo "$MASTER_OFFSET"` fallback on the `slave_repl_offset` grep line (line 76) does not work as intended. The `||` operator triggers on non-zero exit status, but `tr` always exits 0 even with empty input. If `slave_repl_offset` were missing, `REPLICA_OFFSET` would be empty rather than falling back to `$MASTER_OFFSET`. In practice this is a non-issue because `slave_repl_offset` exists on all modern Redis replicas (4.0+), but the defensive fallback is effectively dead code.
- The script uses `grep -oP` with `\K` (PCRE lookbehind), which requires GNU grep. This is not available on macOS (BSD grep) but is appropriate for a Linux server monitoring context.
- The `SLACK_WEBHOOK` variable remains defined in the script as a placeholder for potential extension, but the post does not document how to implement the actual Slack notification. Authors may want to either implement Slack alerting or remove the unused variable in a future update.
- On a replica, both `master_repl_offset` and `slave_repl_offset` come from the same node's INFO output. When the replica is caught up, these values are identical, so the lag calculation yields 0. The "Checking Replication Offset Drift" section correctly shows how to measure true drift by querying master and replica separately.
