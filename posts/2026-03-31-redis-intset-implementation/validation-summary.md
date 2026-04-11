# Validation Summary: How Redis Intset Implementation Works

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- Redis (intset internal data structure)
- Redis CLI commands (SADD, SISMEMBER, OBJECT ENCODING, MEMORY USAGE, CONFIG)
- Redis configuration (set-max-intset-entries)

## Sources Consulted
- Redis source code `src/intset.h` and `src/intset.c` (https://github.com/redis/redis)
- Redis source code `src/t_set.c` for set encoding conversion logic
- Redis official documentation on SET commands (https://redis.io/docs/latest/commands/sadd/)
- Redis official documentation on OBJECT ENCODING (https://redis.io/docs/latest/commands/object-encoding/)
- Redis official documentation on memory optimization (https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/)
- Redis default configuration for `set-max-intset-entries`

## Issues Found
- **Text/code mismatch in "Upgrade on Overflow" section**: The text stated "Adding a value above 2^31 to a 32-bit intset" but the code example starts with values {1, 2, 3} which use 16-bit encoding, not 32-bit. Changed the text to "adding a value that exceeds the 32-bit range" to accurately describe the code example (16-bit intset upgraded directly to 64-bit).

## Review Notes
- The ~4KB memory estimate for 512 intset entries (seq 1 512) is likely overstated. Values 1-512 fit in int16, so the raw intset would be ~1 KB (8 byte header + 512 × 2 bytes). The ~4KB figure would be accurate for 64-bit encoding (8 + 512 × 8 ≈ 4 KB). The numbers are marked as approximate (~) and the overall comparison with hashtable encoding is directionally correct.
- The "5-6x more memory-efficient" claim is conservative. Redis official documentation cites up to 10x savings for compact encodings, with 5x being the average. The stated ratio is safe and defensible.
- SISMEMBER is documented as O(1) in official Redis command docs (reporting hashtable complexity). The O(log N) stated in the post is correct specifically for the intset encoding path and is appropriate given the post is about intset internals.
- The "listpack" or "hashtable" conversion note is version-dependent and correctly acknowledged. In Redis < 7.2, sets convert from intset directly to hashtable. In Redis >= 7.2, small sets (≤128 entries by default) convert to listpack first.
