# How to Use Istio Gateway API Inference Extension

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, Inference, AI, Kubernetes, Service Mesh

Description: How to use the Gateway API inference extension with Istio to route and manage traffic to AI inference endpoints in Kubernetes.

---

The Gateway API inference extension brings AI/ML workload routing to the Kubernetes Gateway API. If you are running inference servers in Kubernetes and using Istio as your Gateway API implementation, this extension gives you traffic management capabilities designed specifically for model serving. You get things like model-aware routing, load balancing based on inference metrics, and traffic splitting between model versions.

## What Is the Gateway API Inference Extension?

The Gateway API inference extension is a set of custom resources that extend the Kubernetes Gateway API for AI inference workloads. It introduces concepts like InferencePool and InferenceObjective that map to how inference serving actually works.

An InferencePool represents a group of model servers (like vLLM, Triton, or TGI instances), and an InferenceObjective represents the serving objective for requests that use a pool.

The core resources are:

- **InferencePool**: A pool of inference server instances
- **InferenceObjective**: A serving objective, with priority, for traffic that uses a pool
- **InferenceModelRewrite**: Optional model-name matching and weighted model rewriting rules

## Prerequisites

You need Istio installed with Gateway API support:

```bash
# Install Istio with Gateway API support

istioctl install --set profile=minimal \
  --set values.pilot.env.SUPPORT_GATEWAY_API_INFERENCE_EXTENSION=true \
  --set values.pilot.env.ENABLE_GATEWAY_API_INFERENCE_EXTENSION=true \
  -y

# Install Gateway API CRDs
kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.1/standard-install.yaml

# Install the inference extension CRDs
IGW_LATEST_RELEASE=$(curl -s https://api.github.com/repos/kubernetes-sigs/gateway-api-inference-extension/releases \
  | jq -r '.[] | select(.prerelease == false) | .tag_name' \
  | sort -V \
  | tail -n1)
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases/download/${IGW_LATEST_RELEASE}/manifests.yaml
```

Verify the CRDs are installed:

```bash
kubectl get crd | grep inference.networking
# Should show inferencepools, inferenceobjectives, inferencemodelrewrites, and inferencepoolimports
```

## Setting Up an InferencePool

An InferencePool defines a group of model servers. Think of it like a Kubernetes Service but with inference-specific metadata.

```yaml
apiVersion: inference.networking.k8s.io/v1
kind: InferencePool
metadata:
  name: llm-pool
  namespace: ai-serving
spec:
  targetPorts:
  - number: 8000
  selector:
    matchLabels:
      app: vllm-server
  endpointPickerRef:
    name: endpoint-picker
    port:
      number: 9002
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
      - name: vllm-sim
        image: ghcr.io/llm-d/llm-d-inference-sim:v0.7.1
        args:
        - --model
        - meta-llama/Llama-3.1-8B-Instruct
        - --port
        - "8000"
        ports:
        - containerPort: 8000
          name: http-inference
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        resources:
          requests:
            cpu: 20m
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

## Defining an InferenceObjective

An InferenceObjective maps a serving objective to an InferencePool and defines how traffic should be handled:

```yaml
apiVersion: inference.networking.x-k8s.io/v1alpha2
kind: InferenceObjective
metadata:
  name: llama-3-8b-critical
  namespace: ai-serving
spec:
  priority: 10
  poolRef:
    group: inference.networking.k8s.io
    kind: InferencePool
    name: llm-pool
```

The `priority` field helps with priority-based routing when the pool is under load. Higher-priority requests are served before lower-priority ones when flow control queues requests.

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
    - group: inference.networking.k8s.io
      kind: InferencePool
      name: llm-pool
```

This routes all requests to `/v1/*` (the OpenAI-compatible API path) to the InferencePool.

## Traffic Splitting Between Model Versions

One of the most useful features is splitting traffic between different model versions for A/B testing or gradual rollouts:

```yaml
apiVersion: inference.networking.x-k8s.io/v1alpha2
kind: InferenceModelRewrite
metadata:
  name: llama-model-rewrite
  namespace: ai-serving
spec:
  poolRef:
    group: inference.networking.k8s.io
    kind: InferencePool
    name: llm-pool
  rules:
  - matches:
    - model:
        type: Exact
        value: my-llm
    targets:
    - modelRewrite: meta-llama/Llama-3.1-8B-Instruct
      weight: 90
    - modelRewrite: meta-llama/Llama-3.1-70B-Instruct
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
      - name: epp
        image: us-central1-docker.pkg.dev/k8s-staging-images/gateway-api-inference-extension/epp:v20251119-2aaf2a6
        args:
        - --pool-name
        - llm-pool
        - --pool-namespace
        - ai-serving
        - --v
        - "4"
        - --zap-encoder
        - json
        - --config-file
        - /config/default-plugins.yaml
        ports:
        - containerPort: 9002
          name: grpc
        - containerPort: 9003
          name: health
        - containerPort: 9090
          name: metrics
        volumeMounts:
        - name: plugins-config-volume
          mountPath: /config
      volumes:
      - name: plugins-config-volume
        configMap:
          name: plugins-config
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
    appProtocol: http2
  selector:
    app: endpoint-picker
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: plugins-config
  namespace: ai-serving
data:
  default-plugins.yaml: |
    apiVersion: inference.networking.x-k8s.io/v1alpha1
    kind: EndpointPickerConfig
    plugins:
    - type: queue-scorer
    - type: kv-cache-utilization-scorer
    - type: prefix-cache-scorer
    schedulingProfiles:
    - name: default
      plugins:
      - pluginRef: queue-scorer
        weight: 2
      - pluginRef: kv-cache-utilization-scorer
        weight: 2
      - pluginRef: prefix-cache-scorer
        weight: 3
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: endpoint-picker-tls
  namespace: ai-serving
spec:
  host: endpoint-picker
  trafficPolicy:
    tls:
      mode: SIMPLE
      insecureSkipVerify: true
```

## Monitoring Inference Traffic

With Istio and the inference extension, you get both standard Istio metrics and inference-specific observability:

```bash
# Check endpoint picker metrics
kubectl port-forward -n ai-serving deploy/endpoint-picker 9090:9090
curl http://localhost:9090/metrics

# Monitor request latencies
# In Prometheus:
# histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="vllm-server.ai-serving.svc.cluster.local"}[5m])) by (le))
```

## Testing the Setup

Send inference requests through the gateway:

```bash
# Get the gateway address
GATEWAY_IP=$(kubectl get gateway inference-gateway -n ai-serving \
  -o jsonpath='{.status.addresses[0].value}')

# Send an inference request
curl -X POST http://$GATEWAY_IP/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.1-8B-Instruct",
    "prompt": "Explain Kubernetes in one sentence",
    "max_tokens": 100
  }'

# Send a chat completion request
curl -X POST http://$GATEWAY_IP/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.1-8B-Instruct",
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
