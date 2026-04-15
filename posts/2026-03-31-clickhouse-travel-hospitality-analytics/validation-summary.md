# Validation Summary: How to Use ClickHouse for Travel and Hospitality Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (columnar OLAP database)
- SQL (ClickHouse dialect)
- MergeTree engine, LowCardinality encoding, Decimal type
- ClickHouse functions: dateDiff, multiIf, countIf, sumIf, toYYYYMM, toStartOfWeek, toYear, toMonth, toDate

## Sources Consulted
- ClickHouse SQL Reference — CREATE TABLE: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse Data Types (LowCardinality, Decimal, UInt): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse MergeTree Engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Arithmetic Operators (division returns Float64 for integer operands): https://clickhouse.com/docs/en/sql-reference/operators/arithmetic
- ClickHouse Functions — dateDiff, multiIf, countIf, sumIf, toStartOfWeek: https://clickhouse.com/docs/en/sql-reference/functions
- ClickHouse WITH (CTE) syntax: https://clickhouse.com/docs/en/sql-reference/statements/select/with

## Issues Found
1. **CTE missing FROM clause in Occupancy/RevPAR query (line 46):** The `hotel_capacity` CTE used `SELECT hotel_id, 200 AS total_rooms` without a FROM clause. Since `hotel_id` is a column (not a constant), ClickHouse would fail with "Unknown identifier: hotel_id". A SELECT without FROM in ClickHouse returns a single row of constants only. Fixed by adding `SELECT DISTINCT hotel_id, 200 AS total_rooms FROM hotel_bookings` so that each hotel_id from the bookings table gets a capacity value, making the subsequent JOIN work correctly.

## Review Notes
- The Occupancy/RevPAR query groups by `check_in_date` and counts bookings checking in on that date. This means it measures "rooms starting a stay" rather than "rooms occupied on a given night" (which would require expanding each booking across its full date range). This is a valid simplification for a tutorial but worth noting for production use.
- The `daily_revenue` calculation uses `dateDiff('day', min(check_in_date), min(check_out_date))` to estimate per-night revenue. Since the GROUP BY is on `check_in_date`, `min(check_in_date)` is constant within each group, but `min(check_out_date)` picks only the shortest stay in the group. A more robust approach would compute per-night revenue at the row level before aggregating.
- Division using `/` in ClickHouse returns Float64 for integer operands (unlike many SQL dialects that perform integer division), so the percentage calculations in the occupancy and cancellation queries are correct as written.
- The `hotel_capacity` CTE with a hardcoded 200 rooms is clearly marked as a placeholder; a real deployment would use an actual capacity table.
