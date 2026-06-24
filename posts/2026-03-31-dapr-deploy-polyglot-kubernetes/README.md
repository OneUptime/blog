# How to Deploy Polyglot Dapr Services on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Polyglot, Deployment, Helm

Description: Deploy a polyglot Dapr microservices system on Kubernetes with Node.js, Python, Go, and Java services using Helm charts and shared component definitions.

---

Deploying polyglot Dapr services on Kubernetes follows the same pattern for every language: annotate the pod template to enable sidecar injection, share component definitions via Kubernetes resources, and configure app IDs that match your service invocation and pub/sub subscriptions.

## Project Structure

Organize your polyglot deployment:

```bash
k8s/
  components/
    statestore.yaml
    pubsub.yaml
    secretstore.yaml
  services/
    order-service-python/
      deployment.yaml
      service.yaml
    inventory-service-go/
      deployment.yaml
      service.yaml
    notification-service-java/
      deployment.yaml
      service.yaml
    gateway-service-node/
      deployment.yaml
      service.yaml
  config/
    dapr-config.yaml
```

## Shared Dapr Configuration

Apply a shared Dapr Configuration resource for all services:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: default
  namespace: production
spec:
  tracing:
    samplingRate: "0.1"
    zipkin:
      endpointAddress: http://zipkin.monitoring:9411/api/v2/spans
  mtls:
    enabled: true
```

## Python Service Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "5000"
        dapr.io/config: "default"
        dapr.io/log-level: "info"
    spec:
      containers:
      - name: order-service
        image: myrepo/order-service-python:1.2.0
        ports:
        - containerPort: 5000
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

## Go Service Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: inventory-service
  template:
    metadata:
      labels:
        app: inventory-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "inventory-service"
        dapr.io/app-port: "8080"
        dapr.io/app-protocol: "grpc"
        dapr.io/config: "default"
    spec:
      containers:
      - name: inventory-service
        image: myrepo/inventory-service-go:2.1.0
        ports:
        - containerPort: 8080
```

## Java Notification Service with Pub/Sub

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "notification-service"
        dapr.io/app-port: "8080"
        dapr.io/config: "default"
    spec:
      containers:
      - name: notification-service
        image: myrepo/notification-service-java:1.0.5
```

## Applying All Resources

Deploy everything in dependency order:

```bash
# 1. Install Dapr on the cluster
dapr init -k

# 2. Create namespace
kubectl create namespace production

# 3. Deploy shared components
kubectl apply -f k8s/components/ -n production

# 4. Deploy Dapr configuration
kubectl apply -f k8s/config/ -n production

# 5. Deploy services
kubectl apply -f k8s/services/ -n production

# 6. Wait for all pods to be ready
kubectl wait --for=condition=ready pod \
  -l app=order-service \
  -n production \
  --timeout=120s
```

## Verifying Cross-Language Communication

```bash
# Test Python -> Go service invocation
kubectl run test-pod --image=curlimages/curl --rm -it --restart=Never \
  -- curl -s http://order-service.production.svc.cluster.local/orders \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"item": "widget", "quantity": 2}'
```

## Summary

Deploying polyglot Dapr services on Kubernetes requires only pod annotations - the actual deployment manifests are nearly identical across Python, Go, Java, and Node.js. Shared component definitions and a common Dapr Configuration resource provide consistent infrastructure access. Deploying components before services ensures they are loaded when sidecars initialize.
