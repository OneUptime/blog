# Validation Summary: How Redis Dict (Hash Table) Implementation Works

## Status
validated

## Post Type
Technical deep-dive / Reference

## Technologies Covered
- Redis (dict / hash table internals)
- C (Redis source code structures)
- Node.js / ioredis (client usage examples)
- SipHash (hash function)

## Sources Consulted
- Redis source code: `src/dict.h` and `src/dict.c` (Redis 7.0+ branch and unstable)
- Redis source code: `src/siphash.c` (SipHash-1-2 implementation)
- Redis 4.0 release notes (SipHash introduction)
- Redis SCAN command documentation (cursor design)
- Redis `dictRehashMilliseconds` and `dictRehash` source code (rehashing mechanics)

## Issues Found

1. **Outdated dict struct (Critical)**: The post presented the pre-Redis 7.0 struct layout with a separate `dictht` struct and `dictht ht[2]`. In Redis 7.0, `dictht` was eliminated and its fields were moved directly into `dict` as `ht_table[2]`, `ht_used[2]`, and `ht_size_exp[2]`. Updated the struct to reflect the Redis 7.0+ layout and added a note about the pre-7.0 structure.

2. **dictGenCaseHashFunction mislabeled (Incorrect)**: The post described `dictGenCaseHashFunction` as "For integer keys (faster)". This function actually performs case-insensitive hashing (using `siphash_nocase`), used for things like case-insensitive command name lookups. Corrected the comment.

3. **Background rehashing description imprecise**: The post stated "background timer moves 100 entries per 1ms". The `dictRehash(d, 100)` parameter refers to 100 bucket steps (not entries), and `dictRehashMilliseconds` calls this in a loop for up to 1ms. Each step processes one bucket which may contain zero or multiple entries. Corrected to "processes buckets in batches of 100 steps, running for up to 1ms".

4. **SCAN cursor example lacked context**: The cursor sequence "0, 8, 4, 12, 2, 10..." is correct for a 16-bucket table but the post didn't specify the table size, and the subsequent text incorrectly referenced "8 to 16 buckets" growth which didn't match. Added explicit "16-bucket table (4-bit index)" label and corrected the growth example to "16 to 32 buckets".

## Review Notes
- The load factor threshold of 5 with active child processes (`dict_force_resize_ratio`) is correct for Redis 7.0 but was changed to 4 in the latest unstable branch (likely Redis 8.x). The post does not specify a version for this claim.
- The dict shrink threshold of 10% (`HASHTABLE_MIN_FILL = 10`) is correct for Redis 7.0 but was changed to 12.5% (`HASHTABLE_MIN_FILL = 8`) in the latest unstable branch. The post does not specify a version for this claim.
- The `pauserehash` field is `int16_t` in Redis 7.0 but was changed to `unsigned` in the latest unstable branch. The corrected struct now shows `int16_t` matching Redis 7.0.
- The JavaScript code example uses `await` outside an async function, which is valid in ES modules or top-level await contexts but could confuse readers in CommonJS contexts. This is a minor style issue, not a correctness error.
- The `DEBUG RELOAD` command is noted as requiring caution in production, which is appropriate.
