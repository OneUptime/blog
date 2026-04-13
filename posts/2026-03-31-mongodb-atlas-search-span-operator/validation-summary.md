# Validation Summary: How to Use the span Operator for Token Proximity in Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- Atlas Search `span` operator and sub-operators (`near`, `first`, `or`, `subtract`, `term`)

## Sources Consulted
- MongoDB Atlas Search span operator documentation: https://www.mongodb.com/docs/atlas/atlas-search/span/

## Issues Found

1. **All sub-operator names were incorrect (camelCase "span"-prefixed instead of short names)**:
   - `spanNear` → `near`
   - `spanFirst` → `first`
   - `spanOr` → `or`
   - `spanNot` → `subtract`
   - `spanTerm` → `term`
   - Changed throughout the post in both code examples, headings, and prose.

2. **Incorrect term clause nesting**: All `term` clauses were wrapped in an extra `{ span: { spanTerm: { ... } } }` structure. The correct syntax is simply `{ term: { path: "...", query: "..." } }` directly inside `clauses` arrays. Fixed in all code examples.

3. **`first` operator field names were wrong**:
   - `query` → `operator` (the field that wraps the inner span clause)
   - `end` → `endPositionLte` (the position limit field)

4. **`spanNot` description was misleading**: The correct operator name is `subtract`, and it uses `include`/`exclude` fields (not a simple inner span exclusion). Updated the sub-operators table.

5. **Minor typo**: "startof-doc" → "start-of-doc" in the comparison table.

## Review Notes
- The `subtract` operator (replacing `spanNot`) was only mentioned in the sub-operators table and not demonstrated in a code example. This is acceptable since the table description was corrected, but a future revision could add a `subtract` example.
- The `contains` sub-operator (with `big`/`little` fields) exists in the span API but was not covered. This is fine for the scope of this tutorial.
- The post's conceptual explanations of proximity search and when to use `span` vs `phrase` are accurate.
