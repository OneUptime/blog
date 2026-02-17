# How to Implement Anomaly Detection in Time-Series Data with Vertex AI and BigQuery ML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, BigQuery ML, Anomaly Detection, Time Series

Description: Implement anomaly detection for time-series data using BigQuery ML for SQL-based models and Vertex AI for custom deep learning approaches on Google Cloud Platform.

---

Detecting anomalies in time-series data is one of those problems that sounds simple until you try to do it well. Is that spike in response times an anomaly or just peak traffic? Is that dip in sales a system bug or a holiday? The challenge is building a system that catches real anomalies while not drowning you in false positives.

GCP gives you two complementary tools for this: BigQuery ML, where you can train anomaly detection models using SQL, and Vertex AI, where you can build custom models for more complex patterns. I'll cover both approaches and when to use each one.

## BigQuery ML Approach: Quick and SQL-Native

BigQuery ML is the fastest path to anomaly detection if your data is already in BigQuery. You can train models without writing any Python or managing infrastructure.

### Preparing the Data

Start with a clean time-series table:

```sql
-- Create a clean time-series view from raw metrics
CREATE OR REPLACE VIEW `your-project.monitoring.clean_metrics` AS
SELECT
    TIMESTAMP_TRUNC(timestamp, MINUTE) AS minute_timestamp,
    metric_name,
    AVG(value) AS avg_value,
    STDDEV(value) AS stddev_value,
    COUNT(*) AS sample_count,
    MIN(value) AS min_value,
    MAX(value) AS max_value
FROM `your-project.monitoring.raw_metrics`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
GROUP BY 1, 2
ORDER BY 1
```

### Training an ARIMA Model

BigQuery ML's ARIMA_PLUS model handles time-series anomaly detection natively:

```sql
-- Train an ARIMA model for anomaly detection on API response times
CREATE OR REPLACE MODEL `your-project.monitoring.response_time_model`
OPTIONS(
    model_type = 'ARIMA_PLUS',
    time_series_timestamp_col = 'minute_timestamp',
    time_series_data_col = 'avg_value',
    time_series_id_col = 'metric_name',
    -- Auto-detect seasonality (hourly, daily, weekly patterns)
    auto_arima = TRUE,
    -- Decompose the series to handle trend and seasonality
    decompose_time_series = TRUE,
    -- Set the holiday region for calendar effects
    holiday_region = 'US',
    -- Confidence level for anomaly bounds
    confidence_level = 0.95
) AS
SELECT
    minute_timestamp,
    metric_name,
    avg_value
FROM `your-project.monitoring.clean_metrics`
WHERE metric_name = 'api_response_time_ms'
```

### Detecting Anomalies

```sql
-- Detect anomalies in the most recent data
SELECT
    *,
    -- Flag points outside the prediction interval as anomalies
    CASE
        WHEN actual_value > upper_bound THEN 'HIGH_ANOMALY'
        WHEN actual_value < lower_bound THEN 'LOW_ANOMALY'
        ELSE 'NORMAL'
    END AS anomaly_status,
    -- Calculate how far outside the bounds the anomaly is
    CASE
        WHEN actual_value > upper_bound
            THEN ROUND((actual_value - upper_bound) / (upper_bound - predicted_value), 2)
        WHEN actual_value < lower_bound
            THEN ROUND((lower_bound - actual_value) / (predicted_value - lower_bound), 2)
        ELSE 0
    END AS anomaly_severity
FROM (
    SELECT
        minute_timestamp,
        metric_name,
        avg_value AS actual_value,
        forecast_value AS predicted_value,
        prediction_interval_lower_bound AS lower_bound,
        prediction_interval_upper_bound AS upper_bound
    FROM ML.DETECT_ANOMALIES(
        MODEL `your-project.monitoring.response_time_model`,
        STRUCT(0.95 AS anomaly_prob_threshold),
        (
            SELECT minute_timestamp, metric_name, avg_value
            FROM `your-project.monitoring.clean_metrics`
            WHERE minute_timestamp > TIMESTAMP_SUB(
                CURRENT_TIMESTAMP(), INTERVAL 24 HOUR
            )
        )
    )
)
WHERE anomaly_status != 'NORMAL'
ORDER BY minute_timestamp DESC
```

### Multi-Metric Anomaly Detection

For detecting anomalies across multiple metrics simultaneously:

```sql
-- Train separate models for each metric, then combine results
CREATE OR REPLACE MODEL `your-project.monitoring.multi_metric_model`
OPTIONS(
    model_type = 'ARIMA_PLUS',
    time_series_timestamp_col = 'minute_timestamp',
    time_series_data_col = 'avg_value',
    time_series_id_col = 'metric_name',
    auto_arima = TRUE,
    decompose_time_series = TRUE,
    confidence_level = 0.99
) AS
SELECT
    minute_timestamp,
    metric_name,
    avg_value
FROM `your-project.monitoring.clean_metrics`
WHERE metric_name IN (
    'api_response_time_ms',
    'error_rate',
    'request_count',
    'cpu_utilization',
    'memory_usage_pct'
)
```

## Vertex AI Approach: Custom Deep Learning

For more complex anomaly patterns, build a custom model on Vertex AI:

```python
import vertexai
from google.cloud import bigquery
from google.cloud import aiplatform
import numpy as np
import pandas as pd
from tensorflow import keras

def build_autoencoder_model(sequence_length, num_features):
    """Build an LSTM autoencoder for multivariate anomaly detection"""

    # The autoencoder learns to reconstruct normal patterns
    # Anomalies produce high reconstruction error
    model = keras.Sequential([
        # Encoder: compress the input sequence
        keras.layers.LSTM(
            64, input_shape=(sequence_length, num_features),
            return_sequences=True
        ),
        keras.layers.LSTM(32, return_sequences=False),

        # Bottleneck: compressed representation
        keras.layers.RepeatVector(sequence_length),

        # Decoder: reconstruct the input
        keras.layers.LSTM(32, return_sequences=True),
        keras.layers.LSTM(64, return_sequences=True),
        keras.layers.TimeDistributed(keras.layers.Dense(num_features)),
    ])

    model.compile(optimizer='adam', loss='mse')
    return model

def prepare_training_data(project_id, metric_names, lookback_days=60):
    """Fetch and prepare training data from BigQuery"""
    bq_client = bigquery.Client(project=project_id)

    # Fetch clean historical data (known normal periods)
    metrics_str = ", ".join([f"'{m}'" for m in metric_names])
    query = f"""
        SELECT
            minute_timestamp,
            metric_name,
            avg_value
        FROM `{project_id}.monitoring.clean_metrics`
        WHERE metric_name IN ({metrics_str})
          AND minute_timestamp > TIMESTAMP_SUB(
              CURRENT_TIMESTAMP(), INTERVAL {lookback_days} DAY
          )
        ORDER BY minute_timestamp
    """

    df = bq_client.query(query).to_dataframe()

    # Pivot so each metric is a column
    pivoted = df.pivot_table(
        index='minute_timestamp',
        columns='metric_name',
        values='avg_value'
    ).fillna(method='ffill')

    # Normalize the data
    mean = pivoted.mean()
    std = pivoted.std()
    normalized = (pivoted - mean) / std

    # Create sliding window sequences
    sequence_length = 60  # 60 minutes of context
    sequences = []
    for i in range(len(normalized) - sequence_length):
        seq = normalized.iloc[i:i + sequence_length].values
        sequences.append(seq)

    return np.array(sequences), mean, std

def train_and_deploy(project_id):
    """Train the anomaly detection model and deploy to Vertex AI"""
    metric_names = [
        'api_response_time_ms',
        'error_rate',
        'request_count',
    ]

    # Prepare the data
    sequences, mean, std = prepare_training_data(project_id, metric_names)

    # Build and train the model
    model = build_autoencoder_model(
        sequence_length=60,
        num_features=len(metric_names)
    )

    # Train on normal data only
    model.fit(
        sequences, sequences,  # Autoencoder: input = target
        epochs=50,
        batch_size=32,
        validation_split=0.1,
        callbacks=[
            keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)
        ],
    )

    # Calculate the anomaly threshold from training reconstruction errors
    reconstructions = model.predict(sequences)
    mse = np.mean(np.power(sequences - reconstructions, 2), axis=(1, 2))
    threshold = np.percentile(mse, 99)  # 99th percentile

    print(f"Anomaly threshold: {threshold}")

    # Save and deploy to Vertex AI
    model.save("/tmp/anomaly_model")

    aiplatform.init(project=project_id, location="us-central1")
    vertex_model = aiplatform.Model.upload(
        display_name="time-series-anomaly-detector",
        artifact_uri="/tmp/anomaly_model",
        serving_container_image_uri="us-docker.pkg.dev/vertex-ai/prediction/tf2-cpu.2-12:latest",
    )

    endpoint = vertex_model.deploy(
        machine_type="n1-standard-2",
        min_replica_count=1,
        max_replica_count=3,
    )

    return endpoint, threshold
```

## Real-Time Detection Pipeline

Set up a streaming pipeline that detects anomalies as data arrives:

```python
from google.cloud import pubsub_v1
import json

def detect_anomalies_realtime(event, context):
    """Cloud Function triggered by new metric data"""
    message = json.loads(
        event["data"].decode("utf-8") if isinstance(event["data"], bytes)
        else event["data"]
    )

    metric_name = message["metric_name"]
    value = message["value"]
    timestamp = message["timestamp"]

    # Get recent history for context
    recent_data = get_recent_metrics(metric_name, minutes=60)

    # Run BigQuery ML detection for quick check
    bq_anomaly = check_with_bqml(metric_name, value, timestamp)

    # If BigQuery flags it, also check with the Vertex AI model
    if bq_anomaly["is_anomaly"]:
        vertex_anomaly = check_with_vertex(recent_data, value)

        # Both models agree - high confidence anomaly
        if vertex_anomaly["is_anomaly"]:
            alert = {
                "metric": metric_name,
                "value": value,
                "expected_range": bq_anomaly["expected_range"],
                "severity": max(
                    bq_anomaly["severity"],
                    vertex_anomaly["severity"]
                ),
                "confidence": "high",
                "timestamp": timestamp,
            }
            publish_alert(alert)
```

## Alerting on Detected Anomalies

```python
def publish_alert(alert):
    """Publish anomaly alerts to the appropriate channels"""
    publisher = pubsub_v1.PublisherClient()
    topic = publisher.topic_path("your-project", "anomaly-alerts")

    # Publish to Pub/Sub for downstream processing
    publisher.publish(
        topic,
        json.dumps(alert).encode("utf-8"),
        severity=alert["severity"],
        metric=alert["metric"],
    )

    # For high severity, also trigger immediate notification
    if alert["severity"] == "critical":
        send_pagerduty_alert(alert)
```

## Wrapping Up

BigQuery ML gets you 80% of the way there with minimal effort - train an ARIMA model in SQL, detect anomalies with a single query, and you're done. For the remaining 20% - complex multivariate patterns, subtle correlations between metrics, or patterns that ARIMA can't capture - a custom autoencoder on Vertex AI fills the gap. In practice, running both in parallel gives you the best coverage: BigQuery ML catches obvious anomalies fast, and the Vertex AI model catches the subtle ones. Start with BigQuery ML, measure how well it catches the anomalies you care about, and add the custom model only if you need it.
