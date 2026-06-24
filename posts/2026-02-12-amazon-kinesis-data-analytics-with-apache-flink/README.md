# How to Use Amazon Kinesis Data Analytics with Apache Flink

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Kinesis, Apache Flink, Streaming, Data Analytics

Description: Build real-time streaming applications on Amazon Kinesis Data Analytics using Apache Flink with Java and Python for complex event processing and analytics.

---

When SQL streaming analytics hits its limits - and it will for complex use cases - Apache Flink is the natural next step. Amazon Managed Service for Apache Flink, formerly Kinesis Data Analytics for Apache Flink, lets you run full Flink applications on AWS without managing Flink clusters. You get stateful processing, exactly-once semantics, event time handling, and all the power of the Flink API with none of the operational burden.

This post walks through building Flink applications in both Java and Python, deploying them to Managed Service for Apache Flink, and handling the tricky parts like state management and watermarks.

## When to Use Flink Over SQL

Amazon Managed Service for Apache Flink supports Flink applications written in Java, Python, Scala, and SQL. Here's when to reach for the Flink APIs:

- Complex event processing with multiple stateful stages
- Custom windowing logic beyond tumbling and sliding
- Integration with external systems (databases, APIs) during processing
- Machine learning inference on streaming data
- Processing that requires exactly-once semantics
- Applications that need checkpointing and application snapshots

## Setting Up a Java Flink Application

Let's start with a Maven project. Here are the essential dependencies.

This pom.xml includes the required dependencies for a Flink application on Managed Service for Apache Flink.

```xml
<properties>
    <flink.version>1.18.1</flink.version>
    <kinesis.connector.version>4.3.0-1.18</kinesis.connector.version>
    <kda.version>1.2.0</kda.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-streaming-java</artifactId>
        <version>${flink.version}</version>
        <scope>provided</scope>
    </dependency>
    <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-connector-kinesis</artifactId>
        <version>${kinesis.connector.version}</version>
    </dependency>
    <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-connector-aws-kinesis-streams</artifactId>
        <version>${kinesis.connector.version}</version>
    </dependency>
    <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-json</artifactId>
        <version>${flink.version}</version>
    </dependency>
    <dependency>
        <groupId>com.amazonaws</groupId>
        <artifactId>aws-kinesisanalytics-runtime</artifactId>
        <version>${kda.version}</version>
    </dependency>
</dependencies>
```

## Building a Streaming Pipeline in Java

Here's a complete Flink application that reads from Kinesis, processes events in 1-minute windows, detects patterns, and writes results back to another Kinesis stream.

This Flink application computes real-time user engagement metrics from a Kinesis stream.

```java
import org.apache.flink.api.common.eventtime.*;
import org.apache.flink.api.common.functions.AggregateFunction;
import org.apache.flink.api.common.serialization.*;
import org.apache.flink.api.java.tuple.Tuple3;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.connector.aws.config.AWSConfigConstants;
import org.apache.flink.connector.kinesis.sink.KinesisStreamsSink;
import org.apache.flink.connector.kinesis.source.KinesisStreamsSource;
import org.apache.flink.connector.kinesis.source.config.KinesisSourceConfigOptions;
import org.apache.flink.streaming.api.datastream.*;
import org.apache.flink.streaming.api.environment.*;
import org.apache.flink.streaming.api.windowing.assigners.*;
import org.apache.flink.streaming.api.windowing.time.Time;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.Properties;

public class EngagementMetrics {

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Enable checkpointing every 60 seconds
        env.enableCheckpointing(60000);
        env.getCheckpointConfig().setMinPauseBetweenCheckpoints(30000);

        // Configure Kinesis source
        Configuration sourceConfig = new Configuration();
        sourceConfig.set(
            KinesisSourceConfigOptions.STREAM_INITIAL_POSITION,
            KinesisSourceConfigOptions.InitialPosition.LATEST
        );

        KinesisStreamsSource<String> source = KinesisStreamsSource.<String>builder()
            .setStreamArn("arn:aws:kinesis:us-east-1:123456789012:stream/user-events")
            .setSourceConfig(sourceConfig)
            .setDeserializationSchema(new SimpleStringSchema())
            .build();

        DataStream<String> input = env.fromSource(
            source,
            WatermarkStrategy.<String>forBoundedOutOfOrderness(Duration.ofSeconds(10))
                .withTimestampAssigner((event, timestamp) -> extractTimestamp(event)),
            "Kinesis Source"
        );

        // Parse JSON and compute windowed aggregates
        DataStream<String> metrics = input
            .map(EngagementMetrics::parseEvent)
            .filter(event -> event != null)
            .keyBy(event -> event.f0)  // Key by userId
            .window(TumblingEventTimeWindows.of(Time.minutes(1)))
            .aggregate(new EngagementAggregator())
            .map(result -> new ObjectMapper().writeValueAsString(result));

        // Configure Kinesis sink
        Properties sinkProperties = new Properties();
        sinkProperties.put(AWSConfigConstants.AWS_REGION, "us-east-1");

        KinesisStreamsSink<String> sink = KinesisStreamsSink.<String>builder()
            .setKinesisClientProperties(sinkProperties)
            .setStreamName("engagement-metrics")
            .setSerializationSchema(new SimpleStringSchema())
            .setPartitionKeyGenerator(element -> String.valueOf(element.hashCode()))
            .build();

        metrics.sinkTo(sink);

        env.execute("Engagement Metrics");
    }

    private static long extractTimestamp(String json) {
        try {
            JsonNode node = new ObjectMapper().readTree(json);
            return node.get("timestamp").asLong();
        } catch (Exception e) {
            return System.currentTimeMillis();
        }
    }

    private static Tuple3<String, String, Double> parseEvent(String json) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(json);
            return Tuple3.of(
                node.get("userId").asText(),
                node.get("eventType").asText(),
                node.has("amount") ? node.get("amount").asDouble() : 0.0
            );
        } catch (Exception e) {
            return null;
        }
    }

}
```

## The Aggregation Function

This custom aggregator computes engagement metrics per user over the window.

```java
public class EngagementAggregator implements
    AggregateFunction<Tuple3<String, String, Double>, EngagementAccumulator, EngagementResult> {

    @Override
    public EngagementAccumulator createAccumulator() {
        return new EngagementAccumulator();
    }

    @Override
    public EngagementAccumulator add(Tuple3<String, String, Double> event, EngagementAccumulator acc) {
        acc.userId = event.f0;
        acc.eventCount++;
        acc.totalAmount += event.f2;

        switch (event.f1) {
            case "page_view": acc.pageViews++; break;
            case "click": acc.clicks++; break;
            case "purchase": acc.purchases++; break;
        }
        return acc;
    }

    @Override
    public EngagementResult getResult(EngagementAccumulator acc) {
        return new EngagementResult(
            acc.userId,
            acc.eventCount,
            acc.pageViews,
            acc.clicks,
            acc.purchases,
            acc.totalAmount,
            System.currentTimeMillis()
        );
    }

    @Override
    public EngagementAccumulator merge(EngagementAccumulator a, EngagementAccumulator b) {
        a.eventCount += b.eventCount;
        a.pageViews += b.pageViews;
        a.clicks += b.clicks;
        a.purchases += b.purchases;
        a.totalAmount += b.totalAmount;
        return a;
    }
}

class EngagementAccumulator {
    public String userId;
    public long eventCount;
    public long pageViews;
    public long clicks;
    public long purchases;
    public double totalAmount;
}

class EngagementResult {
    public String userId;
    public long eventCount;
    public long pageViews;
    public long clicks;
    public long purchases;
    public double totalAmount;
    public long emittedAt;

    public EngagementResult(
            String userId,
            long eventCount,
            long pageViews,
            long clicks,
            long purchases,
            double totalAmount,
            long emittedAt) {
        this.userId = userId;
        this.eventCount = eventCount;
        this.pageViews = pageViews;
        this.clicks = clicks;
        this.purchases = purchases;
        this.totalAmount = totalAmount;
        this.emittedAt = emittedAt;
    }
}
```

## PyFlink Application

You can also write Flink applications in Python using PyFlink. Here's an equivalent application.

This PyFlink script computes real-time metrics from a Kinesis stream using the Table API.

```python
from pyflink.table import EnvironmentSettings, TableEnvironment

# Set up the environment

env_settings = EnvironmentSettings.in_streaming_mode()
t_env = TableEnvironment.create(env_settings)

# Configure checkpointing
t_env.get_config().set("execution.checkpointing.interval", "60000")
t_env.get_config().set("execution.checkpointing.min-pause", "30000")

# Define the Kinesis source table
t_env.execute_sql("""
    CREATE TABLE user_events (
        userId STRING,
        eventType STRING,
        page STRING,
        amount DOUBLE,
        `timestamp` BIGINT,
        event_time AS TO_TIMESTAMP_LTZ(`timestamp`, 3),
        WATERMARK FOR event_time AS event_time - INTERVAL '10' SECOND
    ) WITH (
        'connector' = 'kinesis',
        'stream' = 'user-events',
        'aws.region' = 'us-east-1',
        'scan.stream.initpos' = 'LATEST',
        'format' = 'json'
    )
""")

# Define the output table
t_env.execute_sql("""
    CREATE TABLE engagement_metrics (
        event_type STRING,
        window_start TIMESTAMP_LTZ(3),
        window_end TIMESTAMP_LTZ(3),
        event_count BIGINT,
        unique_users BIGINT,
        total_amount DOUBLE
    ) WITH (
        'connector' = 'kinesis',
        'stream' = 'engagement-metrics',
        'aws.region' = 'us-east-1',
        'format' = 'json'
    )
""")

# Run the streaming query
t_env.execute_sql("""
    INSERT INTO engagement_metrics
    SELECT
        eventType AS event_type,
        window_start,
        window_end,
        COUNT(*) AS event_count,
        COUNT(DISTINCT userId) AS unique_users,
        SUM(amount) AS total_amount
    FROM TABLE(
        TUMBLE(TABLE user_events, DESCRIPTOR(event_time), INTERVAL '1' MINUTE)
    )
    GROUP BY
        eventType,
        window_start,
        window_end
""")
```

## Deploying to Managed Service for Apache Flink

Package your application and upload it to S3, then create the Managed Service for Apache Flink application.

```bash
# Build the JAR (for Java)
mvn clean package -DskipTests

# Upload to S3
aws s3 cp target/engagement-metrics-1.0.jar s3://my-flink-apps/

# Create the KDA application
aws kinesisanalyticsv2 create-application \
  --application-name engagement-metrics \
  --runtime-environment FLINK-1_18 \
  --service-execution-role arn:aws:iam::123456789012:role/KDAFlinkRole \
  --application-configuration '{
    "FlinkApplicationConfiguration": {
      "CheckpointConfiguration": {
        "ConfigurationType": "CUSTOM",
        "CheckpointingEnabled": true,
        "CheckpointInterval": 60000,
        "MinPauseBetweenCheckpoints": 30000
      },
      "ParallelismConfiguration": {
        "ConfigurationType": "CUSTOM",
        "Parallelism": 4,
        "ParallelismPerKPU": 1,
        "AutoScalingEnabled": true
      }
    },
    "ApplicationCodeConfiguration": {
      "CodeContent": {
        "S3ContentLocation": {
          "BucketARN": "arn:aws:s3:::my-flink-apps",
          "FileKey": "engagement-metrics-1.0.jar"
        }
      },
      "CodeContentType": "ZIPFILE"
    }
  }'
```

Start the application.

```bash
aws kinesisanalyticsv2 start-application \
  --application-name engagement-metrics \
  --run-configuration '{
    "FlinkRunConfiguration": {
      "AllowNonRestoredState": true
    }
  }'
```

## State Management and Snapshots

One of Flink's biggest advantages is stateful processing with exactly-once semantics. Managed Service for Apache Flink handles state management through checkpoints stored in S3.

To create an application snapshot (for upgrades or debugging):

```bash
aws kinesisanalyticsv2 create-application-snapshot \
  --application-name engagement-metrics \
  --snapshot-name pre-upgrade-snapshot
```

Restore from an application snapshot when starting.

```bash
aws kinesisanalyticsv2 start-application \
  --application-name engagement-metrics \
  --run-configuration '{
    "FlinkRunConfiguration": {
      "AllowNonRestoredState": false
    },
    "ApplicationRestoreConfiguration": {
      "ApplicationRestoreType": "RESTORE_FROM_CUSTOM_SNAPSHOT",
      "SnapshotName": "pre-upgrade-snapshot"
    }
  }'
```

## Scaling and Performance

Managed Service for Apache Flink scales using Kinesis Processing Units (KPUs). Each KPU provides 1 vCPU and 4 GB of memory.

The parallelism setting controls how many parallel instances of your operators run. Match it to your shard count for optimal throughput.

```bash
# Update parallelism
aws kinesisanalyticsv2 update-application \
  --application-name engagement-metrics \
  --current-application-version-id 1 \
  --application-configuration-update '{
    "FlinkApplicationConfigurationUpdate": {
      "ParallelismConfigurationUpdate": {
        "ConfigurationTypeUpdate": "CUSTOM",
        "ParallelismUpdate": 8,
        "AutoScalingEnabledUpdate": true
      }
    }
  }'
```

## Monitoring

Check your Flink application health with CloudWatch metrics.

- **numRecordsInPerSecond** - Input throughput
- **numRecordsOutPerSecond** - Output throughput
- **lastCheckpointDuration** - How long checkpoints take
- **lastCheckpointSize** - State size
- **currentInputWatermark** - How far behind event time is

Flink on Managed Service for Apache Flink gives you serious stream processing power without the Flink cluster management headache. It's the right choice when your streaming logic outgrows SQL - stateful processing, complex event patterns, and exactly-once guarantees are all table stakes with Flink.
