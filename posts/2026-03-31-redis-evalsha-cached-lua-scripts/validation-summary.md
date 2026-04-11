# Validation Summary: How to Use EVALSHA in Redis to Run Cached Lua Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (EVALSHA, EVAL, SCRIPT LOAD, SCRIPT EXISTS, SCRIPT FLUSH commands)
- Lua scripting in Redis
- Bash scripting (NOSCRIPT fallback example)

## Sources Consulted
- Redis official documentation for EVALSHA: https://redis.io/docs/latest/commands/evalsha/
- Redis official documentation for SCRIPT LOAD: https://redis.io/docs/latest/commands/script-load/
- Redis official documentation for EVAL: https://redis.io/docs/latest/commands/eval/
- Redis official documentation for SCRIPT EXISTS: https://redis.io/docs/latest/commands/script-exists/
- SHA1 hash verification via `shasum -a 1` on the example script text

## Issues Found
- **Incorrect SHA1 hash in examples**: The SHA1 hash shown as the result of `SCRIPT LOAD "return redis.call('SET', KEYS[1], ARGV[1])"` was `2fa2b029f72572e803ff55a6a2a3f4a5b44060d6`, but the actual SHA1 of that script text is `d8f2fad9f8e86a53d2a6ebd960b33c4972cacc37`. This incorrect hash appeared in four places: the SCRIPT LOAD result, the EVALSHA call example, the NOSCRIPT error example, and the SCRIPT EXISTS example. All four occurrences were corrected. A reader following the tutorial with the original hashes would get mismatched SHA1 values and NOSCRIPT errors.

## Review Notes
- The rate limiter example uses a placeholder SHA1 (`abc123def456abc123def456abc123def456abc1`) which is acceptable since the actual hash depends on exact whitespace in the multiline script. The placeholder is correctly 40 hex characters long.
- The bandwidth savings calculation ("~5MB/sec" for a 500-byte script at 10,000 calls/sec) is slightly generous — the precise savings would be ~4.6MB/sec since EVALSHA still transmits the 40-character hash. The "~" qualifier makes this acceptable as an approximation.
- The post correctly notes that the script cache is not replicated to replicas and is cleared on restart or SCRIPT FLUSH.
- The NOSCRIPT fallback pattern shown in the bash example is functional and follows the recommended approach from Redis documentation.
- Redis also caches scripts sent via EVAL internally (so subsequent EVAL calls with the same script skip parsing), but the primary benefit of EVALSHA — reduced network bandwidth — is correctly emphasized throughout the post.
