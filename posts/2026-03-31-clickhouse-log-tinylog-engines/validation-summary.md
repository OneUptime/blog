# Validation Summary: How to Use Log and TinyLog Engines in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- TinyLog table engine
- Log table engine
- StripeLog (mentioned)
- LowCardinality data type
- SQL (DDL and DML)

## Sources Consulted
- ClickHouse Log Family overview: https://clickhouse.com/docs/en/engines/table-engines/log-family
- ClickHouse TinyLog engine documentation: https://clickhouse.com/docs/en/engines/table-engines/log-family/tinylog
- ClickHouse Log engine documentation: https://clickhouse.com/docs/en/engines/table-engines/log-family/log

## Issues Found

### 1. Incorrect claim about data compression (Limitations section)
- **What was wrong:** The post stated "No data compression by default (unlike MergeTree)." This is factually incorrect. The official ClickHouse documentation for both TinyLog and Log engines states that column files contain "serialized and compressed data." Log family engines compress data by default, just like MergeTree.
- **What was changed:** Replaced the bullet with "Data is compressed (like MergeTree), but lacks advanced MergeTree features such as configurable granularity and secondary indices."
- **Why:** Readers could incorrectly conclude that Log/TinyLog engines store uncompressed data, leading to wrong assumptions about disk usage.

### 2. Incorrect concurrent read behavior for TinyLog
- **What was wrong:** The "Concurrent INSERT Limitation" section stated "Reads during an insert return only previously committed data." According to the official documentation, during INSERT queries the table is locked and other queries (including reads) wait for the table to unlock. Reads do not return partial or previously-committed data — they are blocked until the write completes.
- **What was changed:** Replaced with "Reads are blocked while an insert is in progress and will wait for the write to complete before returning results."
- **Why:** The original wording could mislead readers into thinking they would get stale-but-valid results during writes, when in reality queries are blocked.

## Review Notes
- The marks file name `__marks.mrk` is confirmed correct per the official Log engine documentation.
- The file layout on disk section omits the `sizes.json` file that Log engine tables also create, but this is acceptable for a simplified illustration.
- The post correctly notes that TinyLog does not support parallel data reading by multiple threads within a single query, while Log does (via the marks file).
- ClickHouse Cloud does not support either Log or TinyLog engines — this is not mentioned in the post but could be worth noting in a future update.
