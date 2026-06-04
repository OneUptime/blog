# Validation Summary: How to Run Benthos/Bento for Stream Processing in Docker

## Status
validated

## Post Type
Tutorial / Docker deployment guide

## Technologies Covered
- Docker
- Docker Compose
- Benthos
- Bento
- Redpanda Connect
- Redpanda
- Kafka-compatible messaging
- Bloblang
- Elasticsearch
- Prometheus metrics
- PostgreSQL SQL insert output

## Sources Consulted
- Redpanda Connect quickstart and Docker image usage: https://docs.redpanda.com/redpanda-connect/get-started/quickstarts/rpk/
- Redpanda Connect configuration overview: https://docs.redpanda.com/redpanda-connect/configuration/about/
- Redpanda Connect HTTP server input: https://docs.redpanda.com/redpanda-connect/components/inputs/http_server/
- Redpanda Connect Kafka input and output component docs: https://docs.redpanda.com/redpanda-connect/components/inputs/kafka/ and https://docs.redpanda.com/redpanda-connect/components/outputs/kafka/
- Redpanda Connect output switch docs: https://docs.redpanda.com/redpanda-connect/components/outputs/switch/
- Redpanda Connect message batching docs: https://docs.redpanda.com/redpanda-connect/configuration/batching/
- Redpanda Connect Elasticsearch v8 output docs: https://docs.redpanda.com/redpanda-connect/components/outputs/elasticsearch_v8/
- Redpanda Connect Bloblang functions and methods: https://docs.redpanda.com/redpanda-connect/guides/bloblang/functions/ and https://docs.redpanda.com/redpanda-connect/guides/bloblang/methods/
- Redpanda Connect unit testing docs: https://docs.redpanda.com/redpanda-connect/configuration/unit_testing/
- Redpanda Connect metrics and Prometheus docs: https://docs.redpanda.com/redpanda-connect/components/metrics/about/ and https://docs.redpanda.com/redpanda-connect/components/metrics/prometheus/
- Redpanda Connect logger docs: https://docs.redpanda.com/redpanda-cloud/develop/connect/components/logger/about/
- Redpanda Docker Compose quickstart: https://docs.redpanda.com/current/get-started/quick-start/
- Redpanda acquisition / Redpanda Connect naming: https://www.redpanda.com/press/redpanda-acquires-benthos
- Bento official Docker docs: https://warpstreamlabs.github.io/bento/docs/guides/getting_started

## Issues Found
- The post incorrectly described Benthos as rebranded as Bento under Redpanda stewardship. Redpanda acquired Benthos and rebranded it as Redpanda Connect; Bento is a separate open source fork. Updated the description, introduction, and summary to distinguish the projects.
- The Docker image `ghcr.io/redpandadata/connect` did not match the official Redpanda Connect image. Replaced it with `docker.redpanda.com/redpandadata/connect`.
- The quick-start command used an inline `-c` configuration with the container image. Replaced it with the documented Docker flow: generate `connect.yaml`, mount it at `/connect.yaml`, and run `connect run`.
- The Docker Compose examples mounted `config.yaml` to `/bento.yaml` without an explicit command. Updated them to mount `/connect.yaml` and run `run /connect.yaml`.
- The Redpanda Compose `command` listed `redpanda start` as a single argument. Split it into `redpanda` and `start` to match Docker Compose exec-form command behavior and official Redpanda examples.
- The `http_server` input set `address: "0.0.0.0:4195"`, which would conflict with the default service-wide HTTP server on the same address. Removed the custom address so the endpoint registers on the service-wide server.
- The log enrichment example used `batching` as a pipeline processor. Batching is a policy on supporting input/output components, not a standalone processor. Moved the batching policy under the Elasticsearch output.
- The Elasticsearch example used an obsolete `elasticsearch` output with `type: "_doc"`. Updated it to the current `elasticsearch_v8` output and added required `action` and `id` fields.
- The unit test examples targeted `/pipeline/processors` inside the test file rather than the pipeline config file. Changed `target_processors` to `config.yaml#/pipeline/processors`.
- The unit test expected exact JSON equality while the processor adds additional fields. Changed the assertion to `json_contains`.
- The debug-log unit test omitted `user_email`, which the pipeline hashes. Added a test value so the hashing step can run before the deletion filter.
- The Prometheus metrics example used a `prefix` field that is no longer part of the current Prometheus metrics component. Replaced it with `prometheus: {}`.

## Review Notes
Could not run the Redpanda Connect container locally because Docker Hub returned an unauthenticated pull rate-limit error while fetching the official image. The review was completed against current official Redpanda Connect, Redpanda, and Bento documentation.
