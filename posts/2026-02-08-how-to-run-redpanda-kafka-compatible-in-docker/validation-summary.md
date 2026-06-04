# Validation Summary: How to Run Redpanda (Kafka-Compatible) in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Redpanda
- Redpanda Console
- rpk CLI
- Kafka-compatible producer and consumer clients
- kafka-python
- Redpanda Schema Registry
- Redpanda HTTP Proxy / Pandaproxy

## Sources Consulted
- Redpanda Labs: Start a Single Redpanda Broker with Redpanda Console in Docker: https://docs.redpanda.com/labs/docker-compose/single-broker/
- Redpanda Labs: Start a Cluster of Redpanda Brokers with Redpanda Console in Docker: https://docs.redpanda.com/labs/docker-compose/three-brokers/
- Redpanda Console configuration documentation: https://docs.redpanda.com/streaming/current/console/config/configure-console/
- Redpanda rpk topic create reference: https://docs.redpanda.com/current/reference/rpk/rpk-topic/rpk-topic-create/
- Redpanda rpk topic produce reference: https://docs.redpanda.com/streaming/current/reference/rpk/rpk-topic/rpk-topic-produce/
- Redpanda rpk topic consume reference: https://docs.redpanda.com/redpanda-cloud/reference/rpk/rpk-topic/rpk-topic-consume/
- Redpanda Schema Registry API documentation: https://docs.redpanda.com/current/manage/schema-reg/schema-reg-api/
- Redpanda HTTP Proxy API documentation: https://docs.redpanda.com/api/doc/http-proxy/operation/operation-post_topics_name
- Redpanda HTTP Proxy guide: https://docs.redpanda.com/cloud-data-platform/develop/http-proxy/
- kafka-python usage documentation: https://kafka-python.readthedocs.io/en/2.0.1/usage.html

## Issues Found
- The Quick Start `docker run` command mapped host port `9092` to container port `9092`, while the externally advertised Kafka listener was bound inside the container on `19092`. Changed the mapping to `-p 9092:19092` so host clients connecting to `localhost:9092` reach the advertised external listener.
- The Docker Compose `command` arrays used `redpanda start` as a single argument. Changed them to separate `redpanda` and `start` entries to match the exec-form Compose examples in Redpanda's official Docker labs.
- The single-node Compose example omitted explicit RPC listener settings. Added `--rpc-addr` and `--advertise-rpc-addr`, matching Redpanda's Docker examples and making the broker's internal address explicit.
- The Redpanda Console service set `CONFIG_FILEPATH` but did not create `/tmp/config.yml`. Added the shell entrypoint and command that writes `CONSOLE_CONFIG_FILE` to the configured file path before starting Console.
- The Redpanda Console Schema Registry configuration was nested under `kafka`, but current Console configuration uses `schemaRegistry` as a top-level key. Moved it to the correct level.
- The rpk examples used `docker exec redpanda`, which does not match the Compose setup unless the generated container happens to be named `redpanda`. Changed them to `docker compose exec redpanda`, with `-T` for the piped produce command.
- The three-node Compose example used `redpanda start` as a single command argument and did not explicitly configure RPC bind and advertised addresses. Split the command arguments and added the RPC listener settings for all three brokers.

## Review Notes
- The examples use `latest` image tags, which are convenient for tutorials but can produce different behavior over time. Pinning Redpanda and Console versions would make the guide more reproducible.
- The top-level `version: "3.8"` field in Compose files is still widely accepted, but modern Docker Compose no longer requires it.
