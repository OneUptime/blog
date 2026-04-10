# Validation Summary: How to Use the SET Command in Redis with All Options (EX, PX, NX, XX)

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis (SET command and related options: EX, PX, NX, XX, GET, KEEPTTL, EXAT, PXAT)

## Sources Consulted
- Official Redis SET command documentation: https://redis.io/docs/latest/commands/set/

## Issues Found

### 1. Incorrect EXAT Unix timestamp
- **What was wrong:** The EXAT example used timestamp `1751328000`, which corresponds to 2025-07-01 00:00:00 UTC, not 2026-07-01 as stated in the post. The key name `promo:summer2026` and the output comment `<seconds until 2026-07-01>` both indicate the intent was 2026-07-01.
- **What was changed:** Updated the timestamp from `1751328000` to `1782864000` (the correct Unix timestamp for 2026-07-01 00:00:00 UTC).
- **Why:** Using the wrong timestamp would confuse readers who verify the example, and would result in a key that expires a full year earlier than intended.

### 2. Misleading flowchart logic
- **What was wrong:** The original flowchart showed the value being written unconditionally (Create/Overwrite) and then options like NX/XX being applied afterward. In reality, NX and XX are preconditions checked before the write occurs — if the condition is not met, the write does not happen and nil is returned.
- **What was changed:** Replaced the flowchart with a corrected version that shows NX/XX conditions being evaluated first, with a nil return path when conditions are not met, and the GET option determining the return value type.
- **Why:** The original diagram contradicted the actual behavior of NX/XX, which could lead readers to misunderstand how conditional SET works.

## Review Notes
- The post does not mention the newer IFEQ, IFNE, IFDEQ, and IFDNE options introduced in Redis 8.4.0. This is acceptable since the post focuses on the core, widely-used options and the title scopes it to EX, PX, NX, XX.
- The EXAT and PXAT options were introduced in Redis 6.2.0 (same as GET), but the post does not annotate their version. This is a minor omission, not an error, since the post does correctly annotate GET (6.2+) and KEEPTTL (6.0+).
- Since Redis 7.0.0, NX and GET can be combined (previously this was an error). The post doesn't mention this version constraint, which could affect users on Redis 6.2.x–6.x trying to combine them.
- The distributed lock example using `SET ... NX EX` is a simplified pattern. The official Redis docs recommend the Redlock algorithm for production distributed locks. The post correctly presents this as a basic pattern rather than a production-ready solution.
