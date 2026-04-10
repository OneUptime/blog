# Validation Summary: How Redis SDS (Simple Dynamic Strings) Works

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- Redis (internals)
- SDS (Simple Dynamic Strings) library
- C programming (data structures, memory management)
- redis-cli

## Sources Consulted
- Redis source code: `src/sds.h` and `src/sds.c` — SDS header struct definitions (sdshdr5, sdshdr8, sdshdr16, sdshdr32, sdshdr64), pre-allocation logic (`sdsMakeRoomFor`)
- Redis source code: `src/object.c` — `OBJ_ENCODING_EMBSTR_SIZE_LIMIT` definition (44 bytes) and embedded string allocation
- antirez/sds standalone library (https://github.com/antirez/sds) — original SDS struct definition
- Redis documentation on APPEND command — pre-allocation behavior description
- Redis documentation on OBJECT ENCODING command — embstr vs raw encoding

## Issues Found

### 1. Incorrect SDS header size range (line 78)
- **What was wrong:** The post claimed SDS adds "3 to 11 bytes" of header overhead. The value 11 does not correspond to any SDS header type.
- **What was changed:** Corrected to "1 to 17 bytes". The actual header sizes for packed structs are: sdshdr5 = 1 byte, sdshdr8 = 3 bytes, sdshdr16 = 5 bytes, sdshdr32 = 9 bytes, sdshdr64 = 17 bytes.
- **Why:** The header sizes are determined by the packed struct layouts in `sds.h`. Each has a 1-byte `flags` field plus `len` and `alloc` fields of the corresponding integer size.

### 2. Incorrect pre-allocation example comment (line 61)
- **What was wrong:** The third APPEND (`APPEND counter "c"`) was commented as "# same", implying no reallocation was needed. In reality, after the second APPEND consumes the last free byte (len=2, alloc=2, free=0), the third APPEND must trigger a reallocation.
- **What was changed:** Updated comment to "# realloc needed (no free space left), allocates 6 bytes" and clarified the first APPEND comment.
- **Why:** After APPEND "a", alloc=2 and len=1 (free=1). After APPEND "b", len=2 and free=0. The third APPEND finds no free space and must realloc: new_len=3, and since 3 < 1MB, the new allocation is 2×3 = 6 bytes.

### 3. Broken binary-safe example (lines 69-74)
- **What was wrong:** The example used bash ANSI-C quoting (`$'\x00\x01\x02\x03'`) to pass binary data containing null bytes to redis-cli via command-line arguments. Null bytes cannot survive as command-line arguments on Unix systems because `execve()` arguments are null-terminated C strings. Bash itself strips null bytes from variables.
- **What was changed:** Replaced with `printf '\x00\x01\x02\x03' | redis-cli -x SET binkey`, which uses redis-cli's `-x` flag to read the last argument from stdin, bypassing the argv limitation entirely.
- **Why:** The `-x` flag is the standard way to pass binary data to redis-cli. The `printf` command writes raw bytes to a pipe, and redis-cli reads them from stdin without null-termination issues.

## Review Notes
- The SDS struct shown in the post is the pre-3.2 version (with `int len` and `int free` fields). The post correctly notes that Redis 3.2+ introduced typed headers, but the "Key Properties" and "Lazy Shrinking" sections still reference the `free` field. In modern Redis (3.2+), this field was replaced by `alloc` (total allocated size), with free space computed as `alloc - len`. The concept is the same, so this is acceptable for a conceptual explainer but worth noting for future revision.
- The embstr threshold of 44 bytes is confirmed correct for Redis 3.2+ (based on fitting robj(16) + sdshdr8(3) + string + null(1) into jemalloc's 64-byte allocation class).
- The pre-allocation strategy (double below 1MB, linear +1MB above) is confirmed correct per the `sdsMakeRoomFor` function in `sds.c`.
