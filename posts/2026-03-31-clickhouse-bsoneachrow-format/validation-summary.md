# Validation Summary: How to Use BSONEachRow Format in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (BSONEachRow input/output format, `file()` table function, `MergeTree`, `clickhouse-client`)
- MongoDB (BSON wire format, ObjectId, Decimal128)
- MongoDB Database Tools (`mongodump`, `bsondump`)

## Sources Consulted
- ClickHouse BSONEachRow format documentation: https://clickhouse.com/docs/en/interfaces/formats/BSONEachRow
- ClickHouse source for BSON input parsing (`BSONEachRowRowInputFormat.cpp`): https://github.com/ClickHouse/ClickHouse/blob/master/src/Processors/Formats/Impl/BSONEachRowRowInputFormat.cpp
- MongoDB `bsondump` documentation: https://www.mongodb.com/docs/database-tools/bsondump/
- MongoDB `mongodump` documentation (for `--numParallelCollections` and dump file layout)
- BSON specification (type byte codes): https://bsonspec.org/spec.html

## Issues Found

1. **Misuse of `bsondump` to "convert to a BSON stream."** The original "Exporting from MongoDB" and "Practical Migration Workflow" sections piped `mongodump`'s output through `bsondump` to produce a `.bson` stream. `bsondump` actually converts BSON → JSON (Extended JSON), so the resulting file would be JSON and `BSONEachRow` would fail to parse it. Fixed by removing the `bsondump` step and noting that `mongodump`'s `.bson` file is already a stream of concatenated BSON documents that `BSONEachRow` reads directly. The mention of `mongoexport` (which has no BSON output mode) was also removed.

2. **ObjectId representation claimed to be hex string.** The original "Handling ObjectId" section stated that ClickHouse represents ObjectIds as hex strings and recommended `FixedString(24)`. ClickHouse actually inserts the raw 12 bytes (verified in `BSONEachRowRowInputFormat.cpp`, which calls `readAndInsertStringImpl` with `BSON_OBJECT_ID_SIZE` = 12). Fixed to use `FixedString(12)` for the raw bytes and added a `hex(_id)` example for displaying the familiar 24-character form.

3. **`Boolean → UInt8` mapping.** Replaced with `Bool` to match the official input mapping table. (`Bool` is implemented as `UInt8` internally so the original would have worked, but `Bool` is the documented mapping.)

4. **`Decimal128` row in mapping table.** The official input mapping table does not include the BSON `\x13` (decimal128) type. ClickHouse parses `Decimal128`/`Decimal256`/big integers from BSON Binary values instead. Replaced the `Decimal128` row with an explanatory note matching the docs. Also expanded the `Binary`, `Int32`, and `Int64` rows to reflect the additional ClickHouse target types listed in the official mapping (e.g., `IPv6`, `IPv4`, `Decimal32`, `UInt32`, `Enum`, etc.).

5. **Misdescribed `input_format_bson_skip_fields_with_unsupported_types_in_schema_inference`.** The original text introduced this setting as "Enable object reading as strings," which is wrong. The setting allows schema inference to skip columns whose BSON types cannot be mapped, rather than failing. Updated the description to match the official documentation and reframed the JSON-extraction example so it's clearly conditional on the column being declared as `String`.

## Review Notes

- The post still suggests three high-level strategies for nested BSON documents (`String`, `Map(String, String)`, `Tuple`). The official mapping uses `Map / Named Tuple` for `\x03` document; `Tuple`/`Named Tuple` is the more accurate spelling but the post's phrasing is acceptable as plain prose.
- The output mapping (`SELECT ... FORMAT BSONEachRow`) is correct: `Decimal128` writes as `\x05` binary subtype `\x00`, which round-trips back into `Decimal128` on input via the Binary path noted in the table caveat.
- `mongodump --numParallelCollections` is correct as of MongoDB Database Tools 100.x and parallelizes collection-level dumps within a database.
- The post recommends `Float64` for BSON `Double`, which matches; `Float32` is also accepted but loses precision.
