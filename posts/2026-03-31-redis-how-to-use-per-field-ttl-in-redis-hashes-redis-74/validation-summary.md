# Validation Summary: How to Use Per-Field TTL in Redis Hashes (Redis 7.4+)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.4+ (per-field Hash expiration)
- Redis CLI
- Node.js with ioredis client library

## Sources Consulted
- Redis official documentation for HEXPIRE: https://redis.io/docs/latest/commands/hexpire/
- Redis official documentation for HEXPIREAT: https://redis.io/docs/latest/commands/hexpireat/
- Redis official documentation for HPEXPIRE: https://redis.io/docs/latest/commands/hpexpire/
- Redis official documentation for HPEXPIREAT: https://redis.io/docs/latest/commands/hpexpireat/
- Redis official documentation for HTTL: https://redis.io/docs/latest/commands/httl/
- Redis official documentation for HPTTL: https://redis.io/docs/latest/commands/hpttl/
- Redis official documentation for HEXPIRETIME: https://redis.io/docs/latest/commands/hexpiretime/
- Redis official documentation for HPEXPIRETIME: https://redis.io/docs/latest/commands/hpexpiretime/
- Redis official documentation for HPERSIST: https://redis.io/docs/latest/commands/hpersist/
- Redis Hashes data type documentation: https://redis.io/docs/latest/develop/data-types/hashes/

## Issues Found

### 1. Command syntax list missing `FIELDS numfields` keyword (intro section)
**What was wrong:** The command reference list at the top of the post showed simplified syntax like `HEXPIRE key seconds field [field ...]`, omitting the required `FIELDS numfields` keyword that all per-field TTL commands require.
**What was changed:** Updated all 9 command signatures to include the `FIELDS numfields` keyword and the optional `[NX|XX|GT|LT]` flags for the expiration-setting commands.
**Why:** The `FIELDS numfields` keyword is mandatory in the actual Redis protocol. Without it, the commands will return a syntax error.

### 2. Return code `2` incorrectly described for HEXPIRE/HEXPIREAT/HPEXPIRE/HPEXPIREAT
**What was wrong:** The post stated return code `2` means "field does not exist in the hash." According to official docs, `2` means "field was deleted because the specified expiration is in the past or zero." The actual code for "field does not exist" is `-2`.
**What was changed:** Corrected the return code descriptions. Code `2` now correctly says "field was deleted because the specified expiration is in the past or zero." Added `-2` as "field does not exist in the hash."
**Why:** Using the wrong return code interpretation could cause application logic errors when checking HEXPIRE results.

### 3. Return codes for TTL query commands were mixed in with expiration-setting commands
**What was wrong:** The `-1` and `-2` return codes for HTTL/HPTTL were listed alongside HEXPIRE return codes, making it unclear which codes belong to which commands.
**What was changed:** Separated return codes into two groups: one for expiration-setting commands (HEXPIRE, etc.) and one for TTL query commands (HTTL, HPTTL, HEXPIRETIME, HPEXPIRETIME).
**Why:** The two command groups have different return code semantics and mixing them is confusing.

### 4. Example output for nonexistent field showed wrong return code
**What was wrong:** The example `redis-cli HEXPIRE user:123 3600 FIELDS 2 existingField nonExistentField` showed `(integer) 2` for the nonexistent field.
**What was changed:** Corrected to `(integer) -2` which is the actual return code for a field that does not exist.
**Why:** Consistent with the corrected return code documentation above.

## Review Notes
- Redis 8.0 introduced `HSETEX` and `HGETEX` commands that combine get/set operations with field-level expiration in a single command. The post could mention these as a forward-looking note, but this is not a required fix.
- The ioredis code examples use `redis.call()` for HEXPIRE since ioredis may not have native method support for these newer commands. This is a correct and practical approach.
- The code examples in the body of the post (as opposed to the command reference list) already correctly used the `FIELDS numfields` syntax, so no changes were needed there.
