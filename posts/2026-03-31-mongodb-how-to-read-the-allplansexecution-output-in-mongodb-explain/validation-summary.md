# Validation Summary: How to Read the allPlansExecution Output in MongoDB explain()

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (query optimizer, explain plans, plan cache)
- MongoDB Shell (mongosh)
- JavaScript (for plan comparison scripting)

## Sources Consulted
- MongoDB official documentation: explain() verbosity modes — https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB official documentation: Query Plans — https://www.mongodb.com/docs/manual/core/query-plans/
- MongoDB official documentation: planCacheSetFilter — https://www.mongodb.com/docs/manual/reference/command/planCacheSetFilter/
- MongoDB official documentation: reIndex (deprecated) — https://www.mongodb.com/docs/manual/reference/method/db.collection.reIndex/
- MongoDB official documentation: internalQueryPlanEvaluationMaxResults — https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.internalQueryPlanEvaluationMaxResults
- MongoDB official documentation: internalQueryPlanEvaluationWorks — https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.internalQueryPlanEvaluationWorks

## Issues Found

1. **Trial phase works vs results confusion (line 111)**: The post stated "Each plan is given up to 101 'works' (internal execution units)." This is incorrect — 101 is the number of *results* a plan must return to win (`internalQueryPlanEvaluationMaxResults`), not the work budget. The actual work budget defaults to 10000 (`internalQueryPlanEvaluationWorks`). This also contradicted the sample output where Plan B examined 890 keys during the trial. Fixed the trial phase rules to correctly distinguish between the results threshold (101) and the work budget (10000).

2. **Imprecise trial phase description (line 107)**: The text "up to 101 documents or until the fastest plan wins" was imprecise. Changed to clarify that the first plan to *return* 101 results wins, and that plans are evaluated in round-robin fashion (not truly parallel).

3. **Misleading `reIndex()` advice (line 203)**: The post suggested `db.orders.reIndex()` to fix "stale index statistics." This is misleading on two counts: (a) MongoDB's query optimizer uses trial-based plan evaluation, not stored index statistics, so "stale statistics" is not a relevant concept; (b) `reIndex()` is deprecated since MongoDB 6.0 and removed in 8.0. Replaced with `getPlanCache().clear()` which addresses the actual issue (stale cached plans). Removed the now-redundant step 5 that also cleared the plan cache.

4. **Misleading summary advice (line 225)**: The summary stated "Always pair it with `executionStats` verbosity when investigating slow queries." Since `allPlansExecution` is already a superset of `executionStats` (it includes everything `executionStats` shows plus the rejected plans' trial stats), pairing them is unnecessary. Fixed to clarify that `allPlansExecution` is the best single verbosity level for investigation.

## Review Notes
- The `planCacheSetFilter` command shown is correct but was deprecated in MongoDB 8.0 in favor of query settings. This is worth noting if the post is updated for MongoDB 8.0+.
- The sample `allPlansExecution` output structure is representative but simplified — actual output includes additional fields like `plannerVersion`, `namespace`, `parsedQuery`, etc. This is fine for a tutorial.
- The JavaScript plan comparison script uses optional chaining (`?.`) which requires mongosh (not the legacy mongo shell). This is appropriate for modern MongoDB usage.
