# Validation Summary: How to Use the embeddedDocument Operator in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- MongoDB aggregation pipeline (`$search`, `$project`)
- Atlas Search `embeddedDocument` operator
- Atlas Search `embeddedDocuments` index type
- Atlas Search `compound`, `equals`, `range`, and `text` operators

## Sources Consulted
- MongoDB Atlas Search embeddedDocument operator documentation: https://www.mongodb.com/docs/atlas/atlas-search/embedded-document/
- MongoDB Atlas Search field mapping types (embeddedDocuments): https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/#std-label-bson-data-types-embeddedDocuments
- MongoDB Atlas Search equals operator documentation: https://www.mongodb.com/docs/atlas/atlas-search/equals/
- MongoDB Atlas Search compound operator documentation: https://www.mongodb.com/docs/atlas/atlas-search/compound/

## Issues Found
No technical issues found.

## Review Notes
- The index type name `embeddedDocuments` (plural) and the query operator name `embeddedDocument` (singular) are both used correctly throughout the post — matching MongoDB's intentionally asymmetric naming.
- Full dotted paths (e.g., `variants.color`) are correctly used inside the `embeddedDocument` operator, consistent with official documentation examples.
- The `operator` field structure within `embeddedDocument` is correct.
- The `equals` operator is used correctly with `path` and `value` fields for both string and boolean matching.
- The post does not cover the optional `score: { embedded: { aggregate: "mean" } }` scoring configuration, which allows customizing how scores from multiple matching embedded documents are combined (default is `"sum"`). This is an omission, not an error, and could be a useful addition in the future.
