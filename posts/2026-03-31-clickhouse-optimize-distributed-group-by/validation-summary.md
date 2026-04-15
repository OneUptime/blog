# Validation Summary: How to Optimize Distributed GROUP BY in ClickHouse

## Status
validated

## Post Type
Tutorial / Performance Guide

## Technologies Covered
- ClickHouse (Distributed table engine, aggregation settings)
- SQL (GROUP BY, HAVING, aggregation functions)
- ClickHouse system tables (system.query_log, ProfileEvents)

## Sources Consulted
- ClickHouse Settings Documentation (distributed_group_by_no_merge): https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/operations/settings/settings.md
- ClickHouse PR #20882 introducing distributed_group_by_no_merge=2: https://github.com/ClickHouse/ClickHouse/pull/20882
- Altinity Knowledge Base on GROUP BY internals: https://kb.altinity.com/altinity-kb-queries-and-syntax/group-by/
- ClickHouse ProfileEvents source (AggregationPreallocatedElementsInHashTables): https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp
- ClickHouse Distributed Table Engine documentation: https://clickhouse.com/docs/engines/table-engines/special/distributed
- GitHub issues on predicate pushdown with Distributed tables: #69472, #52120, #29332

## Issues Found

1. **`distributed_group_by_no_merge` described as binary (0/1) when it has three values.** The setting accepts 0, 1, or 2. Value 2 (introduced in PR #20882) is the same as 1 but the initiator still applies ORDER BY and LIMIT, making it the more practical choice. Fixed the section to document all three values and changed the example to use value 2.

2. **"Enable two-level aggregation" wording was misleading.** Two-level aggregation is enabled by default with thresholds of 100,000 keys and 50,000,000 bytes. The blog was actually lowering these thresholds, not enabling the feature. Fixed the wording to clarify that it is on by default and the blog is lowering the trigger thresholds.

3. **HAVING push-down via subquery wrapping is unreliable.** The original post wrapped a GROUP BY in a subquery and used an outer WHERE clause, claiming ClickHouse would push the predicate into shard sub-queries. Multiple ClickHouse GitHub issues (#69472, #52120, #29332) document that predicate push-down through subqueries on Distributed tables is unreliable and can even prevent aggregation from being pushed to shards. Fixed to use a direct HAVING clause instead, which reliably filters on each shard.

4. **Summary paragraph updated** to reflect the corrected advice (use `distributed_group_by_no_merge = 2`, tune thresholds rather than enable, and use HAVING directly).

## Review Notes
- The `AggregationPreallocatedElementsInHashTables` ProfileEvent was verified as a real ClickHouse metric in the source code.
- The claim about 256 buckets in two-level aggregation is correct per Altinity Knowledge Base documentation.
- The general description of distributed GROUP BY behavior (partial aggregates sent to initiator for final merge) is accurate per official ClickHouse documentation.
