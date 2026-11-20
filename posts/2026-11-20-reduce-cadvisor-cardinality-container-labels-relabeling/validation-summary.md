# Validation summary

## Checks performed

- Actual cAdvisor 0.55.1 BaseContainerLabels runtime fixture preserved identity, allowed raw Compose labels and pre-collected environment metadata while excluding build_sha.
- Actual Prometheus v0.307.3 relabel library validated the rules and preserved distinct identities across two fixtures while dropping exactly the two requested labels.
- Promtool 3.7.3 check config passed for the complete minimal scrape configuration.
- Compose fragment passed the official JSON schema at commit 6b3a2a93e77c30ded1aa8264307e74d1208a6eae.
- Mermaid structure checked: four directed edges; no graphical diagram rendering.
- Generated 1280x720 social image visually inspected: title readable and unclipped.

## Limitations

- No Docker or live cAdvisor deployment; no real scrape ingestion or measured cardinality, churn or byte reduction.
- Runtime fixtures exercise source libraries, not a complete cAdvisor process.
- Configuration fragment must be merged with the deployment-specific discovery, security and transport settings.

## Reviewed sources

- https://prometheus.io/docs/practices/naming/
- https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats
- https://github.com/google/cadvisor/blob/v0.55.1/cmd/cadvisor.go
- https://github.com/google/cadvisor/blob/v0.55.1/metrics/prometheus.go
- https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
