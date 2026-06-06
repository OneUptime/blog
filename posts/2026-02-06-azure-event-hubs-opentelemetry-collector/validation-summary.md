# Validation Summary: How to Use Azure Event Hubs with OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Event Hubs
- Azure Event Hubs Kafka endpoint
- Azure CLI
- OpenTelemetry Collector
- OpenTelemetry Collector Kafka receiver and exporter
- OpenTelemetry Collector Azure Event Hub receiver
- OpenTelemetry Collector Azure Auth extension
- Docker

## Sources Consulted
- OpenTelemetry Collector Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/kafkaexporter
- OpenTelemetry Collector Kafka receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/kafkareceiver
- OpenTelemetry Collector Azure Event Hub receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/azureeventhubreceiver
- OpenTelemetry Collector Azure Auth extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/azureauthextension
- OpenTelemetry Collector exporters list: https://opentelemetry.io/docs/collector/components/exporter/
- Azure Event Hubs Kafka protocol support: https://learn.microsoft.com/en-gb/azure/event-hubs/azure-event-hubs-apache-kafka-overview
- Azure Event Hubs connection strings: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-get-connection-string
- Azure CLI `az eventhubs eventhub` reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub
- Azure Event Hubs tier limits: https://learn.microsoft.com/en-us/azure/event-hubs/compare-tiers

## Issues Found
- The post used a non-existent `azureeventhub` exporter with `connection_string` and `format: otlp_proto`. The current Collector has Kafka exporter support and a native Azure Event Hub receiver, but no Azure Event Hub exporter. Updated the export path to use the Kafka exporter against the Event Hubs Kafka endpoint with SASL PLAIN over TLS and OTLP protobuf encoding.
- The receive example used the deprecated/native `azureeventhub` receiver name with unsupported `connection_string` and `otlp_proto` settings. The native receiver is now `azure_event_hub`, uses `connection`, and supports Azure diagnostic/raw formats, not OTLP protobuf bridge traffic. Updated the OTLP bridge receive path to use the Kafka receiver with matching topics and `otlp_proto` encoding.
- The Azure CLI command used the invalid `--message-retention` option. Updated the Event Hub creation commands to use the current `--retention-time-in-hours 24` flag.
- The setup created only one Event Hub while the corrected OTLP Kafka configuration routes traces, metrics, and logs to separate Kafka topics/Event Hubs. Added creation commands for `telemetry-metrics` and `telemetry-logs`.
- The authentication setup created an Event Hub-level authorization rule and retrieved an Event Hub connection string, but the Event Hubs Kafka endpoint documentation uses a namespace connection string as the SASL password. Updated the commands to create and retrieve a namespace-level authorization rule.
- The receive example used the removed/deprecated `logging` exporter with `loglevel`. Updated it to the current `debug` exporter with `verbosity: basic`.
- The managed identity section incorrectly claimed the Event Hub exporter falls back to `DefaultAzureCredential` when no shared key is present. Replaced it with the correct native `azure_event_hub` receiver plus `azure_auth` managed identity example, and clarified that the Kafka receiver/exporter path uses SAS credentials.
- The performance guidance overstated consumer group behavior and message-size wording. Updated it to distinguish independent consumer groups from collectors sharing partitions within the same group, and aligned message-size language with Azure Event Hubs publication limits.

## Review Notes
- YAML snippets were syntax-checked locally with `python3` and PyYAML.
- I could not run `az --help` locally because Azure CLI is not installed in this environment, so Azure CLI validation was performed against Microsoft Learn command references.
- I did not run a live Collector against Azure Event Hubs because that would require Azure resources and credentials.
