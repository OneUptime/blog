# How to Enable Scale-to-Zero for Vertex AI Prediction Endpoints to Reduce Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Scale to Zero, Cost Optimization, Model Serving

Description: Learn how to configure scale-to-zero for Vertex AI prediction endpoints to eliminate idle costs when your model is not receiving traffic.

---

Running a Vertex AI prediction endpoint 24/7 costs money even when nobody is sending requests. If your model serves traffic intermittently - maybe during business hours only, or in response to batch triggers - you are paying for idle compute for hours at a time. Scale-to-zero lets Vertex AI shut down all replicas when there is no traffic and bring them back up when requests arrive. This can dramatically cut costs for endpoints with irregular traffic patterns.

## What Is Scale-to-Zero

With traditional autoscaling, you set a minimum replica count of at least 1. That means there is always at least one machine running, ready to serve predictions. With scale-to-zero, you set the minimum to 0. When no requests come in for a configurable period, Vertex AI shuts down all replicas. When a new request arrives, it starts a replica to handle it.

The trade-off is latency. The first request after a scale-to-zero event will take longer because a new replica needs to start up and load the model. This cold start can range from a few seconds to a few minutes depending on your model size and machine type.

## Enabling Scale-to-Zero

To enable scale-to-zero, simply set `min_replica_count` to 0 when deploying your model:

```python
# scale_to_zero.py
# Deploy a model with scale-to-zero enabled

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

model = aiplatform.Model(
    'projects/your-project-id/locations/us-central1/models/MODEL_ID'
)

endpoint = aiplatform.Endpoint.create(
    display_name='cost-optimized-endpoint',
)

# Deploy with min_replica_count=0 for scale-to-zero
model.deploy(
    endpoint=endpoint,
    machine_type='n1-standard-4',
    # Setting this to 0 enables scale-to-zero
    min_replica_count=0,
    # Maximum replicas when under load
    max_replica_count=5,
    # CPU target for scaling decisions
    autoscaling_target_cpu_utilization=60,
    traffic_percentage=100,
    deploy_request_timeout=1200,
)

print(f"Deployed with scale-to-zero: {endpoint.resource_name}")
```

## Using gcloud CLI

You can also configure scale-to-zero with the gcloud command:

```bash
# Deploy a model with scale-to-zero using gcloud
gcloud ai endpoints deploy-model ENDPOINT_ID \
  --region=us-central1 \
  --model=MODEL_ID \
  --display-name=scale-to-zero-deployment \
  --machine-type=n1-standard-4 \
  --min-replica-count=0 \
  --max-replica-count=5
```

## Scale-to-Zero with GPU Models

Scale-to-zero works with GPU-accelerated models too, though cold start times are longer because the GPU needs to be provisioned and the model loaded into GPU memory:

```python
# gpu_scale_to_zero.py
# Deploy a GPU model with scale-to-zero

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

model = aiplatform.Model(
    'projects/your-project-id/locations/us-central1/models/MODEL_ID'
)

endpoint = aiplatform.Endpoint.create(
    display_name='gpu-scale-to-zero-endpoint',
)

model.deploy(
    endpoint=endpoint,
    machine_type='n1-standard-4',
    accelerator_type='NVIDIA_TESLA_T4',
    accelerator_count=1,
    # Scale to zero when idle
    min_replica_count=0,
    max_replica_count=3,
    autoscaling_target_accelerator_duty_cycle=60,
    traffic_percentage=100,
)
```

## Understanding Cold Start Latency

When a scale-to-zero endpoint receives a request with no active replicas, the following happens:

1. Vertex AI provisions a machine (and GPU if configured)
2. The serving container starts up
3. The model is loaded from Cloud Storage into memory
4. The prediction is served

This sequence introduces cold start latency. Here are typical cold start times:

| Machine Type | Model Size | Approximate Cold Start |
|---|---|---|
| n1-standard-2 (CPU) | Small (< 100 MB) | 10-30 seconds |
| n1-standard-4 (CPU) | Medium (100 MB - 1 GB) | 30-60 seconds |
| n1-standard-4 + T4 GPU | Medium (100 MB - 1 GB) | 60-120 seconds |
| n1-standard-8 + A100 GPU | Large (> 1 GB) | 2-5 minutes |

These are rough estimates. Actual times depend on model complexity, framework, and container startup time.

## Strategies to Mitigate Cold Start

If cold start latency is a concern, here are some strategies:

Keep your model small. A smaller model loads faster. Consider model pruning, quantization, or distillation to reduce model size.

Use a fast-loading model format. For TensorFlow, SavedModel loads faster than checkpoints. For PyTorch, TorchScript loads faster than standard pickle files.

Send periodic warmup requests. If you know traffic is coming (like at the start of business hours), send a dummy request a few minutes early to warm up the endpoint:

```python
# warmup.py
# Send a warmup request to prevent cold starts

from google.cloud import aiplatform
import numpy as np

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

endpoint = aiplatform.Endpoint(
    'projects/your-project-id/locations/us-central1/endpoints/ENDPOINT_ID'
)

# Send a dummy prediction to warm up the endpoint
try:
    dummy_input = np.zeros((1, 10)).tolist()
    response = endpoint.predict(instances=dummy_input)
    print("Endpoint warmed up successfully")
except Exception as e:
    print(f"Warmup request sent, cold start initiated: {e}")
```

You can schedule this warmup using Cloud Scheduler:

```bash
# Create a Cloud Scheduler job to warm up the endpoint every weekday at 7:55 AM
gcloud scheduler jobs create http warmup-endpoint \
  --schedule="55 7 * * 1-5" \
  --uri="https://us-central1-aiplatform.googleapis.com/v1/projects/your-project-id/locations/us-central1/endpoints/ENDPOINT_ID:predict" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --body='{"instances": [[0.0, 0.0, 0.0, 0.0, 0.0]]}' \
  --oauth-service-account-email=your-sa@your-project-id.iam.gserviceaccount.com \
  --time-zone="America/New_York"
```

## Cost Savings Calculation

Let us do a quick cost comparison. Say you are running an n1-standard-4 endpoint with one T4 GPU:

- Always-on (min=1): Runs 24 hours x 30 days = 720 hours per month
- Scale-to-zero with 8 hours of active use per day: Runs 8 hours x 22 business days = 176 hours per month

That is roughly a 75% cost reduction. The exact savings depend on your pricing tier and usage patterns, but for endpoints with intermittent traffic, scale-to-zero typically saves 50-90% compared to always-on.

## When Not to Use Scale-to-Zero

Scale-to-zero is not right for every use case:

- Real-time applications where latency is critical (payment processing, fraud detection)
- Endpoints that receive constant traffic throughout the day
- Applications where even occasional cold starts are unacceptable
- Models that take several minutes to load, making cold starts prohibitively long

For these cases, keep at least one replica running and use standard autoscaling.

## Monitoring Scale-to-Zero Endpoints

Keep track of cold start events and latency:

```python
# Check endpoint metrics using Cloud Monitoring
# Look for prediction latency spikes that indicate cold starts

from google.cloud import monitoring_v3
from google.protobuf import timestamp_pb2
import time

client = monitoring_v3.MetricServiceClient()
project_name = f"projects/your-project-id"

# Query prediction latency for the last hour
now = time.time()
interval = monitoring_v3.TimeInterval({
    'end_time': {'seconds': int(now)},
    'start_time': {'seconds': int(now - 3600)},
})

# List time series for prediction latency
results = client.list_time_series(
    request={
        'name': project_name,
        'filter': 'metric.type = "aiplatform.googleapis.com/prediction/online/prediction_latencies"',
        'interval': interval,
    }
)

for result in results:
    for point in result.points:
        print(f"Time: {point.interval.end_time}, Latency: {point.value}")
```

## Combining Scale-to-Zero with Traffic Splitting

If you have a model that needs both low-latency production traffic and intermittent batch-like requests, consider using two deployments on the same endpoint:

```python
# One deployment always on for production traffic
model.deploy(
    endpoint=endpoint,
    machine_type='n1-standard-4',
    min_replica_count=1,
    max_replica_count=5,
    traffic_percentage=90,
)

# Another deployment with scale-to-zero for testing
test_model.deploy(
    endpoint=endpoint,
    machine_type='n1-standard-2',
    min_replica_count=0,
    max_replica_count=2,
    traffic_percentage=10,
)
```

## Wrapping Up

Scale-to-zero is one of the best cost optimization features for Vertex AI endpoints. If your model does not need to serve predictions around the clock, there is no reason to pay for idle infrastructure. Set your minimum replicas to 0, accept the cold start trade-off, and use warmup strategies to minimize the impact on users. For most intermittent workloads, the cost savings are well worth the occasional cold start delay.
