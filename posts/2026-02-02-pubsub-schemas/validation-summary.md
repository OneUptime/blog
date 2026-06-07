# Validation Summary: How to Configure Pub/Sub Schemas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub (schemas, topics, subscriptions)
- Apache Avro (schema definition, JSON encoding, binary encoding)
- Protocol Buffers (proto3 syntax)
- Google Cloud SDK (`gcloud` CLI)
- Python client libraries: `google-cloud-pubsub`, `google-cloud-monitoring`, `avro`
- Google Cloud Monitoring (alerting policies, time series)
- Google Cloud Logging
- Mermaid diagrams (graph, sequence, flowchart, mindmap)

## Sources Consulted
- Google Cloud Pub/Sub schemas docs: https://cloud.google.com/pubsub/docs/schemas
- python-pubsub repository samples: https://github.com/googleapis/python-pubsub/blob/main/samples/snippets/schema.py
- `gcloud pubsub schemas` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/schemas
- `gcloud pubsub schemas validate-schema` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/schemas/validate-schema
- `gcloud pubsub schemas validate-message` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/schemas/validate-message
- Google Cloud SDK Homebrew install instructions: https://cloud.google.com/sdk/docs/downloads-homebrew and https://formulae.brew.sh/cask/gcloud-cli
- `google.pubsub_v1.types` proto source for `Encoding` and `SchemaSettings`: https://github.com/googleapis/python-pubsub/blob/main/google/pubsub_v1/types/schema.py
- Apache Avro Python library docs: https://avro.apache.org/docs/current/getting-started-python/
- Avro `avro-python3` PyPI deprecation note: https://pypi.org/project/avro-python3/
- Google Cloud Monitoring Python client: https://cloud.google.com/python/docs/reference/monitoring/latest
- Pub/Sub metrics reference (`pubsub.googleapis.com/topic/send_request_count`): https://cloud.google.com/monitoring/api/metrics_gcp#gcp-pubsub

## Issues Found
1. **Homebrew install command for Google Cloud SDK** — The post used `brew install google-cloud-sdk`. The Homebrew formula was removed and the SDK is distributed as a cask. Changed to `brew install --cask google-cloud-sdk`.
2. **Deprecated `avro-python3` package** — Replaced `pip install avro-python3` with `pip install avro`. The `avro-python3` distribution is deprecated; the consolidated `avro` package now supports Python 3 and is what `avro.schema.parse` / `avro.io.BinaryDecoder` / `avro.io.DatumReader` come from.
3. **Incorrect `Encoding` enum access in `schema_manager.py`** — The `validate_message` call passed `encoding="JSON"` as a string. The Pub/Sub Python client expects the `Encoding` enum value (`Encoding.JSON`). Added `Encoding` to the imports from `google.pubsub_v1.types` and updated the call.
4. **Incorrect `SchemaSettings.Encoding[...]` lookups in `topic_manager.py`** — `Encoding` is a sibling class to `SchemaSettings` at the `google.pubsub_v1.types` module level, not a nested attribute, so `SchemaSettings.Encoding` raises `AttributeError`. Added `Encoding` to the imports and replaced both occurrences with `Encoding[encoding]` / `Encoding[current_encoding]`.

## Review Notes
- The Avro schema, Protocol Buffer (proto3) schema, and mermaid diagrams are syntactically valid and accurate. The proto3 example correctly uses `0` as the first enum value and `int64` for cents-based amounts.
- The gcloud commands (`schemas create`, `schemas describe`, `schemas validate-schema`, `schemas validate-message`, `topics create --schema --message-encoding`, `logging read`) are all current and valid.
- The Cloud Monitoring filter (`pubsub.googleapis.com/topic/send_request_count` with `metric.label.response_code`) is a valid metric and label combination.
- The schema-evolution compatibility diagram is a reasonable simplification of Avro schema-resolution rules and is consistent with Pub/Sub's revision compatibility semantics; it is not exhaustive but is not misleading.
- The Avro binary decoding pattern used in `subscribe_with_schema` (`avro.schema.parse` + `BinaryDecoder` + `DatumReader.read`) is correct for raw Avro binary; note that Pub/Sub BINARY messages do not carry a writer-schema header, so the reader and writer schemas are assumed identical here — a documented limitation worth noting in a future revision if writer-vs-reader schema evolution at the subscriber is needed.
- Cask naming nuance: Homebrew has been gradually moving the cask to the `gcloud-cli` token, but `google-cloud-sdk` still works as a cask alias today, so the minimally invasive fix (adding `--cask`) was chosen.
