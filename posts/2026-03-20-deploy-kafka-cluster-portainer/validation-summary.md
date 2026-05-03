# Validation Summary: How to Deploy Kafka Cluster via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Apache Kafka 3.7.0 (KRaft mode, combined broker+controller)
- Portainer (Docker stack management)
- Docker Compose (v3.8)
- provectuslabs/kafka-ui
- Kafka CLI tools: `kafka-topics.sh`, `kafka-metadata-shell.sh`, `kafka-consumer-groups.sh`

## Sources Consulted
- Apache Kafka Docker image documentation: https://hub.docker.com/r/apache/kafka
- Apache Kafka Docker examples README: https://github.com/apache/kafka/blob/trunk/docker/examples/README.md
- Apache Kafka official multi-broker combined-mode example: `docker/examples/docker-compose-files/cluster/combined/plaintext/docker-compose.yml`
- Apache Kafka KRaft configuration documentation: https://kafka.apache.org/documentation/#kraft
- provectuslabs/kafka-ui environment variable reference: https://github.com/provectus/kafka-ui

## Issues Found
- **Missing `KAFKA_LOG_DIRS` in broker environment.** The default log directory for the `apache/kafka:3.7.0` image is `/tmp/kraft-combined-logs`, not `/var/lib/kafka/data`. As written, the named volumes `kafka1_data`/`kafka2_data`/`kafka3_data` mounted at `/var/lib/kafka/data` would not actually persist Kafka data, and the `kafka-metadata-shell.sh --snapshot /var/lib/kafka/data/__cluster_metadata-0/...` command in the verification step would fail because the metadata log would not exist at that path. Fixed by adding `KAFKA_LOG_DIRS: /var/lib/kafka/data` to all three brokers so the volumes correctly back the on-disk logs.

## Review Notes
- `CLUSTER_ID` is intentionally not set in the post. According to the apache/kafka image documentation, this is optional — the image has a built-in default cluster ID that is identical across container instances, so multi-broker formation still works. The official multi-broker example does set it explicitly (`4L6g3nShT-eMCtK--X86sw`); setting it explicitly is best practice for production but is not technically required.
- `KAFKA_DEFAULT_REPLICATION_FACTOR` and `KAFKA_TRANSACTION_STATE_LOG_MIN_ISR` are inconsistently set across the three brokers (only on kafka-1 / kafka-1+kafka-2 respectively). Server-side defaults will apply for the brokers where they are missing, which can cause auto-created topics to use replication factor 1 if the controller happens to be a broker without the setting. Setting these consistently across all brokers would be more robust, but it does not affect the explicitly created `orders` topic (which sets `--replication-factor 3` directly), so this is left as-is.
- The brokers expose no host-side ports — clients running outside the Docker network would not be able to connect. This is fine for the post's stated use case (kafka-ui as the in-network management interface), but readers wanting external producer/consumer access would need to add a `PLAINTEXT_HOST` listener and host port mapping.
- `KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT` plus `KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-N:9092` works because all brokers are on the shared Docker network and resolve each other by service name.
- `provectuslabs/kafka-ui:latest` is a valid image; the env var names `KAFKA_CLUSTERS_0_NAME` and `KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS` are correct.
