# Validation Summary: How to Use PromQL count_values() Without Excessive Cardinality

## Status
validated

## Post Type
Technical guide with PromQL examples and metric exposition data.

## Technologies Covered
- Prometheus
- PromQL aggregation and comparison operators
- Recording rules and time-series cardinality
- Information metrics, numeric state gauges, and native histograms

## Sources Consulted
- [Prometheus aggregation operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators), including `count_values`, `count`, `group`, and grouping syntax.
- [Prometheus comparison operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#comparison-binary-operators), including filtering and `bool` semantics.
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/), covering series identity and label changes.
- [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/#do-not-overuse-labels), covering label cardinality costs and gauge usage.
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/), covering periodic evaluation and storage of expression results.
- [Prometheus querying basics: staleness](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness), covering absent series and query population.
- [Prometheus text exposition format](https://prometheus.io/docs/instrumenting/exposition_formats/#text-based-format), covering the sample information-metric rows.
- [Author GitHub profile](https://github.com/nawazdhandala), confirming the author link resolves to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all seven PromQL blocks against documented syntax and semantics. The information-metric example yields version counts of two and one; counting its sample values yields one group with count three.
- The nested `group` and `count` expression deduplicates the stated identity while preserving separate versions. The warning about an instance appearing under multiple versions is correct.
- Grouped `count_values` correctly generates state labels. Summing state counts accounts for selected series, without proving that expected workers are present. Counting workers assumes one selected series per worker.
- Native histogram support and compact histogram label representations are documented. Avoiding existing label names and checking unexpected numeric states are appropriate precautions.
- The 60-series ceiling follows from 20 cluster identities and three state codes. Historical cardinality also depends on cluster identities remaining bounded; changing cluster labels can create additional historical combinations even with a fixed state domain.
- Recording rules persist query results, and changed label values identify new series. This supports the distinction between instantaneous output size and historical series churn.
- Verified that 512 MiB equals 536870912 bytes. The strict comparison excludes equality, filters false cases, and produces no group when none match. Adding `bool` would retain false float samples, which `count` includes.
- The missing-data and scrape-health caveats agree with documented staleness behavior. A missing result cannot establish a healthy population below the threshold.
- Both documentation links point to the intended sections. The author URL redirects to the expected GitHub profile.
- The version strings are illustrative application labels, not Prometheus version requirements. No deprecated constructs, terminal commands, or configuration snippets require correction.
- Validation was documentation-based with manual evaluation of the supplied sample data; no live Prometheus queries or recording-rule deployment tests were performed. README.md was left unchanged.
