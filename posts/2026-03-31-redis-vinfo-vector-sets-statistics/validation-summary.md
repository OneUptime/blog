# Validation Summary: How to Use VINFO in Redis Vector Sets to Get Statistics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 8.0+ (vector sets)
- Redis VINFO, VADD, VCARD, VDIM commands
- HNSW (Hierarchical Navigable Small World) graph index
- Python (redis-py client)
- Node.js (ioredis client)

## Sources Consulted
- Redis VINFO command documentation: https://redis.io/docs/latest/commands/vinfo/
- Redis VADD command documentation: https://redis.io/docs/latest/commands/vadd/
- Redis VCARD command documentation: https://redis.io/docs/latest/commands/vcard/
- Redis VDIM command documentation: https://redis.io/docs/latest/commands/vdim/
- Redis vector sets source code (vset.c): https://github.com/redis/redis/blob/8.2.3/modules/vector-sets/vset.c
- Redis vector sets memory optimization docs: https://redis.io/docs/latest/develop/data-types/vector-sets/memory/

## Issues Found

1. **VADD syntax missing `VALUES` keyword**: All VADD calls used bare float syntax (e.g., `VADD products 0.1 0.9 0.3 0.7 item1`) instead of the required `VALUES num` format. Fixed to `VADD products VALUES 4 0.1 0.9 0.3 0.7 item1`. Also fixed the Python `execute_command` call to include `"VALUES"` and the dimension count.

2. **Wrong VINFO field name `vector-count`**: The correct field name is `size`. Fixed in the example output, fields table, and all Python/Node.js code references.

3. **Wrong VINFO field name `max-node-edges`**: The correct field name is `hnsw-m`. Fixed in the example output, fields table, and mermaid diagram.

4. **Non-existent VINFO field `ml`**: There is no `ml` field in VINFO output. Removed from the example output, fields table, and diagram.

5. **Wrong quantization type names**: The blog listed `float32`, `q8`, and `bin` as VINFO quant-type values. The actual values returned by VINFO are `f32`, `int8`, and `bin`. Fixed in the fields table, mermaid diagram, and the assertion in the verification code example.

6. **Missing VINFO fields**: The original post only showed 6 fields. Added the missing fields to the example output and fields table: `hnsw-m`, `projection-input-dim`, `attributes-count`, `vset-uid`, and `hnsw-max-node-uid`.

## Review Notes
- The VINFO response fields have expanded over Redis 8.x releases. The corrected output reflects the full set of 9 fields available in Redis 8.2.3. Earlier 8.0 releases may return fewer fields (omitting `hnsw-m`, `projection-input-dim`, and `attributes-count`), but the field names that do appear use the same naming convention documented here.
- The VCARD and VDIM command descriptions in the comparison table are accurate.
- The Python and Node.js patterns for parsing the flat key-value array into a dictionary are correct and idiomatic.
