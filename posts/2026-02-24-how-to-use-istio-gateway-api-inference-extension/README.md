# How to Use Istio Gateway API Inference Extension

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, Inference, AI, Kubernetes, Service Mesh

Description: How to use the Gateway API inference extension with Istio to route and manage traffic to AI inference endpoints in Kubernetes.

---

The Gateway API inference extension brings AI/ML workload routing to the Kubernetes Gateway API. If you are running inference servers in Kubernetes and using Istio as your Gateway API implementation, this extension gives you traffic management capabilities designed specifically for model serving. You get things like model-aware routing, load balancing based on inference metrics, and traffic splitting between model versions.

## What Is the Gateway API Inference Extension?

The Gateway API inference extension is a set of custom resources that extend the Kubernetes Gateway API for AI inference workloads. It introduces concepts like InferencePool and InferenceModel that map to how inference serving actually works.

An InferencePool represents a group of model servers (like vLLM, Triton, or TGI instances), and an InferenceModel represents a specific model that can be served by those servers.

The core resources are:

- **InferencePool**: A pool of inference server instances
- **InferenceModel**: A model available for serving, with routing rules

## Prerequisites

You need Istio installed with Gateway API support:

```bash
# Install Istio with Gateway API support
istioctl install --set profile=default \
  --set values.pilot.env.PILOT_ENABLE_ALPHA_GATEWAY_API=true

# Install Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml

# Install the inference extension CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases/download/v0.3.0/install.yaml
```

Verify the CRDs are installed:

```bash
kubectl get crd | grep inference
# Should show inferencemodels and inferencepools
```

## Setting Up an InferencePool

An InferencePool defines a group of model servers. Think of it like a Kubernetes Service but with inference-specific metadata.

```yaml
apiVersion: inference.networking.x-k8s.io/v1alpha2
kind: InferencePool
metadata:
  name: llm-pool
  namespace: ai-serving
spec:
  targetPortNumber: 8000
  selector:
    matchLabels:
      app: vllm-server
  endpointPickerConfig:
    extensionRef:
      name: endpoint-picker
      group: ""
      kind: Service
```

This pool targets all pods with the label `app: vllm-server` on port 8000.

Deploy the model servers that the pool references:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-server
  namespace: ai-serving
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vllm-server
  template:
    metadata:
      labels:
        app: vllm-server
    spec:
      containers:
      - name: vllm
        image: vllm/vllm-openai:latest
        args:
        - --model=meta-llama/Llama-3-8B
        - --port=8000
        ports:
        - containerPort: 8000
          name: http-inference
        resources:
          limits:
            nvidia.com/gpu: 1
---
apiVersion: v1
kind: Service
metadata:
  name: vllm-server
  namespace: ai-serving
spec:
  ports:
  - name: http-inference
    port: 8000
    targetPort: 8000
  selector:
    app: vllm-server
```

## Defining an InferenceModel

An InferenceModel maps a model name to an InferencePool and defines how traffic should be handled:

```yaml
apiVersion: inference.networking.x-k8s.io/v1alpha2
kind: InferenceModel
metadata:
  name: llama-3-8b
  namespace: ai-serving
spec:
  modelName: meta-llama/Llama-3-8B
  criticality: Critical
  poolRef:
    name: llm-pool
  targetModels:
  - name: meta-llama/Llama-3-8B
    weight: 100
```

The `criticality` field helps with priority-based routing when the pool is under load. Critical requests get priority over best-effort ones.

## Routing with HTTPRoute

Connect the Gateway API resources to route inference traffic:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: inference-gateway
  namespace: ai-serving
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    port: 80
    protocol: HTTP
    allowedRoutes:
      namespaces:
        from: Same
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: inference-route
  namespace: ai-serving
spec:
  parentRefs:
  - name: inference-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /v1
    backendRefs:
    - group: inference.networking.x-k8s.io
      kind: InferencePool
      name: llm-pool
      port: 8000
```

This routes all requests to `/v1/*` (the OpenAI-compatible API path) to the InferencePool.

## Traffic Splitting Between Model Versions

One of the most useful features is splitting traffic between different model versions for A/B testing or gradual rollouts:

```yaml
apiVersion: inference.networking.x-k8s.io/v1alpha2
kind: InferenceModel
metadata:
  name: llama-models
  namespace: ai-serving
spec:
  modelName: my-llm
  criticality: Critical
  poolRef:
    name: llm-pool
  targetModels:
  - name: meta-llama/Llama-3-8B
    weight: 90
  - name: meta-llama/Llama-3-70B
    weight: 10
```

This sends 90% of requests to the 8B model and 10% to the 70B model. You can adjust weights gradually as you validate the larger model's performance.

## Model-Aware Load Balancing

The inference extension supports custom endpoint picking strategies that go beyond simple round-robin. An endpoint picker can consider:

- Current queue depth on each server
- GPU memory utilization
- Active request count
- Model-specific metrics

Deploy an endpoint picker service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: endpoint-picker
  namespace: ai-serving
spec:
  replicas: 1
  selector:
    matchLabels:
      app: endpoint-picker
  template:
    metadata:
      labels:
        app: endpoint-picker
    spec:
      containers:
      - name: picker
        image: us-docker.pkg.dev/k8s-staging-gateway-api-inference/gateway-api-inference-extension/epp:main
        args:
        - --poolName=llm-pool
        - --poolNamespace=ai-serving
        ports:
        - containerPort: 9002
          name: grpc
---
apiVersion: v1
kind: Service
metadata:
  name: endpoint-picker
  namespace: ai-serving
spec:
  ports:
  - name: grpc-epp
    port: 9002
    targetPort: 9002
  selector:
    app: endpoint-picker
```

## Monitoring Inference Traffic

With Istio and the inference extension, you get both standard Istio metrics and inference-specific observability:

```bash
# Check standard Istio metrics for inference endpoints
kubectl exec deploy/test-client -c istio-proxy -- \
  pilot-agent request GET stats | grep "vllm-server"

# Monitor request latencies
# In Prometheus:
# histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="vllm-server.ai-serving.svc.cluster.local"}[5m])) by (le))
```

## Testing the Setup

Send inference requests through the gateway:

```bash
# Get the gateway address
GATEWAY_IP=$(kubectl get svc -n ai-serving inference-gateway-istio \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Send an inference request
curl -X POST http://$GATEWAY_IP/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "my-llm",
    "prompt": "Explain Kubernetes in one sentence",
    "max_tokens": 100
  }'

# Send a chat completion request
curl -X POST http://$GATEWAY_IP/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "my-llm",
    "messages": [{"role": "user", "content": "What is a service mesh?"}],
    "max_tokens": 200
  }'
```

## Scaling Considerations

Inference workloads have unique scaling requirements. GPU-bound workloads cannot simply add more replicas without more GPUs. Configure Horizontal Pod Autoscaling based on inference-specific metrics:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vllm-hpa
  namespace: ai-serving
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vllm-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Pods
    pods:
      metric:
        name: vllm_num_requests_waiting
      target:
        type: AverageValue
        averageValue: "5"
```

The Gateway API inference extension gives you a standardized way to manage AI/ML inference traffic in Kubernetes with Istio. It builds on the Gateway API patterns that you already know and adds the model-specific routing and load balancing that inference workloads need. As the extension matures, expect more inference-aware features like request prioritization, model caching, and dynamic batching support.
