# Validation Summary: How to Interpret keysExamined, docsExamined, and nReturned in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (database profiler, explain(), query optimization)
- MongoDB aggregation expressions ($expr, $max, $divide)
- MongoDB indexing (IXSCAN, COLLSCAN, covered queries, multikey indexes)

## Sources Consulted
- MongoDB Database Profiler Output Reference: https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB Explain Results Reference: https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB $max Aggregation Expression: https://www.mongodb.com/docs/manual/reference/operator/aggregation/max/
- MongoDB Covered Queries: https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query

## Issues Found

### 1. COLLSCAN shown with non-zero keysExamined (profiler sample output)
- **What was wrong:** The sample profiler output showed `keysExamined: 45000` with `planSummary: "COLLSCAN"`. A COLLSCAN (collection scan) means no index is used, so `keysExamined` must be 0. Having keysExamined = 45000 is only possible with an index scan (IXSCAN).
- **What was changed:** Changed `planSummary` from `"COLLSCAN"` to `"IXSCAN { status: 1 }"` and adjusted the accompanying description to mention poor index selectivity. This keeps the ratio discussion (45000/12 = 3750) intact and technically correct.

### 2. COLLSCAN shown with non-zero totalKeysExamined (explain output)
- **What was wrong:** The explain() sample output showed `totalKeysExamined: 45000` with `"stage": "COLLSCAN"`. Same issue as above — COLLSCAN cannot have non-zero keysExamined.
- **What was changed:** Changed the execution stage from a bare `COLLSCAN` to the correct `FETCH` -> `IXSCAN` nesting that MongoDB actually produces for an index-assisted query. Updated the comment from "no index used" to "index used but poor selectivity".

### 3. Incorrect covered query heading
- **What was wrong:** The heading read "Covered Query Check: keysExamined == docsExamined == 0?" implying both keysExamined and docsExamined should be 0 for a covered query. For a covered query, `docsExamined` = 0 but `keysExamined` > 0 (the index keys are examined to produce results without fetching documents). The body text was correct; only the heading was misleading.
- **What was changed:** Changed heading to "Covered Query Check: docsExamined == 0?" to accurately reflect the covered query condition.

## Review Notes
- The post correctly distinguishes between `nreturned` (lowercase, used in system.profile) and `nReturned` (camelCase, used in explain output). This is a subtle but important difference that the author handled correctly.
- The efficiency ratio thresholds (ideal, good, acceptable, problem) are reasonable heuristics, though they are the author's guidelines rather than official MongoDB recommendations. This is fine for a blog post.
- The `$expr` query using `$max` to prevent division by zero is a clever technique and is syntactically correct for MongoDB 3.6+.
- Pattern 2's fix (adding a compound index) is correct but only helps queries that filter on both fields. The original single-field query on a low-selectivity field would still scan many entries. The post could note this in the future but it's not an error.
