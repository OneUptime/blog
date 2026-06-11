# Validation Summary: How to Implement Last-Write-Wins

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Last-Write-Wins conflict resolution
- TypeScript
- Distributed systems replication
- Wall-clock timestamps
- Hybrid Logical Clocks
- Lamport clocks
- Version vectors
- CRDT registers and sets
- Operational Transformation

## Sources Consulted
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- MDN Date.now documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
- MDN Number.MAX_SAFE_INTEGER documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
- Leslie Lamport, "Time, Clocks, and the Ordering of Events in a Distributed System": https://lamport.azurewebsites.net/pubs/time-clocks.pdf
- Kulkarni et al., "Logical Physical Clocks and Consistent Snapshots in Globally Distributed Databases": https://cse.buffalo.edu/tech-reports/2014-04.pdf
- Shapiro et al., "A comprehensive study of Convergent and Commutative Replicated Data Types": https://inria.hal.science/inria-00555588/document

## Issues Found
- The `LWWElementSet` example accepted a custom key function but reconstructed values with `JSON.parse(key)`, which only works for the default JSON key function and can return the wrong value or throw for custom keys. I changed the element state to store the original value and return stored values directly.
- The `LWWElementSet` comment said an element exists when `addTimestamp > removeTimestamp`, but the implementation intentionally used `>=` to bias toward adds on equal timestamps. I corrected the comment to match the code.
- The production example combined an HLC timestamp into a JavaScript `number` using `hlc.pt * 1000000 + hlc.lc`, which can exceed `Number.MAX_SAFE_INTEGER` and lose ordering precision. I changed the production timestamp to `bigint`.
- The production example's Lamport clock path returned `Date.now()` despite exposing `"lamport"` as a clock type. I added a `LamportClock` instance and used `tick()`.
- The production example's equal-timestamp tiebreaker compared `this.config.nodeId > ""`, which does not compare the incoming write against the stored winner and would accept any equal-timestamp write from a non-empty local node id. I changed stored production values to include `nodeId` and compare `(timestamp, nodeId)` deterministically.

## Review Notes
The snippets compile under TypeScript 5.9 with `--strict` after providing a placeholder `getNtpOffset()` for the intentionally illustrative NTP example. The article still uses simplified sample code, but the remaining simplifications are called out in context and are technically reasonable for a blog tutorial.
