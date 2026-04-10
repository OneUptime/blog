# Validation Summary: How to Configure Sentinel Notification Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Sentinel
- Bash scripting
- HAProxy
- Slack webhooks (for alerting)

## Sources Consulted
- Official Redis Sentinel configuration file: https://download.redis.io/redis-stable/sentinel.conf
- Official Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/

## Issues Found

1. **Incorrect state values for client-reconfig-script**: The post claimed the `state` parameter ($3) could be "start", "end", or "abort". According to the official sentinel.conf documentation, `<state>` is currently always "start". The example script checked `$STATE = "end"`, which would never match. Fixed by removing the state check and only checking the role ("leader") to determine if the current Sentinel is responsible for the failover.

2. **Non-existent `sentinel script-max-runtime` directive**: The post presented `sentinel script-max-runtime 60000` as a configurable directive. The 60-second script timeout is hardcoded in Redis Sentinel and is not a user-configurable setting. Fixed by replacing the fake config directive with a comment explaining the hardcoded 60-second limit and SIGKILL behavior.

3. **Incorrect event name prefixes**: The post used `+switch-master` and `+failover-end` in the notification script case statement. According to the official documentation, `switch-master` and `failover-end` are Pub/Sub channel names that do NOT carry a `+` prefix (unlike `+sdown`, `+odown`, `-odown` which do). Fixed by removing the `+` prefix from these two event names.

## Review Notes
- The `SENTINEL simulate-failure crash-after-election` command is valid (available since Redis >= 3.2) and correctly used for testing.
- The notification script argument documentation (2 arguments: event type and event description) is correct.
- The client-reconfig-script argument order and role values ("leader"/"observer") are correct per the official docs.
- Exit code semantics (1 = retry up to 10 times, 2+ = no retry) are correctly documented.
- The HAProxy sed-based reconfig approach is a common pattern but in production, users should consider atomic config replacement and validation before reload.
