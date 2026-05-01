# How to Deploy Nuclio on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Nuclio, Serverless, Real-Time Processing, Kubernetes, GPU

Description: Deploy Nuclio serverless platform on Rancher for real-time data processing with GPU support, multiple trigger types, and the Nuclio dashboard.

## Introduction

Nuclio is a high-performance serverless framework optimized for real-time event-driven processing. Unlike general-purpose serverless frameworks, Nuclio is designed for data science workloads, GPU acceleration, and high-throughput event processing. It supports Python, Go, Java, Node.js, and .NET Core.

## Step 1: Install Nuclio via Helm

```bash
kubectl create namespace nuclio

kubectl -n nuclio create secret docker-registry registry-credentials \
  --docker-username <username> \
  --docker-password <password> \
  --docker-server <registry-url> \
  --docker-email <email>

helm repo add nuclio https://nuclio.github.io/nuclio/charts
helm repo update

helm install nuclio nuclio/nuclio \
  --namespace nuclio \
  --set dashboard.containerBuilderKind=kaniko \
  --set registry.secretName=registry-credentials \
  --set registry.pushPullUrl=<registry-url>

kubectl get pods -n nuclio
```

## Step 2: Access the Nuclio Dashboard

```bash
# Forward the dashboard to your workstation
kubectl port-forward -n nuclio \
  $(kubectl get pods -n nuclio -l nuclio.io/app=dashboard -o jsonpath='{.items[0].metadata.name}') \
  8070:8070

# Access the dashboard
echo "Dashboard: http://localhost:8070"
```

## Step 3: Deploy a Function via Dashboard

1. Open the Nuclio Dashboard
2. Click **New Function**
3. Choose runtime (Python 3.12)
4. Enter function code:

```python
import json

def handler(context, event):
    payload = event.body.decode("utf-8")
    context.logger.info_with("Processing event", payload=payload)

    result = {
        "processed": True,
        "input": payload
    }

    return context.Response(
        body=json.dumps(result),
        status_code=200,
        content_type="application/json"
    )
```

## Step 4: Deploy via nuctl CLI

```bash
# Install nuctl
curl -s https://api.github.com/repos/nuclio/nuclio/releases/latest | \
  grep -i "browser_download_url.*nuctl.*$(uname)" | \
  cut -d : -f 2,3 | \
  tr -d '"' | \
  wget -O nuctl -qi - && chmod +x nuctl

# Deploy a function
./nuctl deploy my-function \
  --namespace nuclio \
  --path /path/to/function \
  --runtime python:3.12 \
  --handler handler:handler \
  --http-trigger-service-type nodePort \
  --registry <registry-url> \
  --run-registry <registry-url> \
  --platform kube
```

## Step 5: Configure Kafka Trigger

```yaml
# function-config.yaml
spec:
  triggers:
    kafka-trigger:
      kind: kafka-cluster
      attributes:
        initialOffset: earliest
        brokers:
          - kafka.messaging.svc.cluster.local:9092
        topics:
          - events
        consumerGroup: nuclio-consumer
```

## Step 6: Configure GPU Support

```yaml
# For ML inference functions requiring GPU
spec:
  resources:
    limits:
      nvidia.com/gpu: 1    # Request one GPU from a GPU-enabled node
```

## Conclusion

Nuclio on Rancher excels at high-throughput real-time processing workloads. Its GPU support makes it the natural choice for ML inference serverless functions. The built-in dashboard provides an accessible interface for data scientists who may not be Kubernetes experts, while the CLI supports GitOps-friendly deployments.
