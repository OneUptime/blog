# How to Use ClickHouse with Apache Flink

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Flink, Streaming, Data Engineering, Analytics

Description: Learn how to connect Apache Flink to ClickHouse for real-time stream processing, including writing results to ClickHouse using the Flink JDBC connector and the ClickHouse Flink sink.

---

> Flink handles stateful stream transformations at scale while ClickHouse serves as a high-performance analytical sink.

Apache Flink excels at stateful, event-driven stream processing. Pairing it with ClickHouse lets you push aggregated, enriched, or joined stream results directly into a columnar store built for fast analytical queries. This guide walks through setting up the ClickHouse Flink connector, writing streaming results, and tuning for throughput.

---

## Project Setup

Initialize a Maven project with the required dependencies.

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Flink core -->
    <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-streaming-java</artifactId>
        <version>1.18.0</version>
    </dependency>

    <!-- Flink JDBC connector -->
    <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-connector-jdbc</artifactId>
        <version>3.1.2-1.18</version>
    </dependency>

    <!-- ClickHouse JDBC driver -->
    <dependency>
        <groupId>com.clickhouse</groupId>
        <artifactId>clickhouse-jdbc</artifactId>
        <version>0.6.3</version>
        <classifier>all</classifier>
    </dependency>

    <!-- Flink Kafka source -->
    <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-connector-kafka</artifactId>
        <version>3.1.0-1.18</version>
    </dependency>

    <!-- Flink Table API and SQL -->
    <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-table-api-java-bridge</artifactId>
        <version>1.18.0</version>
    </dependency>
</dependencies>
```

## Creating the Destination Table in ClickHouse

Set up the table that Flink will write into.

```sql
CREATE TABLE flink_events
(
    window_start DateTime,
    window_end   DateTime,
    event_type   LowCardinality(String),
    event_count  UInt64,
    unique_users UInt64,
    updated_at   DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(window_start)
ORDER BY (event_type, window_start);
```

## Writing a Flink Job with JDBC Sink

Use the Flink JDBC connector to write aggregated results to ClickHouse.

```java
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.connector.jdbc.JdbcConnectionOptions;
import org.apache.flink.connector.jdbc.JdbcExecutionOptions;
import org.apache.flink.connector.jdbc.JdbcSink;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;

public class FlinkClickHouseJob {

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env =
            StreamExecutionEnvironment.getExecutionEnvironment();

        // Read from Kafka
        DataStream<UserEvent> events = env.fromSource(
            buildKafkaSource(),
            WatermarkStrategy.<UserEvent>forBoundedOutOfOrderness(
                Duration.ofSeconds(10))
                .withTimestampAssigner((e, ts) -> e.getTimestamp()),
            "Kafka Source"
        );

        // Aggregate in 1-minute tumbling windows
        DataStream<WindowResult> aggregated = events
            .keyBy(UserEvent::getEventType)
            .window(TumblingEventTimeWindows.of(Time.minutes(1)))
            .aggregate(new CountAndDistinctUsers());

        // Sink to ClickHouse
        aggregated.addSink(
            JdbcSink.sink(
                "INSERT INTO flink_events " +
                "(window_start, window_end, event_type, event_count, unique_users) " +
                "VALUES (?, ?, ?, ?, ?)",
                (stmt, result) -> {
                    stmt.setTimestamp(1, Timestamp.from(result.windowStart));
                    stmt.setTimestamp(2, Timestamp.from(result.windowEnd));
                    stmt.setString(3, result.eventType);
                    stmt.setLong(4, result.eventCount);
                    stmt.setLong(5, result.uniqueUsers);
                },
                JdbcExecutionOptions.builder()
                    .withBatchSize(5000)
                    .withBatchIntervalMs(2000)
                    .withMaxRetries(3)
                    .build(),
                new JdbcConnectionOptions.JdbcConnectionOptionsBuilder()
                    .withUrl("jdbc:ch://localhost:8123/default")
                    .withDriverName("com.clickhouse.jdbc.ClickHouseDriver")
                    .withUsername("default")
                    .withPassword("password")
                    .build()
            )
        );

        env.execute("Flink ClickHouse Aggregation");
    }
}
```

## Using Flink SQL with ClickHouse

Flink SQL lets you define ClickHouse as a catalog table and query it directly.

```java
import org.apache.flink.table.api.EnvironmentSettings;
import org.apache.flink.table.api.TableEnvironment;

public class FlinkSQLClickHouse {

    public static void main(String[] args) throws Exception {
        TableEnvironment tEnv = TableEnvironment.create(
            EnvironmentSettings.newInstance().inStreamingMode().build()
        );

        // Define a Kafka source table
        tEnv.executeSql(
            "CREATE TABLE kafka_events (" +
            "  event_id   STRING," +
            "  user_id    BIGINT," +
            "  event_type STRING," +
            "  ts         TIMESTAMP(3)," +
            "  WATERMARK FOR ts AS ts - INTERVAL '5' SECOND" +
            ") WITH (" +
            "  'connector' = 'kafka'," +
            "  'topic'     = 'user_events'," +
            "  'properties.bootstrap.servers' = 'localhost:9092'," +
            "  'format'    = 'json'" +
            ")"
        );

        // Define the ClickHouse sink table
        tEnv.executeSql(
            "CREATE TABLE ch_event_counts (" +
            "  window_start TIMESTAMP(3)," +
            "  window_end   TIMESTAMP(3)," +
            "  event_type   STRING," +
            "  event_count  BIGINT," +
            "  unique_users BIGINT" +
            ") WITH (" +
            "  'connector'  = 'jdbc'," +
            "  'url'        = 'jdbc:ch://localhost:8123/default'," +
            "  'table-name' = 'flink_events'," +
            "  'username'   = 'default'," +
            "  'password'   = 'password'" +
            ")"
        );

        // Run the aggregation query
        tEnv.executeSql(
            "INSERT INTO ch_event_counts " +
            "SELECT " +
            "  TUMBLE_START(ts, INTERVAL '1' MINUTE) AS window_start," +
            "  TUMBLE_END(ts, INTERVAL '1' MINUTE)   AS window_end," +
            "  event_type," +
            "  COUNT(*)                               AS event_count," +
            "  COUNT(DISTINCT user_id)                AS unique_users " +
            "FROM kafka_events " +
            "GROUP BY TUMBLE(ts, INTERVAL '1' MINUTE), event_type"
        );
    }
}
```

## Custom ClickHouse Sink Function

For more control over batching and retries, implement a custom sink.

```java
import com.clickhouse.jdbc.ClickHouseDataSource;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;

public class ClickHouseBatchSink extends RichSinkFunction<WindowResult> {

    private static final int BATCH_SIZE = 10000;
    private transient Connection connection;
    private transient PreparedStatement pstmt;
    private transient List<WindowResult> buffer;

    @Override
    public void open(Configuration parameters) throws Exception {
        ClickHouseDataSource ds = new ClickHouseDataSource(
            "jdbc:ch://localhost:8123/default"
        );
        connection = ds.getConnection("default", "password");
        pstmt = connection.prepareStatement(
            "INSERT INTO flink_events " +
            "(window_start, window_end, event_type, event_count, unique_users) " +
            "VALUES (?, ?, ?, ?, ?)"
        );
        buffer = new ArrayList<>(BATCH_SIZE);
    }

    @Override
    public void invoke(WindowResult value, Context ctx) throws Exception {
        buffer.add(value);
        if (buffer.size() >= BATCH_SIZE) {
            flush();
        }
    }

    private void flush() throws Exception {
        for (WindowResult r : buffer) {
            pstmt.setTimestamp(1, Timestamp.from(r.windowStart));
            pstmt.setTimestamp(2, Timestamp.from(r.windowEnd));
            pstmt.setString(3, r.eventType);
            pstmt.setLong(4, r.eventCount);
            pstmt.setLong(5, r.uniqueUsers);
            pstmt.addBatch();
        }
        pstmt.executeBatch();
        buffer.clear();
    }

    @Override
    public void close() throws Exception {
        if (!buffer.isEmpty()) {
            flush();
        }
        if (pstmt != null) pstmt.close();
        if (connection != null) connection.close();
    }
}
```

## Configuring Checkpointing

Enable Flink checkpointing for exactly-once delivery semantics.

```java
StreamExecutionEnvironment env =
    StreamExecutionEnvironment.getExecutionEnvironment();

// Enable checkpointing every 30 seconds
env.enableCheckpointing(30_000);
env.getCheckpointConfig().setCheckpointingMode(
    CheckpointingMode.EXACTLY_ONCE
);
env.getCheckpointConfig().setMinPauseBetweenCheckpoints(10_000);
env.getCheckpointConfig().setCheckpointTimeout(60_000);
env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);

// Persist checkpoints to S3
env.getCheckpointConfig().setCheckpointStorage(
    "s3://my-bucket/flink-checkpoints"
);
```

## Deploying on Kubernetes

Deploy the Flink job on Kubernetes with the Flink Operator.

```yaml
apiVersion: flink.apache.org/v1beta1
kind: FlinkDeployment
metadata:
  name: clickhouse-sink-job
spec:
  image: flink:1.18
  flinkVersion: v1_18
  flinkConfiguration:
    taskmanager.numberOfTaskSlots: "4"
    state.backend: rocksdb
    state.checkpoints.dir: s3://my-bucket/checkpoints
  serviceAccount: flink
  jobManager:
    resource:
      memory: "2048m"
      cpu: 1
  taskManager:
    resource:
      memory: "4096m"
      cpu: 2
  job:
    jarURI: local:///opt/flink/usrlib/clickhouse-flink-job.jar
    parallelism: 4
    upgradeMode: stateless
```

## Querying Results in ClickHouse

Once data flows in, run analytical queries against the aggregated results.

```sql
-- Event counts by type over the last hour
SELECT
    event_type,
    sum(event_count)  AS total_events,
    sum(unique_users) AS total_unique_users
FROM flink_events
WHERE window_start >= now() - INTERVAL 1 HOUR
GROUP BY event_type
ORDER BY total_events DESC;

-- Trending event types per minute
SELECT
    toStartOfMinute(window_start) AS minute,
    event_type,
    sum(event_count) AS events
FROM flink_events
WHERE window_start >= now() - INTERVAL 1 DAY
GROUP BY minute, event_type
ORDER BY minute DESC, events DESC;
```

## Summary

Apache Flink and ClickHouse complement each other well: Flink handles stateful windowing, joins, and enrichment while ClickHouse provides low-latency analytical queries on the results. Use the Flink JDBC connector with batching enabled, tune batch sizes and intervals to balance latency and throughput, and enable checkpointing for fault tolerance. Flink SQL is the quickest path to get started, while a custom RichSinkFunction gives you full control over retries and buffer flushing.
