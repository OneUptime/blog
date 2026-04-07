# Validation Summary: How to Set Up Centralized Logging for Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Fluent Bit (log shipper)
- Promtail (Loki log agent)
- Grafana Loki (log aggregation)
- Elasticsearch (log aggregation)
- Kubernetes (container orchestration)

## Sources Consulted
- Fluent Bit official documentation: https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/pipeline/filters/kubernetes
- Ceph configuration reference for logging options: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Promtail configuration documentation: https://grafana.com/docs/loki/latest/clients/promtail/configuration/
- Kubernetes logging architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes containerd migration (Docker shim removal in 1.24+): https://kubernetes.io/blog/2022/02/17/dockershim-faq/

## Issues Found
1. **Fluent Bit parser set to `docker` instead of `cri`**: The INPUT section used `Parser docker`, but Kubernetes 1.24+ removed the Docker shim and defaults to containerd, which uses the CRI log format. Changed `Parser docker` to `Parser cri` to match modern Kubernetes clusters.

2. **Misleading section title "Enable Structured Logging in Ceph"**: The section claimed to "configure Ceph to write JSON-formatted logs for easier parsing," but the commands (`log_to_file false`, `log_to_stderr true`) only redirect logs to stderr — they do not enable JSON or structured log output. Ceph does not have a simple config toggle for JSON-formatted logging. Renamed the section to "Direct Ceph Logs to stderr" and corrected the description to accurately reflect what the commands do.

## Review Notes
- The Fluent Bit configuration shown is only the ConfigMap. A complete deployment would also need the DaemonSet manifest with volume mounts for `/var/log/containers`. The post references `fluent-bit-ceph.yaml` but does not provide the full DaemonSet spec. This is acceptable for a focused guide but readers may need to refer to Fluent Bit Kubernetes deployment docs for the complete setup.
- The Promtail relabel config filters on `__meta_kubernetes_pod_label_app` matching `rook-ceph-.*`. This is correct for Rook-deployed Ceph pods which use the `app` label with values like `rook-ceph-mon`, `rook-ceph-osd`, etc.
- The Elasticsearch query and LogQL examples are syntactically correct and serve as reasonable verification steps.
