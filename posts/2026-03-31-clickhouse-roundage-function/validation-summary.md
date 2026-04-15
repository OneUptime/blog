# Validation Summary: How to Use roundAge() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- `roundAge()` rounding/demographic function
- `roundDown()` rounding function
- ClickHouse SQL syntax (CREATE TABLE, INSERT, SELECT, JOIN, GROUP BY, arrayJoin, countIf)

## Sources Consulted
- ClickHouse official documentation for roundAge(): https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions#roundage
- ClickHouse source code (roundAge.cpp): https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/roundAge.cpp
- ClickHouse official documentation for roundDown(): https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions#rounddownx-array

## Issues Found

### Issue 1: Incorrect number of buckets — phantom "65" bucket
**What was wrong:** The post claimed `roundAge()` returns 8 boundary values: 0, 17, 18, 25, 35, 45, 55, and 65. In reality, there are only 7 buckets and the function never returns 65. Ages 55 and above all map to 55.
**What was changed:** Removed "65" from all lists of boundary values (intro paragraph, function signature section, summary).
**Why:** The ClickHouse source code shows the final condition is `age >= 55 → 55` with no further check for 65.

### Issue 2: Incorrect bucket mapping for ages 0–17
**What was wrong:** The post stated ages 0–16 map to 0 and age 17 alone maps to 17. The actual behavior is: age < 1 maps to 0, and ages 1–17 all map to 17.
**What was changed:** Rewrote the bucket mapping table to match the actual source code: `age 0 -> 0`, `age 1-17 -> 17`.
**Why:** Confirmed via the ClickHouse source code that the conditions are `age < 1 → 0` and `age < 18 → 17`.

### Issue 3: Incorrect bucket mapping for ages 55+
**What was wrong:** The post split seniors into two buckets: ages 55–64 mapping to 55 and ages 65+ mapping to 65. There is no 65 bucket; all ages 55+ map to 55.
**What was changed:** Merged the two senior rows into a single `age 55+ -> 55` entry.
**Why:** Source code confirms the final bucket is `age >= 55 → 55`.

### Issue 4: CASE expression had a nonexistent WHEN 65 branch
**What was wrong:** The CASE expression in "Segmenting Users by Age Group" included `WHEN 65 THEN '65+'`, which would never match since `roundAge()` never returns 65. The WHEN 55 label was also wrong ('55-64' instead of '55+').
**What was changed:** Removed the `WHEN 65` branch, updated `WHEN 55` label to `'55+'`, and corrected `WHEN 0` to `'Under 1'` and `WHEN 17` to `'1-17'` to match the actual bucket boundaries.
**Why:** Labels must reflect the actual age ranges that map to each bucket value.

### Issue 5: False equivalence claim with roundDown()
**What was wrong:** The post stated `roundAge()` is equivalent to `roundDown(age, [0, 17, 18, 25, 35, 45, 55, 65])`. This is incorrect in two ways: (1) the 65 boundary doesn't exist, and (2) even with the correct array `[0, 17, 18, 25, 35, 45, 55]`, the functions differ for ages 1–16 — `roundDown()` maps them to 0 while `roundAge()` maps them to 17.
**What was changed:** Rewrote the section to explain that the two functions are related but not equivalent, highlighting the divergence for ages 1–16. Updated the SQL example to show both results side-by-side (without an `are_equal` column, since they are not equal). Corrected the summary paragraph similarly.
**Why:** `roundDown()` always returns the largest array element ≤ the input. For age 5, `roundDown(5, [0, 17, ...])` returns 0, but `roundAge(5)` returns 17. The equivalence claim was fundamentally wrong.

## Review Notes
- All SQL syntax (CREATE TABLE, INSERT, SELECT with JOIN, GROUP BY, arrayJoin, countIf, count(DISTINCT ...), round(), sum()) is valid ClickHouse SQL.
- The Basic Usage example includes ages 65 and 80 in the arrayJoin, which correctly demonstrate that these values map to 55 under the corrected bucket definitions.
- The sample data and aggregation queries are well-constructed and would execute correctly on a ClickHouse instance.
