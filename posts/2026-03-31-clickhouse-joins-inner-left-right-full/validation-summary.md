# Validation Summary: How to Use JOINs in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL JOINs)
- ClickHouse join algorithms (hash, parallel_hash, grace_hash, full_sorting_merge, direct)
- ClickHouse `Join` table engine and `joinGet()` function
- Standard SQL: INNER, LEFT, RIGHT, FULL OUTER JOIN

## Sources Consulted
- [ClickHouse JOIN documentation](https://clickhouse.com/docs/en/sql-reference/statements/select/join)
- [Using JOINs in ClickHouse guide](https://clickhouse.com/docs/guides/joining-tables)
- [ClickHouse Joins Under the Hood - Hash Join, Parallel Hash, Grace Hash (Part 2)](https://clickhouse.com/blog/clickhouse-fully-supports-joins-hash-joins-part2)
- [Choosing the Right Join Algorithm (Part 5)](https://clickhouse.com/blog/clickhouse-fully-supports-joins-how-to-choose-the-right-algorithm-part5)
- [ClickHouse Joins Under the Hood - Direct Join (Part 4)](https://clickhouse.com/blog/clickhouse-fully-supports-joins-direct-join-part4)
- [Issue #72727: grace_hash_join_initial_buckets tuning](https://github.com/ClickHouse/ClickHouse/issues/72727)

## Issues Found
- **RIGHT JOIN section had an internally contradictory technical claim.** The post stated: "the left table drives the hash table build in the default hash join algorithm" — this is incorrect and contradicted the rest of the post (the Join Algorithms section comment and the Summary both correctly state that the right table is hashed). Per ClickHouse documentation, the hash join builds the hash table from the right table in RAM. Changed the wording to: "the right table drives the hash table build regardless of join direction, so put the smaller table on the right when possible." Also softened the "often faster" rewrite recommendation since the official docs do not explicitly recommend rewriting RIGHT JOIN as LEFT JOIN — the rewrite is semantically equivalent and helps you control which side gets hashed, but is not unconditionally faster.

## Review Notes
- All other SQL syntax is valid ClickHouse SQL: INNER/LEFT/FULL OUTER JOIN examples, the multi-column join example, the `Join(ANY, LEFT, country_code)` engine declaration, and the `joinGet()` lookup are all syntactically correct.
- All five `join_algorithm` values referenced (`hash`, `parallel_hash`, `grace_hash`, `full_sorting_merge`, `direct`) are valid in current ClickHouse versions. The `grace_hash_join_initial_buckets` setting also exists and is documented (note: ClickHouse rounds the value up to the nearest power of two).
- The `count(o.order_id)` lowercase function name is fine; ClickHouse function names are case-insensitive.
- Worth noting in a future revision: as of ClickHouse 24.x discussions, `parallel_hash` has been considered for becoming the default join algorithm in some configurations (see PR #70788 / Issue #71424). The post's claim that `hash` is the default is still correct for current default settings, but readers should check their specific version.
- The CTE-based filter-pushdown example is good practice; ClickHouse's optimizer can also push some predicates automatically depending on settings, but writing them explicitly is reliably effective.
