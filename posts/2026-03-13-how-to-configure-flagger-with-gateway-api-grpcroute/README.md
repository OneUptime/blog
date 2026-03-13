# How to Configure Flagger with Gateway API GRPCRoute

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Gateway API, GRPCRoute, Kubernetes, gRPC, Canary Deployments

Description: Learn how to configure Flagger with Kubernetes Gateway API GRPCRoute for progressive delivery of gRPC services.

---

## Introduction

gRPC is a high-performance remote procedure call framework widely used for microservices communication. When deploying gRPC services on Kubernetes, the Gateway API provides a dedicated GRPCRoute resource that handles gRPC-specific routing concerns such as service and method matching. Flagger supports GRPCRoute for progressive delivery, enabling automated canary deployments for gRPC workloads with traffic splitting and metric-based analysis.

This guide covers setting up Flagger with Gateway API GRPCRoute to automate canary deployments for gRPC services. You will learn how to configure the Gateway, define GRPCRoute resources, and create Flagger Canary resources that manage traffic splitting for gRPC traffic.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster running version 1.24 or later.
- `kubectl` installed and configured.
- Helm 3 installed.
- Gateway API CRDs installed, including the experimental channel for GRPCRoute support.
- A Gateway API controller that supports GRPCRoute (such as Envoy Gateway or Istio).
- Prometheus installed for metrics collection.

## Installing Gateway API CRDs with GRPCRoute Support

GRPCRoute may require the experimental channel of the Gateway API CRDs. Install them as follows.

```bash
# Install Gateway API CRDs including experimental resources
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/experimental-install.yaml
```

## Setting Up the Gateway

Create a Gateway that listens for gRPC traffic. Configure it with HTTP/2 support since gRPC operates over HTTP/2.

```yaml
# gateway.yaml
# Gateway resource configured for gRPC traffic
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: grpc-gateway
  namespace: test
spec:
  gatewayClassName: envoy
  listeners:
    - name: grpc
      protocol: HTTP
      port: 50051
      allowedRoutes:
        namespaces:
          from: Same
```

Apply the Gateway.

```bash
kubectl apply -f gateway.yaml
```

## Installing Flagger for Gateway API

Install Flagger with the Gateway API provider.

```bash
helm repo add flagger https://flagger.app

helm install flagger flagger/flagger \
  --namespace flagger-system \
  --create-namespace \
  --set meshProvider=gatewayapi \
  --set metricsServer=http://prometheus.monitoring:9090
```

## Deploying a gRPC Application

Deploy a gRPC service with the appropriate Deployment and Service resources.

```yaml
# grpc-app.yaml
# gRPC application deployment and service
apiVersion: v1
kind: Namespace
metadata:
  name: test
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-service
  namespace: test
  labels:
    app: grpc-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: grpc-service
  template:
    metadata:
      labels:
        app: grpc-service
    spec:
      containers:
        - name: grpc-service
          image: myregistry/grpc-service:v1.0.0
          ports:
            - containerPort: 50051
              name: grpc
              protocol: TCP
          readinessProbe:
            grpc:
              port: 50051
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: grpc-service
  namespace: test
spec:
  type: ClusterIP
  selector:
    app: grpc-service
  ports:
    - name: grpc
      port: 50051
      targetPort: 50051
      protocol: TCP
      appProtocol: grpc
```

Apply the resources.

```bash
kubectl apply -f grpc-app.yaml
```

## Creating the GRPCRoute

Define a GRPCRoute that routes gRPC traffic through the Gateway to your service. You can match on specific gRPC services and methods.

```yaml
# grpcroute.yaml
# Gateway API GRPCRoute for gRPC traffic routing
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: grpc-service
  namespace: test
spec:
  parentRefs:
    - name: grpc-gateway
      namespace: test
  hostnames:
    - grpc.example.com
  rules:
    - matches:
        - method:
            service: myapp.v1.MyService
      backendRefs:
        - name: grpc-service
          port: 50051
```

Apply the GRPCRoute.

```bash
kubectl apply -f grpcroute.yaml
```

## Configuring the Flagger Canary Resource for gRPC

Create a Canary resource that references the GRPCRoute for traffic management during canary analysis.

```yaml
# canary.yaml
# Flagger Canary resource for Gateway API GRPCRoute
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: grpc-service
  namespace: test
spec:
  provider: gatewayapi
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: grpc-service
  progressDeadlineSeconds: 60
  service:
    port: 50051
    targetPort: 50051
    appProtocol: grpc
    gatewayRefs:
      - name: grpc-gateway
        namespace: test
        group: gateway.networking.k8s.io
        kind: Gateway
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
```

Apply the Canary resource.

```bash
kubectl apply -f canary.yaml
```

## How Flagger Manages GRPCRoute Traffic Splitting

During canary analysis, Flagger updates the GRPCRoute backendRefs to split traffic between the primary and canary services using weights.

```yaml
# Example GRPCRoute during canary analysis (managed by Flagger)
spec:
  rules:
    - matches:
        - method:
            service: myapp.v1.MyService
      backendRefs:
        - name: grpc-service-primary
          port: 50051
          weight: 80
        - name: grpc-service-canary
          port: 50051
          weight: 20
```

The weights are adjusted at each analysis interval based on your stepWeight configuration and metric results.

## Monitoring gRPC Canary Metrics

For gRPC services, ensure your metrics pipeline captures gRPC-specific status codes. You can define custom metric templates that evaluate gRPC success rates.

```yaml
# metric-template.yaml
# Custom metric template for gRPC success rate
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: grpc-success-rate
  namespace: test
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    sum(rate(grpc_server_handled_total{
      grpc_code!~"Unknown|Unimplemented|Internal|Unavailable|DataLoss",
      kubernetes_namespace="{{ namespace }}",
      kubernetes_pod_name=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
    }[{{ interval }}]))
    /
    sum(rate(grpc_server_handled_total{
      kubernetes_namespace="{{ namespace }}",
      kubernetes_pod_name=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
    }[{{ interval }}]))
    * 100
```

Reference this custom metric in your Canary resource analysis section.

```yaml
    metrics:
      - name: grpc-success-rate
        templateRef:
          name: grpc-success-rate
          namespace: test
        thresholdRange:
          min: 99
        interval: 1m
```

## Triggering a Canary Deployment

Update the container image to start a canary deployment.

```bash
kubectl set image deployment/grpc-service \
  grpc-service=myregistry/grpc-service:v1.1.0 -n test

# Monitor the canary
kubectl get canary grpc-service -n test -w
```

## Conclusion

Configuring Flagger with Gateway API GRPCRoute enables automated progressive delivery for gRPC services using the Kubernetes-native Gateway API routing model. The GRPCRoute resource provides gRPC-aware routing with service and method matching, and Flagger's integration allows you to safely roll out new versions with automated metric analysis and traffic shifting. This approach is ideal for teams running gRPC workloads who want to adopt the Gateway API standard for traffic management.
