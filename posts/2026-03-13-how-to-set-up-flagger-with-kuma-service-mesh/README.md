# How to Set Up Flagger with Kuma Service Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Kuma, Service Mesh, Canary, Kubernetes, Progressive Delivery, Traffic Routing

Description: Learn how to set up Flagger with Kuma service mesh for progressive canary deployments with automatic traffic management.

---

## Introduction

Kuma is a service mesh built on top of Envoy proxy, originally created by Kong. It supports both Kubernetes and universal (VM-based) deployments. Flagger integrates with Kuma to perform progressive canary deployments using Kuma's TrafficRoute resource for traffic splitting.

The Flagger-Kuma integration uses Kuma's native traffic management capabilities to shift traffic between primary and canary workloads. Kuma provides built-in metrics through its integration with Prometheus, which Flagger uses to evaluate canary health during analysis.

This guide walks through setting up Kuma, installing Flagger with the Kuma mesh provider, and configuring a canary deployment.

## Prerequisites

- A running Kubernetes cluster
- Helm installed
- kubectl access to your cluster
- `kumactl` CLI installed

## Step 1: Install Kuma

Install Kuma using Helm:

```bash
helm repo add kuma https://kumahq.github.io/charts
helm repo update

helm install kuma kuma/kuma \
  --namespace kuma-system \
  --create-namespace \
  --set controlPlane.mode=standalone
```

Verify the installation:

```bash
kubectl get pods -n kuma-system
```

Wait for the Kuma control plane pods to be ready.

## Step 2: Enable Metrics

Kuma needs Prometheus metrics enabled for Flagger to evaluate canary health. Enable the built-in metrics:

```yaml
apiVersion: kuma.io/v1alpha1
kind: Mesh
metadata:
  name: default
spec:
  metrics:
    enabledBackend: prometheus-1
    backends:
      - name: prometheus-1
        type: prometheus
        conf:
          port: 5670
          path: /metrics
          skipMTLS: true
```

Apply this Mesh configuration:

```bash
kubectl apply -f mesh.yaml
```

Deploy Prometheus to scrape Kuma metrics:

```bash
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --create-namespace \
  --set server.persistentVolume.enabled=false \
  --set alertmanager.enabled=false
```

Configure Prometheus to scrape Kuma's metrics endpoints by adding the appropriate scrape configuration for the mesh dataplane proxy metrics.

## Step 3: Install Flagger

Install Flagger with the Kuma mesh provider:

```bash
helm repo add flagger https://flagger.app

helm upgrade -i flagger flagger/flagger \
  --namespace kuma-system \
  --set meshProvider=kuma \
  --set metricsServer=http://prometheus-server.monitoring:80
```

The `meshProvider=kuma` flag configures Flagger to use Kuma's traffic management resources. The `metricsServer` points to your Prometheus instance.

## Step 4: Install the Load Tester

Deploy the Flagger load tester:

```bash
helm upgrade -i flagger-loadtester flagger/loadtester \
  --namespace test \
  --create-namespace
```

Enable Kuma sidecar injection for the test namespace:

```bash
kubectl annotate namespace test kuma.io/sidecar-injection=enabled
kubectl -n test rollout restart deploy flagger-loadtester
```

## Step 5: Prepare the Application Namespace

Create a namespace with Kuma sidecar injection:

```bash
kubectl create namespace demo
kubectl annotate namespace demo kuma.io/sidecar-injection=enabled
```

## Step 6: Deploy the Application

Deploy a sample application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: demo
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

Apply the deployment:

```bash
kubectl apply -f deployment.yaml
```

## Step 7: Create the Canary Resource

Create a Canary resource for Kuma:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: demo
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  service:
    port: 9898
    targetPort: 9898
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 5
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
          cmd: "curl -sf http://podinfo-canary.demo:9898/healthz"
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://podinfo-canary.demo:9898/"
```

Apply the Canary:

```bash
kubectl apply -f canary.yaml
```

Wait for initialization:

```bash
kubectl -n demo get canary podinfo -w
```

## Step 8: Trigger a Canary Deployment

Update the container image:

```bash
kubectl -n demo set image deployment/podinfo podinfo=stefanprodan/podinfo:6.0.1
```

Watch the deployment progress:

```bash
kubectl -n demo describe canary podinfo
```

Flagger creates a TrafficRoute that splits traffic between the primary and canary services, updating the weights at each analysis step.

## How Kuma Traffic Routing Works with Flagger

Flagger creates a Kuma TrafficRoute resource that controls traffic distribution. The TrafficRoute uses Kuma's traffic management to split traffic between the primary and canary destinations:

During analysis, the traffic distribution follows the step weight configuration:

- Step 1: 95% primary, 5% canary
- Step 2: 90% primary, 10% canary
- And so on until `maxWeight` is reached

After successful analysis, Flagger promotes the canary by updating the primary Deployment and resetting the TrafficRoute to send 100% of traffic to the primary.

## Custom Metrics with Kuma

For custom metrics beyond the built-in success rate and duration, create MetricTemplates that query Kuma's Prometheus metrics:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate-kuma
  namespace: demo
spec:
  provider:
    type: prometheus
    address: http://prometheus-server.monitoring:80
  query: |
    sum(rate(
      envoy_cluster_upstream_rq{
        envoy_cluster_name="demo_podinfo-canary_demo_svc_9898",
        envoy_response_code=~"5.*"
      }[{{ interval }}]
    ))
    /
    sum(rate(
      envoy_cluster_upstream_rq{
        envoy_cluster_name="demo_podinfo-canary_demo_svc_9898"
      }[{{ interval }}]
    ))
    * 100
```

Kuma uses Envoy under the hood, so the metric names follow Envoy conventions. The exact metric names and labels depend on your Kuma version and configuration.

## Verifying the Setup

Check the resources Flagger created:

```bash
kubectl -n demo get deploy
kubectl -n demo get svc
kubectl -n demo get canary
```

You should see the original Deployment, plus the `podinfo-primary` Deployment that Flagger manages, along with the corresponding Services.

## Conclusion

Setting up Flagger with Kuma involves installing the Kuma control plane with metrics enabled, deploying Flagger with the Kuma mesh provider, and creating Canary resources that target your Deployments. Flagger uses Kuma's traffic management capabilities to progressively shift traffic during canary analysis. The setup is similar to other Flagger integrations, with the main differences being Kuma-specific namespace annotations for sidecar injection and the Envoy-based metric names used in custom MetricTemplates.
