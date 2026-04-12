# Validation Summary: How to Use $where for JavaScript-Based Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators: `$where`, `$expr`)
- JavaScript (server-side evaluation in MongoDB)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation on `$where` operator: https://www.mongodb.com/docs/manual/reference/operator/query/where/
- MongoDB official documentation on `$expr` operator: https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB official documentation on `$multiply` aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/multiply/
- MongoDB official documentation on `--noscripting` server option: https://www.mongodb.com/docs/manual/reference/program/mongod/#std-option-mongod.--noscripting
- MongoDB official documentation on `$gt` comparison operator (aggregation): https://www.mongodb.com/docs/manual/reference/operator/aggregation/gt/

## Issues Found
No technical issues found.

## Review Notes
- The claim that `$expr` has "Partial" index support starting in MongoDB 5.0+ is accurate but worth noting: `$expr` can leverage indexes when comparing a field against a constant value using comparison operators (`$eq`, `$lt`, `$lte`, `$gt`, `$gte`). For inter-field comparisons (which is the primary use case discussed in this post), neither `$where` nor `$expr` can use indexes. The table is still correct as a general comparison.
- The post correctly warns against `$where` in production and recommends `$expr` as the modern alternative. This aligns with current MongoDB best practices.
- Starting in MongoDB 8.0, `$where` is formally deprecated (not just discouraged). The post says MongoDB "discourages" it, which was accurate for older versions. If the post targets MongoDB 8.0+, the language could be strengthened to say "deprecated," but the current wording is not incorrect for a general audience.
