# Validation Summary: How to Use Custom Aggregation Pipelines with Atlas Charts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- MongoDB Atlas Charts
- MongoDB $lookup (concise correlated subquery form, MongoDB 5.1+)
- MongoDB $dateTrunc (MongoDB 5.0+)
- MongoDB $dateAdd (MongoDB 5.0+)
- MongoDB $facet
- MongoDB $dateFromParts, $dateToString, $dateFromString

## Sources Consulted
- MongoDB Aggregation Pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB $lookup documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB $dateTrunc documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/
- MongoDB $dateAdd documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateAdd/
- MongoDB $facet documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
- MongoDB $dateFromParts documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateFromParts/
- MongoDB Atlas Charts documentation: https://www.mongodb.com/docs/charts/

## Issues Found
No technical issues found.

## Review Notes
- Example 2 uses the concise correlated subquery form of `$lookup` (combining `localField`/`foreignField` with `pipeline`), which requires MongoDB 5.1+. This is appropriate for Atlas Charts since Atlas runs modern MongoDB versions, but worth noting for readers who may try to replicate on older self-hosted deployments.
- Example 4 uses `$dateTrunc` which requires MongoDB 5.0+. Same caveat applies.
- Example 3 (Cohort Analysis) is complex but logically correct. The pipeline chains `$dateFromString`, `$dateAdd`, and `$dateToString` to compute the next cohort month, then uses `$in` to check retention — a valid approach.
- The Atlas Charts UI steps are described at a general level. The exact UI may vary as MongoDB updates the Charts interface, but the workflow concept (toggling to pipeline mode) is accurate.
