# Validation Summary: How to Use Dot Notation in MongoDB to Query Nested Documents

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell syntax)
- Dot notation for embedded/nested document queries
- Dot notation for array element and array index access
- MongoDB query operators ($gt, regex)
- MongoDB update operators ($set)
- MongoDB projection with dot notation

## Sources Consulted
- MongoDB official documentation: Dot Notation — https://www.mongodb.com/docs/manual/core/document/#dot-notation
- MongoDB official documentation: Query on Embedded/Nested Documents — https://www.mongodb.com/docs/manual/tutorial/query-embedded-documents/
- MongoDB official documentation: Query an Array of Embedded Documents — https://www.mongodb.com/docs/manual/tutorial/query-array-of-documents/
- MongoDB official documentation: Project Fields to Return from Query — https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/
- MongoDB official documentation: Update Operators ($set) — https://www.mongodb.com/docs/manual/reference/operator/update/set/

## Issues Found
- **Incorrect/confusing inline comment (line 124):** The comment `// Returns both Alice (90 and 85) and Bob (75 qualifies... wait: only Alice)` initially claims both documents are returned, then self-corrects. This is misleading. Bob's scores are 60 and 75, neither of which exceeds 80, so only Alice is returned. Fixed to: `// Returns only Alice (scores 90 and 85 are both above 80; Bob's scores are 60 and 75)`.

## Review Notes
- All code examples use correct mongosh syntax and would work as described.
- The caveat about exact embedded document matching (including field order) is accurate and important.
- The summary's mention of `$elemMatch` for multi-condition array element checks is a valuable tip, though the post doesn't include an explicit example of it. This is fine as-is since the summary serves as a pointer for further reading.
- All dot notation patterns shown (nested fields, multi-level nesting, array index access, array field access) are correct per MongoDB documentation.
