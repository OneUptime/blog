# Validation Summary: How to Use Lua String Operations in Redis Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (EVAL scripting)
- Lua 5.1 (as embedded in Redis)
- Lua `string` standard library

## Sources Consulted
- Lua 5.1 Reference Manual — String Manipulation: https://www.lua.org/manual/5.1/manual.html#5.4
- Lua 5.2 Reference Manual — `string.rep` changes: https://www.lua.org/manual/5.2/manual.html#6.4
- Redis EVAL documentation: https://redis.io/docs/latest/commands/eval/
- Redis Lua scripting reference: https://redis.io/docs/latest/develop/interact/programmability/lua-api/

## Issues Found

1. **`string.rep` with separator argument (Lua 5.2+ only)**
   - **What was wrong:** The post included `string.rep("ab", 3, "-")` claiming it returns `"ab-ab-ab"`. The three-argument form of `string.rep` with a separator was introduced in Lua 5.2. Redis embeds Lua 5.1, so this call would fail at runtime.
   - **What was changed:** Removed the three-argument `string.rep` example and added a note that Redis uses Lua 5.1 (which only supports two arguments).
   - **Why:** Prevents readers from using a function signature that does not exist in Redis's Lua environment.

2. **Misleading "String Length vs Byte Length" section**
   - **What was wrong:** The prose suggested using `string.len()` as an alternative to `#s` for multi-byte UTF-8 strings, and referenced a vague "byte library." In reality, `string.len()` and `#s` are identical — both return byte length. Lua 5.1 has no built-in UTF-8 character counting. The code comments even acknowledged they are the same, contradicting the prose.
   - **What was changed:** Rewrote the section to clearly state that both `#s` and `string.len()` return byte length, and that Lua 5.1 in Redis has no built-in UTF-8 character counting. Removed the unreachable second `return` statement.
   - **Why:** The original text would mislead readers into thinking `string.len()` provides UTF-8-aware character counting, which it does not.

## Review Notes
- Several code blocks contain multiple sequential `return` statements (e.g., in "String Basics" and "Case and Repetition"). These are illustrative snippets showing individual expressions rather than runnable scripts, so this is acceptable as a teaching convention, though readers should understand only the first `return` would execute in practice.
- The `string.find` call on line 39 uses a plain string `"profile"` as the pattern. This works correctly here, but readers should be aware that special pattern characters (e.g., `.`, `%`, `(`) in the search string would need escaping. The post doesn't mention this but it's outside the scope of the examples shown.
- All Redis commands (`EVAL`, `INCR`, `INCRBY`, `SADD`, `SCARD`) and Lua API calls (`redis.call`, `redis.error_reply`) are used correctly.
