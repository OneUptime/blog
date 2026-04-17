# Validation Summary: How to Track Environmental Conditions in Cold Chain with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide (SQL-focused, domain-specific use case)

## Technologies Covered
- ClickHouse (MergeTree engine, TTL, PARTITION BY, LowCardinality, DateTime/Float32/UInt8 types)
- ClickHouse SQL functions: `now()`, `today()`, `toDate()`, `toYYYYMM()`, `countIf()`, `avg()`, `min()`, `max()`, `round()`, `ln()`, `exp()`
- Cold chain logistics / pharmaceutical stability concepts
- Mean Kinetic Temperature (MKT) calculation per USP/ICH

## Sources Consulted
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse TTL documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse data types (LowCardinality, UUID, DateTime): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse date/time functions (`today()`, `now()`, `toYYYYMM`, `toDate`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse aggregate functions (`countIf`, `avg`, `min`, `max`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse math functions (`exp`, `ln`): https://clickhouse.com/docs/en/sql-reference/functions/math-functions
- USP General Chapter <1079.2> "Mean Kinetic Temperature in the Evaluation of Drug Product Stability"
- ICH Q1A(R2) Stability Testing of New Drug Substances and Products
- Vaisala Application Note B211534EN "Mean Kinetic Temperature in GxP Environments"
- Haynes (1971) original derivation of the Mean Kinetic Temperature equation

## Issues Found

1. **Incorrect activation energy constant in MKT formula.**
   - The post used `83138.0` for ΔH in J/mol in the Mean Kinetic Temperature calculation.
   - The canonical value per USP <1079.2>, ICH Q1A(R2), and the original Haynes (1971) derivation is **83,144 J/mol** (ΔH = 83.144 kJ/mol). 83138 is not a recognized standard value in any authoritative pharma reference — it appears to be a digit-transposition typo.
   - Fixed by replacing both occurrences of `83138.0` with `83144.0` inside the MKT SELECT expression.

## Review Notes

- All ClickHouse SQL syntax is valid and uses current, non-deprecated constructs (MergeTree, TTL on DateTime column, LowCardinality(String), integer-day subtraction on `today()`, `countIf`, etc.).
- The excursion threshold ranges used match common pharmaceutical/cold-chain conventions (frozen ≤ -15 °C, refrigerated 2–8 °C, ambient 15–25 °C). "Ambient" has multiple definitions in regulatory contexts (some sources use 15–30 °C or 20–25 °C with excursions to 15–30 °C); the chosen 15–25 °C range is defensible but not universal — readers should align with their specific regulatory guidance (e.g., USP <659>) in production use.
- The MKT formula as written is mathematically equivalent to the standard USP form: Tmkt = (ΔH/R) / -ln((1/n)·Σ exp(-ΔH/(R·Ti))). ClickHouse's `avg()` provides the (1/n)·Σ term correctly.
- The 7-year TTL claim for "pharmaceutical regulatory retention" is a reasonable default but actual retention duration varies by jurisdiction and product class (e.g., EU GDP, FDA 21 CFR, etc.); readers should verify against their applicable regulatory framework.
- The `signal_strength < -90` threshold assumes the value represents RSSI in dBm (which is conventional for cellular/WiFi); the column type `Float32` supports negative values, consistent with this interpretation.
