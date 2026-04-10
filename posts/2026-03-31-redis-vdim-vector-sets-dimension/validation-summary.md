# Validation Summary: How to Use VDIM in Redis Vector Sets to Get Dimension

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 8.0 (Vector Sets)
- Redis VDIM command
- Redis VADD command
- Python (redis-py client)
- Node.js (ioredis client)

## Sources Consulted
- Redis official documentation for VADD: https://redis.io/docs/latest/commands/vadd/
- Redis official documentation for VDIM: https://redis.io/docs/latest/commands/vdim/
- Other validated blog posts in this repository covering VADD, VCARD, VINFO, and VREM commands

## Issues Found

1. **All VADD commands missing `VALUES <count>` keyword (6 instances in Redis examples)**: The VADD command requires `VALUES num` before the float values when passing vector components as strings. All Redis CLI examples used bare floats (e.g., `VADD embeddings 0.1 0.2 0.3 0.4 doc1`) instead of the correct syntax (`VADD embeddings VALUES 4 0.1 0.2 0.3 0.4 doc1`). Fixed all 5 VADD commands in the Redis code blocks.

2. **Python VADD call missing `VALUES` keyword and dimension count**: The `execute_command("VADD", key, *vec_args, member)` call was missing the `"VALUES"` keyword and `str(len(vector))` dimension count argument. Fixed to `execute_command("VADD", key, "VALUES", str(len(vector)), *vec_args, member)`.

3. **Python exception handling swallowed ValueError**: The original exception handler caught all exceptions with `except Exception as e` and only re-raised if `"ERR"` or `"WRONGTYPE"` appeared in the message. A `ValueError` raised for a dimension mismatch (e.g., `"Expected 8 dimensions, got 4"`) does not contain either substring, so it would be silently swallowed instead of propagated to the caller. Fixed by adding a separate `except ValueError: raise` clause before the general `except Exception` catch-all.

4. **Node.js VADD call missing `VALUES` keyword and dimension count**: The `redis.call("VADD", key, ...vecArgs, member)` call was missing `"VALUES"` and `vector.length` arguments. Fixed to `redis.call("VADD", key, "VALUES", vector.length, ...vecArgs, member)`.

5. **REDUCE example VADD missing `VALUES` keyword**: The REDUCE example `VADD big_embeddings REDUCE 64 0.01 0.02 ...` was missing `VALUES 1536` to specify the original vector dimension count. Fixed to `VADD big_embeddings REDUCE 64 VALUES 1536 0.01 0.02 ...`.

## Review Notes
- The VDIM documentation states that when REDUCE is used, `VDIM` returns the reduced dimension but `VSIM` queries still require full-size vectors. The blog post correctly notes VDIM returns the reduced dimension but does not mention the VSIM requirement. This is not incorrect but could be a useful addition in a future update.
- The embedding dimensions table is accurate for the default output dimensions of each listed model. Note that OpenAI text-embedding-3-small and text-embedding-3-large support configurable output dimensions via the `dimensions` API parameter, so the listed values represent defaults.
- The Node.js example uses top-level `await` which requires ES modules or a supported runtime (Node.js 14.8+ with `--experimental-top-level-await`, or Node.js 16+ with ESM). This is a common modern pattern and not an error.
