# Validation Summary: How to Deploy Grafana Tempo in Microservices Mode

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Grafana Tempo
- Kubernetes Deployments, StatefulSets, Services, ConfigMaps, and PVCs
- Kafka-compatible ingest for Tempo microservices mode
- Amazon S3 object storage
- Grafana Tempo data source provisioning
- Prometheus / PromQL monitoring

## Sources Consulted
- Grafana Tempo deployment modes: https://grafana.com/docs/tempo/latest/reference-tempo-architecture/deployment-modes/
- Grafana Tempo distributor component: https://grafana.com/docs/tempo/latest/reference-tempo-architecture/components/distributor/
- Grafana Tempo block-builder component: https://grafana.com/docs/tempo/latest/reference-tempo-architecture/components/block-builder/
- Grafana Tempo live-store component: https://grafana.com/docs/tempo/latest/reference-tempo-architecture/components/live-store/
- Grafana Tempo query frontend component: https://grafana.com/docs/tempo/latest/reference-tempo-architecture/components/query-frontend/
- Grafana Tempo compaction component: https://grafana.com/docs/tempo/latest/reference-tempo-architecture/components/compaction/
- Grafana Tempo configuration manifest: https://grafana.com/docs/tempo/latest/configuration/manifest/
- Grafana Tempo Kubernetes deployment documentation: https://grafana.com/docs/tempo/latest/set-up-for-tracing/setup-tempo/deploy/kubernetes/
- Grafana Tempo distributed Docker Compose example: https://github.com/grafana/tempo/tree/main/example/docker-compose/distributed
- Kubernetes `kubectl scale` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/

## Issues Found
- The post used the older microservices architecture where distributors send traces to ingesters. Current Tempo v3.0 microservices mode uses Kafka-compatible ingest; distributors write to Kafka, while block-builders and live-stores consume from Kafka independently. Updated the architecture text, configuration, deployments, and scaling commands accordingly.
- The Tempo configuration included an invalid top-level `ingester` block for the current `grafana/tempo:latest` image. Removed it and added current `ingest`, `block_builder`, `live_store`, `backend_scheduler`, and `backend_worker` configuration blocks.
- The old `overrides` format placed `max_traces_per_user` and `max_bytes_per_trace` directly under `overrides`. Updated it to the current `overrides.defaults.ingestion` and `overrides.defaults.global` structure.
- The S3 credentials used environment variable placeholders, but the workloads did not enable environment expansion or provide the variables. Added `-config.expand-env=true` and `envFrom` references to a `tempo-s3-credentials` Secret in the Tempo workloads.
- The live-store `complete_block_timeout` was too low for the default blocklist polling interval and caused Tempo configuration verification warnings. Updated it to `20m`.
- The Jaeger Thrift HTTP receiver was configured on port `14268`, but the distributor pod and service did not expose that port. Added the missing container and service port.
- The monitoring examples referenced legacy ingester, querier, and compactor metrics. Updated them to current distributor, query frontend, block-builder, live-store, backend scheduler, and backend worker metrics documented by Tempo.

## Review Notes
The Tempo configuration snippet was verified with `grafana/tempo:latest` using `-config.verify=true`, and all YAML snippets in the post were parsed successfully. The guide still assumes a Kafka-compatible service and an S3 credentials Secret already exist; a future improvement could add explicit examples for those prerequisites.
