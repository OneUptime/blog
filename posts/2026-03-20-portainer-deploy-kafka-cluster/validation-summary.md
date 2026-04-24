# Validation Summary: How to Deploy Kafka Cluster via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Docker stacks
- Apache Kafka 3.7
- KRaft mode
- Bitnami Kafka container image
- Kafka UI

## Sources Consulted
- Apache Kafka 3.7 KRaft documentation: https://kafka.apache.org/37/operations/kraft/
- Apache Kafka 3.7 broker configs: https://kafka.apache.org/37/configuration/broker-configs/
- Apache Kafka 3.7 producer configs: https://kafka.apache.org/37/configuration/producer-configs/
- Apache Kafka latest KRaft operations page for `kafka-metadata-quorum.sh` usage examples: https://kafka.apache.org/40/operations/kraft/
- Bitnami Kafka Docker image documentation: https://hub.docker.com/r/bitnami/kafka/
- Bitnami Kafka container README: https://github.com/bitnami/containers/blob/main/bitnami/kafka/README.md
- Docker CLI reference for `docker exec`: https://docs.docker.com/engine/reference/commandline/exec
- Docker CLI reference for `docker stop`: https://docs.docker.com/reference/cli/docker/container/stop/
- Docker CLI reference for `docker start`: https://docs.docker.com/reference/cli/docker/container/start

## Issues Found
- The stack published broker ports even though the brokers only advertised internal Docker-network listener addresses. I removed the broker `ports` mappings so the example matches the internal-only listener configuration documented by Bitnami. Without a dedicated external listener, those published ports would be misleading for host clients.
- The failover test used `docker exec` without interactive stdin for `kafka-console-producer.sh`. I changed it to `docker exec -it` so the console producer can accept typed input, matching Docker's documented `exec` behavior.
- The restart verification said partitions would "rebalance" immediately. I corrected this to verifying that the broker rejoins and replicas return to the ISR, which is what the shown `kafka-topics.sh --describe` output actually demonstrates.
- The conclusion overstated `min.insync.replicas`. I corrected it to say the 2-of-3 durability guarantee applies when producers use `acks=all`, which matches Apache Kafka's broker and producer documentation.
- The performance snippet labeled a broker-side setting as "Producer tuning". I corrected that comment to identify it as a broker message-size limit.
- The introduction and conclusion described the layout as a general HA cluster without clarifying that each node is running in combined controller+broker mode. I adjusted the wording to describe the actual topology more precisely and to frame it as suitable for small self-hosted deployments.

## Review Notes
- The guide now accurately documents a combined-role KRaft cluster. Apache Kafka's official docs note that combined controller+broker nodes are simpler for small environments but should be avoided in critical deployment environments.
- If the post later needs host or remote clients to connect directly to the brokers, it should add a dedicated external listener per broker and matching `advertised.listeners` values, following the Bitnami container documentation.
