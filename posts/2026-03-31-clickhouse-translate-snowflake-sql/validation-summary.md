# Validation Summary: How to Translate Snowflake SQL to ClickHouse SQL

## Status
validated

## Post Type
Reference / Migration Guide

## Technologies Covered
- ClickHouse (SQL dialect, data types, built-in functions)
- Snowflake (SQL dialect, VARIANT type, LATERAL FLATTEN)
- SQL query translation patterns (date functions, JSON access, window functions)

## Sources Consulted
- ClickHouse QUALIFY clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/qualify
- ClickHouse Bool type documentation: https://clickhouse.com/docs/sql-reference/data-types/boolean
- ClickHouse DateTime64 documentation: https://clickhouse.com/docs/sql-reference/data-types/datetime64
- ClickHouse Decimal type documentation: https://clickhouse.com/docs/sql-reference/data-types/decimal
- ClickHouse date/time functions documentation: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse JSON functions documentation: https://clickhouse.com/docs/sql-reference/functions/json-functions
- ClickHouse conditional functions documentation: https://clickhouse.com/docs/sql-reference/functions/conditional-functions
- ClickHouse arrayJoin documentation: https://clickhouse.com/docs/sql-reference/functions/array-join
- ClickHouse JSON data type documentation: https://clickhouse.com/docs/sql-reference/data-types/newjson
- ClickHouse Map type documentation: https://clickhouse.com/docs/sql-reference/data-types/map
- Snowflake date/time data types documentation: https://docs.snowflake.com/en/sql-reference/data-types-datetime
- Snowflake numeric data types documentation: https://docs.snowflake.com/en/sql-reference/data-types-numeric

## Issues Found

### 1. QUALIFY clause incorrectly described as unsupported (HIGH severity)
- **What was wrong:** The post stated "ClickHouse requires a subquery" for QUALIFY filtering, and showed a subquery workaround as the ClickHouse translation. ClickHouse natively supports the QUALIFY clause.
- **What was changed:** Updated the section to state that ClickHouse supports QUALIFY and the translation is direct. Replaced the subquery example with the identical QUALIFY syntax. Updated the summary paragraph to list QUALIFY among the easy direct translations.
- **Why:** ClickHouse documents QUALIFY support in its official SQL reference. Using a subquery when QUALIFY is available adds unnecessary complexity and could mislead readers doing migrations.

### 2. BOOLEAN mapped to UInt8 instead of Bool (MEDIUM severity)
- **What was wrong:** The data type mapping table showed `BOOLEAN -> UInt8`. While UInt8 works (Bool is stored as UInt8 internally), ClickHouse has a dedicated `Bool` type that is the idiomatic and semantically correct choice.
- **What was changed:** Updated the mapping from `UInt8` to `Bool`.
- **Why:** The Bool type provides better semantic clarity and SQL standard compatibility. It has been available in ClickHouse since version 21.x.

## Review Notes
- The `ARRAY -> Array(String)` mapping is correct for Snowflake VARIANT arrays containing strings, but readers should be aware that they may need `Array(T)` with a different element type depending on their data.
- The ClickHouse JSON data type became production-ready in version 25.3. For older versions, the String-based approach with JSONExtract* functions shown in the post is the correct method.
- DateTime64(9) provides nanosecond precision matching Snowflake's TIMESTAMP_NTZ default, but limits the maximum representable date to 2262-04-11. For most practical use cases this is fine, but readers needing a wider date range could use lower precision (3 or 6).
