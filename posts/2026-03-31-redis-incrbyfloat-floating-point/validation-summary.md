# Validation Summary: How to Use INCRBYFLOAT in Redis for Floating-Point Counters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (INCRBYFLOAT, INCRBY, INCR, SET, GET, DEL commands)
- Double-precision IEEE 754 floating-point arithmetic

## Sources Consulted
- Official Redis INCRBYFLOAT documentation: https://redis.io/docs/latest/commands/incrbyfloat/
- Official Redis INCRBY documentation: https://redis.io/docs/latest/commands/incrby/
- Official Redis INCR documentation: https://redis.io/docs/latest/commands/incr/

## Issues Found
- **Sensor aggregation example had incorrect INCR usage and output**: The example called `INCR sensor:room1:readings` only once, but the output showed `(integer) 3`, implying it had been called three times. A single INCR on a non-existent key initializes to 0 and increments to 1, so the output should have been `(integer) 1`. Fixed by adding an `INCR sensor:room1:readings` call after each `INCRBYFLOAT` (once per sensor reading), so the counter correctly reaches 3 and the output matches the commands.

## Review Notes
- The "Scientific notation" example text says "Redis accepts scientific notation for the increment," but the example actually demonstrates scientific notation in the stored value (`SET counter 3.1415e2`), not in the increment argument (`10`). The claim is technically true per Redis docs (both value and increment accept exponential notation), so no change was made, but a future revision could use a scientific notation increment (e.g., `1.0e1`) to better match the description.
- The precision notes correctly advise using integer-based storage (e.g., cents) with INCRBY for financial applications. This is sound advice given IEEE 754 rounding behavior.
- All arithmetic in the examples was verified to be correct.
- Redis internally uses `long double` for INCRBYFLOAT computation but propagates the result as a SET in replication/AOF to avoid cross-platform floating-point inconsistencies. The post's description of "double-precision IEEE 754" is a reasonable simplification.
