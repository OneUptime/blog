# Validation Summary: How to Set Up NATS JetStream for Persistent Messaging on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- NATS Server
- NATS JetStream
- NATS CLI
- Linux systemd

## Sources Consulted
- NATS Docs: Configuring NATS Server - https://docs.nats.io/running-a-nats-service/configuration
- NATS Docs: Configuring JetStream - https://docs.nats.io/running-a-nats-service/configuration/resource_management
- NATS Docs: JetStream Streams - https://docs.nats.io/nats-concepts/jetstream/streams
- NATS Docs: JetStream Consumers - https://docs.nats.io/nats-concepts/jetstream/consumers
- NATS Docs: JetStream Consumer Administration - https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/consumers
- NATS Docs: Key/Value Store - https://docs.nats.io/nats-concepts/jetstream/key-value-store
- NATS Docs: Key/Value Store Walkthrough - https://docs.nats.io/nats-concepts/jetstream/key-value-store/kv_walkthrough
- NATS Docs: NATS CLI - https://docs.nats.io/using-nats/nats-tools/nats_cli

## Issues Found
- The consumer creation command did not explicitly create a pull consumer, but the next step uses `nats consumer next`, which is for pull-based message retrieval. Added `--pull` to `nats consumer add` so the durable consumer matches the consumption command and NATS CLI documentation.

## Review Notes
- The JetStream configuration keys in the post are valid for current NATS Server documentation. The docs also show the longer names `max_memory_store` and `max_file_store`; the shorter `max_mem` and `max_file` form used in the post is also documented in JetStream resource management examples.
- The RHEL package layout, service name, and runtime user can vary depending on how NATS Server is installed. The post assumes an installation that provides `/etc/nats/nats-server.conf`, a `nats` systemd service, and a `nats` user/group.
