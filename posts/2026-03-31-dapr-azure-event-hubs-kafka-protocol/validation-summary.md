# Validation Summary: How to Configure Azure Event Hubs with Kafka Protocol for Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, Kafka component, Azure Event Hubs component)
- Azure Event Hubs (Kafka protocol surface, AMQP)
- Apache Kafka (SASL/PLAIN authentication, consumer groups)
- Azure CLI (`az eventhubs`)
- Kubernetes (Secrets, Dapr component/subscription CRDs)
- Python (Dapr SDK)

## Sources Consulted
- Dapr Kafka pub/sub component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Azure Event Hubs pub/sub component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-eventhubs/
- Dapr Subscription spec reference — https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Python SDK documentation — https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Azure Event Hubs for Apache Kafka overview — https://learn.microsoft.com/en-us/azure/event-hubs/azure-event-hubs-apache-kafka-overview
- Azure Event Hubs Kafka FAQ — https://learn.microsoft.com/en-us/azure/event-hubs/apache-kafka-frequently-asked-questions
- Azure CLI `az eventhubs` reference — https://learn.microsoft.com/en-us/cli/azure/eventhubs

## Issues Found

1. **Invalid CLI flag `--message-retention`**: The `az eventhubs eventhub create` command used `--message-retention 1`, which is not a valid flag. Changed to `--retention-time-in-hours 24` (the current correct flag name, with 24 hours equivalent to 1 day retention).

2. **Invalid Dapr metadata field `tlsEnabled`**: The Dapr Kafka pub/sub component does not have a `tlsEnabled` field. The correct field is `disableTls` (defaults to `false`, meaning TLS is on by default). Changed to `disableTls: "false"` for explicitness.

3. **Incorrect Managed Identity configuration**: The post showed `authType: "azure"` with `azureClientId` for the Kafka pub/sub component, but the Dapr Kafka component does not support an `azure` auth type. Valid auth types are: `none`, `password`, `mtls`, `oidc`. Replaced the section with guidance to use the native `pubsub.azure.eventhubs` component for Managed Identity authentication.

4. **Incorrect consumer group guidance**: The post stated "Dapr does not auto-create" consumer groups and showed an `az eventhubs eventhub consumer-group create` command. When using the Kafka protocol surface, consumer groups are auto-created by the Kafka protocol layer. The `az` command creates AMQP consumer groups, which are a separate entity from Kafka consumer groups. Removed the incorrect command and updated the text to reflect auto-creation behavior.

5. **Deprecated Subscription API version**: The Subscription CRD used `apiVersion: dapr.io/v1alpha1` with `route:` field. Updated to `dapr.io/v2alpha1` with the current `routes.default:` syntax.

## Review Notes
- The `--enable-kafka true` flag on `az eventhubs namespace create` is redundant since Kafka is automatically enabled on Standard and Premium tiers, but it is not incorrect and makes intent explicit. Left as-is.
- The `saslMechanism: "PLAIN"` value is correct per the SASL specification (RFC 4616) and Kafka's SASL/PLAIN mechanism naming. This aligns with the Sarama Go library used by Dapr internally.
- The Python SDK code is correct and uses current parameter names (`pubsub_name`, `topic_name`, `data`, `data_content_type`).
- The Event Hubs Kafka endpoint format (`{namespace}.servicebus.windows.net:9093`) and SASL username (`$ConnectionString`) are correct per Azure documentation.
- The connection string format shown is correct for a namespace-level connection string.
