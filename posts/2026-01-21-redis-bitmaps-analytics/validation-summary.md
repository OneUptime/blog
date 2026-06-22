# Validation Summary: How to Use Redis Bitmaps for Analytics and Flags

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis Bitmaps
- Redis String bitmap commands: SETBIT, GETBIT, BITCOUNT, BITPOS, BITOP, BITFIELD
- Python with redis-py
- Node.js with ioredis
- Go with go-redis

## Sources Consulted
- Redis bitmap documentation: https://redis.io/docs/latest/develop/data-types/strings/bitmaps/
- Redis SETBIT command documentation: https://redis.io/docs/latest/commands/setbit/
- Redis GETBIT command documentation: https://redis.io/docs/latest/commands/getbit/
- Redis BITCOUNT command documentation: https://redis.io/docs/latest/commands/bitcount/
- Redis BITPOS command documentation: https://redis.io/docs/latest/commands/bitpos/
- Redis BITOP command documentation: https://redis.io/docs/latest/commands/bitop/
- Redis BITFIELD command documentation: https://redis.io/docs/latest/commands/bitfield/
- Redis Python client guide: https://redis.io/docs/latest/develop/clients/redis-py/
- ioredis official repository and documentation: https://github.com/redis/ioredis
- Redis command documentation API examples for go-redis methods: https://redis.io/docs/latest/commands/setbit/ and https://redis.io/docs/latest/commands/bitop/

## Issues Found
- The description said the post included Python and Node examples, but the post also includes Go. Updated it to "Python, Node.js, and Go."
- The bitmap capabilities list made `AND`, `OR`, `XOR`, and `NOT` sound like the complete set of Redis bit operations. Current Redis documentation lists additional BITOP operations, so the wording was changed to "such as AND, OR, XOR, NOT."
- The Redis Set memory comparison said a Set would use about 400 MB for 100 million 4-byte IDs. That is only the raw ID payload and excludes Redis Set overhead. Updated the wording to "at least ~400 MB before Redis Set overhead."
- The `BITOP NOT` example comment said "users NOT active" without noting that Redis only inverts the stored string length. Updated the comment to say "within the stored bitmap length."
- The Python `enable_for_percentage` example truncated fractional percentages and iterated `range(max_user_id)`, excluding the stated maximum user ID. Updated it to validate `0 <= percentage <= 100`, support two decimal places using `percentage * 100`, and iterate `range(1, max_user_id + 1)`.

## Review Notes
Python and JavaScript code blocks were syntax-checked locally. Go code was reviewed against the official Redis/go-redis method signatures, but not compiled locally because the `go` toolchain is not installed in this workspace. The examples use fixed temporary Redis keys for BITOP results; production code should use request-scoped or otherwise collision-resistant temporary keys when concurrent callers may run the same operation.
