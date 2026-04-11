# Validation Summary: How to Use BITOP in Redis for Bitwise Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (BITOP, SETBIT, BITCOUNT, EXPIRE commands)
- Python (redis-py client library)
- Node.js (node-redis v4 client library)

## Sources Consulted
- Redis official documentation for BITOP: https://redis.io/docs/latest/commands/bitop/
- Redis official documentation for SETBIT: https://redis.io/docs/latest/commands/setbit/
- Redis official documentation for BITCOUNT: https://redis.io/docs/latest/commands/bitcount/
- redis-py documentation for bitop method
- node-redis v4 documentation for bitOp method

## Issues Found
1. **Incorrect XOR description for multi-key operations**: The original text described XOR as "bits are 1 where exactly ONE key has 1 (exclusive OR)." This is only correct when exactly two keys are used. When BITOP XOR is applied to 3 or more keys, the operation is performed sequentially (key1 XOR key2 XOR key3...), and the result bit is 1 when an **odd** number of source keys have that bit set to 1. For example, if three keys all have bit N set to 1, the XOR result for that bit is 1 (not 0). Fixed the description to: "bits are 1 where an odd number of keys have 1 (for two keys, where exactly one has 1)."

## Review Notes
- The blog post correctly uses `decode_responses=False` in the Python example, which is important for bitmap operations that work with raw bytes.
- The NOT operation caveat section provides a valid and useful warning about the pitfalls of NOT on differently-sized keys, along with a correct workaround pattern using a universe bitmap.
- The performance note that "1,000,000 users = ~125 KB per bitmap key" is correct (1,000,000 bits / 8 = 125,000 bytes = ~125 KB using SI units).
- The Node.js example omits `await client.connect()` which is required in node-redis v4 before issuing commands, but this is a common and acceptable omission in code snippets that focus on the BITOP usage pattern.
- Redis 8.2 introduced additional BITOP operations (DIFF, DIFF1, ANDOR, ONE) not covered in this post. The post focuses on the four classic operations (AND, OR, XOR, NOT) which have been available since Redis 2.6.0 and remain fully supported.
