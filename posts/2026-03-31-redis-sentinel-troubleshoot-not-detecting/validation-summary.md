# Validation Summary: How to Troubleshoot Redis Sentinel Not Detecting Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis Sentinel
- Redis CLI (`redis-cli`)
- Redis Sentinel commands (`SENTINEL masters`, `SENTINEL sentinels`, `SENTINEL failover`, `INFO sentinel`)
- Redis Pub/Sub (Sentinel auto-discovery mechanism)

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Sentinel notification/event documentation (log prefix conventions: `+` for state entered, `-` for state cleared)
- Redis `INFO sentinel` command output reference
- Redis Sentinel TILT mode documentation

## Issues Found
- **Incorrect log event interpretation in "Reading Sentinel Logs" section**: The post listed `-odown` as indicating "(failed to reach quorum)". This is incorrect. In Redis Sentinel log notation, the `-` prefix means a state was *cleared* (i.e., `-odown` means the Objectively Down state was removed, which is a recovery event). The correct indicator of quorum not being reached is seeing `+sdown` (Subjectively Down — one Sentinel detects the failure) without a corresponding `+odown` (Objectively Down — quorum agreement reached). Fixed by replacing the `-odown` quorum explanation with the correct `+sdown` without `+odown` pattern, and re-described `-odown` accurately as a state-cleared event.

## Review Notes
- The note about Pub/Sub being "blocked" in Check 5 could be slightly clearer. Sentinel Pub/Sub discovery uses the `__sentinel__:hello` channel over the same TCP connection to the Redis primary (port 6379), so firewall blocking would affect the entire Redis connection, not Pub/Sub independently. However, Redis ACLs could restrict Pub/Sub commands specifically, so the statement is not technically wrong — just potentially misleading for readers who might think Pub/Sub uses a separate port.
- All CLI commands, flags, and Sentinel command syntax are correct and current.
- The TILT mode duration of 30 seconds and its trigger conditions (clock jumps, process pauses) are accurate.
- The `down-after-milliseconds`, quorum concepts, and `INFO sentinel` output formats are all correct.
