# Validation Summary: How to Stream Data from Azure Event Hubs to ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (Kafka engine, MergeTree engine, materialized views, HTTP interface)
- Azure Event Hubs (Kafka-compatible endpoint)
- Azure Functions (C#, EventHubTrigger)
- Azure CLI (`az eventhubs`)
- SASL_SSL / PLAIN authentication
- librdkafka (underlying ClickHouse Kafka client)

## Sources Consulted
- [ClickHouse Kafka Table Engine Docs](https://clickhouse.com/docs/engines/table-engines/integrations/kafka) — verified table-level SETTINGS for `kafka_security_protocol`, `kafka_sasl_mechanism`, `kafka_sasl_username`, `kafka_sasl_password`
- [ClickHouse system.kafka_consumers Docs](https://clickhouse.com/docs/operations/system-tables/kafka_consumers) — confirmed the system table exists and shows consumer state
- [ClickHouse HTTP Interface Docs](https://clickhouse.com/docs/interfaces/http) — verified INSERT pattern (query prefix in URL, data in POST body)
- [Azure Event Hubs Kafka Overview](https://learn.microsoft.com/en-us/azure/event-hubs/azure-event-hubs-apache-kafka-overview) — confirmed port 9093 and `$ConnectionString` as SASL username
- [Azure Event Hubs Kafka Client Configurations](https://learn.microsoft.com/en-us/azure/event-hubs/apache-kafka-configurations) — verified SASL_SSL + PLAIN auth settings
- [Azure CLI: az eventhubs eventhub consumer-group show](https://learn.microsoft.com/en-us/rest/api/eventhub/consumer-groups/get) — confirmed it returns only metadata, not lag
- [Azure.Messaging.EventHubs EventData.EventBody](https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.eventhubs.eventdata.eventbody) — verified `EventBody` is `BinaryData` and `.ToString()` returns UTF-8 string
- [Azure Functions In-process to Isolated Worker Migration Guide](https://learn.microsoft.com/en-us/azure/azure-functions/migrate-dotnet-to-isolated-model) — checked deprecation status of in-process model

## Issues Found

### 1. Misleading "Check Event Hub consumer lag" description
- **What was wrong:** The text said "Check Event Hub consumer lag:" before the `az eventhubs eventhub consumer-group show` command. This command only returns consumer group metadata (name, creation time, user metadata), not lag or offset information.
- **What was changed:** Changed the description to "View consumer group details:" and added a note clarifying that this command shows metadata, not lag, and that Azure Monitor metrics or the ClickHouse `system.kafka_consumers` table should be used for lag monitoring.
- **Why:** The original text would mislead readers into thinking they could monitor consumer lag with this command, when in fact Azure Event Hubs does not expose consumer lag through the management plane CLI.

### 2. ClickHouse HTTP INSERT pattern
- **What was wrong:** The Azure Function code put the entire INSERT statement (including all VALUES data) into the URL query parameter and sent `null` as the POST body: `client.PostAsync($"http://clickhouse:8123/?query={Uri.EscapeDataString(query)}", null)`. While this works for small payloads, URL length limits (typically 2KB-8KB) would cause failures with real Event Hub batches.
- **What was changed:** Split the query so the `INSERT INTO telemetry VALUES` prefix goes in the URL parameter and the actual values data is sent as the POST body via `new StringContent(values)`.
- **Why:** This matches the documented ClickHouse HTTP API pattern and avoids URL length limitations that would break in production with batch inserts from Event Hubs.

## Review Notes
- The Azure Function uses the in-process model (`[FunctionName]` attribute from `Microsoft.Azure.WebJobs`). Microsoft has announced end of support for the in-process model on November 10, 2026. The isolated worker model (`[Function]` attribute from `Microsoft.Azure.Functions.Worker`) is the recommended path forward. The code is still valid as of the blog post date but will need updating.
- The Azure Function code constructs SQL via string interpolation, which is vulnerable to SQL injection if event data contains single quotes. For a production deployment, parameterized queries or proper escaping should be used.
- The Azure Function creates a new `HttpClient` per invocation, which is an anti-pattern that can cause socket exhaustion. Production code should use a static `HttpClient` or `IHttpClientFactory`.
- The ClickHouse Kafka engine settings, Azure Event Hubs Kafka configuration (port 9093, `$ConnectionString` username, SASL_SSL/PLAIN), MergeTree table, materialized view pattern, consumer group CLI commands, and `system.kafka_consumers` table are all technically correct.
