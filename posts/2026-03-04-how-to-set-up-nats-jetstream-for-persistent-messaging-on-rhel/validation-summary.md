# Validation Summary: How to Set Up NATS JetStream for Persistent Messaging on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- NATS Server
- NATS JetStream
- NATS CLI
- JetStream streams and consumers
- JetStream key-value store
- NATS HTTP monitoring

## Sources Consulted
- NATS Docs: Configuring NATS Server - https://docs.nats.io/running-a-nats-service/configuration
- NATS Docs: Configuring JetStream - https://docs.nats.io/running-a-nats-service/configuration/resource_management
- NATS Docs: JetStream concepts - https://docs.nats.io/nats-concepts/jetstream
- NATS Docs: Streams - https://docs.nats.io/nats-concepts/jetstream/streams
- NATS Docs: Consumers - https://docs.nats.io/nats-concepts/jetstream/consumers
- NATS Docs: JetStream walkthrough - https://docs.nats.io/nats-concepts/jetstream/js_walkthrough
- NATS Docs: Monitoring - https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- NATS CLI v0.4.0 `--help` output for `stream add`, `consumer add`, `consumer next`, and `kv add`
- NATS Server v2.14.0 local validation run

## Issues Found
- The durable push consumer example included `--deliver-group` but did not set a push delivery target. Current `nats consumer add` requires a delivery target for a push consumer and failed non-interactively with `could not request delivery target`. Added `--target order.processors`, using a subject outside the stream's `orders.>` subject space to avoid a delivery cycle.

## Review Notes
The JetStream server configuration, stream creation command, pull consumer command, publish/consume examples, monitoring endpoint, key-value commands, and retention policy explanation were checked against official NATS documentation and current CLI help. The `max_mem` and `max_file` JetStream server config aliases were also validated against NATS Server v2.14.0.
