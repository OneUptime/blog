# Validation Summary: How to Reduce RAM Usage with Projection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query projection, aggregation pipeline)
- JavaScript (MongoDB shell syntax)

## Sources Consulted
- MongoDB official documentation: Project Fields to Return from Query (https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/)
- MongoDB official documentation: $slice projection operator (https://www.mongodb.com/docs/manual/reference/operator/projection/slice/)
- MongoDB official documentation: $project aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/)
- MongoDB official documentation: Covered Queries (https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query)
- MongoDB official documentation: explain() results (https://www.mongodb.com/docs/manual/reference/explain-results/)

## Issues Found
No technical issues found.

## Review Notes
- The monitoring section suggests checking `totalDocsExamined` before and after adding a projection. In practice, `totalDocsExamined` only changes when the projection enables a covered query (all projected fields are in the index and `_id` is excluded). For regular projections, `totalDocsExamined` remains the same since MongoDB still reads the full documents before applying the projection. This is not incorrect as stated but could set misleading expectations for readers who add a non-covered projection and see no change in `totalDocsExamined`.
- The introductory explanation about working set memory is slightly simplified. For non-covered queries, MongoDB loads the full document into cache before applying the projection, so projection reduces the result set size and network transfer but not the server-side working set pressure from reading documents. The post's description is a reasonable simplification for the target audience.
