# Validation Summary: How to Use topK for Heavy Hitters Detection in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, aggregate functions, materialized views)
- topK and topKWeighted aggregate functions
- AggregatingMergeTree engine
- -State and -Merge aggregate function combinators

## Sources Consulted
- ClickHouse official docs: topK function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/topk
- ClickHouse official docs: topKWeighted function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/topkweighted
- ClickHouse official docs: Aggregate function combinators (-State, -Merge) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- Space-Saving algorithm paper by Metwally, Agrawal, and El Abbadi (2005) for theoretical guarantees

## Issues Found
1. **Algorithm name was imprecise**: The post stated topK "uses the Space-Saving algorithm." ClickHouse's documentation specifies it uses the "Filtered Space-Saving algorithm for analyzing TopK, based on the reduce-and-combine algorithm from Parallel Space Saving." Changed to "a variant of the Space-Saving algorithm (specifically, the Filtered Space-Saving algorithm)" for accuracy.

2. **Accuracy guarantees presented without caveat**: The post presented the theoretical Space-Saving algorithm guarantees (frequency > total/(k+1) threshold and overestimation bound) as if they directly apply to ClickHouse's implementation. However, ClickHouse's official documentation explicitly states: "This function does not provide a guaranteed result. In certain situations, errors might occur and it might return frequent values that aren't the most frequent values." Added a caveat clarifying these are theoretical properties of the original algorithm and that ClickHouse's filtered variant does not guarantee exact results.

## Review Notes
- All SQL syntax is correct: `topK(N)(column)`, `topKWeighted(N)(column, weight)`, `topKState(N)(column)`, and `topKMerge(N)(column)` all follow valid ClickHouse syntax.
- The AggregatingMergeTree materialized view pattern with -State/-Merge combinators is a well-established ClickHouse pattern and is used correctly.
- The math in the accuracy section is correct: 1,000,000 / (10 + 1) = 90,909.
- topK also supports optional `load_factor` and `'counts'` parameters not mentioned in the post, but omitting them is fine for a tutorial-level introduction.
- The topK function's maximum K value is 65,536 per the docs; the examples in the post use small K values (3, 5, 10, 20) which are well within limits.
