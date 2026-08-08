# Validation Summary: EdgeQL vs SQL: Links, Shapes, and Cardinality Explained

## Status

validated

## Post Type

Technical tutorial and conceptual guide

## Technologies Covered

- Gel (formerly EdgeDB)
- EdgeQL
- PostgreSQL and SQL
- Gel schema definition language
- Gel JavaScript/TypeScript client
- Relational and object-relational data modeling

## Sources Consulted

- [Gel schema overview](https://docs.geldata.com/learn/schema)
- [Gel object types](https://docs.geldata.com/reference/datamodel/objects)
- [Gel links](https://docs.geldata.com/reference/datamodel/links)
- [Gel link properties](https://docs.geldata.com/reference/datamodel/linkprops)
- [Gel indexes](https://docs.geldata.com/reference/datamodel/indexes)
- [EdgeQL paths and backlinks](https://docs.geldata.com/reference/edgeql/paths)
- [EdgeQL path scoping](https://docs.geldata.com/reference/edgeql/path_resolution)
- [EdgeQL shapes](https://docs.geldata.com/reference/reference/edgeql/shapes)
- [EdgeQL cardinality](https://docs.geldata.com/reference/reference/edgeql/cardinality)
- [EdgeQL insert statements](https://docs.geldata.com/reference/edgeql/insert)
- [EdgeQL sets and empty values](https://docs.geldata.com/reference/edgeql/sets)
- [EdgeQL generic comparison operators](https://docs.geldata.com/reference/stdlib/generic)
- [EdgeQL query parameters](https://docs.geldata.com/reference/edgeql/parameters)
- [EdgeQL select statements](https://docs.geldata.com/reference/reference/edgeql/select)
- [EdgeQL analyze statements](https://docs.geldata.com/reference/reference/edgeql/analyze)
- [Gel TypeScript client query methods](https://docs.geldata.com/reference/using/js/client)
- [Gel architecture and PostgreSQL backing](https://www.geldata.com/blog/edgedb-is-now-gel-and-postgres-is-the-future)
- [PostgreSQL joined-table semantics](https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN)
- [PostgreSQL JSON functions and aggregates](https://www.postgresql.org/docs/current/functions-json.html)

## Issues Found

- The initial `User` schema did not declare `display_name`, but a later cardinality example filtered on `.display_name`. Added the optional `display_name: str` property so the example resolves against the schema and compiles.
- The terminal path examples filtered `User.email` outside `User.posts.tags.name`. That relies on legacy path factoring and raises an `InvalidReferenceError` with Gel 7's simple scoping. Moved the user filter into a parenthesized root subquery before traversing `posts` and `tags`.
- The `distinct` example used `Tag.name`, even though object paths already contain unique reachable objects and `Tag.name` has an `exclusive` constraint in the shown schema. Changed the example to deduplicate `Post.title`, which can legitimately repeat across distinct posts.
- The cardinality explanation implied that an expression which might be empty would be rejected during compilation when assigned to a required single link. Clarified that a possibly-many expression is rejected for a single link, while an empty result for a required link is rejected at runtime.
- The explanation of coalescing equality said `?=` should be false when one side is absent, but `?=` returns true when both operands are empty. Replaced that statement with the complete empty-set behavior.
- The SQL example used an inner join to `post`, so it could not produce the missing-post row discussed immediately afterward. Changed it to a left join, preserving an author with no posts and making the mapping explanation accurate.

## Review Notes

The corrected schema and EdgeQL examples were checked against a local Gel 7.1 server in addition to the current official documentation. The JavaScript client methods are current, the post's external documentation links resolve to the intended resources, and no deprecated APIs remain. The `joined_at` and `role` link properties are optional as written; this is valid, but they would need `required` modifiers if every membership must carry those values. The `EdgeDB` tag is retained as a useful legacy name for Gel rather than as a current product-name claim.
