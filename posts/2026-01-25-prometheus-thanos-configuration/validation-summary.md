# Validation Summary: How to Configure Thanos with Prometheus

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Prometheus
- Thanos Sidecar
- Thanos Query
- Thanos Store Gateway
- Thanos Compactor
- Thanos Query Frontend
- Thanos Ruler
- Kubernetes
- Docker Compose
- S3, GCS, and MinIO object storage
- Prometheus alerting rules

## Sources Consulted
- Thanos Sidecar documentation: https://thanos.io/tip/components/sidecar.md/
- Thanos Object Storage documentation: https://thanos.io/tip/thanos/storage.md/
- Thanos Query documentation: https://github.com/thanos-io/thanos/blob/main/docs/components/query.md
- Thanos Store Gateway documentation: https://thanos.io/v0.26/components/store.md/
- Thanos Query Frontend documentation: https://thanos.io/v0.38/components/query-frontend.md/
- Thanos Ruler documentation: https://thanos.io/tip/components/rule.md/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Local CLI validation with `quay.io/thanos/thanos:v0.32.0` help output for `query`, `store`, `compact`, and `query-frontend`
- Local CLI validation with `prom/prometheus:v2.45.0` help output

## Issues Found
- The architecture diagram said Thanos Ruler uploads alerts to object storage. Thanos Ruler sends alerts to Alertmanager and can upload generated TSDB rule blocks to object storage, so the diagram label was changed to "upload rule blocks".
- The S3 example used `${AWS_ACCESS_KEY_ID}` and `${AWS_SECRET_ACCESS_KEY}` inside `bucket.yml`. Thanos does not document shell-style expansion for those fields; it either reads literal config values or, with `aws_sdk_auth: true`, uses the AWS SDK credential chain. The example now uses `aws_sdk_auth: true`.
- The GCS example used `service_account` as a filesystem path. Thanos documents `service_account` as inline JSON, while file-based credentials should be provided through `GOOGLE_APPLICATION_CREDENTIALS`. The example now states that distinction.
- The Thanos Query examples used `--store`, which is accepted but deprecated in Thanos v0.32.0 in favor of `--endpoint`. The Kubernetes and Docker Compose examples now use `--endpoint`.
- The Docker Compose sidecar mounted Prometheus data read-only. The sidecar needs write access to maintain shipper metadata such as `thanos.shipper.json`, so the mount is now read-write.

## Review Notes
The examples still use older pinned images (`prom/prometheus:v2.45.0` and `quay.io/thanos/thanos:v0.32.0`) in Kubernetes while Docker Compose uses `latest`. The flags in the post were checked against those pinned Thanos and Prometheus versions where applicable. For production use, pinning Docker Compose images would improve repeatability.
