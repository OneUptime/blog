# Validation summary

Reviewed on 24 November 2026.

## Evidence and scope

The guide targets ECK3.2.0 default single-budget logic and Elasticsearch9.1.0 API shapes. It explicitly distinguishes Enterprise role budgets and custom overrides, Pod readiness and shard allocation, and node drains from ECK change budgets. Official source links are listed in validation.json.

Nine upstream Go policy tests passed for unknown/non-green health, normal green health, single-node topology, and singleton master/data/ingest roles. Four HTTP snippets matched the pinned Elasticsearch REST specifications for method, path and query fields. Boolean, enum and timeout parameter types and allocation request JSON were checked. These were source/specification checks, not endpoint execution.

All three shell inspection blocks ran against a disposable Kubernetes1.34.0 API with the official ECK3.2.0 CRD. Cluster health, PDB status and Pod/container readiness were explicitly seeded, producing three Ready Pods with zero budget allowance. The Pod/PVC inspection commands exercised API reads only. No operator or Elasticsearch cluster produced those fixture states.

Three bash blocks passed syntax. The eight-node/seven-edge Mermaid structure was checked. The generated1280x720 image was opened and visually reviewed; the two-line title and branding fit without clipping.

## Limits

No live Elasticsearch, Kibana, ECK operator, scheduler, kubelet, disruption controller, node drain or recovery ran. Source verification cannot establish live privileges, network trust, shard safety or health propagation timing. The article requests an evidence-based maintenance rehearsal and does not prescribe destructive allocation or volume changes. The disposable API was stopped and its kubeconfig removed. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
