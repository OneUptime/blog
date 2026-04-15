# How to Stream Data from Azure Event Hubs to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Azure Event Hub, Azure, Streaming, Kafka, Data Pipeline

Description: Stream events from Azure Event Hubs into ClickHouse using the Kafka-compatible endpoint or an Azure Function consumer.

---

Azure Event Hubs is a fully managed event streaming platform with a Kafka-compatible API. This makes it straightforward to integrate with ClickHouse's native Kafka engine.

## Using the Kafka-Compatible Endpoint

Azure Event Hubs exposes a Kafka-compatible endpoint that requires no code changes. Create a ClickHouse Kafka engine table pointing at your Event Hub:

```sql
CREATE TABLE eventhub_queue (
    event_time DateTime,
    device_id String,
    temperature Float32,
    humidity Float32
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'my-namespace.servicebus.windows.net:9093',
    kafka_topic_list = 'telemetry',
    kafka_group_name = 'clickhouse-consumer',
    kafka_format = 'JSONEachRow',
    kafka_security_protocol = 'SASL_SSL',
    kafka_sasl_mechanism = 'PLAIN',
    kafka_sasl_username = '$ConnectionString',
    kafka_sasl_password = 'Endpoint=sb://my-namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=YOUR_KEY';
```

Create the target table:

```sql
CREATE TABLE telemetry (
    event_time DateTime,
    device_id LowCardinality(String),
    temperature Float32,
    humidity Float32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (device_id, event_time);
```

Create the materialized view:

```sql
CREATE MATERIALIZED VIEW eventhub_to_telemetry TO telemetry AS
SELECT * FROM eventhub_queue;
```

## TLS Configuration

Event Hubs requires TLS. Ensure your ClickHouse server has the proper CA certificates:

```bash
sudo update-ca-certificates
```

If connecting from within Azure, the certificates are pre-installed. From external systems, install the DigiCert root CA.

## Using Azure Functions as a Consumer

For more control or to transform data before insertion:

```csharp
[FunctionName("EventHubToClickHouse")]
public async Task Run([EventHubTrigger("telemetry", Connection = "EventHubConnection")] EventData[] events)
{
    var rows = events.Select(e => {
        var data = JsonSerializer.Deserialize<TelemetryEvent>(e.EventBody.ToString());
        return $"('{data.EventTime}', '{data.DeviceId}', {data.Temperature}, {data.Humidity})";
    });

    var values = string.Join(",", rows);
    var query = "INSERT INTO telemetry VALUES";

    using var client = new HttpClient();
    await client.PostAsync($"http://clickhouse:8123/?query={Uri.EscapeDataString(query)}", new StringContent(values));
}
```

## Consumer Group Management

Create a dedicated consumer group for ClickHouse in your Event Hub namespace to avoid conflicting with other consumers:

```bash
az eventhubs eventhub consumer-group create \
  --resource-group my-rg \
  --namespace-name my-namespace \
  --eventhub-name telemetry \
  --name clickhouse-consumer
```

## Monitor Consumer Lag

View consumer group details:

```bash
az eventhubs eventhub consumer-group show \
  --resource-group my-rg \
  --namespace-name my-namespace \
  --eventhub-name telemetry \
  --name clickhouse-consumer
```

Note: This command shows consumer group metadata, not lag. To monitor consumer lag, use Azure Monitor metrics or the ClickHouse system table below.

Check ClickHouse Kafka engine status:

```sql
SELECT * FROM system.kafka_consumers;
```

## Summary

Azure Event Hubs integrates with ClickHouse seamlessly via the Kafka compatibility endpoint. Configure the Kafka engine with SASL_SSL authentication, set up a materialized view to write to your target table, and create a dedicated consumer group. For transformation-heavy pipelines, Azure Functions provides a serverless alternative.
