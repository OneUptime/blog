# How to Set Up Multi-Cluster Ingress with GKE Multi-Cluster Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GKE, Ingress, Multi-Cluster, Load Balancing, Gateway API

Description: Learn how to configure GKE Multi-Cluster Gateway for global load balancing and intelligent traffic routing across multiple Google Kubernetes Engine clusters.

---

Google Kubernetes Engine Multi-Cluster Gateway provides cloud-native load balancing across multiple GKE clusters using Google Cloud's global infrastructure. Unlike traditional ingress controllers that work within a single cluster, Multi-Cluster Gateway distributes traffic based on cluster health, capacity, and geographic proximity.

In this guide, you'll learn how to set up and configure GKE Multi-Cluster Gateway for production multi-cluster deployments.

## Understanding GKE Multi-Cluster Gateway Architecture

GKE Multi-Cluster Gateway implements the Kubernetes Gateway API standard, providing a vendor-neutral way to configure ingress and load balancing. It consists of a GatewayClass that defines the load balancer type, a Gateway resource that configures the load balancer itself, and HTTPRoute resources that define routing rules.

The architecture uses Google Cloud Load Balancer as the global entry point, Health checks to determine cluster availability, and Backend services that represent application endpoints across clusters. Traffic routing happens at the Google network edge, providing low latency for users worldwide.

## Prerequisites and Initial Setup

Enable required GCP APIs:

```bash
gcloud services enable \
  container.googleapis.com \
  gkehub.googleapis.com \
  multiclusterservicediscovery.googleapis.com \
  multiclusteringress.googleapis.com \
  trafficdirector.googleapis.com
```

Create multiple GKE clusters in different regions:

```bash
# Create cluster in us-central1
gcloud container clusters create prod-central \
  --region us-central1 \
  --num-nodes 3 \
  --machine-type n2-standard-4 \
  --enable-ip-alias \
  --workload-pool=PROJECT_ID.svc.id.goog \
  --labels=env=production,region=us-central

# Create cluster in europe-west1
gcloud container clusters create prod-europe \
  --region europe-west1 \
  --num-nodes 3 \
  --machine-type n2-standard-4 \
  --enable-ip-alias \
  --workload-pool=PROJECT_ID.svc.id.goog \
  --labels=env=production,region=europe-west

# Create cluster in asia-southeast1
gcloud container clusters create prod-asia \
  --region asia-southeast1 \
  --num-nodes 3 \
  --machine-type n2-standard-4 \
  --enable-ip-alias \
  --workload-pool=PROJECT_ID.svc.id.goog \
  --labels=env=production,region=asia-southeast
```

## Registering Clusters to a Fleet

Register all clusters to a GKE fleet for unified management:

```bash
# Register us-central cluster
gcloud container fleet memberships register prod-central \
  --gke-cluster us-central1/prod-central \
  --enable-workload-identity

# Register europe cluster
gcloud container fleet memberships register prod-europe \
  --gke-cluster europe-west1/prod-europe \
  --enable-workload-identity

# Register asia cluster
gcloud container fleet memberships register prod-asia \
  --gke-cluster asia-southeast1/prod-asia \
  --enable-workload-identity

# Verify registration
gcloud container fleet memberships list
```

## Enabling Multi-Cluster Gateway

Enable the Multi-Cluster Gateway feature on the fleet:

```bash
gcloud container fleet ingress enable \
  --config-membership=prod-central \
  --location=us-central1
```

This designates prod-central as the config cluster where you'll create Gateway and HTTPRoute resources.

Install Gateway API CRDs in the config cluster:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml --context prod-central
```

## Creating a Multi-Cluster Gateway

Create a Gateway resource in the config cluster:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: global-gateway
  namespace: default
spec:
  gatewayClassName: gke-l7-global-external-managed
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
  - name: https
    protocol: HTTPS
    port: 443
    allowedRoutes:
      namespaces:
        from: All
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: example-com-tls
```

Create a TLS certificate for HTTPS:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: example-com-tls
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi... # Base64 encoded certificate
  tls.key: LS0tLS1CRUdJTi... # Base64 encoded private key
```

Apply the Gateway:

```bash
kubectl apply -f gateway.yaml --context prod-central

# Check Gateway status
kubectl get gateway global-gateway --context prod-central
kubectl describe gateway global-gateway --context prod-central
```

The Gateway creation triggers provisioning of a Google Cloud Load Balancer. This may take several minutes.

## Deploying Applications Across Clusters

Deploy the same application to all clusters with multi-cluster service annotations:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: store-frontend
  namespace: default
  annotations:
    cloud.google.com/neg: '{"exposed_ports": {"80":{}}}'
    networking.gke.io/max-rate-per-endpoint: "100"
spec:
  type: ClusterIP
  selector:
    app: store-frontend
  ports:
  - port: 80
    targetPort: 8080
    name: http

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: store-frontend
  namespace: default
spec:
  replicas: 5
  selector:
    matchLabels:
      app: store-frontend
  template:
    metadata:
      labels:
        app: store-frontend
    spec:
      containers:
      - name: frontend
        image: gcr.io/PROJECT_ID/store-frontend:v1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

Deploy this to all clusters:

```bash
kubectl apply -f store-frontend.yaml --context prod-central
kubectl apply -f store-frontend.yaml --context prod-europe
kubectl apply -f store-frontend.yaml --context prod-asia
```

## Configuring HTTP Routes

Create an HTTPRoute that routes traffic across all clusters:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: store-route
  namespace: default
spec:
  parentRefs:
  - kind: Gateway
    name: global-gateway
  hostnames:
  - "store.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: store-frontend-mcs
      kind: Service
      port: 80
```

Create a Multi-Cluster Service to aggregate backends:

```yaml
apiVersion: net.gke.io/v1
kind: ServiceExport
metadata:
  name: store-frontend
  namespace: default
```

Apply ServiceExport in all clusters:

```bash
kubectl apply -f service-export.yaml --context prod-central
kubectl apply -f service-export.yaml --context prod-europe
kubectl apply -f service-export.yaml --context prod-asia
```

GKE automatically creates a ServiceImport in the config cluster that aggregates all exports.

Update the HTTPRoute to use the multi-cluster service:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: store-route
  namespace: default
spec:
  parentRefs:
  - kind: Gateway
    name: global-gateway
  hostnames:
  - "store.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - group: net.gke.io
      kind: ServiceImport
      name: store-frontend
      port: 80
```

## Implementing Traffic Splitting

Split traffic between application versions for canary deployments:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: store-route
  namespace: default
spec:
  parentRefs:
  - kind: Gateway
    name: global-gateway
  hostnames:
  - "store.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - group: net.gke.io
      kind: ServiceImport
      name: store-frontend-v1
      port: 80
      weight: 90
    - group: net.gke.io
      kind: ServiceImport
      name: store-frontend-v2
      port: 80
      weight: 10
```

This sends 90% of traffic to v1 and 10% to v2 across all clusters.

## Path-Based Routing

Route different paths to different services:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-routes
  namespace: default
spec:
  parentRefs:
  - kind: Gateway
    name: global-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/v1/users
    backendRefs:
    - group: net.gke.io
      kind: ServiceImport
      name: user-service
      port: 80

  - matches:
    - path:
        type: PathPrefix
        value: /api/v1/orders
    backendRefs:
    - group: net.gke.io
      kind: ServiceImport
      name: order-service
      port: 80

  - matches:
    - path:
        type: PathPrefix
        value: /api/v1/
    backendRefs:
    - group: net.gke.io
      kind: ServiceImport
      name: api-gateway
      port: 80
```

## Header-Based Routing

Route based on HTTP headers:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-routing
  namespace: default
spec:
  parentRefs:
  - kind: Gateway
    name: global-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - headers:
      - name: X-Canary
        value: "true"
    backendRefs:
    - group: net.gke.io
      kind: ServiceImport
      name: app-canary
      port: 80

  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - group: net.gke.io
      kind: ServiceImport
      name: app-stable
      port: 80
```

## Configuring Health Checks

Customize health check parameters:

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: custom-health-check
  namespace: default
spec:
  healthCheck:
    checkIntervalSec: 10
    timeoutSec: 5
    healthyThreshold: 2
    unhealthyThreshold: 3
    type: HTTP
    requestPath: /healthz
    port: 8080

---
apiVersion: v1
kind: Service
metadata:
  name: store-frontend
  namespace: default
  annotations:
    cloud.google.com/neg: '{"exposed_ports": {"80":{}}}'
    cloud.google.com/backend-config: '{"default": "custom-health-check"}'
spec:
  type: ClusterIP
  selector:
    app: store-frontend
  ports:
  - port: 80
    targetPort: 8080
```

## Monitoring Multi-Cluster Gateway

View Gateway metrics in Cloud Console or query via Cloud Monitoring:

```bash
# Get load balancer metrics
gcloud monitoring time-series list \
  --filter='metric.type="loadbalancing.googleapis.com/https/request_count"' \
  --format=json

# Get backend health
gcloud compute backend-services describe <backend-service-name> \
  --global \
  --format="get(backends[].healthStatus)"
```

Create alerts for unhealthy backends:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gateway-alerts
  namespace: monitoring
spec:
  groups:
  - name: multi-cluster-gateway
    rules:
    - alert: UnhealthyBackends
      expr: sum(backend_unhealthy) by (cluster) > 0
      for: 5m
      annotations:
        summary: "Unhealthy backends detected in {{ $labels.cluster }}"
```

## Best Practices

Use health checks that accurately reflect application readiness. Failed health checks remove entire clusters from load balancing.

Implement gradual rollouts when deploying to multiple clusters. Deploy to one cluster first, verify, then roll out to others.

Configure appropriate timeout values based on your application's response characteristics.

Use session affinity when applications require sticky sessions for user state.

Monitor traffic distribution across clusters to ensure load balancing works as expected.

Plan for cluster failures by ensuring remaining clusters can handle full load.

## Conclusion

GKE Multi-Cluster Gateway provides enterprise-grade global load balancing for Kubernetes applications across multiple clusters and regions. By leveraging Google Cloud's global network infrastructure and implementing the Gateway API standard, it offers a future-proof solution for multi-cluster ingress that scales to global traffic patterns.

Start with basic HTTP routing and gradually add sophisticated features like traffic splitting, header-based routing, and custom health checks as your requirements evolve.
