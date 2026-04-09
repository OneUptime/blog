# Validation Summary: How to Set Up External Manager Endpoints for Monitoring in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (MGR Prometheus module)
- Kubernetes (Services, NodePort, kubectl)
- Prometheus (scrape configuration, relabel configs, basic_auth)
- Grafana (mentioned as downstream consumer)
- Linux firewall (firewall-cmd, UFW)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/ — confirmed `monitoring.externalMgrEndpoints` and `monitoring.externalMgrPrometheusPort` fields exist
- Rook Ceph Monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook external cluster design document: https://github.com/rook/rook/blob/master/design/ceph/ceph-external-cluster.md — confirmed externalMgrEndpoints structure uses `ip` field
- Ceph MGR Prometheus module documentation (from source): https://raw.githubusercontent.com/ceph/ceph/main/doc/mgr/prometheus.rst — confirmed default port 9283, confirmed no built-in basic auth support
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/ — searched for `set-prometheus-credentials` command, not found
- Prometheus relabel_configs documentation for scrape config validation

## Issues Found
1. **Step 5 — `ceph dashboard set-prometheus-credentials` command does not exist.**
   - **What was wrong:** The post claimed you could secure the MGR Prometheus metrics endpoint with basic authentication by running `ceph dashboard set-prometheus-credentials --username metrics --password securepass`. This command does not exist in any version of Ceph. Additionally, the Ceph MGR Prometheus module does not support built-in basic authentication — it only listens on an unauthenticated HTTP endpoint.
   - **What was changed:** Replaced the incorrect command with a correct approach: using a reverse proxy (nginx) with basic auth in front of the MGR Prometheus endpoint. Added an nginx configuration example and clarified that the MGR module itself has no auth support. The Prometheus client-side `basic_auth` config was retained as it is valid syntax for connecting through the proxy.
   - **Why:** Readers following the original instructions would encounter a "command not found" error and have no working path to securing their metrics endpoint.

## Review Notes
- The Kubernetes Service YAML, kubectl commands, Prometheus scrape configuration, and firewall rules are all technically correct.
- The CephCluster CRD fields (`monitoring.externalMgrEndpoints`, `externalMgrPrometheusPort`) are verified against official Rook documentation.
- The Ceph container image `quay.io/ceph/ceph:v19.2.0` references the Squid release, which is current.
- The Prometheus relabel config uses `source_labels: [__address__]` to set a static `cluster` label — this works but is unconventional. A simpler approach would be to add the label directly in `static_configs.labels`, but the current approach is functionally correct.
- The `ufw reload` command is valid in modern UFW versions (0.36+).
- The mermaid diagram arrow direction shows `LB -->|scrape| Prometheus`, which implies LB pushes to Prometheus. Technically Prometheus pulls (scrapes) from the LB endpoint, so the arrow direction is semantically reversed. However, this is a diagram style choice rather than a technical error in the instructions.
