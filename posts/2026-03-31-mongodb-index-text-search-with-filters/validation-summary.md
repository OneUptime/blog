# Validation Summary: How to Index for Text Search with Filters in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (text indexes, compound text indexes, wildcard text indexes)
- MongoDB Shell (mongosh) commands
- MongoDB query explain plans

## Sources Consulted
- MongoDB official documentation on text indexes: https://www.mongodb.com/docs/manual/core/index-text/
- MongoDB official documentation on compound text indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/create-compound-text-index/
- MongoDB official documentation on $text operator: https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB official documentation on $meta (textScore): https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB official documentation on wildcard text indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/create-wildcard-text-index/

## Issues Found
1. **Misleading description of filter field placement in compound text indexes**: The "Compound Text Index with Filter Fields" section stated filter fields could be placed "before or after the text component." This contradicted the later section "Filter Fields Must Be Prefix in the Index," which correctly states they must be prefix keys. In MongoDB compound text indexes, ascending/descending keys before the text keys serve as prefix equality filters (narrowing the index scan before text matching), while keys after the text keys are suffix keys used only for sorting or post-filtering (much less efficient). Changed "before or after" to "as a prefix before" to be accurate and consistent with the rest of the post.

## Review Notes
- All code examples use correct MongoDB syntax and would work as described.
- The one-text-index-per-collection limitation is correctly stated.
- The `$meta: "textScore"` projection and sort syntax is correct.
- The wildcard text index (`$**`) limitation about not combining with compound indexes is correct.
- The explain plan output showing TEXT_MATCH → TEXT_OR → IXSCAN stages is an accurate representation of text search query plans.
- The post could mention that suffix keys (ascending/descending keys placed after text keys) can be used for sorting, which is a valid use case distinct from prefix equality filtering. This is not an error, just an area that could be expanded in a future update.
