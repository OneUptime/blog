# Validation Summary: How to Use NATS for Cloud-Native Messaging on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NATS
- NATS JetStream
- Kubernetes
- Helm
- Go
- nats.go
- NATS CLI
- Prometheus monitoring
- OneUptime monitoring

## Sources Consulted
- NATS and Kubernetes documentation: https://docs.nats.io/running-a-nats-service/nats-kubernetes
- NATS Helm chart values source: https://github.com/nats-io/k8s/blob/main/helm/charts/nats/values.yaml
- NATS CLI documentation: https://docs.nats.io/using-nats/nats-tools/nats_cli
- nats.go package documentation: https://pkg.go.dev/github.com/nats-io/nats.go
- NATS JetStream documentation: https://docs.nats.io/nats-concepts/jetstream
- NATS JetStream streams documentation: https://docs.nats.io/nats-concepts/jetstream/streams
- NATS JetStream consumers documentation: https://docs.nats.io/nats-concepts/jetstream/consumers
- NATS JetStream model deep dive: https://docs.nats.io/using-nats/developer/develop_jetstream/model_deep_dive
- NATS queue groups documentation: https://docs.nats.io/nats-concepts/core-nats/queue

## Issues Found
- The post used outdated NATS Helm chart JetStream values: `config.jetstream.memStorage` and `config.jetstream.fileStorage`. Updated them to the current chart keys `config.jetstream.memoryStore` and `config.jetstream.fileStore.pvc`.
- The custom Helm values placed NATS container resources under a pod template container merge. Updated this to the chart-supported `container.resources` field.
- The pod disruption budget example used `podDisruptionBudget.minAvailable`, which is not a direct chart value. Updated it to use `podDisruptionBudget.merge.spec.minAvailable`.
- The monitoring values and diagram implied Prometheus scrapes the NATS monitoring endpoint directly. Added `promExporter.enabled: true` and updated the diagram to show Prometheus scraping the NATS Prometheus exporter.
- The NATS CLI commands were shown as running inside the `nats` server container. Updated them to run from the Helm chart's `nats-box` deployment, which is the documented place to validate connectivity and run NATS CLI commands.
- The JetStream pull subscription created a durable consumer and then subscribed without explicitly binding to it. Updated the example to use `nats.Bind("EVENTS", "event-processor")`.
- The JetStream delivery guarantee wording implied unconditional exactly-once delivery. Clarified that exactly-once semantics require message deduplication and double acknowledgments.
- The OneUptime monitoring paragraph said OneUptime monitors by scraping built-in monitoring endpoints. Clarified that monitoring can be done by checking built-in endpoints or by ingesting Prometheus-exported metrics.

## Review Notes
- The Go examples were checked against current `nats.go` API documentation, but this environment does not have `go` installed, so they were not compiled locally.
- Helm and kubectl are also not installed in this environment, so the chart commands were verified against official documentation and chart source rather than executed locally.
- The post uses the established `nats.go` JetStream context API. Newer NATS examples may also use the newer `jetstream` package, but the APIs used here remain documented.
