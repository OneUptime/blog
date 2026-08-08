# Validation Summary: EdgeQL Backlinks Explained

## Status

validated

## Post Type

Technical guide/tutorial

## Technologies Covered

- Gel and the Gel Schema Definition Language (SDL)
- EdgeQL
- Directional links and backlinks
- Type intersections and polymorphic paths
- Computed links and cardinality inference
- Exclusive constraints
- Link properties and relationship modeling
- Indexes, query analysis, and pagination
- Access policies and globals

## Sources Consulted

- [EdgeQL paths and backlinks](https://docs.geldata.com/reference/edgeql/paths)
- [Gel links](https://docs.geldata.com/reference/datamodel/links)
- [Gel computed properties and links](https://docs.geldata.com/reference/datamodel/computeds)
- [EdgeQL select](https://docs.geldata.com/reference/edgeql/select)
- [Formal EdgeQL select reference](https://docs.geldata.com/reference/reference/edgeql/select)
- [EdgeQL insert](https://docs.geldata.com/reference/edgeql/insert)
- [EdgeQL update](https://docs.geldata.com/reference/edgeql/update)
- [EdgeQL parameters](https://docs.geldata.com/reference/edgeql/parameters)
- [Set functions and cardinality assertions](https://docs.geldata.com/reference/stdlib/set)
- [Gel constraints](https://docs.geldata.com/reference/datamodel/constraints)
- [Gel indexes](https://docs.geldata.com/reference/datamodel/indexes)
- [EdgeQL analyze](https://docs.geldata.com/reference/edgeql/analyze)
- [Gel access policies](https://docs.geldata.com/reference/datamodel/access_policies)
- [Gel permissions](https://docs.geldata.com/reference/datamodel/permissions)
- [Gel link properties](https://docs.geldata.com/reference/datamodel/linkprops)
- [Gel schema and current file conventions](https://docs.geldata.com/reference/datamodel)
- [Gel migration tips](https://docs.geldata.com/resources/guides/migrations/tips)
- [Upgrading from EdgeDB 5 to Gel 6](https://docs.geldata.com/resources/upgrading)
- [Gel query-file conventions](https://docs.geldata.com/reference/using/js/queries)

## Issues Found

- The filtering examples referenced `Post.published` and `Post.published_at`, but the tutorial's `Post` schema did not declare those properties. Added a required `published` boolean with a `false` default and an optional `published_at` datetime. The default keeps the earlier insert example valid without requiring another field.
- The post recommended deterministic ordering but sorted the limited reverse set only by `published_at`, which is not deterministic when timestamps tie or are empty. Added `empty last then .id` so empty timestamps have an explicit position and the unique object ID breaks ties.
- The discussion of an unsupported `single` backlink said the error might only surface later. For the plain backlink shown, Gel rejects the schema when inferred `multi` cardinality conflicts with the explicit `single` modifier. Updated the explanation to describe that schema-validation behavior precisely.

## Review Notes

- The corrected schema and query examples were compiled and exercised against the official `geldata/gel:7` container image running Gel 7.1.
- The backlink syntax, polymorphic narrowing, computed-link declaration, exclusivity model, mutations through the forward link, `exists` filters, automatic link indexing, link-property explanation, access-policy visibility, rename guidance, and legacy computed-pointer syntax are otherwise accurate.
- In Gel 7 and later, a non-superuser needs the `sys::perm::analyze` permission to run `analyze`; this does not change the post's query-planning recommendation.
- Access policies filter ordinary user-facing backlink queries and counts as described. Policy expressions themselves intentionally do not apply other access policies, a separate advanced case not covered by the post.
- All seven documentation links in the post resolved to the intended current official Gel pages during review.
