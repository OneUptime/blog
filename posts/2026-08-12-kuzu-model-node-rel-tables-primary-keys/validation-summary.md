# Validation Summary: How Should You Model Node Tables, Relationship Tables, and Primary Keys in Kuzu?

## Status
validated

## Post Type
Technical schema-design and data-modeling guide

## Technologies Covered
- Kuzu 0.11.3 graph database
- Cypher schema definition and data modeling
- Node tables and node primary-key indexes
- Relationship tables, internal relationship IDs, and multiplicity constraints
- `SERIAL` properties
- CSV `COPY FROM` relationship imports
- Kuzu database export and import

## Sources Consulted
- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu repository and archive status](https://github.com/kuzudb/kuzu)
- [Kuzu structured property graph quick start](https://kuzudb.github.io/docs/get-started/)
- [Kuzu Cypher syntax, reserved keywords, and identifier escaping](https://kuzudb.github.io/docs/cypher/syntax/)
- [Kuzu node- and relationship-table DDL](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [Kuzu data types and `SERIAL`](https://kuzudb.github.io/docs/cypher/data-types/)
- [Kuzu indexes and constraints](https://kuzudb.github.io/docs/cypher/difference/#indexes-and-constraints)
- [Kuzu node and relationship functions](https://kuzudb.github.io/docs/cypher/expressions/node-rel-functions/)
- [Kuzu CSV import](https://kuzudb.github.io/docs/import/csv/)
- [Kuzu database export and import](https://kuzudb.github.io/docs/migrate/)
- [Kuzu v0.11.3 relationship-table grammar](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/antlr4/Cypher.g4#L90-L103)
- [Kuzu v0.11.3 multi-endpoint relationship import test](https://github.com/kuzudb/kuzu/blob/v0.11.3/test/test_files/rel_group/basic.test#L144-L151)

## Issues Found
- **Invalid relationship multiplicity placement.** The `LIVES_IN` example placed `MANY_ONE` before the `since` property, which Kuzu 0.11.3 rejects. Moved `MANY_ONE` after all relationship properties, as required by the grammar.
- **Overgeneralized relationship CSV import rule.** The post described the first two columns correctly but omitted the special requirement for a relationship table with multiple endpoint pairs. Clarified that each such pair needs a separate `COPY` with explicit `FROM='...'` and `TO='...'` options.
- **Incomplete endpoint schemas.** The `TRANSFERRED` and `TAGGED` examples referenced `Account` and `Tag` node tables that had not been declared, so the relationship DDL failed if the post's examples were executed in sequence. Added minimal primary-keyed definitions for both endpoint tables.
- **Imprecise `MANY_MANY` description.** The post grouped `MANY_MANY` with multiplicities that impose at-most-one constraints, although `MANY_MANY` is the unconstrained default. Clarified which multiplicities constrain one or both directions.

## Review Notes
- All corrected DDL examples were executed successfully with the official `kuzu==0.11.3` Python package. Runtime checks also confirmed generated `SERIAL` values, distinct internal IDs for parallel relationships, enforcement of `MANY_ONE`, and the sample `CONTAINS` CSV import.
- All eight external documentation links in the post returned HTTP 200 and resolved to the expected Kuzu resources on 2026-08-12.
- Kuzu v0.11.3 is the latest official release, and the upstream repository was archived on October 10, 2025. The review therefore treats 0.11.3 as the final Kuzu behavior; independently maintained successors may differ.
