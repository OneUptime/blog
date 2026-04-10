# Validation Summary: How to Set Up Ceph Storage for Grafana Tempo on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (CephObjectStore, RGW/RADOS Gateway)
- Grafana Tempo (distributed tracing backend)
- Kubernetes (Helm, kubectl, port-forwarding)
- S3-compatible object storage
- Zipkin trace format
- OpenTelemetry (OTLP ports referenced)

## Sources Consulted
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana tempo-distributed Helm chart values.yaml: https://github.com/grafana/helm-charts/blob/main/charts/tempo-distributed/values.yaml
- Tempo S3 storage backend source (s3/config.go): https://github.com/grafana/tempo/blob/main/tempodb/backend/s3/config.go
- Tempo ingester configuration source (ingester/config.go): https://github.com/grafana/tempo/blob/main/modules/ingester/config.go
- Zipkin v2 Span specification: https://zipkin.io/zipkin-api/
- Rook Ceph CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- tempo-distributed distributor service template: https://github.com/grafana/helm-charts/blob/main/charts/tempo-distributed/templates/distributor/service-distributor.yaml

## Issues Found

1. **Helm values storage path incorrect (High)**: The S3 storage configuration was nested under `tempo.storage.trace` but the `grafana/tempo-distributed` Helm chart reads storage config from `.Values.storage.trace` at the top level. Moved the storage block from `tempo.storage.trace.s3` to `storage.trace.s3`.

2. **Zipkin receiver not enabled (High)**: The blog used the Zipkin HTTP endpoint (port 9411, `/api/v2/spans`) to send test traces, but the Helm values did not enable the Zipkin receiver. Added `traces.zipkin.enabled: true` to the Helm values so the distributor actually listens on the Zipkin port.

3. **Port-forward mismatch (High)**: The port-forward command forwarded port 4317 (OTLP gRPC) but the subsequent curl command sent spans to port 9411 (Zipkin HTTP). Changed the port-forward to 9411 to match the Zipkin endpoint being used.

4. **Mislabeled protocol (Medium)**: The text said "Send a test span using OpenTelemetry" but the curl command used the Zipkin v2 JSON format (`/api/v2/spans`), not OTLP. Changed the description to "Send a test span using the Zipkin format."

5. **Invalid Zipkin trace and span IDs (High)**: The example used `traceId: "abc123"` and `id: "def456"`, which are not valid per the Zipkin v2 specification. Trace IDs must be 16 or 32 lowercase hex characters; span IDs must be 16 lowercase hex characters. Replaced with valid 32-char and 16-char hex values respectively. Also updated the matching trace query URL.

6. **Wrong config field name and path for trace idle period (High)**: The compaction section used `global.max_trace_idle_period` but Tempo has no `global` config section. The correct field is `trace_idle_period` (not `max_trace_idle_period`) and it belongs under `ingester`. Changed to `ingester.trace_idle_period`.

## Review Notes
- The CephObjectStore YAML, radosgw-admin user creation command, and aws s3 mb bucket creation command are all correct.
- The `forcepathstyle: true` field name is confirmed correct per Tempo's Go struct YAML tags (no underscores).
- The `compactor.compaction.block_retention: 336h` value and path are correct per Tempo's configuration manifest.
- The Helm chart name `grafana/tempo-distributed` and the Helm repo URL `https://grafana.github.io/helm-charts` are correct.
- The Tempo query frontend service name `tempo-query-frontend` and API path `/api/traces/{traceID}` are correct.
- Readers should be aware that S3 credentials (access_key/secret_key) are shown inline for simplicity; in production, these should be provided via Kubernetes Secrets.
