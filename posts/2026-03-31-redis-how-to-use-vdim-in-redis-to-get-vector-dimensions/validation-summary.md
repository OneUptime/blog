# Validation Summary: How to Use VDIM in Redis to Get Vector Dimensions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Open Source 8.0.0+)
- Redis Vector Sets (VDIM, VADD, VINFO commands)
- Python (`redis-py` client library)

## Sources Consulted
- Redis official VDIM documentation: https://redis.io/docs/latest/commands/vdim/
- Redis official VADD documentation: https://redis.io/docs/latest/commands/vadd/
- Redis official VINFO documentation: https://redis.io/docs/latest/commands/vinfo/

## Issues Found

### 1. VADD argument order incorrect throughout (all bash and Python examples)
**What was wrong:** The blog placed the element name before `VALUES` and the vector data (e.g., `VADD my_vectors item1 VALUES 4 0.1 0.2 0.3 0.4`). Per the official Redis documentation, the correct VADD syntax is `VADD key VALUES num <vector_values...> element` — the element name comes **after** the vector values.

**What was changed:** Fixed all VADD invocations (2 bash examples, 3 Python `execute_command` calls, and 1 Python command-building list) to place the element name after the vector values.

### 2. `get_index_dimension` function does not handle VDIM error for non-existent keys
**What was wrong:** The function used `return int(result) if result else 0`, assuming VDIM returns a falsy value (None/0) for non-existent keys. Per the official docs, VDIM returns a **Simple error reply** when the key does not exist, which causes `redis-py` to raise an exception — the `else 0` branch would never execute.

**What was changed:** Wrapped the VDIM call in a `try/except` block to catch the error and return 0, matching the function's intended behavior for non-existent keys.

## Review Notes
- The VDIM command description, syntax, return type, and error behavior are all accurately documented.
- The comparison between VDIM and VINFO is correct — VDIM returns only the dimension count while VINFO returns full metadata including `vector-dim`.
- The model dimension mapping (384 for MiniLM-L6-v2, 768 for mpnet-base-v2, 1536 for text-embedding-3-small, 3072 for text-embedding-3-large) is accurate.
- The `check_all_dimensions` function using `r.keys()` is fine for illustrative purposes but would not be recommended in production (KEYS can block Redis on large datasets; SCAN would be preferred).
