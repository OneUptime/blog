# What is KEDA and How to Implement It in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KEDA, Autoscaling, DevOps, Cloud Native

Description: Learn what KEDA (Kubernetes Event-Driven Autoscaling) is, why it matters, and how to implement it in your Kubernetes cluster for event-driven, production-grade autoscaling.

---

Kubernetes Horizontal Pod Autoscaler (HPA) is great for scaling workloads based on CPU and memory. But what if you want to scale based on queue length, database records, or custom metrics? Enter **KEDA**—Kubernetes Event-Driven Autoscaling.

KEDA lets you scale any container in Kubernetes based on the number of events needing to be processed, not just resource usage. It supports dozens of event sources (Kafka, RabbitMQ, AWS SQS, Azure Queue, Prometheus, HTTP, and more) and is production-ready for both cloud and on-prem clusters.

## What is KEDA?

KEDA is an open-source project that acts as a Kubernetes Metrics Server and a custom controller. It enables event-driven autoscaling by monitoring external event sources and scaling your deployments accordingly.

- **Event-driven:** Scale up when there are messages to process, scale down to zero when idle.
- **Pluggable:** Supports 50+ scalers (Kafka, SQS, Prometheus, Redis, HTTP, etc.)
- **Lightweight:** Deploys as a single pod and CRDs, no heavy dependencies.
- **Works with HPA:** KEDA creates and manages HPAs for you, using custom metrics.

## When Should You Use KEDA?

- **Queue-based workloads:** Workers that process jobs from RabbitMQ, Kafka, SQS, etc.
- **Serverless patterns:** Scale to zero when idle, scale up instantly on demand.
- **Custom metrics:** Scale on anything you can expose as a metric (HTTP requests, database rows, etc.)
- **Cost optimization:** Avoid running idle pods, pay only for what you use.

## How KEDA Works

1. **Scaler:** KEDA monitors an event source (e.g., queue length).
2. **ScaledObject:** You define a ScaledObject CRD that links your deployment to the scaler.
3. **Metrics Adapter:** KEDA exposes custom metrics to the Kubernetes HPA.
4. **Autoscaling:** KEDA creates an HPA that scales your deployment based on the event source.

## Installing KEDA

KEDA can be installed via Helm or with kubectl manifests. Here’s the Helm method (recommended):

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm install keda kedacore/keda --namespace keda --create-namespace
```

Verify installation:

```bash
kubectl get pods -n keda
```

## Example: Autoscale a Worker Based on RabbitMQ Queue Length

Suppose you have a deployment that processes jobs from a RabbitMQ queue. You want to scale the number of workers based on the queue length.

### Step 1: Deploy Your Worker

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-worker
spec:
  replicas: 1
  selector:
    matchLabels:
      app: queue-worker
  template:
    metadata:
      labels:
        app: queue-worker
    spec:
      containers:
        - name: worker
          image: mycompany/worker:latest
          env:
            - name: RABBITMQ_HOST
              value: rabbitmq.default.svc.cluster.local
            - name: QUEUE_NAME
              value: jobs
```

### Step 2: Create a KEDA ScaledObject

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: queue-worker-scaledobject
spec:
  scaleTargetRef:
    name: queue-worker
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
    - type: rabbitmq
      metadata:
        host: "amqp://guest:guest@rabbitmq.default.svc.cluster.local:5672/"
        queueName: jobs
        queueLength: "5"  # Scale up when >5 messages
```

Apply both manifests:

```bash
kubectl apply -f worker-deployment.yaml
kubectl apply -f scaledobject.yaml
```

KEDA will now monitor the RabbitMQ queue and scale your worker deployment up or down based on the number of messages.

## Example: Autoscale Based on Prometheus Metrics

You can scale on any Prometheus metric (e.g., HTTP requests per second):

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-autoscaler
spec:
  scaleTargetRef:
    name: api-deployment
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring.svc.cluster.local:9090
        metricName: http_requests_total
        threshold: '100'
        query: sum(rate(http_requests_total[1m]))
```

## Supported Event Sources (Scalers)

KEDA supports 50+ scalers, including:
- RabbitMQ, Kafka, AWS SQS, Azure Queue, Google Pub/Sub
- Prometheus, Redis, MongoDB, MySQL, PostgreSQL
- HTTP, Cron, Azure Monitor, GCP Stackdriver
- Custom external metrics

See the full list: https://keda.sh/docs/2.14/scalers/

## Best Practices

- **Set minReplicaCount to 0** for true scale-to-zero (serverless pattern)
- **Use resource requests/limits** on your containers for predictable scaling
- **Monitor KEDA and HPA events** for troubleshooting
- **Test with real workloads** to tune thresholds and maxReplicaCount
- **Secure event source credentials** (use Kubernetes Secrets)

## Troubleshooting

- **Pods not scaling?** Check KEDA and HPA events: `kubectl get events -n keda`
- **Metrics not found?** Ensure your scaler is configured correctly and event source is reachable
- **Scale-to-zero not working?** Set `minReplicaCount: 0` and check for pending events

## TL;DR Quick Start

1. **Install KEDA** with Helm or kubectl
2. **Deploy your workload** (Deployment, StatefulSet, etc.)
3. **Create a ScaledObject** for your event source
4. **Watch KEDA scale your pods** up and down based on real-world events

---

**Related Reading:**

- [Kubernetes Storage Layers: Ceph vs. Longhorn vs. Everything Else](https://oneuptime.com/blog/post/2025-11-27-choosing-kubernetes-storage-layers/view)
- [How to configure MetalLB with Kubernetes (Microk8s)](https://oneuptime.com/blog/post/2023-11-06-configure-metallb-with-kubernetes-microk8s/view)
- [How to Use NAS Storage with Kubernetes: NFS, SMB, and iSCSI Volumes](https://oneuptime.com/blog/post/2025-12-15-how-to-use-nas-storage-with-kubernetes/view)
