# Validation Summary: How to Use isIPv4String() and isIPv6String() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL functions (`isIPv4String`, `isIPv6String`, `toIPv4`, `toIPv6`, `toIPv4OrNull`, `toIPv6OrNull`)
- ClickHouse data types (`IPv4`, `IPv6`, `UInt8`, `String`, `DateTime`)
- ClickHouse `MergeTree` table engine and materialized views
- IPv4/IPv6 address notation (including IPv4-mapped IPv6 addresses)

## Sources Consulted
- [ClickHouse IP Address Functions documentation](https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions)
- [ClickHouse PR #35240 — Standardize behaviour of CAST into IPv4, IPv6, toIPv4, toIPv6 functions](https://github.com/ClickHouse/ClickHouse/pull/35240)
- [ClickHouse Issue #22825 — toIPv4OrNull does not exist](https://github.com/ClickHouse/ClickHouse/issues/22825)

## Issues Found
No technical issues found.

Key claims verified:
- `isIPv4String(str)` and `isIPv6String(str)` both return `UInt8` (0 or 1) — confirmed.
- IPv4 strings do not pass `isIPv6String` and vice versa (mutual exclusivity) — confirmed by official docs examples (`'127.0.0.1'` → 0 for `isIPv6String`, `'::'` → 0 for `isIPv4String`).
- IPv4-mapped IPv6 addresses like `::ffff:192.0.2.1` pass `isIPv6String` but not `isIPv4String` — confirmed (docs show `'::ffff:127.0.0.1'` → 1 for `isIPv6String`, 0 for `isIPv4String`).
- `toIPv4()` and `toIPv6()` throw exceptions on invalid input; `toIPv4OrNull()`/`toIPv6OrNull()` return NULL — confirmed.
- Materialized view + `TO` target table syntax is valid ClickHouse DDL.
- Table engine, column types, and `arrayJoin` usage in the classification example are syntactically correct.

## Review Notes
- The post mentions `toIPv4OrNull()`/`toIPv6OrNull()` are available "for ClickHouse 22.3+". The standardization PR (#35240) landed in March 2022 and was backported to 21.8, 22.1, and 22.2, so these functions are actually available on older versions as well. The claim is technically conservative but not incorrect — anyone on 22.3+ can use them safely.
- The "zero-overhead" phrasing in the summary is marketing-style but accurate enough; these functions are lightweight string validators.
