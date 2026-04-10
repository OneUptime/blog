# Validation Summary: How to Handle Serialization Versioning in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3 (f-strings, type hints, dict unpacking)
- Redis (via redis-py client library)
- JSON serialization (`json` stdlib module)
- Apache Avro (via `fastavro` library)
- `struct` module for binary packing
- Schema evolution / versioning patterns

## Sources Consulted
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html — verified `pack_into` requires a pre-sized buffer vs `pack` which returns new bytes
- Python `io.BytesIO` documentation: https://docs.python.org/3/library/io.html#io.BytesIO — confirmed empty BytesIO has zero-length buffer
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/ — verified `Redis()` constructor args, `set(name, value, ex=...)`, and `get()` return behavior with `decode_responses=True`
- fastavro documentation: https://fastavro.readthedocs.io/en/latest/ — confirmed `schemaless_writer(fo, schema, record)` and `schemaless_reader(fo, writer_schema, reader_schema=None)` signatures

## Issues Found

### Issue 1: `struct.pack_into` on empty BytesIO buffer (Strategy 3 — `pack` function)

**What was wrong:** `struct.pack_into(">H", buf.getbuffer(), 0, CURRENT_VERSION)` was called on an empty `io.BytesIO()`. Since `pack_into` writes into an existing buffer at a given offset and does not grow the buffer, this raises `struct.error: pack_into requires a buffer of at least 2 bytes for packing 2 bytes at offset 0 (actual buffer size is 0)`. Confirmed by running the code.

**What was changed:** Replaced `struct.pack_into(">H", buf.getbuffer(), 0, CURRENT_VERSION)` / `buf.seek(2)` with `buf.write(struct.pack(">H", CURRENT_VERSION))`. `struct.pack` returns a new `bytes` object and `BytesIO.write()` appends it, growing the stream automatically. The subsequent `fastavro.schemaless_writer` call then appends after the 2-byte version header as intended.

### Issue 2: Lazy migration re-cache condition never triggers

**What was wrong:** In `get_with_migration`, the check `data.get("_v", 1) != 2` was performed *after* calling `deserialize(raw)`. But `deserialize` already migrates v1 objects to v2 (via `migrate_v1_to_v2`, which sets `_v = 2`). So after deserialization, `data["_v"]` is always `2`, and the re-cache branch never executes — defeating the purpose of lazy migration.

**What was changed:** Added `original_version = json.loads(raw).get("_v", 1)` before the `deserialize` call to capture the version from the raw payload. The re-cache condition now checks `original_version != 2` instead, so stale v1 entries are correctly written back as v2.

## Review Notes
- Strategy 1 and Strategy 2 code examples are correct and idiomatic.
- The `fastavro.schemaless_reader` call correctly passes `writer_schema` as the positional arg and `reader_schema` as keyword, which is the right way to enable Avro schema evolution.
- The `SCHEMAS` dict in Strategy 3 references `v1_schema` and `v2_schema` which are undefined — this is acceptable for a tutorial as they represent placeholder Avro schema definitions the reader would supply.
- The redis-py API usage (`set` with `ex` for seconds-based expiry, `get` returning `None` on miss) is current and correct.
