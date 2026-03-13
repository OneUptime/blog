# How to Set Up Flagger with Apache APISIX Ingress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flagger, apisix, ingress, canary, kubernetes, progressive delivery, traffic splitting

Description: Learn how to set up Flagger with Apache APISIX ingress controller for progressive canary deployments with automatic traffic management.

---

## Introduction

Apache APISIX is a dynamic, high-performance API gateway and ingress controller for Kubernetes. Flagger integrates with APISIX to perform progressive canary deployments using APISIX's traffic splitting capabilities through its ApisixRoute custom resource.

When Flagger operates with APISIX as its provider, it manages ApisixRoute resources to control traffic distribution between primary and canary workloads. APISIX handles the actual traffic routing at the ingress level, while Flagger automates the weight updates based on canary health metrics.

This guide walks through setting up Apache APISIX, installing Flagger with the APISIX provider, and configuring canary deployments.

## Prerequisites

- A running Kubernetes cluster
- Helm installed
- kubectl access to your cluster
- Prometheus installed for metrics collection

## Step 1: Install Apache APISIX

Install APISIX and the APISIX Ingress Controller using Helm:

```bash
helm repo add apisix https://charts.apiseven.com
helm repo update

helm install apisix apisix/apisix \
  --namespace apisix \
  --create-namespace \
  --set gateway.type=NodePort \
  --set ingress-controller.enabled=true \
  --set ingress-controller.config.apisix.serviceNamespace=apisix
```

Verify the installation:

```bash
kubectl get pods -n apisix
```

Wait for the APISIX gateway and ingress controller pods to be ready.

## Step 2: Install Prometheus

APISIX exports metrics that Prometheus can scrape. Install Prometheus:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --create-namespace \
  --set server.persistentVolume.enabled=false \
  --set alertmanager.enabled=false
```

Configure APISIX to expose Prometheus metrics by enabling the prometheus plugin in the APISIX configuration.

## Step 3: Install Flagger

Install Flagger with the APISIX provider:

```bash
helm repo add flagger https://flagger.app

helm upgrade -i flagger flagger/flagger \
  --namespace apisix \
  --set meshProvider=apisix \
  --set metricsServer=http://prometheus-server.monitoring:80
```

## Step 4: Install the Load Tester

Deploy the Flagger load tester:

```bash
helm upgrade -i flagger-loadtester flagger/loadtester \
  --namespace test \
  --create-namespace
```

## Step 5: Deploy the Application

Deploy a sample application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: default
  labels:
    app: podinfo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: podinfo
  template:
    metadata:
      labels:
        app: podinfo
    spec:
      containers:
        - name: podinfo
          image: stefanprodan/podinfo:6.0.0
          ports:
            - containerPort: 9898
              name: http
          command:
            - ./podinfo
            - --port=9898
```

Apply it:

```bash
kubectl apply -f deployment.yaml
```

## Step 6: Create the Canary Resource

Create a Canary resource for APISIX. The key difference from other providers is the service spec configuration for APISIX routing:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  service:
    port: 9898
    targetPort: 9898
    hosts:
      - podinfo.example.com
    apex:
      annotations:
        k8s.apisix.apache.org/upstream-hash-by: "consumer_name"
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
    webhooks:
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sf http://podinfo-canary.default:9898/healthz"
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 -host podinfo.example.com http://apisix-gateway.apisix/"
```

Apply the Canary:

```bash
kubectl apply -f canary.yaml
```

## How APISIX Traffic Routing Works with Flagger

Flagger creates an ApisixRoute resource that defines traffic splitting between the primary and canary upstreams. During canary analysis, Flagger updates the route to adjust the weight distribution:

```yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: podinfo
  namespace: default
spec:
  http:
    - name: podinfo
      match:
        hosts:
          - podinfo.example.com
        paths:
          - /*
      backends:
        - serviceName: podinfo-primary
          servicePort: 9898
          weight: 90
        - serviceName: podinfo-canary
          servicePort: 9898
          weight: 10
```

Flagger manages this resource automatically, updating the `weight` values at each analysis step.

## Step 7: Trigger a Canary Deployment

Update the container image to trigger the canary:

```bash
kubectl set image deployment/podinfo podinfo=stefanprodan/podinfo:6.0.1
```

Watch the progress:

```bash
kubectl describe canary podinfo
```

## Custom Metrics for APISIX

APISIX exports metrics through its Prometheus plugin. Create MetricTemplates that query APISIX-specific metrics:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: apisix-error-rate
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus-server.monitoring:80
  query: |
    sum(rate(
      apisix_http_status{
        route=~".*{{ target }}.*",
        code=~"5.."
      }[{{ interval }}]
    ))
    /
    sum(rate(
      apisix_http_status{
        route=~".*{{ target }}.*"
      }[{{ interval }}]
    ))
    * 100
```

The metric names and labels depend on APISIX's Prometheus plugin configuration. Verify the actual metric names in your Prometheus instance.

## Load Testing Through APISIX Gateway

When load testing with APISIX, you can target either the canary service directly (for metrics that use service-level monitoring) or the APISIX gateway (for end-to-end testing):

```yaml
    webhooks:
      - name: load-test-via-gateway
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: >
            hey -z 1m -q 10 -c 2
            -host podinfo.example.com
            http://apisix-gateway.apisix/
      - name: load-test-direct
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://podinfo-canary.default:9898/"
```

Testing through the gateway exercises the full APISIX routing path, while direct testing targets the canary service specifically.

## Conclusion

Flagger integrates with Apache APISIX by managing ApisixRoute resources for traffic splitting during canary deployments. The setup involves installing APISIX with its ingress controller, deploying Flagger with the APISIX mesh provider, and creating Canary resources that define the service and analysis configuration. APISIX handles traffic routing at the ingress level, while Flagger automates the progressive weight updates based on metric analysis. Custom metrics can query APISIX's Prometheus plugin for gateway-level measurements.
