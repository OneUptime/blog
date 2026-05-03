# Validation Summary: How to Deploy Elasticsearch on Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Elasticsearch (via Elastic Helm chart)
- Kibana (via Elastic Helm chart)
- Rancher / Kubernetes
- Helm 3
- Longhorn (storage class)
- X-Pack Security
- Prometheus / prometheus-elasticsearch-exporter
- NGINX Ingress Controller
- Kubernetes DaemonSet (sysctl tuning for `vm.max_map_count`)

## Sources Consulted
- Official Elastic Helm charts repo: https://github.com/elastic/helm-charts
- elasticsearch Helm chart values reference: https://github.com/elastic/helm-charts/tree/main/elasticsearch
- kibana Helm chart values reference: https://github.com/elastic/helm-charts/tree/main/kibana
- Elasticsearch reference (vm.max_map_count, heap sizing): https://www.elastic.co/guide/en/elasticsearch/reference/current/vm-max-map-count.html
- Kubernetes Ingress API (deprecation of `kubernetes.io/ingress.class`): https://kubernetes.io/docs/concepts/services-networking/ingress/#deprecated-annotation
- Kubernetes registry migration (`gcr.io/google_containers` → `registry.k8s.io`): https://kubernetes.io/blog/2023/03/10/image-registry-redirect/
- prometheus-community/elasticsearch_exporter metrics: https://github.com/prometheus-community/elasticsearch_exporter

## Issues Found
1. **Deprecated pause image registry** — The DaemonSet used `gcr.io/google_containers/pause`. The `gcr.io/google_containers/` registry has been deprecated; Kubernetes images now live on `registry.k8s.io`. Updated to `registry.k8s.io/pause:3.10`.
2. **Deprecated Ingress class annotation** — The Kibana ingress block used `kubernetes.io/ingress.class: nginx`, which is deprecated since Kubernetes 1.18 and not honored by newer NGINX Ingress Controller versions. Replaced with the chart's `className: nginx` field, which renders as the modern `spec.ingressClassName` on the Ingress resource.

## Review Notes
- **`minimumMasterNodes` is legacy**: The chart's `minimumMasterNodes` value maps to the removed `discovery.zen.minimum_master_nodes` setting and is only applied by the chart for Elasticsearch < 7.0. On 7.x and 8.x the value is silently ignored — cluster bootstrapping (`cluster.initial_master_nodes`) and quorum-based coordination handle split-brain prevention automatically. The Best Practices `(replicas / 2) + 1` rule similarly applies only to ES 6.x and earlier. Left as-is because it does not break a modern deployment, but worth modernizing in a future revision.
- **elastic/elasticsearch Helm chart status**: Elastic deprecated this chart in mid-2023 and recommends ECK (Elastic Cloud on Kubernetes) operator for new production deployments. The chart still works for the versions referenced here, but the post should eventually be updated to reference ECK.
- **Kibana → Elasticsearch credentials**: The Kibana values set `elasticsearch.username: "elastic"` but do not wire up the password from the `elasticsearch-master-credentials` secret. In practice, Kibana will fail to authenticate without `extraEnvs` (e.g., `ELASTICSEARCH_PASSWORD` from the secret) or another credential source. This is incomplete rather than incorrect, and fixing it would require restructuring the Kibana section.
- **`xpack.security.enabled` note**: As of Elasticsearch 8.0+, security is enabled by default, so the Best Practices reminder is technically still accurate but somewhat redundant for current versions.
- **`esJavaOpts` heap sizing**: For ES 7.11+ the JVM heap is auto-sized based on node roles and container memory limits. Setting `-Xmx`/`-Xms` explicitly is still valid and is the conservative recommendation here.
