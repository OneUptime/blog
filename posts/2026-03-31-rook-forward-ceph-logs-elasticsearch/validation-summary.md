# Validation Summary: How to Forward Ceph Logs to Elasticsearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Elasticsearch (search and analytics engine)
- Fluent Bit (log shipper)
- Kubernetes (DaemonSet, ConfigMap, Secrets)
- Kibana (mentioned for dashboards)

## Sources Consulted
- Fluent Bit official documentation — Elasticsearch output plugin: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Fluent Bit official documentation — Tail input plugin: https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit official documentation — Record Modifier filter: https://docs.fluentbit.io/manual/pipeline/filters/record-modifier
- Elasticsearch 8.x documentation — Index templates: https://www.elastic.co/guide/en/elasticsearch/reference/current/index-templates.html
- Elasticsearch 8.x documentation — Removal of mapping types: https://www.elastic.co/guide/en/elasticsearch/reference/current/removal-of-types.html
- Kubernetes documentation — DaemonSet: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/

## Issues Found

### 1. Index name mismatch between Fluent Bit config and Elasticsearch index template
- **What was wrong:** The Fluent Bit output used a static `Index ceph-logs`, but the Elasticsearch index template pattern was `ceph-logs-*`. The template would never match a single index named `ceph-logs` — it expects a dash-separated suffix (e.g., date-based indices like `ceph-logs-2026.04.09`).
- **What was changed:** Replaced `Index ceph-logs` with `Logstash_Format On` and `Logstash_Prefix ceph-logs`. This causes Fluent Bit to generate date-based index names like `ceph-logs-YYYY.MM.DD`, which correctly match the `ceph-logs-*` template pattern.
- **Why:** Without this fix, the index template (and its shard/replica settings and mappings) would never be applied to the ingested data.

### 2. `Type _doc` removed in Elasticsearch 8.x
- **What was wrong:** The Fluent Bit config included `Type _doc`. Elasticsearch 8.x completely removed support for mapping types, and requests that include type information are rejected.
- **What was changed:** Replaced `Type _doc` with `Suppress_Type_Name On`, which tells Fluent Bit not to include type information in requests — required for Elasticsearch 8.x compatibility.
- **Why:** Using `Type _doc` with Elasticsearch 8.x causes indexing requests to fail with an error about unsupported types.

### 3. Search query used wrong index name
- **What was wrong:** The example search query targeted `ceph-logs/_search`, but after the Logstash format fix, indices are date-based (e.g., `ceph-logs-2026.04.09`).
- **What was changed:** Updated the query URL to `ceph-logs-*/_search` to search across all date-based Ceph log indices.
- **Why:** The original query would return a 404 (index not found) since no index named exactly `ceph-logs` exists with the corrected configuration.

## Review Notes
- The DaemonSet does not include `tolerations` for master/control-plane nodes. If Ceph daemons run on tainted nodes, Fluent Bit pods won't be scheduled there and those logs will be missed. This is a deployment consideration rather than a correctness error.
- The post does not specify Elasticsearch version requirements. The corrected configuration targets Elasticsearch 8.x. Users on Elasticsearch 7.x may need to adjust (`Suppress_Type_Name` is not needed on ES 7.x, though it is harmless).
- The `fluent/fluent-bit:2.2` image tag is a valid release. Users may want to pin a more specific patch version (e.g., `2.2.2`) for reproducibility.
