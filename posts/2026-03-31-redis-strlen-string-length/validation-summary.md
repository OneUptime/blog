# Validation Summary: How to Use STRLEN in Redis to Get String Length

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (STRLEN, SET, DEL, APPEND, SETRANGE commands)
- redis-cli
- Bash scripting with redis-cli
- UTF-8 encoding

## Sources Consulted
- Redis official documentation for STRLEN: https://redis.io/commands/strlen/
- Redis official documentation for APPEND: https://redis.io/commands/append/
- Redis official documentation for DEL: https://redis.io/commands/del/
- Redis CLI documentation: https://redis.io/docs/connect/cli/
- UTF-8 encoding specification (RFC 3629)

## Issues Found

### 1. Incorrect byte count for JSON payload example
- **What was wrong:** The `STRLEN user:1` example claimed the JSON string `{"id":1,"name":"Alice","email":"alice@example.com"}` was 50 bytes. The actual byte count is 51.
- **What was changed:** Corrected `(integer) 50` to `(integer) 51` in the output block.
- **Why:** Manually counted and verified with `echo -n '...' | wc -c` -- the string is 51 ASCII characters / bytes.

### 2. Missing DEL output in APPEND comparison example
- **What was wrong:** The "STRLEN compared to APPEND return value" section had 3 commands (`DEL buf`, `APPEND buf "hello"`, `APPEND buf " world"`) but only showed 2 output lines. The `DEL` command's return value was missing.
- **What was changed:** Added `(integer) 0` as the first output line to reflect the DEL return value (number of keys deleted).
- **Why:** DEL always returns an integer indicating the number of keys removed. The other DEL example in the post (APPEND buffer growth) correctly showed this output, so the omission was inconsistent and could confuse readers.

## Review Notes
- The bash scripting example (`redis-cli STRLEN` in a command substitution) is correct because redis-cli automatically switches to raw output mode when stdout is not a TTY, so the `-eq` integer comparison works as expected.
- The post correctly emphasizes that STRLEN counts bytes, not Unicode characters, and the multi-byte UTF-8 emoji example is accurate (wave emoji is 4 bytes in UTF-8).
- The O(1) time complexity claim for STRLEN is correct -- Redis stores string length metadata alongside the string data.
- All other byte counts were verified and are correct.
