# Validation Summary: How to Use LASTSAVE in Redis to Check Last Successful Save

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (LASTSAVE, BGSAVE, INFO persistence commands)
- Bash scripting (monitoring/alerting scripts)
- GNU date (timestamp conversion)

## Sources Consulted
- Redis official documentation for LASTSAVE: https://redis.io/docs/latest/commands/lastsave/
- Redis official documentation for BGSAVE: https://redis.io/docs/latest/commands/bgsave/
- Redis official documentation for INFO: https://redis.io/docs/latest/commands/info/

## Issues Found
1. **Incorrect example timestamps and date output**: The example Unix timestamp `1711900800` corresponded to March 31, 2024, not 2026. The `date` command output comment showed "Thu Mar 31 12:00:00 UTC 2026" but March 31, 2026 is a Tuesday. Fixed all example timestamps to use `1774958400` (Tue Mar 31 12:00:00 UTC 2026) and `1774958410` for the post-BGSAVE examples, and corrected the day of week from "Thu" to "Tue".

## Review Notes
- The `date -d` flag used in the bash example is GNU-specific and does not work on macOS/BSD. The post doesn't note this, but since the target audience is likely using Linux servers for Redis, this is acceptable.
- All Redis command behaviors (LASTSAVE return value, BGSAVE response, INFO persistence fields, startup behavior) are accurately described and verified against official documentation.
- The monitoring script and mermaid flowchart are logically correct.
