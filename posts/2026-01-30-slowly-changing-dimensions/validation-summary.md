# Validation Summary: How to Build Slowly Changing Dimensions

## Status
validated

## Post Type
Tutorial / Guide — a conceptual and implementation guide explaining the canonical SCD types (1, 2, 3, 4, and 6) with SQL examples, ER diagrams, and process flows.

## Technologies Covered
- Data warehousing / dimensional modeling (Ralph Kimball's SCD methodology)
- SQL (DDL for table creation, MERGE statements, multi-step ETL procedures, view creation)
- Mermaid diagrams (erDiagram, flowchart, graph)

## Sources Consulted
- Ralph Kimball's "The Data Warehouse Toolkit" — definitions of SCD Types 0–7, including Type 6 as Type 1+2+3 hybrid
- Kimball Group's online articles on "Slowly Changing Dimensions" (kimballgroup.com)
- SQL ANSI standard (ISO/IEC 9075) MERGE statement specification
- PostgreSQL documentation on `INTERVAL`, `UPDATE ... FROM`, `MERGE` (added in 15), and date/timestamp casts (postgresql.org/docs)
- MySQL documentation on `AUTO_INCREMENT` and `ON UPDATE CURRENT_TIMESTAMP` (dev.mysql.com)

## Issues Found

1. **Inaccurate description metadata.** The front-matter description read "(SCD Types 1, 2, 3)" but the post actually covers Types 1, 2, 3, 4, and 6. Updated the description to reflect the full set of types covered.

2. **Broken date arithmetic in the Type 4 procedure.** The original Step 4a computed `effective_date` as `MAX(expiration_date) + INTERVAL '1 day'` over the history table. Because Step 4d initially inserted history records with `expiration_date = '9999-12-31'`, the second update onward would produce an invalid date (10000-01-01) and the procedure could not generate the example output shown immediately below it.

3. **Type 4 procedure did not match its own example.** The example shows the original INSERT history row closed off (`expiration_date = 2025-06-14`) when the customer is later updated, but the original procedure never updated the previous open history row, so the example state was unreachable from the given SQL.

   I rewrote Step 4 with a cleaner, correct sequence: (4a) detect changed customers into a temp table, (4b) close the open history record for changed customers, (4c) update current with new values, (4d) insert genuinely new customers into current, (4e) insert a new open-ended history row for both new and changed customers (with `change_type` set to INSERT for first-time records and UPDATE otherwise). This reproduces the example output exactly and removes the broken date math.

## Review Notes
- The SQL examples mix dialects (MySQL's `AUTO_INCREMENT` and `ON UPDATE CURRENT_TIMESTAMP`, PostgreSQL's `INTERVAL`, `UPDATE ... FROM`, `::DATE` cast, and the ANSI `MERGE` statement that PostgreSQL only added in 15 and MySQL does not support). This is consistent with the post's pedagogical/illustrative intent and is common in SCD tutorials, but readers porting the code to a specific engine should expect to adjust dialect-specific syntax.
- The Type 2 point-in-time query handles `expiration_date IS NULL` defensively, but the Type 2 ETL never inserts NULL expiration_dates (it uses '9999-12-31'). The defensive clause is harmless but slightly inconsistent with the procedure that populates the table.
- The intro says "five most common SCD types"; this is a reasonable framing — Kimball's canonical types are 0–7, and Types 1, 2, 3, 4, and 6 are the most widely used in practice. Type 0 (retain original) and Types 5/7 are less common and would extend scope beyond this post's stated focus.
- The Type 2 fact-loading join uses inclusive bounds on both sides (`>= effective_date AND <= expiration_date`), which correctly pairs with the procedure's choice of yesterday/today boundaries (expiration = day-of-change minus 1, next effective = day-of-change), so there is no off-by-one overlap or gap.
- The Type 6 change-detection compares against `historical_*` columns (rather than `current_*`), which is correct: `current_*` is rewritten on every load via the Type 1 mechanism, so only `historical_*` reflects the version's frozen state for change detection.
