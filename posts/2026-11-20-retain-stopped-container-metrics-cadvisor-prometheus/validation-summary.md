# Validation summary

## Checks performed

- Promtool 3.7.3 evaluated six assertions covering current absence after a stale marker, historical instant selection, last observed value, maximum observed value, and both range functions after their window expires.
- Compose fragment passed official schema at commit 6b3a2a93e77c30ded1aa8264307e74d1208a6eae; storage flag names verified with actual Prometheus 3.7.3 help.
- cAdvisor 0.55.1 container cache cleanup and official Prometheus retention/staleness behavior source-reviewed.
- Five-edge Mermaid structure checked; not graphically rendered.
- Generated social image visually inspected at 1280x720; readable title without clipping.

## Limitations

- No live container stop/restart, persistent-volume recovery, long-duration retention or remote-store deployment was tested.
- PromQL fixtures verify historical selection, not that a particular deployment captured every short-lived container.
- Illustrative retention size does not guarantee thirty days of history.

## Reviewed sources

- https://github.com/google/cadvisor/blob/v0.55.1/manager/container.go
- https://prometheus.io/docs/prometheus/latest/storage/
- https://prometheus.io/docs/prometheus/latest/querying/api/#range-queries
- https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness
- https://prometheus.io/docs/prometheus/latest/querying/functions/#aggregation_over_time

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
