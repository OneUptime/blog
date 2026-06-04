# Validation Summary: How to Deploy NATS JetStream for Persistent Message Streaming on Kubernetes

## Status
validated

## Post Type
Tutorial / Kubernetes deployment guide

## Technologies Covered
- Kubernetes
- NATS Server
- NATS JetStream
- NATS CLI
- nats.go
- nats.py
- NATS Surveyor
- Prometheus Operator PrometheusRule

## Sources Consulted
- NATS JetStream concepts and delivery semantics: https://docs.nats.io/nats-concepts/jetstream
- NATS JetStream model deep dive, exactly-once semantics, deduplication, and double acknowledgments: https://docs.nats.io/using-nats/developer/develop_jetstream/model_deep_dive
- NATS Server JetStream configuration: https://docs.nats.io/running-a-nats-service/configuration/resource_management
- NATS JetStream clustering requirements: https://docs.nats.io/running-a-nats-service/configuration/clustering/jetstream_clustering
- NATS Server command-line flags: https://docs.nats.io/running-a-nats-service/introduction/flags
- NATS CLI consumer examples: https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/consumers
- NATS Python client JetStream API documentation: https://nats-io.github.io/nats.py/modules.html
- NATS Surveyor README and JSZ metric documentation: https://github.com/nats-io/nats-surveyor
- NATS Surveyor release notes listing JetStream metric names: https://github.com/nats-io/nats-surveyor/releases
- Go package reference for nats.go constants and acknowledgment APIs: https://pkg.go.dev/github.com/nats-io/nats.go

## Issues Found
- The post described JetStream as generally providing exactly-once semantics through message IDs alone. Updated the wording to match NATS documentation: exactly-once publish/consume semantics require publish deduplication plus confirmed consumer acknowledgments.
- The clustered JetStream StatefulSet did not set a unique server name for each NATS server. Added a `POD_NAME` environment variable and passed it through `--name`, matching the clustered JetStream requirement for unique server names.
- The Python example used `js: JetStreamContext.jetstream = nc.jetstream()`, which is invalid because `JetStreamContext` has no `jetstream` attribute. Changed it to `js: JetStreamContext = nc.jetstream()`.
- The exactly-once consumer example used plain `msg.Ack()`. Changed the successful path to `msg.AckSync()` so the consumer waits for the server to confirm the acknowledgment.
- The NATS Surveyor example referenced credentials without mounting them and did not enable JSZ metrics. Added a Secret creation command, mounted the credentials into the Deployment, passed `--creds`, and enabled `--jsz all --jsz-leaders-only`.
- The Prometheus alerts used non-Surveyor metric names (`nats_jetstream_stream_lag`, `nats_jetstream_consumer_ack_pending`) and applied `rate()` to an ack-pending gauge. Updated the examples to use Surveyor's documented `nats_consumer_num_pending` and `nats_consumer_num_ack_pending` metrics directly.

## Review Notes
The Go examples use the established pre-2.0 `nats.JetStreamContext` API, which remains documented and usable. Newer nats.go applications may choose the newer `github.com/nats-io/nats.go/jetstream` package, but the existing examples are still technically valid. The local environment did not include `go`, `nats`, or `nats-server`, so Go and CLI behavior was verified against official documentation rather than by executing those tools locally.
