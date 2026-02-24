# How to Integrate Istio with Apache SkyWalking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Apache SkyWalking, Observability, Tracing, Kubernetes

Description: Complete guide to setting up Apache SkyWalking with Istio for distributed tracing and service mesh observability.

---

Apache SkyWalking is an open-source APM (Application Performance Monitoring) system that works really well with service meshes. While most people reach for Jaeger or Zipkin when they think about tracing in Istio, SkyWalking offers a more complete observability platform that includes metrics, tracing, logging, and even a topology map out of the box.

## Why SkyWalking with Istio

SkyWalking was actually designed with service mesh observability in mind. It can consume Envoy's access logs and metrics directly, which means you get deep visibility into your mesh without adding any instrumentation to your application code. The topology view is particularly useful because it shows you the real service dependency graph based on actual traffic.

## Installing Apache SkyWalking

Deploy SkyWalking using Helm. The SkyWalking Helm chart includes the OAP (Observability Analysis Platform) server and the UI:

```bash
helm repo add skywalking https://apache.jfrog.io/artifactory/skywalking-helm
helm repo update

helm install skywalking skywalking/skywalking \
  --namespace skywalking \
  --create-namespace \
  --set oap.replicas=1 \
  --set oap.storageType=elasticsearch \
  --set ui.service.type=ClusterIP \
  --set elasticsearch.enabled=true \
  --set elasticsearch.replicas=1
```

For a quick test setup, you can use the in-memory storage instead of Elasticsearch:

```bash
helm install skywalking skywalking/skywalking \
  --namespace skywalking \
  --create-namespace \
  --set oap.replicas=1 \
  --set oap.storageType=memory \
  --set ui.service.type=ClusterIP \
  --set elasticsearch.enabled=false
```

Verify the installation:

```bash
kubectl get pods -n skywalking
kubectl get svc -n skywalking
```

## Configuring Istio to Send Data to SkyWalking

Istio can send telemetry data to SkyWalking through Envoy's access log service (ALS). This is one of the cleanest integration points because it does not require any changes to your applications.

Configure the mesh to enable Envoy ALS and point it at SkyWalking:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableEnvoyAccessLogService: true
    defaultConfig:
      envoyAccessLogService:
        address: skywalking-oap.skywalking.svc:11800
```

If you already have Istio running, you can update the mesh config:

```bash
kubectl edit configmap istio -n istio-system
```

Add the access log service configuration under the mesh section:

```yaml
data:
  mesh: |-
    enableEnvoyAccessLogService: true
    defaultConfig:
      envoyAccessLogService:
        address: skywalking-oap.skywalking.svc:11800
```

After updating, restart the Istio control plane:

```bash
kubectl rollout restart deployment/istiod -n istio-system
```

You also need to restart your application pods so they pick up the new proxy configuration:

```bash
kubectl rollout restart deployment -n your-namespace
```

## Using the Telemetry API

Starting with Istio 1.17+, the preferred way to configure telemetry is through the Telemetry API. You can set up SkyWalking as a tracing provider:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: skywalking-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: skywalking
    randomSamplingPercentage: 100
```

For this to work, you need to configure the tracing provider in the Istio mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: skywalking
      skywalking:
        service: skywalking-oap.skywalking.svc.cluster.local
        port: 11800
```

## Setting Up the SkyWalking Satellite

For high-traffic environments, you probably do not want every sidecar proxy talking directly to the OAP server. SkyWalking Satellite acts as a lightweight proxy/collector that buffers and batches telemetry data:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: skywalking-satellite
  namespace: skywalking
spec:
  replicas: 2
  selector:
    matchLabels:
      app: skywalking-satellite
  template:
    metadata:
      labels:
        app: skywalking-satellite
    spec:
      containers:
      - name: satellite
        image: apache/skywalking-satellite:latest
        ports:
        - containerPort: 11800
          name: grpc
        env:
        - name: SATELLITE_GRPC_CLIENT_FINDER
          value: static
        - name: SATELLITE_GRPC_CLIENT_SERVER_ADDR
          value: skywalking-oap.skywalking.svc:11800
---
apiVersion: v1
kind: Service
metadata:
  name: skywalking-satellite
  namespace: skywalking
spec:
  selector:
    app: skywalking-satellite
  ports:
  - port: 11800
    name: grpc
    targetPort: 11800
```

Then point your Istio configuration at the satellite instead of the OAP server directly.

## Exploring the SkyWalking UI

Access the SkyWalking UI:

```bash
kubectl port-forward svc/skywalking-ui -n skywalking 8080:80
```

Open your browser to `http://localhost:8080`. The UI has several key sections:

**Topology**: Shows the real-time service dependency graph. Every service in your mesh appears as a node, and the edges show traffic flow with latency and error rate information.

**Service Dashboard**: Gives you per-service metrics including throughput, average response time, P99 latency, and success rate.

**Trace View**: Shows distributed traces across services. Each trace shows the full request path through the mesh.

**Endpoint Analysis**: Breaks down performance by individual API endpoints.

## Configuring Metrics Collection

SkyWalking can also scrape Istio's Prometheus metrics for additional data. Configure the OAP server to fetch metrics from Istio:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: skywalking-oap-config
  namespace: skywalking
data:
  fetcher-default.yaml: |
    fetcherType: prometheus
    metricsPath: /stats/prometheus
    staticConfig:
      targets:
      - url: http://istio-ingressgateway.istio-system.svc:15090/stats/prometheus
```

## Setting Up Alerts

SkyWalking has a built-in alerting engine. Configure alert rules for your mesh services:

```yaml
rules:
  service_resp_time_rule:
    metrics-name: service_resp_time
    op: ">"
    threshold: 1000
    period: 10
    count: 3
    message: "Response time of service {name} is more than 1000ms in the last 10 minutes"
  service_sla_rule:
    metrics-name: service_sla
    op: "<"
    threshold: 8000
    period: 10
    count: 2
    message: "Successful rate of service {name} is lower than 80% in the last 10 minutes"
```

These rules go into the alarm-settings.yml file in the OAP configuration. You can deliver alerts through webhooks, Slack, email, and other channels.

## Troubleshooting

If you do not see data in SkyWalking, check these things:

```bash
# Verify the OAP server is receiving data
kubectl logs -n skywalking -l app=oap

# Check that Envoy proxies are configured for ALS
istioctl proxy-config bootstrap <pod-name> | grep access_log

# Verify connectivity from sidecars to SkyWalking
kubectl exec <pod-name> -c istio-proxy -- curl -s skywalking-oap.skywalking.svc:12800/healthcheck
```

A common issue is the OAP server not recognizing the Envoy ALS format. Make sure you are using a compatible version of SkyWalking (9.x or later works best with recent Istio versions).

SkyWalking paired with Istio gives you a comprehensive observability setup without touching your application code. The access log service integration is particularly clean because it uses data that Envoy already generates. For teams that want more than just tracing, the combination of topology mapping, metrics, and alerting makes SkyWalking a strong choice.
