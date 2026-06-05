# How to Build a Real-Time Analytics Pipeline: OpenTelemetry to Kafka to Apache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kafka, Apache Flink, ClickHouse

Description: Build a real-time analytics pipeline that streams OpenTelemetry data through Kafka and Flink into ClickHouse for instant insights.

Raw telemetry data is useful, but pre-computed analytics are what teams actually look at in dashboards. By placing Apache Flink between Kafka and ClickHouse, you can compute aggregations, detect anomalies, and derive metrics in real time before the data even hits storage. This post walks through building that pipeline end to end.

## Architecture

```text
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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.AggregateFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.connector.jdbc.JdbcConnectionOptions;
import org.apache.flink.connector.jdbc.JdbcSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
import org.apache.flink.util.Collector;

public class SpanAnalyticsJob {

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env =
            StreamExecutionEnvironment.getExecutionEnvironment();
        ObjectMapper mapper = new ObjectMapper();

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
                JsonNode node = mapper.readTree(json);
                // Navigate the OTLP JSON structure
                JsonNode resourceSpans = node.get("resourceSpans");
                // Flatten the nested structure
                List<SpanRecord> records = new ArrayList<>();
                for (JsonNode rs : resourceSpans) {
                    String serviceName = getResourceAttribute(
                        rs.get("resource"), "service.name", "unknown");
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
            .window(TumblingEventTimeWindows.of(Duration.ofMinutes(1)))
            .aggregate(
                new LatencyPercentileAggregator(),
                new AddWindowEnd());

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
                .withUrl("jdbc:ch:http://clickhouse:8123/default")
                .withDriverName("com.clickhouse.jdbc.ClickHouseDriver")
                .build()
        ));

        env.execute("Span Analytics Pipeline");
    }

    private static String getResourceAttribute(
        JsonNode resource, String key, String defaultValue) {
        if (resource == null || !resource.has("attributes")) {
            return defaultValue;
        }
        for (JsonNode attribute : resource.get("attributes")) {
            if (key.equals(attribute.path("key").asText())) {
                return attribute.path("value").path("stringValue").asText(defaultValue);
            }
        }
        return defaultValue;
    }

    public static class SpanRecord {
        private String serviceName;
        private String spanName;
        private long durationMs;
        private long timestampMs;

        public SpanRecord() {
        }

        public SpanRecord(
            String serviceName, String spanName, long durationMs, long timestampMs) {
            this.serviceName = serviceName;
            this.spanName = spanName;
            this.durationMs = durationMs;
            this.timestampMs = timestampMs;
        }

        public String getServiceName() {
            return serviceName;
        }

        public long getDurationMs() {
            return durationMs;
        }

        public long getTimestampMs() {
            return timestampMs;
        }
    }

    public static class LatencyAccumulator {
        private String serviceName;
        private final List<Long> durations = new ArrayList<>();
    }

    public static class LatencyPercentiles {
        private String serviceName;
        private long p50;
        private long p95;
        private long p99;
        private long spanCount;

        public LatencyPercentiles() {
        }

        public LatencyPercentiles(
            String serviceName, long p50, long p95, long p99, long spanCount) {
            this.serviceName = serviceName;
            this.p50 = p50;
            this.p95 = p95;
            this.p99 = p99;
            this.spanCount = spanCount;
        }
    }

    public static class LatencyStats {
        private long windowEnd;
        private String serviceName;
        private long p50;
        private long p95;
        private long p99;
        private long spanCount;

        public LatencyStats() {
        }

        public LatencyStats(
            long windowEnd, String serviceName, long p50, long p95, long p99, long spanCount) {
            this.windowEnd = windowEnd;
            this.serviceName = serviceName;
            this.p50 = p50;
            this.p95 = p95;
            this.p99 = p99;
            this.spanCount = spanCount;
        }

        public long getWindowEnd() {
            return windowEnd;
        }

        public String getServiceName() {
            return serviceName;
        }

        public long getP50() {
            return p50;
        }

        public long getP95() {
            return p95;
        }

        public long getP99() {
            return p99;
        }

        public long getSpanCount() {
            return spanCount;
        }
    }

    public static class LatencyPercentileAggregator implements
        AggregateFunction<SpanRecord, LatencyAccumulator, LatencyPercentiles> {

        @Override
        public LatencyAccumulator createAccumulator() {
            return new LatencyAccumulator();
        }

        @Override
        public LatencyAccumulator add(SpanRecord value, LatencyAccumulator accumulator) {
            accumulator.serviceName = value.getServiceName();
            accumulator.durations.add(value.getDurationMs());
            return accumulator;
        }

        @Override
        public LatencyPercentiles getResult(LatencyAccumulator accumulator) {
            Collections.sort(accumulator.durations);
            return new LatencyPercentiles(
                accumulator.serviceName,
                percentile(accumulator.durations, 0.50),
                percentile(accumulator.durations, 0.95),
                percentile(accumulator.durations, 0.99),
                accumulator.durations.size()
            );
        }

        @Override
        public LatencyAccumulator merge(
            LatencyAccumulator first, LatencyAccumulator second) {
            first.durations.addAll(second.durations);
            if (first.serviceName == null) {
                first.serviceName = second.serviceName;
            }
            return first;
        }

        private long percentile(List<Long> sortedValues, double percentile) {
            if (sortedValues.isEmpty()) {
                return 0;
            }
            int index = (int) Math.ceil(percentile * sortedValues.size()) - 1;
            return sortedValues.get(Math.max(0, Math.min(index, sortedValues.size() - 1)));
        }
    }

    public static class AddWindowEnd extends
        ProcessWindowFunction<LatencyPercentiles, LatencyStats, String, TimeWindow> {

        @Override
        public void process(
            String serviceName,
            Context context,
            Iterable<LatencyPercentiles> values,
            Collector<LatencyStats> out) {
            LatencyPercentiles percentiles = values.iterator().next();
            out.collect(new LatencyStats(
                context.window().getEnd(),
                serviceName,
                percentiles.p50,
                percentiles.p95,
                percentiles.p99,
                percentiles.spanCount
            ));
        }
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
