# How to Deploy Nuclio on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Nuclio, Serverless, Kubernetes, Real-Time

Description: Guide to deploying Nuclio high-performance serverless framework on Rancher for real-time data processing.

## Introduction

Nuclio is a high-performance serverless framework designed for real-time data processing. It supports data bindings to Kafka, Kinesis, NATS, and more, making it ideal for ML inference pipelines and event-driven microservices.

## Step 1: Install Nuclio

```bash
# Add Nuclio Helm repository

helm repo add nuclio https://nuclio.github.io/nuclio/charts
helm repo update

# Create namespace
kubectl create namespace nuclio

# Install Nuclio
helm install nuclio nuclio/nuclio \
  --namespace nuclio
```

## Step 2: Configure Container Registry

```bash
# Create registry credentials secret
kubectl create secret docker-registry registry-credentials \
  --namespace nuclio \
  --docker-server=registry.example.com \
  --docker-username=your-username \
  --docker-password=your-password

# Configure Nuclio to use registry
helm upgrade --install nuclio nuclio/nuclio \
  --namespace nuclio \
  --set registry.secretName=registry-credentials \
  --set registry.pushPullUrl=registry.example.com

# Wait for deployment
kubectl rollout status deployment nuclio-controller -n nuclio
kubectl rollout status deployment nuclio-dashboard -n nuclio
```

## Step 3: Install nuctl CLI

```bash
# Download nuctl
curl -s https://api.github.com/repos/nuclio/nuclio/releases/latest \
  | grep -i "browser_download_url.*nuctl.*$(uname)" \
  | cut -d : -f 2,3 \
  | tr -d '"' \
  | wget -O nuctl -qi -
chmod +x nuctl
sudo mv nuctl /usr/local/bin/nuctl

nuctl version
```

## Step 4: Deploy a Python Function

```python
# process_event.py
def handler(context, event):
    message = event.body.decode('utf-8')
    context.logger.info_with('Processing event', body=message)

    # Process the event
    result = f"Processed: {message}"

    return context.Response(
        body=result,
        content_type='text/plain',
        status_code=200
    )
```

```bash
# Deploy function
nuctl deploy process-event \
  --namespace nuclio \
  --path process_event.py \
  --runtime python:3.11 \
  --handler process_event:handler \
  --registry registry.example.com \
  --run-registry registry.example.com \
  --http-trigger-service-type nodePort \
  --min-replicas 2 \
  --max-replicas 2

# Test function
nuctl invoke process-event \
  --namespace nuclio \
  --via external-ip \
  --method POST \
  --body "test data"
```

## Step 5: Function with Kafka Trigger

```yaml
# kafka-function.yaml
apiVersion: nuclio.io/v1
kind: NuclioFunction
metadata:
  name: kafka-processor
  namespace: nuclio
spec:
  description: "Processes Kafka events"
  runtime: python:3.11
  handler: "kafka_handler:handler"
  
  image: registry.example.com/nuclio/kafka-processor:latest
  
  # Kafka trigger
  triggers:
    kafka-trigger:
      kind: kafka-cluster
      attributes:
        topics:
        - events-input
        brokers:
        - kafka.default.svc.cluster.local:9092
        consumerGroup: nuclio-processors
        initialOffset: latest
  
  # Resource configuration
  minReplicas: 1
  maxReplicas: 10
  
  resources:
    limits:
      cpu: "1"
      memory: "512Mi"
    requests:
      cpu: "100m"
      memory: "128Mi"
```

## Step 6: ML Inference Function

```python
# ml_inference.py
import numpy as np
import json

def init_context(context):
    # Load your model once per worker
    context.logger.info("Loading model...")
    # context.user_data.model = load_model('/models/my_model')
    context.user_data.model = None
    context.logger.info("Model loaded")

def handler(context, event):
    # Parse input
    input_data = json.loads(event.body)
    features = np.array(input_data['features'])

    # Run inference
    # prediction = context.user_data.model.predict(features)
    prediction = {"class": "cat", "confidence": 0.95}

    return context.Response(
        body=json.dumps(prediction),
        content_type='application/json',
        status_code=200
    )
```

## Step 7: HTTP Trigger with Ingress

```yaml
# http-function.yaml
spec:
  triggers:
    http:
      kind: http
      numWorkers: 8
      attributes:
        ingresses:
          main:
            host: api.example.com
            paths:
            - /api/process
```

## Monitoring Nuclio

```bash
# List all functions
nuctl get functions --namespace nuclio

# View function logs
kubectl get pods -n nuclio
kubectl logs -n nuclio <processor-pod-name> -f

# Access Nuclio dashboard
kubectl port-forward -n nuclio $(kubectl get pods -n nuclio -l nuclio.io/app=dashboard -o jsonpath='{.items[0].metadata.name}') 8070:8070
# Open http://localhost:8070
```

## Conclusion

Nuclio excels at high-throughput, real-time data processing with its native integration with message queues and data streams. Its ability to load models and data at startup (rather than per-invocation) makes it particularly suitable for ML inference pipelines. Deploy Nuclio on Rancher when you need serverless processing at scale with rich data binding support.
