# Validation Summary: How to Implement NATS JetStream Event-Driven Architecture on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Helm
- NATS
- NATS JetStream
- NATS CLI
- Go
- github.com/nats-io/nats.go
- Prometheus monitoring

## Sources Consulted
- NATS Kubernetes documentation: https://docs.nats.io/running-a-nats-service/nats-kubernetes
- NATS JetStream concepts: https://docs.nats.io/nats-concepts/jetstream
- NATS JetStream streams documentation: https://docs.nats.io/nats-concepts/jetstream/streams
- NATS JetStream consumers documentation: https://docs.nats.io/nats-concepts/jetstream/consumers
- NATS stream administration documentation: https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/streams
- NATS Helm chart README and values: https://github.com/nats-io/k8s/tree/main/helm/charts/nats
- NATS Go client source and JetStream docs: https://github.com/nats-io/nats.go
- NATS CLI stream command source: https://github.com/nats-io/natscli

## Issues Found
- The Helm values snippet used the older chart schema (`nats.jetstream`, `memStorage`, `fileStorage`, `exporter.serviceMonitor`). Updated it to the current `config.jetstream`, `memoryStore`, `fileStore.pvc`, `promExporter.podMonitor`, and `config.monitor` keys used by the official NATS Helm chart.
- The Helm values used `nats:latest`. Replaced it with the current chart-style `container.image` fields and a concrete NATS image tag so the example is deterministic.
- CLI verification and monitoring commands executed `nats` inside the server pod. The official chart deploys a `nats-box` deployment for CLI access, so the commands now use `kubectl exec ... deployment/nats-box`.
- The stream creation command could prompt for unspecified settings when run interactively. Added `--defaults`, which is supported by the NATS CLI stream add command.
- The metrics port-forward command referenced `svc/nats-metrics`, which is not the current chart's default metrics service. Updated it to port-forward the `nats-0` pod's Prometheus exporter port.
- The consumer Go example referenced `UserEvent` without defining it in that file. Added the struct so the example is self-contained.
- The post described JetStream as providing exactly-once delivery and used a section titled "Implementing Exactly-Once Delivery" for publish deduplication only. Adjusted the wording to "publish deduplication" and explained that a stable message ID deduplicates retry publishes within the duplicate window.

## Review Notes
The Go examples use the legacy `nats.JetStream()` API, which is still present in `github.com/nats-io/nats.go`. The newer `github.com/nats-io/nats.go/jetstream` package is now highlighted in the official client documentation and would be a good future modernization.
