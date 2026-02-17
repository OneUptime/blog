# How to Process Real-Time IoT Sensor Data with Google Cloud Dataflow Streaming Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, IoT, Streaming, Apache Beam

Description: Process IoT sensor data in real time using Google Cloud Dataflow streaming pipelines with windowing, aggregation, and alerting.

---

When you have thousands of sensors sending data every few seconds, you need a processing layer that can handle the volume, apply transformations in real time, and route the results to the right destinations. Google Cloud Dataflow, built on Apache Beam, is designed for exactly this kind of work.

In this guide, I will show you how to build a Dataflow streaming pipeline that reads IoT sensor data from Pub/Sub, applies windowed aggregations, detects anomalies, and writes results to both BigQuery and Cloud Storage.

## Why Dataflow for IoT Streaming

Dataflow is a managed Apache Beam runner. You write your pipeline logic using the Beam SDK, and Dataflow handles the infrastructure - scaling workers up and down based on data volume, managing checkpoints, and handling failures.

For IoT workloads, the key features are:

- Autoscaling based on message backlog
- Built-in windowing for time-based aggregations
- Exactly-once processing semantics
- Native Pub/Sub and BigQuery connectors

## Prerequisites

- GCP project with Dataflow, Pub/Sub, BigQuery, and Cloud Storage APIs enabled
- Python 3.8+ with Apache Beam SDK installed
- A Pub/Sub topic receiving IoT sensor data
- A GCS bucket for Dataflow staging files

Install the required packages:

```bash
# Install Apache Beam with GCP extras for Dataflow support
pip install apache-beam[gcp]==2.53.0
```

## Step 1: Define the Data Schema

First, define what your sensor data looks like and where it goes:

```python
# schema.py - Defines the BigQuery table schemas for our pipeline outputs

# Schema for raw sensor readings
RAW_SCHEMA = {
    "fields": [
        {"name": "device_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "sensor_type", "type": "STRING", "mode": "REQUIRED"},
        {"name": "value", "type": "FLOAT", "mode": "REQUIRED"},
        {"name": "unit", "type": "STRING", "mode": "NULLABLE"},
        {"name": "timestamp", "type": "TIMESTAMP", "mode": "REQUIRED"},
        {"name": "ingested_at", "type": "TIMESTAMP", "mode": "REQUIRED"},
    ]
}

# Schema for windowed aggregations (1-minute averages)
AGGREGATED_SCHEMA = {
    "fields": [
        {"name": "device_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "sensor_type", "type": "STRING", "mode": "REQUIRED"},
        {"name": "avg_value", "type": "FLOAT", "mode": "REQUIRED"},
        {"name": "min_value", "type": "FLOAT", "mode": "REQUIRED"},
        {"name": "max_value", "type": "FLOAT", "mode": "REQUIRED"},
        {"name": "reading_count", "type": "INTEGER", "mode": "REQUIRED"},
        {"name": "window_start", "type": "TIMESTAMP", "mode": "REQUIRED"},
        {"name": "window_end", "type": "TIMESTAMP", "mode": "REQUIRED"},
    ]
}
```

## Step 2: Build the Streaming Pipeline

Here is the complete pipeline that handles parsing, windowing, aggregation, and writing:

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions, StandardOptions
from apache_beam.transforms.window import FixedWindows, SlidingWindows
from apache_beam.transforms.trigger import AfterWatermark, AfterProcessingTime, AccumulationMode
import json
from datetime import datetime

class ParseSensorMessage(beam.DoFn):
    """Parses raw Pub/Sub messages into structured sensor readings.
    Bad messages are routed to a dead-letter output for debugging."""

    # Define tagged outputs for routing good and bad messages
    VALID_OUTPUT = "valid"
    DEAD_LETTER = "dead_letter"

    def process(self, element):
        try:
            data = json.loads(element.decode("utf-8"))

            # Validate required fields exist
            required = ["device_id", "sensor_type", "value", "timestamp"]
            for field in required:
                if field not in data:
                    raise ValueError(f"Missing required field: {field}")

            yield beam.pvalue.TaggedOutput(self.VALID_OUTPUT, {
                "device_id": data["device_id"],
                "sensor_type": data["sensor_type"],
                "value": float(data["value"]),
                "unit": data.get("unit", ""),
                "timestamp": datetime.utcfromtimestamp(
                    data["timestamp"] / 1000
                ).isoformat(),
                "ingested_at": datetime.utcnow().isoformat(),
            })
        except Exception as e:
            # Route bad messages to the dead letter output
            yield beam.pvalue.TaggedOutput(self.DEAD_LETTER, {
                "raw_message": str(element),
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            })


class ComputeAggregations(beam.DoFn):
    """Computes min, max, average, and count for a window of sensor readings.
    Input is a tuple of (key, list_of_values) after GroupByKey."""

    def process(self, element, window=beam.DoFn.WindowParam):
        key, values = element
        device_id, sensor_type = key.split("|")
        values_list = list(values)

        if not values_list:
            return

        yield {
            "device_id": device_id,
            "sensor_type": sensor_type,
            "avg_value": sum(values_list) / len(values_list),
            "min_value": min(values_list),
            "max_value": max(values_list),
            "reading_count": len(values_list),
            "window_start": window.start.to_utc_datetime().isoformat(),
            "window_end": window.end.to_utc_datetime().isoformat(),
        }


class DetectAnomalies(beam.DoFn):
    """Simple threshold-based anomaly detection.
    Checks if sensor values fall outside expected ranges."""

    # Define thresholds per sensor type
    THRESHOLDS = {
        "temperature": {"min": -20.0, "max": 60.0},
        "humidity": {"min": 0.0, "max": 100.0},
        "pressure": {"min": 900.0, "max": 1100.0},
    }

    def process(self, element):
        sensor_type = element["sensor_type"]
        value = element["value"]

        if sensor_type in self.THRESHOLDS:
            limits = self.THRESHOLDS[sensor_type]
            if value < limits["min"] or value > limits["max"]:
                yield {
                    "device_id": element["device_id"],
                    "sensor_type": sensor_type,
                    "value": value,
                    "threshold_min": limits["min"],
                    "threshold_max": limits["max"],
                    "timestamp": element["timestamp"],
                    "alert_type": "out_of_range",
                }


def run():
    """Builds and runs the streaming Dataflow pipeline."""
    options = PipelineOptions([
        "--project=your-project",
        "--region=us-central1",
        "--temp_location=gs://your-bucket/temp",
        "--staging_location=gs://your-bucket/staging",
    ])
    options.view_as(StandardOptions).streaming = True

    with beam.Pipeline(options=options) as p:
        # Read raw messages from Pub/Sub
        raw_messages = (
            p | "ReadPubSub" >> beam.io.ReadFromPubSub(
                subscription="projects/your-project/subscriptions/sensor-data-sub"
            )
        )

        # Parse messages and split into valid and dead-letter streams
        parsed = (
            raw_messages
            | "ParseMessages" >> beam.ParDo(ParseSensorMessage())
                .with_outputs(
                    ParseSensorMessage.DEAD_LETTER,
                    main=ParseSensorMessage.VALID_OUTPUT
                )
        )

        valid_readings = parsed[ParseSensorMessage.VALID_OUTPUT]
        dead_letters = parsed[ParseSensorMessage.DEAD_LETTER]

        # Write raw valid readings to BigQuery
        valid_readings | "WriteRawToBQ" >> beam.io.WriteToBigQuery(
            table="your-project:iot_data.raw_readings",
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
            create_disposition=beam.io.BigQueryDisposition.CREATE_NEVER,
        )

        # Apply 1-minute fixed windows for aggregation
        windowed = (
            valid_readings
            | "ExtractKV" >> beam.Map(
                lambda x: (f"{x['device_id']}|{x['sensor_type']}", x["value"])
            )
            | "Window" >> beam.WindowInto(
                FixedWindows(60),  # 60-second windows
                trigger=AfterWatermark(
                    early=AfterProcessingTime(30)  # Emit early results every 30s
                ),
                accumulation_mode=AccumulationMode.DISCARDING,
            )
            | "GroupByKey" >> beam.GroupByKey()
            | "Aggregate" >> beam.ParDo(ComputeAggregations())
        )

        # Write aggregations to BigQuery
        windowed | "WriteAggToBQ" >> beam.io.WriteToBigQuery(
            table="your-project:iot_data.sensor_aggregations",
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
            create_disposition=beam.io.BigQueryDisposition.CREATE_NEVER,
        )

        # Detect anomalies from raw readings
        anomalies = (
            valid_readings
            | "DetectAnomalies" >> beam.ParDo(DetectAnomalies())
        )

        # Publish anomalies to a Pub/Sub topic for alerting
        (
            anomalies
            | "FormatAlerts" >> beam.Map(lambda x: json.dumps(x).encode("utf-8"))
            | "PublishAlerts" >> beam.io.WriteToPubSub(
                topic="projects/your-project/topics/sensor-alerts"
            )
        )

if __name__ == "__main__":
    run()
```

## Step 3: Deploy the Pipeline

Submit the job to Dataflow:

```bash
# Deploy the streaming pipeline to Dataflow
# The max-num-workers flag caps autoscaling to control costs
python pipeline.py \
  --runner=DataflowRunner \
  --streaming \
  --max_num_workers=10 \
  --autoscaling_algorithm=THROUGHPUT_BASED \
  --experiments=enable_streaming_engine
```

The `enable_streaming_engine` experiment offloads shuffle operations to the Dataflow service instead of running them on worker VMs, which reduces costs and improves performance.

## Step 4: Monitor the Pipeline

In the GCP Console, navigate to Dataflow and click on your job. The pipeline graph shows each transform step with throughput metrics. Key metrics to watch:

- **System Lag**: How far behind the pipeline is from real time
- **Data Watermark**: The oldest unprocessed event timestamp
- **Elements Added/Second**: Throughput at each step
- **Worker CPU/Memory**: Resource utilization

Set up alerts on system lag to catch processing delays:

```bash
# Create an alert policy for high pipeline lag (over 5 minutes)
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Dataflow Pipeline Lag Alert" \
  --condition-display-name="System lag over 5 minutes" \
  --condition-filter='resource.type="dataflow_job" AND metric.type="dataflow.googleapis.com/job/system_lag"' \
  --condition-threshold-value=300 \
  --condition-threshold-comparison=COMPARISON_GT
```

## Windowing Strategies

The pipeline above uses fixed 60-second windows, but depending on your use case, you might want different strategies:

- **Fixed Windows**: Equal-sized, non-overlapping time intervals. Good for regular reporting.
- **Sliding Windows**: Overlapping windows that update more frequently. Good for moving averages.
- **Session Windows**: Windows based on activity gaps. Good for tracking device sessions.

## Wrapping Up

Dataflow streaming pipelines give you a declarative way to process IoT sensor data at any scale. The combination of Pub/Sub for ingestion, Beam windowing for time-based aggregations, and BigQuery for storage means you can build a complete real-time analytics system without managing any infrastructure. The autoscaling takes care of traffic spikes, and the exactly-once processing guarantees mean you do not lose data or double-count readings.
