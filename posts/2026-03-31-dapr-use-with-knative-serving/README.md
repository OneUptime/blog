# How to Use Dapr with Knative Serving

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Knative, Serverless, Scale to Zero, Event-Driven

Description: Learn how to combine Dapr building blocks with Knative Serving to run Dapr-enabled services that scale to zero and receive events through Knative Eventing.

---

Knative Serving provides scale-to-zero serverless capabilities on Kubernetes, while Dapr provides application building blocks. Combining them lets you run event-driven Dapr services that hibernate when idle and scale up on demand.

## How Knative and Dapr Complement Each Other

Knative Serving handles:
- Scale-to-zero based on request queue depth
- Traffic splitting for canary deployments
- Automatic HTTPS via cert-manager

Dapr handles:
- State management, pub/sub, secrets, and service invocation
- mTLS between services
- Resiliency policies

## Installing Both

```bash
# Install Knative Serving
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.16.0/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.16.0/serving-core.yaml

# Install Kourier (networking layer)
kubectl apply -f https://github.com/knative/net-kourier/releases/download/knative-v1.16.0/kourier.yaml
kubectl patch configmap config-network -n knative-serving \
  --patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'

# Install Dapr
dapr init -k
```

## Creating a Dapr-Enabled Knative Service

Knative Service (ksvc) pods can include Dapr sidecar annotations:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: order-processor
  namespace: production
spec:
  template:
    metadata:
      annotations:
        # Knative annotations
        autoscaling.knative.dev/min-scale: "0"
        autoscaling.knative.dev/max-scale: "20"
        autoscaling.knative.dev/target: "100"
        # Dapr annotations
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-processor"
        dapr.io/app-port: "8080"
        dapr.io/config: "dapr-config"
    spec:
      containers:
        - image: myrepo/order-processor:latest
          ports:
            - containerPort: 8080
```

## Scale-to-Zero Considerations

When a Knative service scales to zero, the Dapr sidecar also terminates. This means:

- Active pub/sub subscriptions are paused while scaled to zero
- Long-running Dapr workflows should not be hosted in scale-to-zero services
- State operations resume immediately when the service scales back up

For pub/sub-driven scale-to-zero, use Knative Eventing as the trigger:

```yaml
apiVersion: sources.knative.dev/v1
kind: ApiServerSource
metadata:
  name: k8s-event-source
spec:
  serviceAccountName: default
  resources:
    - apiVersion: v1
      kind: Event
  sink:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-processor
```

## Traffic Splitting for Canary Deployments

Knative's traffic splitting works alongside Dapr:

```yaml
spec:
  traffic:
    - tag: current
      revisionName: order-processor-v1
      percent: 90
    - tag: canary
      revisionName: order-processor-v2
      percent: 10
```

Both revisions use the same Dapr components - the component YAML is applied at the namespace level and shared across all revisions.

## Observability

Knative and Dapr both emit metrics. Scrape both in Prometheus:

```yaml
# Prometheus scrape config
scrape_configs:
  - job_name: knative-serving
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_serving_knative_dev_revision]
        action: keep
        regex: .+
  - job_name: dapr-sidecar
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_app_id]
        action: keep
        regex: .+
```

## Summary

Dapr and Knative Serving complement each other by combining scale-to-zero serverless hosting with Dapr's application building blocks. Add Dapr sidecar annotations to Knative Service templates, use Knative Eventing as the trigger mechanism for pub/sub-driven scaling, and leverage Knative's traffic splitting for canary deployments of Dapr-enabled services.
