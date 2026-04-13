# Validation Summary: How to Use $first and $last Accumulators in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$first` accumulator operator
- `$last` accumulator operator
- `$group` stage
- `$sort` stage
- `$min` and `$max` accumulator operators

## Sources Consulted
- MongoDB official documentation: $first (aggregation accumulator) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/first/
- MongoDB official documentation: $last (aggregation accumulator) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/last/
- MongoDB official documentation: $group stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB official documentation: $sort stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/

## Issues Found
No technical issues found.

## Review Notes
- All five code examples are syntactically correct and produce the expected output given the input documents.
- Example 4 is titled "$first / $last on String Fields" but intentionally demonstrates `$min`/`$max` instead, with a note explaining why. This is a deliberate teaching choice, not an error.
- The mermaid diagram's first node is labeled "Sorted Documents" but conceptually represents unsorted input documents before the `$sort` stage. This is a minor diagram labeling ambiguity, not a technical error in the code or explanations.
- Starting from MongoDB 5.0, `$first` and `$last` can also be used as window operators in `$setWindowFields`. The post focuses on `$group` usage, which is the most common use case and is appropriate for the scope.
- The post correctly and repeatedly emphasizes the importance of using `$sort` before `$group` for deterministic `$first`/`$last` results, which is the most critical best practice for these operators.
