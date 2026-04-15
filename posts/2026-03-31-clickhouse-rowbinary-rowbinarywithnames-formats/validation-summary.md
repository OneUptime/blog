# Validation Summary: How to Use RowBinary and RowBinaryWithNames Formats in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (RowBinary, RowBinaryWithNames, RowBinaryWithNamesAndTypes formats)
- Python (custom binary parser example)
- clickhouse-client CLI

## Sources Consulted
- ClickHouse official documentation on formats: https://clickhouse.com/docs/en/interfaces/formats#rowbinary
- ClickHouse official documentation on RowBinaryWithNames: https://clickhouse.com/docs/en/interfaces/formats#rowbinarywithnames
- ClickHouse official documentation on RowBinaryWithNamesAndTypes: https://clickhouse.com/docs/en/interfaces/formats#rowbinarywithnamesandtypes
- ClickHouse official documentation on Native format: https://clickhouse.com/docs/en/interfaces/formats#native
- LEB128 variable-length integer encoding specification (used by ClickHouse for varint encoding)

## Issues Found
1. **String serialization description inaccuracy**: The post described String serialization as "varint length followed by UTF-8 bytes." ClickHouse strings are arbitrary byte sequences, not necessarily UTF-8. Changed to "varint length followed by raw bytes."
2. **Python parser missing DateTime column**: The export command selects 4 columns (`id, ts, event_type, value`), but the `read_row` Python function only parsed 3 fields — it skipped the `ts` (DateTime/UInt32) column. This would cause the parser to produce incorrect results when reading `events.rowbin`, since the 4-byte DateTime value would be misinterpreted as the start of the String varint. Added the missing `ts = struct.unpack('<I', buf.read(4))[0]` read and updated the return tuple.

## Review Notes
- The performance comparison table uses approximate/illustrative numbers rather than benchmarked figures. The relative ordering (RowBinary < CSV < JSONEachRow in size, and RowBinary fastest) is directionally correct, but readers should not treat the exact numbers as authoritative.
- The RowBinaryWithNames description omits the detail that a LEB128-encoded column count precedes the column name strings in the header. This is accurate enough for a high-level overview but someone implementing a parser from this blog post alone would miss that prefix byte. The same applies to RowBinaryWithNamesAndTypes.
- The varint (LEB128) implementation in Python is correct and matches ClickHouse's documented encoding.
- All CLI commands use correct syntax for clickhouse-client.
