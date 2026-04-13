# Validation Summary: How to Run Dapr Without Docker

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Dapr (runtime, CLI, placement service)
- Redis (state store)
- Apache Kafka (pub/sub with KRaft mode)
- GitHub Actions (CI pipeline)
- Python (example application)

## Sources Consulted
- Dapr self-hosted no-Docker docs: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-no-docker/
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr in-memory state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-inmemory/
- Dapr in-memory pub/sub reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-inmemory/
- Dapr Kafka pub/sub reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/

## Issues Found

1. **Option 3 heading mismatch (line 112)**: The heading said "File-Based State Store" but the component YAML used `state.in-memory`, which is not file-based. Changed heading to "In-Memory State Store" to match the actual component type.

2. **Ubuntu Redis service name (line 75)**: `sudo systemctl start redis` is incorrect for Ubuntu. The `redis-server` package creates a systemd unit named `redis-server`, not `redis`. Changed to `sudo systemctl start redis-server`.

3. **CI Pipeline section title and comment (lines 225-228)**: The heading said "CI Pipeline Example (No Docker)" and the comment said "no Docker socket required", but the GitHub Actions config uses a `services` block with `image: redis:7`, which is a Docker container. Changed the heading to "CI Pipeline Example (Slim Init)" and the comment to clarify that Dapr itself runs without containers via slim init, while Redis still runs as a service container.

## Review Notes
- The `daprd` command references `--config ~/.dapr/config.yaml`, but slim init does not create this file. If the file does not exist, `daprd` will use defaults and may log a warning. Readers should be aware they may need to create this file or omit the flag.
- The Kafka download URL (`https://downloads.apache.org/kafka/3.7.0/kafka_2.13-3.7.0.tgz`) points to a specific version that may be removed from Apache mirrors over time. Readers should check for the latest Kafka version.
- The `secretKeyRef` usage in Option 2 (remote Redis) requires a configured Dapr secret store component, which is not mentioned. Readers unfamiliar with Dapr secrets may find this incomplete, but it is technically correct syntax.
- The runtime version "1.14.x" in the sample output is illustrative. All flags and component specs verified against current Dapr documentation are accurate.
