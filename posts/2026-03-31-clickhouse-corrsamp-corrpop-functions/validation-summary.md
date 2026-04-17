# Validation Summary: How to Use corrSamp() and corrPop() in ClickHouse

## Status
not-technically-relevant

## Post Type
Tutorial / Reference (purportedly documenting ClickHouse aggregate functions)

## Technologies Covered
- ClickHouse
- SQL aggregate functions (correlation / Pearson coefficient)
- AggregatingMergeTree / -State / -Merge combinators

## Sources Consulted
- [ClickHouse Aggregate Functions Reference](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference)
- [ClickHouse `corr()` documentation](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/corr)
- GitHub code search across the `ClickHouse/ClickHouse` repository for the literals `corrSamp` and `corrPop` (both returned zero matches)
- Sibling post `posts/2026-03-31-clickhouse-corr-function/README.md` (uses the real `corr()` function)

## Issues Found
The entire post is built on a false premise: it claims that ClickHouse provides two aggregate functions named `corrSamp(x, y)` and `corrPop(x, y)`. **Neither function exists in ClickHouse.**

Verification:
- The official ClickHouse aggregate-function reference lists only `corr`, `corrStable`, `corrMatrix`, and `rankCorr` for correlation. There is no `corrSamp` or `corrPop`.
- A GitHub code search for `corrSamp repo:ClickHouse/ClickHouse` returns 0 results. The same is true for `corrPop`.
- The naming pattern (`*Samp` / `*Pop`) does exist for **covariance** (`covarSamp` / `covarPop`) and for variance/standard deviation, but it was never extended to correlation in ClickHouse — `corr()` is the single Pearson correlation function (and is implemented via the formula Σ(x−x̄)(y−ȳ) / √[Σ(x−x̄)² × Σ(y−ȳ)²], in which the Bessel-correction divisors cancel out, so the sample-vs-population distinction is mathematically irrelevant for the coefficient itself).

Because every code block, every claim, and the entire conceptual framing of the post depends on these non-existent functions (including the equally non-existent `corrSampState` / `corrSampMerge` combinator forms in the `AggregatingMergeTree` example), there is nothing salvageable through targeted edits — fixing the post would mean rewriting it entirely as a duplicate of the existing `2026-03-31-clickhouse-corr-function` post. The post should be removed from the blog rather than published.

No edits were made to README.md.

## Review Notes
- A correct, related post already exists at `posts/2026-03-31-clickhouse-corr-function/README.md` covering the real `corr()` function, and another at `posts/2026-03-31-clickhouse-corrmatrix-function/` for `corrMatrix`. There is no gap in the blog series that this post fills.
- If the author wants to discuss sample-vs-population semantics, the appropriate venue is a covariance post (e.g. `posts/2026-03-31-clickhouse-covarsamp-covarpop-functions/`), where `covarSamp` and `covarPop` are genuinely distinct functions with different divisors.
- The mermaid diagram's correlation-strength buckets (negligible / weak / moderate / strong / very strong by absolute value) are a reasonable rule-of-thumb interpretation, but they are attached to function names that do not exist.
