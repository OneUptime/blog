# How to Set Up Flagger with Knative Serving

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flagger, knative, serving, canary, kubernetes, progressive delivery, serverless, traffic splitting

Description: Learn how to set up Flagger with Knative Serving for progressive canary deployments of serverless workloads with automatic traffic management.

---

## Introduction

Knative Serving provides a serverless platform on Kubernetes with features like automatic scaling, revision management, and traffic splitting. Flagger integrates with Knative to add progressive delivery capabilities to Knative Services, using Knative's built-in traffic management to gradually shift traffic between revisions.

Unlike traditional Deployment-based canaries where Flagger manages the routing layer (VirtualService, TrafficSplit, etc.), with Knative, Flagger manages traffic percentages on the Knative Service resource itself. Knative handles the underlying routing through its networking layer.

This guide covers setting up Flagger with Knative Serving, creating canary resources for Knative Services, and configuring analysis for serverless workloads.

## Prerequisites

- A running Kubernetes cluster
- Knative Serving installed with a networking layer (Istio, Kourier, or Contour)
- Prometheus installed and configured to scrape Knative metrics
- Helm installed
- kubectl access to your cluster

## Step 1: Install Knative Serving

If you have not already installed Knative Serving, install the core components:

```bash
kubectl apply -f https://github.com/knative/serving/releases/latest/download/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/latest/download/serving-core.yaml
```

Install a networking layer. For Kourier (a lightweight option):

```bash
kubectl apply -f https://github.com/knative/net-kourier/releases/latest/download/kourier.yaml

kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'
```

## Step 2: Install Flagger

Install Flagger with the Knative mesh provider:

```bash
helm repo add flagger https://flagger.app

helm upgrade -i flagger flagger/flagger \
  --namespace knative-serving \
  --set meshProvider=knative \
  --set metricsServer=http://prometheus-server.monitoring:80
```

The `meshProvider=knative` flag tells Flagger to manage traffic through Knative Service resources.

## Step 3: Install the Load Tester

Deploy the load tester:

```bash
helm upgrade -i flagger-loadtester flagger/loadtester \
  --namespace test \
  --create-namespace
```

## Step 4: Deploy a Knative Service

Create a Knative Service:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: podinfo
  namespace: default
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
    spec:
      containers:
        - image: stefanprodan/podinfo:6.0.0
          ports:
            - containerPort: 9898
```

Apply the service:

```bash
kubectl apply -f knative-service.yaml
```

The `autoscaling.knative.dev/minScale: "1"` annotation prevents the service from scaling to zero during canary analysis, ensuring that Flagger can evaluate metrics consistently.

## Step 5: Create the Canary Resource

For Knative, the Canary resource targets the Knative Service instead of a Deployment:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: default
spec:
  targetRef:
    apiVersion: serving.knative.dev/v1
    kind: Service
    name: podinfo
  service:
    port: 80
    targetPort: 9898
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
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://podinfo.default/"
```

Note that the `targetRef` uses `apiVersion: serving.knative.dev/v1` and `kind: Service` instead of the typical `apps/v1` Deployment reference.

Apply the Canary:

```bash
kubectl apply -f canary.yaml
```

## Step 6: Trigger a Canary Deployment

Update the Knative Service to trigger a new revision:

```bash
kubectl patch service podinfo \
  --namespace default \
  --type merge \
  --patch '{"spec":{"template":{"spec":{"containers":[{"image":"stefanprodan/podinfo:6.0.1","name":"user-container"}]}}}}'
```

Flagger detects the new revision and starts the canary analysis. It manages the traffic splitting through the Knative Service's `traffic` stanza.

## How Flagger Manages Knative Traffic

During canary analysis, Flagger updates the Knative Service traffic configuration:

```yaml
spec:
  traffic:
    - revisionName: podinfo-00001
      percent: 90
      tag: stable
    - revisionName: podinfo-00002
      percent: 10
      tag: canary
```

At each analysis step, Flagger increases the canary percentage and decreases the stable percentage according to the step weight configuration. Knative's networking layer handles the actual traffic routing based on these percentages.

## Custom Metrics for Knative

When using Knative with Istio as the networking layer, you can use Istio-based metrics:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: knative-success-rate
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus-server.monitoring:80
  query: |
    sum(rate(
      istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}",
        response_code!~"5.*"
      }[{{ interval }}]
    ))
    /
    sum(rate(
      istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}"
      }[{{ interval }}]
    ))
    * 100
```

When using Kourier or Contour as the networking layer, you need application-level metrics or Knative's built-in metrics for canary evaluation.

## Scaling Considerations

Knative's auto-scaling can affect canary analysis:

- If the canary scales to zero during analysis, metrics become unavailable. Use `minScale: "1"` to prevent this.
- During scale-up, initial requests may have higher latency. Account for this in your latency thresholds.
- The `window` annotation controls the scaling window:

```yaml
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
        autoscaling.knative.dev/window: "60s"
```

## Monitoring the Deployment

Watch the canary progress:

```bash
kubectl get canary podinfo -w
```

Check the Knative Service traffic configuration:

```bash
kubectl get ksvc podinfo -o yaml | grep -A 20 "traffic:"
```

View Flagger events:

```bash
kubectl describe canary podinfo
```

## Complete Example

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: default
spec:
  targetRef:
    apiVersion: serving.knative.dev/v1
    kind: Service
    name: podinfo
  service:
    port: 80
    targetPort: 9898
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
    webhooks:
      - name: smoke-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sf http://podinfo.default/"
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://podinfo.default/"
```

## Conclusion

Flagger integrates with Knative Serving by managing traffic percentages on the Knative Service resource, leveraging Knative's built-in revision management and traffic splitting. The setup involves installing Flagger with the Knative mesh provider and creating Canary resources that target Knative Services instead of Deployments. Key considerations include preventing scale-to-zero during analysis and configuring metrics that match your Knative networking layer. The result is progressive delivery for serverless workloads with the same metric-based analysis that Flagger provides for traditional Deployments.
