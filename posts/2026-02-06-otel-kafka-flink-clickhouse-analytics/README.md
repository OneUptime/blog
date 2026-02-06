# How to Build a Real-Time Analytics Pipeline: OpenTelemetry to Kafka to Apache Flink to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka, Apache Flink, ClickHouse

Description: Build a real-time analytics pipeline that streams OpenTelemetry data through Kafka and Flink into ClickHouse for instant insights.

Raw telemetry data is useful, but pre-computed analytics are what teams actually look at in dashboards. By placing Apache Flink between Kafka and ClickHouse, you can compute aggregations, detect anomalies, and derive metrics in real time before the data even hits storage. This post walks through building that pipeline end to end.

## Architecture

```
OTel Collector -> Kafka -> Flink (stream processing) -> ClickHouse
                                                     -> Alerting System
```

Flink reads from Kafka, applies windowed aggregations and transformations, and writes the results to ClickHouse. It can also emit alerts to a side output when it detects anomalies.

## Step 1: Collector to Kafka

This part is straightforward. Configure the OTel Collector to export to Kafka:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  kafka:
    brokers:
      - kafka:9092
    topic: otel-spans
    encoding: otlp_json
    producer:
      compression: lz4

processors:
  batch:
    send_batch_size: 4096
    timeout: 1s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [kafka]
```

Note that we use `otlp_json` encoding here instead of protobuf. This makes it easier for Flink to deserialize the data without needing the OTel protobuf schemas.

## Step 2: Flink Job for Real-Time Aggregation

Here is a Flink job written in Java that reads spans from Kafka, computes p50/p95/p99 latency per service per minute, and writes the results to ClickHouse:

```java
// SpanAnalyticsJob.java
public class SpanAnalyticsJob {

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env =
            StreamExecutionEnvironment.getExecutionEnvironment();

        // Enable checkpointing every 60 seconds for fault tolerance
        env.enableCheckpointing(60000);

        // Read spans from Kafka
        KafkaSource<String> kafkaSource = KafkaSource.<String>builder()
            .setBootstrapServers("kafka:9092")
            .setTopics("otel-spans")
            .setGroupId("flink-span-analytics")
            .setStartingOffsets(OffsetsInitializer.latest())
            .setValueOnlyDeserializer(new SimpleStringSchema())
            .build();

        DataStream<String> rawSpans = env.fromSource(
            kafkaSource, WatermarkStrategy.noWatermarks(), "Kafka Source");

        // Parse JSON spans and extract fields
        DataStream<SpanRecord> spans = rawSpans
            .map(json -> {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode node = mapper.readTree(json);
                // Navigate the OTLP JSON structure
                JsonNode resourceSpans = node.get("resourceSpans");
                // Flatten the nested structure
                List<SpanRecord> records = new ArrayList<>();
                for (JsonNode rs : resourceSpans) {
                    String serviceName = rs.get("resource")
                        .get("attributes").findValue("service.name")
                        .asText("unknown");
                    for (JsonNode ss : rs.get("scopeSpans")) {
                        for (JsonNode span : ss.get("spans")) {
                            long startNano = span.get("startTimeUnixNano").asLong();
                            long endNano = span.get("endTimeUnixNano").asLong();
                            long durationMs = (endNano - startNano) / 1_000_000;
                            records.add(new SpanRecord(
                                serviceName,
                                span.get("name").asText(),
                                durationMs,
                                startNano / 1_000_000
                            ));
                        }
                    }
                }
                return records;
            })
            .flatMap((List<SpanRecord> list, Collector<SpanRecord> out) ->
                list.forEach(out::collect))
            .returns(SpanRecord.class);

        // Compute per-service, per-minute latency percentiles
        DataStream<LatencyStats> stats = spans
            .assignTimestampsAndWatermarks(
                WatermarkStrategy.<SpanRecord>forBoundedOutOfOrderness(
                    Duration.ofSeconds(10))
                .withTimestampAssigner((span, ts) -> span.getTimestampMs()))
            .keyBy(SpanRecord::getServiceName)
            .window(TumblingEventTimeWindows.of(Time.minutes(1)))
            .aggregate(new LatencyPercentileAggregator());

        // Write aggregated stats to ClickHouse via JDBC
        stats.addSink(JdbcSink.sink(
            "INSERT INTO service_latency_stats VALUES (?, ?, ?, ?, ?, ?)",
            (ps, stat) -> {
                ps.setTimestamp(1, new Timestamp(stat.getWindowEnd()));
                ps.setString(2, stat.getServiceName());
                ps.setLong(3, stat.getP50());
                ps.setLong(4, stat.getP95());
                ps.setLong(5, stat.getP99());
                ps.setLong(6, stat.getSpanCount());
            },
            new JdbcConnectionOptions.JdbcConnectionOptionsBuilder()
                .withUrl("jdbc:clickhouse://clickhouse:8123/default")
                .withDriverName("com.clickhouse.jdbc.ClickHouseDriver")
                .build()
        ));

        env.execute("Span Analytics Pipeline");
    }
}
```

## Step 3: ClickHouse Aggregated Table

Create the destination table for pre-computed stats:

```sql
CREATE TABLE service_latency_stats (
    window_end DateTime,
    service_name LowCardinality(String),
    p50_ms UInt64,
    p95_ms UInt64,
    p99_ms UInt64,
    span_count UInt64
) ENGINE = MergeTree()
PARTITION BY toDate(window_end)
ORDER BY (service_name, window_end)
TTL toDate(window_end) + INTERVAL 365 DAY;
```

## Querying Pre-Computed Analytics

Because the data is already aggregated, dashboard queries are instant:

```sql
-- Service latency trend for the last 24 hours
SELECT
    window_end,
    service_name,
    p99_ms,
    span_count
FROM service_latency_stats
WHERE window_end > now() - INTERVAL 24 HOUR
  AND service_name = 'checkout-service'
ORDER BY window_end;
```

This query returns in milliseconds because it is reading pre-aggregated rows instead of scanning billions of raw spans.

## Wrapping Up

Adding Flink between Kafka and ClickHouse gives you the ability to run continuous analytics on your telemetry stream. Pre-computed percentiles, error rate calculations, and anomaly detection can all happen in real time, making your dashboards faster and your alerting more responsive. The tradeoff is operational complexity, but for organizations processing billions of spans per day, the benefits far outweigh the cost of running a Flink cluster.
