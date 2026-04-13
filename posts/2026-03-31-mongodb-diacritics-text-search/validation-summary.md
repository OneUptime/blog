# Validation Summary: How to Handle Diacritics in MongoDB Text Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (text indexes, `$text` operator)
- MongoDB `$diacriticSensitive` and `$caseSensitive` query options
- MongoDB Atlas Search
- Unicode diacritical mark handling

## Sources Consulted
- MongoDB `$text` Operator Documentation: https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Text Index Properties Documentation: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/text-index-properties/
- MongoDB v8.0 `$text` Documentation: https://www.mongodb.com/docs/v8.0/reference/operator/query/text/

## Issues Found
- **"Caffe Reggio" example was incorrect**: The original first code example included `{ name: "Caffe Reggio" }` with the comment "All three match because accents are folded." This was wrong — "caffe" (double f, no accent) is a different spelling from "cafe", not a diacritical variant. Diacritic folding removes accent marks (e.g., "café" → "cafe", "cafè" → "cafe") but does not handle spelling differences like double consonants. Changed `"Caffe Reggio"` to `"Cafe Reggio"` (no accent, single f) and `"Café Etienne"` to `"Cafè Etienne"` (with grave accent) so that all three documents are genuine diacritical variants of "cafe" and the example accurately demonstrates accent folding.

## Review Notes
- The `$diacriticSensitive` option was introduced in MongoDB 3.2. The post does not mention version requirements, which is acceptable since 3.2 is very old and all current MongoDB versions support it.
- The performance note about diacritic-sensitive queries bypassing text-index optimizations is accurate — MongoDB performs an additional post-filtering stage after the index scan.
- All code syntax is correct for the MongoDB shell (`mongosh`).
- The Atlas Search mention is accurate but brief; this is appropriate for a post focused on the built-in `$text` operator.
