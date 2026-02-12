# How to Set Up Amazon Managed Service for Apache Flink

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Apache Flink, Streaming, Data Processing

Description: A step-by-step guide to setting up Amazon Managed Service for Apache Flink for real-time stream processing with Kinesis and other AWS data sources.

---

Apache Flink is one of the best frameworks for real-time stream processing, but running it yourself means managing clusters, handling checkpoints, dealing with upgrades, and figuring out scaling. Amazon Managed Service for Apache Flink (formerly Kinesis Data Analytics) runs Flink for you. You provide the application code, connect it to your data sources and sinks, and AWS handles the infrastructure.

If you're already using Kinesis Data Streams or MSK (Managed Streaming for Apache Kafka), Flink is the natural choice for processing those streams with complex transformations, windowing, and stateful computations.

## Core Concepts

Before we build anything, here's the mental model:

- **Application** - Your Flink job running on managed infrastructure
- **Source** - Where data comes from (Kinesis, MSK, S3)
- **Sink** - Where processed data goes (Kinesis, S3, OpenSearch, Redshift)
- **Parallelism** - How many parallel instances of your operators run
- **Checkpoints** - Periodic snapshots of application state for fault tolerance
- **Savepoints** - Manual snapshots for upgrades and maintenance

## Creating a Flink Application

First, you need to package your Flink code as a JAR file (for Java/Scala) or a zip file (for Python) and upload it to S3.

Here's a simple Flink application in Java that reads from Kinesis, processes the data, and writes to another Kinesis stream:

```java
// Flink application that reads orders, enriches them, and outputs results
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.connectors.kinesis.FlinkKinesisConsumer;
import org.apache.flink.streaming.connectors.kinesis.FlinkKinesisProducer;
import org.apache.flink.streaming.api.windowing.time.Time;

import java.util.Properties;

public class OrderProcessor {
    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Configure Kinesis consumer properties
        Properties consumerConfig = new Properties();
        consumerConfig.setProperty("aws.region", "us-east-1");
        consumerConfig.setProperty("flink.stream.initpos", "LATEST");
        consumerConfig.setProperty("flink.stream.recordpublisher", "EFO");
        consumerConfig.setProperty("flink.stream.efo.consumername", "flink-processor");

        // Create source from Kinesis
        FlinkKinesisConsumer<String> source = new FlinkKinesisConsumer<>(
                "orders-stream",
                new SimpleStringSchema(),
                consumerConfig
        );

        DataStream<String> orderStream = env.addSource(source);

        // Process: parse, validate, enrich, aggregate
        DataStream<OrderSummary> processedStream = orderStream
                .map(json -> parseOrder(json))
                .filter(order -> order.getAmount() > 0)
                .keyBy(order -> order.getRegion())
                .window(TumblingProcessingTimeWindows.of(Time.minutes(1)))
                .aggregate(new OrderAggregator());

        // Configure Kinesis producer properties
        Properties producerConfig = new Properties();
        producerConfig.setProperty("aws.region", "us-east-1");
        producerConfig.setProperty("AggregationEnabled", "false");

        FlinkKinesisProducer<String> sink = new FlinkKinesisProducer<>(
                new SimpleStringSchema(),
                producerConfig
        );
        sink.setDefaultStream("order-summaries-stream");
        sink.setDefaultPartition("0");

        processedStream
                .map(summary -> summary.toJson())
                .addSink(sink);

        env.execute("Order Processing Pipeline");
    }
}
```

Upload the compiled JAR to S3:

```bash
# Upload the Flink application JAR to S3
aws s3 cp target/order-processor-1.0.jar s3://my-flink-apps/order-processor-1.0.jar
```

## Creating the Managed Flink Application

Now create the application using the AWS CLI:

```bash
# Create a managed Apache Flink application
aws kinesisanalyticsv2 create-application \
    --application-name "order-processor" \
    --runtime-environment "FLINK-1_18" \
    --service-execution-role "arn:aws:iam::123456789012:role/FlinkApplicationRole" \
    --application-configuration '{
        "ApplicationCodeConfiguration": {
            "CodeContent": {
                "S3ContentLocation": {
                    "BucketARN": "arn:aws:s3:::my-flink-apps",
                    "FileKey": "order-processor-1.0.jar"
                }
            },
            "CodeContentType": "ZIPFILE"
        },
        "FlinkApplicationConfiguration": {
            "CheckpointConfiguration": {
                "ConfigurationType": "CUSTOM",
                "CheckpointingEnabled": true,
                "CheckpointInterval": 60000,
                "MinPauseBetweenCheckpoints": 30000
            },
            "MonitoringConfiguration": {
                "ConfigurationType": "CUSTOM",
                "MetricsLevel": "APPLICATION",
                "LogLevel": "INFO"
            },
            "ParallelismConfiguration": {
                "ConfigurationType": "CUSTOM",
                "Parallelism": 4,
                "ParallelismPerKPU": 1,
                "AutoScalingEnabled": true
            }
        },
        "EnvironmentProperties": {
            "PropertyGroups": [
                {
                    "PropertyGroupId": "KinesisSource",
                    "PropertyMap": {
                        "stream.name": "orders-stream",
                        "aws.region": "us-east-1"
                    }
                },
                {
                    "PropertyGroupId": "KinesisSink",
                    "PropertyMap": {
                        "stream.name": "order-summaries-stream",
                        "aws.region": "us-east-1"
                    }
                }
            ]
        }
    }'
```

## IAM Role for the Flink Application

The execution role needs permissions for your sources, sinks, and the application code in S3:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "kinesis:DescribeStream",
                "kinesis:GetShardIterator",
                "kinesis:GetRecords",
                "kinesis:ListShards",
                "kinesis:SubscribeToShard",
                "kinesis:DescribeStreamConsumer",
                "kinesis:RegisterStreamConsumer",
                "kinesis:PutRecord",
                "kinesis:PutRecords"
            ],
            "Resource": [
                "arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream",
                "arn:aws:kinesis:us-east-1:123456789012:stream/order-summaries-stream",
                "arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream/consumer/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:GetObjectVersion"
            ],
            "Resource": "arn:aws:s3:::my-flink-apps/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:PutLogEvents",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams"
            ],
            "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/kinesis-analytics/order-processor:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "cloudwatch:PutMetricData"
            ],
            "Resource": "*"
        }
    ]
}
```

## Starting the Application

Start the application and tell it where to begin reading:

```bash
# Start the Flink application
aws kinesisanalyticsv2 start-application \
    --application-name "order-processor" \
    --run-configuration '{
        "FlinkRunConfiguration": {
            "AllowNonRestoredState": false
        }
    }'
```

Check the application status:

```bash
# Check the application status
aws kinesisanalyticsv2 describe-application \
    --application-name "order-processor"
```

## Auto Scaling

One of the best features of managed Flink is auto scaling. When you enable it (which we did in the configuration above), the service automatically adjusts the parallelism based on your workload.

The scaling is based on KPUs (Kinesis Processing Units). Each KPU provides:
- 1 vCPU
- 4 GB memory
- 50 GB storage for application state

If you set parallelism to 4 and parallelism per KPU to 1, you start with 4 KPUs. With auto-scaling, this can grow up to 8x the initial parallelism.

## Updating the Application

When you need to deploy a new version:

```bash
# Upload new version of the application
aws s3 cp target/order-processor-2.0.jar s3://my-flink-apps/order-processor-2.0.jar

# Update the application to use the new code
# First, get the current version ID
CURRENT_VERSION=$(aws kinesisanalyticsv2 describe-application \
    --application-name "order-processor" \
    --query 'ApplicationDetail.ApplicationVersionId' \
    --output text)

# Update the application code
aws kinesisanalyticsv2 update-application \
    --application-name "order-processor" \
    --current-application-version-id $CURRENT_VERSION \
    --application-configuration-update '{
        "ApplicationCodeConfigurationUpdate": {
            "CodeContentUpdate": {
                "S3ContentLocationUpdate": {
                    "FileKeyUpdate": "order-processor-2.0.jar"
                }
            }
        }
    }' \
    --run-configuration-update '{
        "FlinkRunConfiguration": {
            "AllowNonRestoredState": true
        }
    }'
```

Setting `AllowNonRestoredState` to true means if your new code has different state than the old version, it won't fail on restart. This is important when you've changed your operator graph.

## Monitoring

Flink applications publish metrics to CloudWatch automatically. The key ones to watch:

- **downtime** - Time the job has been down. Should always be 0.
- **uptime** - How long the job has been running since last restart
- **numberOfFailedCheckpoints** - Checkpoint failures can lead to data reprocessing
- **lastCheckpointDuration** - If checkpoints are taking too long, you might need more resources
- **records_lag_max** - How far behind the consumer is from the latest data

```bash
# Check Flink application metrics
aws cloudwatch get-metric-statistics \
    --namespace "AWS/KinesisAnalytics" \
    --metric-name "downtime" \
    --dimensions Name=Application,Value=order-processor \
    --start-time 2026-02-11T00:00:00Z \
    --end-time 2026-02-12T00:00:00Z \
    --period 300 \
    --statistics Maximum
```

Managed Flink takes the operational burden off your team while giving you the full power of the Flink runtime. For monitoring the Kinesis streams feeding your Flink applications, see [monitoring Kinesis with CloudWatch](https://oneuptime.com/blog/post/monitor-kinesis-data-streams-cloudwatch/view).
