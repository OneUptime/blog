# How to Deploy KEDA with RabbitMQ Trigger with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, KEDA, RabbitMQ, Autoscaling, Event-Driven, Messaging

Description: Deploy KEDA with RabbitMQ message queue trigger using Flux CD to automatically scale worker pods based on queue depth.

---

## Introduction

RabbitMQ is a widely used message broker for task queues and pub/sub messaging. When queue depth grows faster than workers can process messages, you need to scale out worker pods dynamically. KEDA's RabbitMQ scaler monitors queue depth via the RabbitMQ Management API and triggers pod scaling to match demand.

Managing this autoscaling configuration through Flux CD means your queue depth thresholds, worker limits, and authentication details are all version-controlled. Scaling policy changes go through code review before affecting production.

This guide covers configuring KEDA with the RabbitMQ trigger using Flux CD, supporting both HTTP (Management API) and AMQP protocol-based metrics.

## Prerequisites

- KEDA deployed on your Kubernetes cluster
- RabbitMQ cluster deployed with the Management plugin enabled
- Flux CD v2 bootstrapped to your Git repository
- A worker Deployment to autoscale

## Step 1: Create the TriggerAuthentication for RabbitMQ

```yaml
# clusters/my-cluster/keda-rabbitmq/trigger-auth.yaml
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-credentials
  namespace: app
type: Opaque
stringData:
  # RabbitMQ Management API connection string
  # Format: amqp://user:password@host:port/vhost
  host: "amqp://admin:password@rabbitmq.rabbitmq.svc.cluster.local:5672/"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: rabbitmq-trigger-auth
  namespace: app
spec:
  secretTargetRef:
    - parameter: host
      name: rabbitmq-credentials
      key: host
```

## Step 2: Create the ScaledObject

```yaml
# clusters/my-cluster/keda-rabbitmq/scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-worker-scaler
  namespace: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: task-worker
  minReplicaCount: 0
  maxReplicaCount: 20
  pollingInterval: 10
  cooldownPeriod: 90
  triggers:
    - type: rabbitmq
      metadata:
        # Protocol: amqp (for queue length) or http (for Management API)
        protocol: amqp
        # Queue name to monitor
        queueName: task-queue
        # Scale 1 replica per N messages in the queue
        queueLength: "5"
        # vhost for the queue
        vhostName: "/"
      authenticationRef:
        name: rabbitmq-trigger-auth
```

## Step 3: Deploy the Worker Application

```yaml
# clusters/my-cluster/keda-rabbitmq/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-worker
  namespace: app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: task-worker
  template:
    metadata:
      labels:
        app: task-worker
    spec:
      containers:
        - name: worker
          image: myregistry/task-worker:v2.0.0
          env:
            - name: RABBITMQ_URL
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-credentials
                  key: host
            - name: QUEUE_NAME
              value: "task-queue"
            # Number of messages to prefetch per worker
            - name: PREFETCH_COUNT
              value: "5"
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1"
              memory: "512Mi"
          # Graceful shutdown: finish current task before terminating
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]
          terminationGracePeriodSeconds: 60
```

## Step 4: Add a Pod Disruption Budget

```yaml
# clusters/my-cluster/keda-rabbitmq/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: task-worker-pdb
  namespace: app
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: task-worker
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/keda-rabbitmq/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - trigger-auth.yaml
  - worker-deployment.yaml
  - scaledobject.yaml
  - pdb.yaml
---
# clusters/my-cluster/flux-kustomization-keda-rabbitmq.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: keda-rabbitmq
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: keda
  path: ./clusters/my-cluster/keda-rabbitmq
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Test RabbitMQ-Based Scaling

```bash
# Check ScaledObject status
kubectl get scaledobject rabbitmq-worker-scaler -n app

# Publish test messages to trigger scaling
kubectl exec -n rabbitmq rabbitmq-0 -- rabbitmqadmin publish \
  exchange=amq.default routing_key=task-queue \
  payload='{"task": "process", "id": "1"}'

# Watch workers scale
kubectl get pods -n app -l app=task-worker -w

# Check queue depth via Management API
kubectl exec -n rabbitmq rabbitmq-0 -- rabbitmqadmin list queues name messages
```

## Best Practices

- Set PREFETCH_COUNT on your consumer equal to `queueLength` per replica to ensure KEDA's metric matches actual consumer throughput.
- Use `minReplicaCount: 0` for batch-style task workers that can tolerate cold starts, and `minReplicaCount: 1` for tasks that require low-latency response.
- Include a `preStop` lifecycle hook and a sufficient `terminationGracePeriodSeconds` so workers finish processing in-flight messages before the pod terminates during scale-down.
- Use a PodDisruptionBudget to prevent KEDA from scaling down too aggressively during rolling upgrades, preserving processing capacity.
- Prefer the `http` protocol for the RabbitMQ trigger when using the Management API — it provides richer metrics including message rates, not just queue depth.

## Conclusion

KEDA with a RabbitMQ trigger managed by Flux CD gives your team an automated approach to queue-depth-driven scaling. Worker counts automatically track queue backlog, preventing message accumulation during traffic spikes while scaling to zero during idle periods — all with the scaling policy defined declaratively in Git.
