# Validation Summary: How to Use GEORADIUS in Redis to Query by Radius

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (geospatial commands)
- GEORADIUS command
- GEOSEARCH command (migration target)
- GEOADD command (setup)
- GEOSEARCHSTORE command (mentioned)

## Sources Consulted
- Official Redis GEORADIUS documentation: https://redis.io/docs/latest/commands/georadius/
- Official Redis GEOSEARCH documentation: https://redis.io/docs/latest/commands/geosearch/
- Official Redis GEOADD documentation: https://redis.io/docs/latest/commands/geoadd/
- Haversine distance computation using Redis's earth radius (6372797.560856 m) to verify example output distances

## Issues Found
1. **Missing WITHHASH option in syntax**: The syntax block omitted the `[WITHHASH]` option, which is part of the official GEORADIUS command syntax. Added `[WITHHASH]` to the syntax line and a description entry for it.

2. **STORE and STOREDIST shown as independent options**: The syntax showed `[STORE key] [STOREDIST key]` implying both can be used together. The official syntax is `[STORE key | STOREDIST key]` — these are mutually exclusive. Fixed the syntax line and added mutual exclusivity notes to the parameter descriptions.

3. **Incorrect distance for uptown-diner**: The WITHDIST example output showed uptown-diner at "0.3124" km from the center point (-73.9855, 40.7580). Haversine computation using Redis's earth radius gives approximately 0.7950 km. Corrected from "0.3124" to "0.7950".

4. **Slightly inaccurate distance for joes-pizza**: The example output showed joes-pizza at "1.0874" km. Haversine computation gives approximately 1.0679 km. Corrected from "1.0874" to "1.0679".

## Review Notes
- The deprecation notice for GEORADIUS in Redis 6.2 is accurate and well-placed.
- The GEOSEARCH migration example is syntactically correct.
- The flowchart accurately describes the Geohash bounding-box-then-exact-radius algorithm Redis uses internally.
- The basic search output correctly includes only joes-pizza and uptown-diner (harbor-grill is ~5.31 km away, just outside the 5 km radius).
- The blog does not mention that STORE/STOREDIST are incompatible with WITHCOORD/WITHDIST/WITHHASH — this is a known constraint but omitting it is acceptable for a focused tutorial.
- Redis uses the Haversine formula assuming Earth is a perfect sphere, which introduces up to 0.5% error vs real-world distances. Not mentioned in the post but acceptable for this scope.
