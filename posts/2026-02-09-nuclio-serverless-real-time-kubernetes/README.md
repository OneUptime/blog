# How to Deploy Nuclio Serverless Platform on Kubernetes for Real-Time Data Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nuclio, Kubernetes, Serverless, Real-Time, Data-Processing

Description: Deploy Nuclio on Kubernetes for high-performance serverless functions optimized for real-time data processing with sub-millisecond latency and GPU support.

---

Nuclio is a high-performance serverless framework designed specifically for real-time data processing workloads. Unlike general-purpose serverless platforms, Nuclio prioritizes low latency and high throughput, making it ideal for data science, machine learning inference, and stream processing. This guide shows you how to deploy and configure Nuclio for production real-time workloads.

## Why Choose Nuclio for Real-Time Processing

Nuclio achieves exceptional performance through several design choices. It keeps function processes warm and reuses them across invocations, eliminating cold starts. It supports direct triggering from data stores and message queues without intermediate layers. It provides native GPU support for ML workloads.

The platform supports multiple programming languages including Python, Go, Node.js, Java, and .NET. Functions can be deployed from source code, container images, or Jupyter notebooks. This flexibility enables data scientists and developers to use their preferred tools.

Nuclio integrates deeply with data processing ecosystems. It includes built-in triggers for Kafka, Kinesis, MQTT, RabbitMQ, and HTTP. It supports GPU acceleration for TensorFlow and PyTorch models. It provides automatic parallelization for batch processing.

## Installing Nuclio on Kubernetes

Install Nuclio using Helm:

```bash
# Add Nuclio Helm repository
helm repo add nuclio https://nuclio.github.io/nuclio/charts
helm repo update

# Create namespace
kubectl create namespace nuclio

# Install Nuclio
helm install nuclio nuclio/nuclio \
  --namespace nuclio \
  --set controller.image.tag=latest-amd64 \
  --set dashboard.enabled=true \
  --set dashboard.baseImagePullPolicy=IfNotPresent

# Verify installation
kubectl get pods -n nuclio
```

Install the Nuclio CLI:

```bash
# Download nuctl
curl -s https://api.github.com/repos/nuclio/nuclio/releases/latest \
  | grep -i "browser_download_url.*nuctl.*$(uname -s).*$(uname -m)" \
  | cut -d : -f 2,3 \
  | tr -d \" \
  | wget -qi -

# Make executable and move to PATH
chmod +x nuctl-*
sudo mv nuctl-* /usr/local/bin/nuctl

# Verify installation
nuctl version
```

## Creating Real-Time Data Processing Functions

Build a Python function for real-time log processing:

```python
# log-processor.py
import json
import re
from datetime import datetime

def handler(context, event):
    """Process log entries in real-time"""

    # Parse log line
    log_line = event.body.decode('utf-8')

    try:
        # Extract components using regex
        pattern = r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z) (\w+) \[(\w+)\] (.*)'
        match = re.match(pattern, log_line)

        if not match:
            context.logger.warn(f"Failed to parse log: {log_line}")
            return context.Response(
                status_code=400,
                body="Invalid log format"
            )

        timestamp, level, component, message = match.groups()

        # Process based on log level
        if level == 'ERROR' or level == 'FATAL':
            # Send alert for errors
            send_alert(context, {
                'timestamp': timestamp,
                'level': level,
                'component': component,
                'message': message
            })

        # Extract metrics
        metrics = extract_metrics(message)

        # Build processed event
        processed = {
            'timestamp': timestamp,
            'level': level,
            'component': component,
            'message': message,
            'metrics': metrics,
            'processed_at': datetime.utcnow().isoformat()
        }

        # Log processing stats
        context.logger.info_with(
            "Processed log entry",
            level=level,
            component=component
        )

        return context.Response(
            body=json.dumps(processed),
            headers={'Content-Type': 'application/json'},
            status_code=200
        )

    except Exception as e:
        context.logger.error(f"Processing error: {str(e)}")
        return context.Response(
            status_code=500,
            body=str(e)
        )

def extract_metrics(message):
    """Extract numeric metrics from log message"""
    metrics = {}

    # Extract response times
    time_match = re.search(r'(\d+)ms', message)
    if time_match:
        metrics['response_time_ms'] = int(time_match.group(1))

    # Extract status codes
    status_match = re.search(r'status=(\d{3})', message)
    if status_match:
        metrics['status_code'] = int(status_match.group(1))

    return metrics

def send_alert(context, error_data):
    """Send alert for error logs"""
    # Implementation depends on your alerting system
    context.logger.warn_with("Alert triggered", **error_data)
```

Create a function configuration:

```yaml
# log-processor-config.yaml
apiVersion: "nuclio.io/v1"
kind: "NuclioFunction"
metadata:
  name: log-processor
  namespace: nuclio
spec:
  runtime: python:3.9
  handler: log-processor:handler

  # Resource limits
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

  # Minimum and maximum replicas
  minReplicas: 1
  maxReplicas: 10

  # HTTP trigger
  triggers:
    http:
      kind: http
      maxWorkers: 8
      workerAvailabilityTimeoutMilliseconds: 10000

  # Environment variables
  env:
    - name: LOG_LEVEL
      value: info
```

Deploy the function:

```bash
# Deploy from local file
nuctl deploy log-processor \
  --namespace nuclio \
  --path log-processor.py \
  --file log-processor-config.yaml

# Get function info
nuctl get functions --namespace nuclio

# Test the function
nuctl invoke log-processor \
  --namespace nuclio \
  --method POST \
  --body "2026-02-09T10:30:45.123Z INFO [api] Request processed status=200 duration=45ms"
```

## Building Kafka-Triggered Functions

Process Kafka streams in real-time:

```python
# stream-processor.py
import json
import numpy as np
from typing import Dict, List

def handler(context, event):
    """Process streaming sensor data from Kafka"""

    try:
        # Parse event data
        data = json.loads(event.body)

        sensor_id = data.get('sensor_id')
        readings = data.get('readings', [])

        context.logger.info_with(
            "Processing sensor data",
            sensor_id=sensor_id,
            reading_count=len(readings)
        )

        # Calculate statistics
        values = [r['value'] for r in readings]
        stats = {
            'sensor_id': sensor_id,
            'count': len(values),
            'mean': float(np.mean(values)),
            'std': float(np.std(values)),
            'min': float(np.min(values)),
            'max': float(np.max(values)),
            'median': float(np.median(values))
        }

        # Detect anomalies
        anomalies = detect_anomalies(values, stats['mean'], stats['std'])

        if anomalies:
            context.logger.warn_with(
                "Anomalies detected",
                sensor_id=sensor_id,
                anomaly_count=len(anomalies)
            )
            stats['anomalies'] = anomalies

        # Store results (non-blocking)
        store_results(context, stats)

        return context.Response(
            body=json.dumps(stats),
            headers={'Content-Type': 'application/json'},
            status_code=200
        )

    except Exception as e:
        context.logger.error_with("Processing failed", error=str(e))
        return context.Response(status_code=500, body=str(e))

def detect_anomalies(values: List[float], mean: float, std: float) -> List[int]:
    """Detect anomalies using standard deviation"""
    threshold = 3  # 3 sigma
    anomalies = []

    for idx, value in enumerate(values):
        if abs(value - mean) > threshold * std:
            anomalies.append(idx)

    return anomalies

def store_results(context, stats: Dict):
    """Store processing results"""
    # Implementation depends on your storage backend
    pass
```

Configure with Kafka trigger:

```yaml
# stream-processor-config.yaml
apiVersion: "nuclio.io/v1"
kind: "NuclioFunction"
metadata:
  name: stream-processor
  namespace: nuclio
spec:
  runtime: python:3.9
  handler: stream-processor:handler

  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi

  minReplicas: 2
  maxReplicas: 20

  # Kafka trigger configuration
  triggers:
    kafka:
      kind: kafka
      attributes:
        brokers:
          - kafka-broker-1:9092
          - kafka-broker-2:9092
        topics:
          - sensor-data
        consumerGroup: nuclio-stream-processor
        initialOffset: latest
        sasl:
          enabled: false
        sessionTimeout: 10s
        heartbeatInterval: 3s

  # Dependencies
  build:
    commands:
      - pip install numpy==1.24.0
```

Deploy the Kafka function:

```bash
nuctl deploy stream-processor \
  --namespace nuclio \
  --path stream-processor.py \
  --file stream-processor-config.yaml

# Monitor function logs
kubectl logs -f -n nuclio \
  -l nuclio.io/function-name=stream-processor \
  -c processor
```

## ML Model Inference with GPU Support

Deploy a machine learning model for real-time inference:

```python
# ml-inference.py
import json
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Global model loading (happens once)
model = None
tokenizer = None

def init_context(context):
    """Initialize model on function startup"""
    global model, tokenizer

    context.logger.info("Loading model...")

    model_name = "distilbert-base-uncased-finetuned-sst-2-english"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)

    # Move model to GPU if available
    if torch.cuda.is_available():
        model = model.cuda()
        context.logger.info("Model loaded on GPU")
    else:
        context.logger.info("Model loaded on CPU")

def handler(context, event):
    """Perform sentiment analysis on text"""
    global model, tokenizer

    try:
        # Parse input
        data = json.loads(event.body)
        texts = data.get('texts', [])

        if not texts:
            return context.Response(
                status_code=400,
                body="No texts provided"
            )

        context.logger.info_with(
            "Processing batch",
            batch_size=len(texts)
        )

        # Tokenize inputs
        inputs = tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt"
        )

        # Move to GPU if available
        if torch.cuda.is_available():
            inputs = {k: v.cuda() for k, v in inputs.items()}

        # Run inference
        with torch.no_grad():
            outputs = model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)

        # Format results
        results = []
        for idx, text in enumerate(texts):
            probs = predictions[idx].cpu().numpy()
            results.append({
                'text': text,
                'sentiment': 'positive' if probs[1] > probs[0] else 'negative',
                'confidence': float(max(probs))
            })

        return context.Response(
            body=json.dumps({'results': results}),
            headers={'Content-Type': 'application/json'},
            status_code=200
        )

    except Exception as e:
        context.logger.error_with("Inference failed", error=str(e))
        return context.Response(status_code=500, body=str(e))
```

Configure with GPU support:

```yaml
# ml-inference-config.yaml
apiVersion: "nuclio.io/v1"
kind: "NuclioFunction"
metadata:
  name: ml-inference
  namespace: nuclio
spec:
  runtime: python:3.9
  handler: ml-inference:handler

  # GPU resources
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
      nvidia.com/gpu: 1
    limits:
      cpu: 2000m
      memory: 4Gi
      nvidia.com/gpu: 1

  minReplicas: 1
  maxReplicas: 5

  # HTTP trigger for inference requests
  triggers:
    http:
      kind: http
      maxWorkers: 4

  # Build configuration
  build:
    baseImage: pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime
    commands:
      - pip install transformers==4.30.0

  # Node selector for GPU nodes
  platform:
    attributes:
      nodeSelector:
        accelerator: nvidia-gpu
```

## Monitoring and Performance Tuning

Monitor function performance:

```bash
# Get function metrics
kubectl get nucliofunction ml-inference -n nuclio -o yaml

# View detailed metrics
kubectl port-forward -n nuclio svc/ml-inference 8080:8080
curl http://localhost:8080/metrics

# Check resource usage
kubectl top pod -n nuclio -l nuclio.io/function-name=ml-inference
```

Create performance dashboards:

```promql
# Request rate
rate(nuclio_function_invocations_total{function="ml-inference"}[5m])

# Latency percentiles
histogram_quantile(0.95,
  rate(nuclio_function_duration_seconds_bucket{function="ml-inference"}[5m])
)

# Error rate
rate(nuclio_function_errors_total{function="ml-inference"}[5m])

# GPU utilization (if using GPU functions)
nvidia_gpu_duty_cycle{kubernetes_pod_name=~"ml-inference.*"}
```

## Best Practices

Initialize expensive resources in init_context. Load models, establish database connections, and prepare caches during function initialization, not in the handler.

Batch requests when possible. Process multiple items per invocation to amortize overhead. This is especially important for GPU workloads.

Configure appropriate worker counts. More workers increase throughput but consume more memory. Match worker count to your concurrency needs.

Use the right trigger type. HTTP triggers for synchronous requests, message queue triggers for async processing, cron triggers for scheduled jobs.

Monitor cold start times. Nuclio minimizes cold starts, but tracking them helps optimize initialization code and resource allocation.

Scale based on actual load. Configure minReplicas to handle baseline load and maxReplicas based on peak capacity. Use Kubernetes HPA for automatic scaling.

## Conclusion

Nuclio provides a high-performance serverless platform optimized for real-time data processing workloads. Its warm function model, native GPU support, and deep integration with data processing ecosystems make it ideal for ML inference, stream processing, and real-time analytics. By properly configuring triggers, resource allocations, and initialization code, you can build serverless functions that deliver the low latency and high throughput required for production real-time systems.
