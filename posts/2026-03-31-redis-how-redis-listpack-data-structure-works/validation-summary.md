# Validation Summary: How Redis Listpack Data Structure Works

## Status
validated

## Post Type
Technical Reference / Internals Deep-Dive

## Technologies Covered
- Redis (5.0, 7.0, 7.2)
- Listpack data structure
- Ziplist (predecessor)
- Quicklist
- Redis CLI commands (OBJECT ENCODING, MEMORY USAGE, CONFIG SET/GET, DEBUG OBJECT)

## Sources Consulted
- Redis listpack.c source code (https://github.com/redis/redis/blob/unstable/src/listpack.c)
- Redis listpack specification by antirez (https://github.com/antirez/listpack/blob/master/listpack.md)
- Redis 7.0 release notes (https://github.com/redis/redis/releases/tag/7.0.0) — confirmed ziplist-to-listpack migration
- Redis 7.2 release notes — confirmed set-max-listpack-entries addition
- Redis lpEncodeIntegerGetType() source for integer encoding sizes

## Issues Found

1. **Entry format diagram showed ziplist format instead of listpack format (CRITICAL)**
   - **What was wrong:** The entry diagram showed `prevlen | encoding + data | element value`, which is the ziplist entry format. Listpack does NOT have a `prevlen` field — that was the exact problem listpack was designed to eliminate.
   - **What was changed:** Replaced with the correct listpack entry format: `encoding + data | backlen`, where `backlen` is stored at the END of each entry and encodes the current entry's own length (not the previous entry's).
   - **Why:** This directly contradicted the post's own "Advantages Over Ziplist" section which correctly states listpack doesn't store previous entry size. The `prevlen` field in ziplist caused cascading updates; listpack's `backlen` suffix avoids this entirely.

2. **32-bit integer encoding size was wrong (6 bytes -> 5 bytes)**
   - **What was wrong:** Post claimed 32-bit int encoding uses 6 bytes total.
   - **What was changed:** Corrected to 5 bytes (1 encoding byte + 4 data bytes), matching `enclen = 5` in `lpEncodeIntegerGetType()`.
   - **Why:** The 6-byte figure appears to have included the backlen byte, but the other entries (7-bit through 24-bit) did not include backlen, making the table inconsistent. Corrected to be consistent with the rest of the table.

3. **64-bit integer encoding size was wrong (10 bytes -> 9 bytes)**
   - **What was wrong:** Post claimed 64-bit int encoding uses 10 bytes total.
   - **What was changed:** Corrected to 9 bytes (1 encoding byte + 8 data bytes), matching `enclen = 9` in `lpEncodeIntegerGetType()`.
   - **Why:** Same inconsistency as the 32-bit case.

4. **Listpack introduction version was misleading**
   - **What was wrong:** "introduced in Redis 5.0 to replace the older ziplist encoding" implied ziplist was replaced in 5.0.
   - **What was changed:** Clarified that listpack was first introduced in Redis 5.0 for Streams, but replaced ziplist for Hashes, Sorted Sets, and Lists in Redis 7.0.
   - **Why:** The ziplist-to-listpack migration for general data types happened in Redis 7.0 (PR #8887, #9366, #9740), not 5.0.

5. **Small Lists version was wrong (7.2+ -> 7.0+)**
   - **What was wrong:** Post said "Small Lists (Redis 7.2+, per quicklist node)".
   - **What was changed:** Corrected to "Redis 7.0+".
   - **Why:** Quicklist nodes switched from ziplist to listpack in Redis 7.0, as confirmed by the 7.0 release notes.

6. **Backward traversal mechanism description was inaccurate**
   - **What was wrong:** "Backward traversal uses a different mechanism (entry-encoding prefix)" — the mechanism is a suffix, not a prefix.
   - **What was changed:** Corrected to "backlen suffix at the end of each entry".
   - **Why:** The backlen is stored at the END of each entry, and is read right-to-left for backward traversal.

7. **Hashtable memory estimate was unrealistically low**
   - **What was wrong:** "Now 400-800 bytes" for a hash with 133 fields in hashtable encoding.
   - **What was changed:** Corrected to "typically 8-15 KB".
   - **Why:** Each hashtable entry requires a dictEntry (24 bytes) plus two SDS strings with jemalloc overhead, totaling ~80+ bytes per entry. For 133 entries, the realistic range is 8,000-15,000 bytes.

## Review Notes
- The `ql_ziplist_max` field name in the DEBUG OBJECT output (line 156) may still appear in Redis 7.0 for backward compatibility, but could be renamed in newer versions. This was left as-is since it is plausible for Redis 7.0/7.2.
- The integer encoding table now consistently shows encoding+data bytes without backlen. Each entry also has 1 byte of backlen overhead not reflected in the table — this is a reasonable simplification for a blog post.
- The time complexity table and cache locality explanation are accurate.
- The sorted set listpack storage order (sorted by score) is correct.
- All Redis CLI commands shown are syntactically correct and produce the described outputs.
