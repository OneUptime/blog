# Validation Summary: How to Use EXPIREAT and PEXPIREAT in Redis for Absolute Expiry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (EXPIREAT, PEXPIREAT, EXPIRETIME, TTL commands)
- Redis 7.0 conditional expiry flags (NX, XX, GT, LT)
- Bash / GNU date for timestamp calculation

## Sources Consulted
- Redis official documentation for EXPIREAT: https://redis.io/commands/expireat/
- Redis official documentation for PEXPIREAT: https://redis.io/commands/pexpireat/
- Redis official documentation for EXPIRETIME: https://redis.io/commands/expiretime/
- Unix timestamp verification via Python datetime module

## Issues Found
1. **Incorrect Unix timestamp for promo:summer2026 key**: The post used timestamp `1751328000` and described it as "2025-07-01 00:00:00 UTC". While the timestamp-to-date conversion was technically correct, the key is named `promo:summer2026` and the post is dated 2026-03-31, meaning a 2025-07-01 timestamp would already be in the past (the key would be immediately deleted, contradicting the example). Fixed the timestamp to `1782864000` (2026-07-01 00:00:00 UTC) and updated the date description to "2026-07-01 00:00:00 UTC".
2. **EXPIRETIME output inconsistency**: The EXPIRETIME example showed the old timestamp `1751328000`. Updated to `1782864000` to match the corrected EXPIREAT value.

## Review Notes
- The `date -u -d "tomorrow 00:00:00" +%s` command in the "Expire at midnight tonight" example uses GNU date syntax, which does not work on macOS. This is a common convention in Redis tutorials since Redis servers typically run on Linux. Not changed, but worth noting for readers on macOS.
- The TTL example output of 86337 seconds (~24 hours) is illustrative and depends on when the command is executed relative to the expiry timestamp. This is acceptable as example output.
- The PEXPIREAT example and comparison table still use `1751328000000` / `1751328000` respectively, but those are independent examples (the flash:sale key and generic table entries) with no year-specific key name, so no inconsistency exists there.
