# Validation Summary: How to Use BITCOUNT in Redis to Count Set Bits

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (BITCOUNT command)
- Redis Bitmaps (SETBIT, BITOP)
- Redis 7.0+ BIT range option

## Sources Consulted
- Official Redis BITCOUNT documentation: https://redis.io/docs/latest/commands/bitcount/
- Official Redis SETBIT documentation: https://redis.io/docs/latest/commands/setbit/
- Official Redis BITOP documentation: https://redis.io/docs/latest/commands/bitop/

## Issues Found
1. **Incorrect description in "Weekly Active Users" section**: The description said "Count active days for all users across a week by ORing bitmaps first." This is misleading — `BITOP OR` followed by `BITCOUNT` counts the number of **unique users** active on at least one day during the week, not "active days for all users." Changed to: "Count unique users active across a week by ORing daily bitmaps first."

## Review Notes
- The memory claim "A bitmap for 10 million users requires only 1.25 MB" is correct using SI megabytes (10,000,000 bits / 8 = 1,250,000 bytes = 1.25 MB). Using binary mebibytes it would be ~1.19 MiB, but 1.25 MB is the standard SI interpretation and is acceptable.
- The BYTE default description says "(default before Redis 7.0)" — BYTE is actually the default in all versions (including 7.0+). The wording is not wrong (it was the only behavior before 7.0), but could be clearer. Left as-is since it's not technically incorrect.
- All Redis command syntax, examples, and patterns are correct and verified against official documentation.
- The `BIT` range option was correctly attributed to Redis 7.0+.
- SETBIT and BITOP OR usage is correct throughout.
