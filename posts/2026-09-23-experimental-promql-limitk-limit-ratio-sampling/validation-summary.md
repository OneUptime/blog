# Validation Summary: How to Enable Experimental PromQL limitk() and limit_ratio() for Series Sampling

## Status

validated

## Post Type

Technical guide with a Prometheus startup command and PromQL query examples.

## Technologies Covered

- Prometheus server configuration and experimental feature flags
- PromQL aggregation, grouping, and set operators
- Deterministic time-series sampling
- Float samples and native histograms
- Observability dashboards and query evaluation

## Sources Consulted

- [Prometheus aggregation and set operators](https://prometheus.io/docs/prometheus/latest/querying/operators/): syntax, grouping, sampling semantics, histogram support, and complementary subsets.
- [Experimental PromQL feature flag](https://prometheus.io/docs/prometheus/latest/feature_flags/#experimental-promql-functions): enablement and experimental compatibility caveats.
- [Prometheus command-line reference](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/): `--config.file` and comma-separated `--enable-feature` values.
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/): distinction between startup flags and reloadable configuration.
- [PromQL querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/): selectors, evaluation timestamps, lookback, and staleness.
- [Official Prometheus query engine source](https://github.com/prometheus/prometheus/blob/main/promql/engine.go): sampling, preservation of input samples, and selector evaluation.
- [Official PromQL parser source](https://github.com/prometheus/prometheus/blob/main/promql/parser/parse.go): scalar aggregation parameters and vector inputs.
- [Author GitHub profile](https://github.com/nawazdhandala): verified the linked author destination.

## Issues Found

No technical issues found.

## Review Notes

- Reviewed all six PromQL code blocks. The fixed-size examples and `limitk by (cluster)` syntax are valid. Selection preserves input labels and values, supports floats and native histograms, and does not rank by sample value.
- Confirmed the documented complementary pairing of positive `0.1` and negative `-0.9`. The intersection expression correctly uses `and`; the complementary union recovers the input identities at the same evaluation time. Small populations need not yield an exact percentage.
- The startup command uses current flags. It assumes an installed Prometheus executable and a valid `prometheus.yml`. Reloading configuration cannot substitute for changing the process's feature flags.
- The query-engine implementation supports the warning that limiting output does not eliminate candidate discovery or storage reads. Query sampling does not change scrape ingestion.
- The estimation cautions are sound: series selection does not weight instances by traffic or guarantee exact totals. The recommendation to use complete data for correctness-sensitive calculations is appropriate.
- Checking every executing query engine and HA replica is valid operational guidance; this review does not certify any particular managed service or alternate PromQL implementation.
- Both documentation links resolve to the intended resources, and the author link redirects to the expected GitHub profile.
- The post does not pin a Prometheus release. The current official documentation still marks these operators experimental; upgrade checks remain appropriate. Source links on `main` are mutable and were used as supporting implementation evidence.
- A fixed-size bound applies per evaluation and per grouping bucket. A range query can show more distinct series across its entire interval when membership changes; the post already cautions about population churn.
- Validation was performed against official documentation and source code, without launching Prometheus or executing queries against a live dataset. No README changes were necessary.
