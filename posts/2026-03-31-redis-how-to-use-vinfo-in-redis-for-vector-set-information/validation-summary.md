# Validation Summary: How to Use VINFO in Redis for Vector Set Information

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (8.x+ with Vector Sets support)
- Redis Vector Sets (VINFO, VADD, VCARD, VDIM commands)
- Python (redis-py client library)
- HNSW (Hierarchical Navigable Small World) graph algorithm

## Sources Consulted
- [VINFO | Redis Docs](https://redis.io/docs/latest/commands/vinfo/)
- [VADD | Redis Docs](https://redis.io/docs/latest/commands/vadd/)
- [VCARD | Redis Docs](https://redis.io/docs/latest/commands/vcard/)
- [VDIM | Redis Docs](https://redis.io/docs/latest/commands/vdim/)
- [Redis Vector Sets Overview](https://redis.io/docs/latest/develop/data-types/vector-sets/)
- [Redis Source Code - vset.c (8.2.3)](https://github.com/redis/redis/blob/8.2.3/modules/vector-sets/vset.c) — confirmed VINFO returns exactly 9 fields via `RedisModule_ReplyWithMap(ctx, 9)`

## Issues Found

### 1. VINFO output fields were fabricated
**What was wrong:** The sample output and field table listed fields that do not exist in VINFO: `current-elements`, `deleted-elements`, `max-elements`, `entry-point`, and `memory-usage`. The real field for element count is `size`. Fields like `deleted-elements`, `max-elements`, `entry-point`, and `memory-usage` are not returned by VINFO at all.
**What was changed:** Replaced the entire sample output and field description table with the correct 9 fields: `quant-type`, `hnsw-m`, `vector-dim`, `projection-input-dim`, `size`, `max-level`, `attributes-count`, `vset-uid`, `hnsw-max-node-uid`.

### 2. VADD syntax had wrong argument order
**What was wrong:** All VADD examples placed the element name before the vector data (e.g., `VADD my_vectors item1 VALUES 4 0.1 0.2 0.3 0.4`). The correct VADD syntax requires the element name to come after the vector data (e.g., `VADD my_vectors VALUES 4 0.1 0.2 0.3 0.4 item1`).
**What was changed:** Fixed all VADD commands in both the sample output section and the Python code to use the correct argument order.

### 3. Python VADD call incorrectly combined FP32 and VALUES
**What was wrong:** The Python example used `r.execute_command("VADD", "products:vectors", "FP32", "prod:1001", "VALUES", "8", ...)` which nonsensically combines `FP32` (a binary blob input format) with `VALUES` (a text-based input format). These are mutually exclusive input methods.
**What was changed:** Replaced with the correct `VALUES`-based syntax: `r.execute_command("VADD", "products:vectors", "VALUES", "8", "0.1", ..., "prod:1001")`.

### 4. Wrong quantization types listed
**What was wrong:** The post claimed quantization types are `int8, bf16, fp32, or none`. The types `bf16` and `none` do not exist in Redis Vector Sets. The actual VINFO quant-type values are `int8` (default, via Q8 option), `f32` (via NOQUANT option), and `bin` (via BIN option).
**What was changed:** Updated the field table to list the correct values: `int8, f32, or bin`.

### 5. Python code referenced non-existent VINFO fields
**What was wrong:** The `print_index_report`, `estimate_full_capacity`, and `is_index_healthy` functions all referenced fields that don't exist in VINFO output (`current-elements`, `deleted-elements`, `memory-usage`).
**What was changed:** Rewrote all three functions to use only real VINFO fields (`size`, `vector-dim`, `quant-type`, `hnsw-m`, `projection-input-dim`, `attributes-count`). The capacity estimation now calculates based on dimensions and quantization type rather than a non-existent memory-usage field. The health check was simplified to use available fields.

### 6. Summary paragraph referenced non-existent fields
**What was wrong:** The summary mentioned `memory-usage` and `deleted-elements` fields.
**What was changed:** Updated to reference the actual fields `vector-dim`, `quant-type`, `hnsw-m`, and `max-level`.

## Review Notes
- The VCARD and VDIM commands referenced in the comparison table are real Redis commands and correctly described.
- The `parse_vinfo` function's approach of zipping alternating key-value pairs from the raw response is correct for VINFO's map-style output.
- The capacity estimation function now uses a heuristic based on quantization type and HNSW M parameter. This provides a rough estimate; actual memory usage depends on additional factors like HNSW graph level distribution and Redis internal overhead.
