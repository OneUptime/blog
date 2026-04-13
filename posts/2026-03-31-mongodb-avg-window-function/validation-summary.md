# Validation Summary: How to Use $avg as a Window Function in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB `$setWindowFields` aggregation stage
- MongoDB `$avg` window/accumulator operator
- MongoDB aggregation pipeline (`$project`, `$round`, `$subtract`)

## Sources Consulted
- MongoDB Manual: `$setWindowFields` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB Manual: `$avg` (aggregation accumulator) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/
- MongoDB Manual: Window function operators reference

## Issues Found
No technical issues found.

All code examples were verified for correctness:

1. **Simple Moving Average** — `range: [-6, 0]` with `unit: "day"` is valid syntax for a time-based range window. The explanation that it covers the current day plus 6 preceding days is accurate.
2. **Document-Based Window** — `documents: [-4, 0]` correctly specifies a 5-document window (current + 4 preceding).
3. **Cumulative Average** — `documents: ["unbounded", "current"]` is the correct syntax for a cumulative window from partition start to the current document.
4. **Partition-Wide Average** — `documents: ["unbounded", "unbounded"]` correctly computes across the entire partition, attaching the same average to every document.
5. **Centered Moving Average** — `documents: [-3, 3]` is valid syntax for a 7-document centered window.
6. **`$setWindowFields` structure** — The use of `partitionBy`, `sortBy`, and `output` fields matches official documentation.
7. **`$avg` as window function** — Confirmed as a supported accumulator operator within `$setWindowFields`.

## Review Notes
- The post targets MongoDB 5.0+ since `$setWindowFields` was introduced in that version. This is not explicitly mentioned in the post but is implied.
- The note about forward-looking windows not working in "streaming contexts" (line 156) is a reasonable general caveat, though MongoDB aggregation pipelines are inherently batch operations. The distinction is more relevant if readers are thinking about change streams or similar patterns.
