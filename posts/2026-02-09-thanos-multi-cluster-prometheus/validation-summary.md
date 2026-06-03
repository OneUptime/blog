# Validation Summary: How to Use Thanos for Multi-Cluster Prometheus Metric Aggregation

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Prometheus
- Thanos Query, Sidecar, Store Gateway, and Compactor
- Prometheus Operator CRDs
- Kubernetes Deployments, StatefulSets, Services, Secrets, Ingress, ServiceMonitor, and PrometheusRule
- Grafana Prometheus data source configuration
- PromQL
- AWS S3-compatible object storage

## Sources Consulted
- Thanos v41.0 Query documentation: https://thanos.io/v41.0/components/query.md/
- Thanos v41.0 Store Gateway documentation: https://thanos.io/v41.0/components/store.md/
- Thanos v41.0 Compactor documentation: https://thanos.io/v41.0/components/compact.md/
- Thanos Object Storage documentation: https://thanos.io/tip/thanos/storage.md/
- Thanos v0.41.0 release notes: https://github.com/thanos-io/thanos/releases/tag/v0.41.0
- Prometheus Operator Thanos integration guide: https://prometheus-operator.dev/docs/platform/thanos/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- ingress-nginx gRPC and backend protocol documentation: https://kubernetes.github.io/ingress-nginx/examples/grpc/ and https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The Thanos examples used the removed legacy `--store` flag for Query store endpoints. Updated all Query examples to use `--endpoint.sd-config-file` with endpoint configuration files, matching the current Thanos Query flags.
- The DNS service discovery explanation implied Thanos Query automatically finds all sidecars and Store Gateways in the cluster. Reworded it to state that DNS service discovery resolves the explicitly named services.
- The ingress example exposed Thanos sidecar gRPC traffic through nginx ingress without declaring the backend protocol. Added `nginx.ingress.kubernetes.io/backend-protocol: "GRPC"` so nginx routes HTTP/2 gRPC correctly.
- The public ingress endpoint example connected to port 443 without enabling TLS for the Thanos Query gRPC client. Added `--grpc-client-tls-secure` to match TLS termination at the ingress endpoint.
- The manifests were pinned to `quay.io/thanos/thanos:v0.34.0`. Updated them to `v0.41.0`, the latest Thanos release available at validation time.

## Review Notes
The Prometheus Operator `spec.thanos.objectStorageConfig`, external labels, sidecar upload behavior, Store Gateway cache flags, Compactor retention flags, Grafana data source format, and PromQL examples are technically consistent with the official documentation. The ingress approach still assumes a controller that supports gRPC ingress and valid TLS certificates for the public hostnames.
