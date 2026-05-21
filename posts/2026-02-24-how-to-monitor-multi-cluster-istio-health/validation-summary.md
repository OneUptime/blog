# Validation Summary: How to Monitor Multi-Cluster Istio Health

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio multi-cluster service mesh
- Kubernetes
- kubectl
- istioctl
- Prometheus and PromQL alerting rules
- Grafana
- Thanos
- mTLS certificates

## Sources Consulted
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Troubleshooting Multicluster: https://istio.io/latest/docs/ops/diagnostic-tools/multicluster/
- Istio multicluster install and verification docs: https://istio.io/latest/docs/setup/install/multicluster/ and https://istio.io/latest/docs/ambient/install/multicluster/verify/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio pilot-discovery exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus query functions and histogram guidance: https://prometheus.io/docs/prometheus/latest/querying/functions/ and https://prometheus.io/docs/practices/histograms/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Thanos object storage and sidecar documentation: https://thanos.io/tip/thanos/storage.md and https://thanos.io/v0.38/components/sidecar.md/

## Issues Found
- The `IstiodHighPushLatency` PromQL used `histogram_quantile()` directly over unsummed bucket rates. Updated it to aggregate by `le` and `cluster`, matching Prometheus histogram guidance.
- The `IstiodDown` alert used `absent(up{job="istiod"} == 1)` while templating a cluster label. Updated it to alert on `up{job="istiod"} == 0` so the existing target labels remain available.
- The east-west gateway health check only read `.status.loadBalancer.ingress[0].ip`. Updated it to also handle cloud providers that publish a load balancer hostname.
- The proxy status explanation simplified `STALE` incorrectly. Updated it to match Istio's definition: istiod sent an update but has not received Envoy acknowledgement.
- The service discovery endpoint command used `deploy/sleep`; updated it to `deployment/sleep`, matching the documented istioctl resource form.
- The endpoint-count explanation assumed multi-network meshes expose every remote pod IP directly. Updated it to distinguish same-network workload endpoints from multi-network remote gateway endpoints.
- The service-count comparison used a vector comparison between different cluster label sets. Updated it to compare aggregate service counts for each cluster.
- The root CA expiry command read `ca-cert.pem` while describing the root CA. Updated it to read `root-cert.pem`.
- The workload certificate example only printed secret names from JSON and did not show expiry. Replaced it with `istioctl proxy-config secret`, whose summary includes certificate validity and expiration fields.
- The cross-cluster traffic alert used invalid label-to-label PromQL (`source_cluster!=destination_cluster`). Replaced it with explicit cluster-pair queries for the two-cluster example.
- The remote secret expiry alert inferred expiry from `kube_secret_created + 31536000`, which is not a valid remote-secret or certificate expiry signal. Replaced it with an alert on Istio's `remote_cluster_sync_timeouts_total` metric.

## Review Notes
The Thanos ConfigMap remains an illustrative object storage configuration; a full production deployment also needs the Thanos sidecar container wired to that file with the appropriate `--objstore.config-file` argument and credentials.
