# Validation Summary: How to Configure the Azure Event Hub Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Azure Event Hub receiver (`azure_event_hub`)
- Azure Event Hubs
- Azure Auth extension
- Azure Blob checkpoint store
- Collector processors: memory limiter, resource, transform, filter, batch
- OTLP HTTP exporter
- Azure Monitor exporter
- Azure CLI
- Kubernetes Deployment, Service, and HorizontalPodAutoscaler

## Sources Consulted
- OpenTelemetry Collector Contrib Azure Event Hub receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/azureeventhubreceiver
- OpenTelemetry Collector Contrib Azure Event Hub receiver package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/azureeventhubreceiver
- OpenTelemetry Collector Contrib Azure Auth extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/azureauthextension
- OpenTelemetry Collector Contrib Azure Monitor exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/azuremonitorexporter
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Azure Event Hubs overview and tier limits: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-about
- Azure Event Hubs Microsoft Entra authorization docs: https://learn.microsoft.com/en-us/azure/event-hubs/authorize-access-azure-active-directory
- Azure CLI `az role assignment list` docs: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- OneUptime related blog URLs linked from the post

## Issues Found
- The receiver type used `azureeventhub`, which is deprecated. Updated examples to use the current `azure_event_hub` component type.
- The receiver configuration used unsupported fields including `namespace`, `eventhub`, `consumer_group`, `storage.connection`, `logs.body_field`, `logs.timestamp_field`, `logs.attributes`, `consumer.receive_timeout`, and `partition_manager`. Replaced them with supported fields such as `event_hub.name`, `event_hub.namespace`, `group`, `storage`, `blob_checkpoint_store`, `max_poll_events`, `poll_rate`, and `prefetch_count`.
- The post described generic JSON custom field mapping that the receiver does not support. Updated examples and explanations to use `format: azure` for Azure Monitor payloads and `format: raw` only as a supported raw log mode.
- Managed identity examples incorrectly embedded `auth.type: managed_identity` in the receiver. Updated them to use the `azure_auth` extension and reference it with `auth: azure_auth`.
- Azure Blob checkpoint examples used unsupported storage account fields. Replaced them with `blob_checkpoint_store.storage_account_url` and `blob_checkpoint_store.container_name`.
- The basic checkpoint example used `file_storage` without `create_directory`; validation showed the directory must exist unless `create_directory: true` is set. Added `create_directory: true`.
- The Azure Monitor exporter example used unsupported `workspace_id`. Replaced it with the documented `connection_string` setting.
- The filter processor examples used legacy/deprecated filter syntax and invalid OTTL paths. Updated them to current `log_conditions` syntax with explicit `log.` paths.
- Internal telemetry metrics listed non-current or receiver-specific metric names. Updated them to current Collector internal telemetry metrics and noted Prometheus `_total` suffix behavior.
- The Kubernetes deployment used an old Collector image (`0.93.0`) that would not support the Azure Blob checkpoint store examples. Updated it to `0.153.0`.
- The conclusion claimed exactly-once processing semantics. Corrected this to at-least-once processing behavior.

## Review Notes
Representative Collector configurations were validated with the local `otel/opentelemetry-collector-contrib:0.153.0` image using `otelcol validate`. The Azure Event Hub receiver and Azure Auth extension remain beta/alpha-level components respectively, so production users should re-check the component README when upgrading Collector versions.
