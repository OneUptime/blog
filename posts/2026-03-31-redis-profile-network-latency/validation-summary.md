# Validation Summary: How to Profile Redis Network Latency

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (redis-cli built-in latency tools)
- tcpdump (network packet capture)
- tshark/Wireshark (packet analysis)
- ping (ICMP packet loss measurement)
- Bash shell utilities (time, kill, background jobs)

## Sources Consulted
- Redis official documentation on redis-cli latency modes: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/
- Redis redis-cli documentation: https://redis.io/docs/latest/develop/connect/cli/
- Redis DEBUG command documentation: https://redis.io/docs/latest/commands/debug/
- tcpdump man page for flag verification
- tshark documentation for `-z io,stat` statistics syntax

## Issues Found
No technical issues found.

## Review Notes
- The `DEBUG SLEEP` command is restricted by default in Redis 7.0+ (requires `enable-debug-command yes` in the config). The command syntax shown is correct, but readers using Redis 7+ may encounter an error unless they explicitly enable debug commands. This is a minor version-specific caveat rather than an error.
- The description "samples every 100ms" for `--latency` mode is a common simplification. The actual behavior is a ~100ms sleep between PING commands, so the real interval is 100ms plus the round-trip time. This matches how the Redis documentation describes it and is accurate enough for practical purposes.
- All command flags, output formats, and technical explanations are accurate and consistent with current Redis documentation.
