# How to Deploy KEDA ScaledObjects with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, KEDA, Event-Driven Autoscaling

Description: Learn how to deploy KEDA ScaledObjects with ArgoCD for event-driven autoscaling that scales based on queue depth, message rates, and custom metrics.

---

KEDA (Kubernetes Event-Driven Autoscaling) extends Kubernetes autoscaling beyond CPU and memory. It lets you scale workloads based on event sources like message queues, databases, HTTP request rates, and dozens of other triggers. Deploying KEDA with ArgoCD requires handling CRD dependencies, authentication for event sources, and the same replica count conflicts you see with standard HPAs.

## Installing KEDA with ArgoCD

Deploy KEDA itself as an ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: keda
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  project: platform
  source:
    repoURL: https://kedacore.github.io/charts
    chart: keda
    targetRevision: 2.13.0
    helm:
      values: |
        resources:
          operator:
            requests:
              cpu: 100m
              memory: 256Mi
          metricsApiServer:
            requests:
              cpu: 100m
              memory: 256Mi
        prometheus:
          metricServer:
            enabled: true
          operator:
            enabled: true
        podAnnotations:
          prometheus.io/scrape: "true"
  destination:
    server: https://kubernetes.default.svc
    namespace: keda
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

KEDA installs several CRDs including ScaledObject, ScaledJob, TriggerAuthentication, and ClusterTriggerAuthentication. These must be installed before any ScaledObject resources, so deploying KEDA as a separate Application with a negative sync wave ensures proper ordering.

## Basic ScaledObject for Queue-Based Scaling

Here is a ScaledObject that scales a worker deployment based on RabbitMQ queue depth:

```yaml
# scaled-object.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor
  namespace: production
spec:
  scaleTargetRef:
    name: order-processor  # Name of the Deployment to scale
  pollingInterval: 15      # How often KEDA checks the trigger (seconds)
  cooldownPeriod: 60       # How long to wait before scaling to zero
  minReplicaCount: 1       # Minimum replicas (0 for scale-to-zero)
  maxReplicaCount: 50      # Maximum replicas
  triggers:
    - type: rabbitmq
      metadata:
        queueName: orders
        queueLength: "10"  # Scale up when queue has more than 10 messages per replica
        host: amqp://guest:guest@rabbitmq.production.svc.cluster.local:5672
```

## Authentication for Event Sources

Hardcoding credentials in the ScaledObject is not safe. Use TriggerAuthentication to reference secrets:

```yaml
# trigger-auth.yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: rabbitmq-auth
  namespace: production
spec:
  secretTargetRef:
    - parameter: host
      name: rabbitmq-credentials
      key: connection-string

---
# Kubernetes secret with the connection string
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-credentials
  namespace: production
type: Opaque
stringData:
  connection-string: "amqp://user:password@rabbitmq.production.svc.cluster.local:5672"
```

Reference the TriggerAuthentication in the ScaledObject:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor
  namespace: production
spec:
  scaleTargetRef:
    name: order-processor
  pollingInterval: 15
  cooldownPeriod: 60
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
    - type: rabbitmq
      metadata:
        queueName: orders
        queueLength: "10"
      authenticationRef:
        name: rabbitmq-auth
```

For cluster-wide authentication (useful when multiple namespaces need the same credentials):

```yaml
apiVersion: keda.sh/v1alpha1
kind: ClusterTriggerAuthentication
metadata:
  name: aws-credentials
spec:
  secretTargetRef:
    - parameter: awsAccessKeyID
      name: aws-creds
      key: access-key-id
    - parameter: awsSecretAccessKey
      name: aws-creds
      key: secret-access-key
```

## Common KEDA Trigger Examples

### AWS SQS Queue

```yaml
triggers:
  - type: aws-sqs-queue
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789/my-queue
      queueLength: "5"
      awsRegion: us-east-1
    authenticationRef:
      name: aws-auth
      kind: ClusterTriggerAuthentication
```

### Kafka Consumer Group Lag

```yaml
triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka.production.svc.cluster.local:9092
      consumerGroup: order-processor
      topic: orders
      lagThreshold: "100"  # Scale when lag exceeds 100 messages
    authenticationRef:
      name: kafka-auth
```

### Prometheus Metrics

```yaml
triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring.svc.cluster.local:9090
      metricName: http_requests_per_second
      query: sum(rate(http_requests_total{service="backend-api"}[2m]))
      threshold: "1000"  # Scale when requests exceed 1000/s
```

### Redis List Length

```yaml
triggers:
  - type: redis
    metadata:
      address: redis.production.svc.cluster.local:6379
      listName: task-queue
      listLength: "20"
    authenticationRef:
      name: redis-auth
```

### Cron-Based Scaling

```yaml
triggers:
  - type: cron
    metadata:
      timezone: America/New_York
      start: "0 8 * * 1-5"    # Scale up at 8 AM weekdays
      end: "0 18 * * 1-5"     # Scale down at 6 PM weekdays
      desiredReplicas: "10"
```

## Scale-to-Zero Configuration

KEDA's standout feature is scaling to zero replicas. When there is no work to do, KEDA scales the deployment to zero pods, saving resources:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: batch-processor
spec:
  scaleTargetRef:
    name: batch-processor
  minReplicaCount: 0       # Allow scale to zero
  maxReplicaCount: 20
  cooldownPeriod: 300      # Wait 5 minutes before scaling to zero
  idleReplicaCount: 0      # Scale to this when idle
  triggers:
    - type: rabbitmq
      metadata:
        queueName: batch-jobs
        queueLength: "1"   # Scale up on any message
      authenticationRef:
        name: rabbitmq-auth
```

With ArgoCD, scale-to-zero means the Deployment has 0 replicas. ArgoCD will see this as healthy as long as you configure the health check correctly:

```yaml
# Custom health check for scale-to-zero deployments
resource.customizations.health.apps_Deployment: |
  hs = {}
  if obj.status == nil then
    hs.status = "Progressing"
    hs.message = "No status"
    return hs
  end

  -- Check if this deployment is managed by KEDA
  local kedaManaged = false
  if obj.metadata.labels ~= nil then
    if obj.metadata.labels["scaledobject.keda.sh/name"] ~= nil then
      kedaManaged = true
    end
  end

  local desired = obj.spec.replicas or 1
  local available = obj.status.availableReplicas or 0

  -- Scale-to-zero is healthy for KEDA-managed deployments
  if kedaManaged and desired == 0 then
    hs.status = "Healthy"
    hs.message = "Scaled to zero (KEDA managed)"
    return hs
  end

  if available == desired then
    hs.status = "Healthy"
    hs.message = string.format("%d/%d available", available, desired)
  else
    hs.status = "Progressing"
    hs.message = string.format("%d/%d available", available, desired)
  end
  return hs
```

## Handling ArgoCD Diff Conflicts

Just like HPA, KEDA modifies the deployment's replica count. Configure ignoreDifferences:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order-processor
spec:
  source:
    repoURL: https://github.com/myorg/order-processor-config
    targetRevision: main
    path: overlays/production
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    # Also ignore KEDA-added labels and annotations
    - group: apps
      kind: Deployment
      jqPathExpressions:
        - .metadata.labels["scaledobject.keda.sh/name"]
        - .metadata.annotations["scaledobject.keda.sh/name"]
```

## Health Check for ScaledObjects

Tell ArgoCD how to assess ScaledObject health:

```yaml
resource.customizations.health.keda.sh_ScaledObject: |
  hs = {}
  if obj.status ~= nil then
    if obj.status.conditions ~= nil then
      for _, condition in ipairs(obj.status.conditions) do
        if condition.type == "Ready" then
          if condition.status == "True" then
            hs.status = "Healthy"
            hs.message = string.format("Active triggers: %s",
              tostring(obj.status.externalMetricNames or "unknown"))
            return hs
          elseif condition.status == "False" then
            hs.status = "Degraded"
            hs.message = condition.message or "ScaledObject not ready"
            return hs
          end
        end
      end
    end
  end
  hs.status = "Progressing"
  hs.message = "Waiting for ScaledObject to be ready"
  return hs
```

## Kustomize Organization

Organize KEDA configs alongside your deployment manifests:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - scaled-object.yaml
  - trigger-auth.yaml
```

Environment-specific overrides:

```yaml
# overlays/production/patches/scaled-object.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor
spec:
  minReplicaCount: 3    # Never scale below 3 in production
  maxReplicaCount: 100  # Higher ceiling for production
  cooldownPeriod: 300   # Longer cooldown in production
```

```yaml
# overlays/dev/patches/scaled-object.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor
spec:
  minReplicaCount: 0    # Allow scale to zero in dev
  maxReplicaCount: 5    # Limited in dev
  cooldownPeriod: 30    # Fast cooldown in dev
```

## Multiple Triggers

KEDA supports multiple triggers on a single ScaledObject. The highest recommendation wins:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-gateway
spec:
  scaleTargetRef:
    name: api-gateway
  minReplicaCount: 3
  maxReplicaCount: 50
  triggers:
    # Scale on request rate
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        query: sum(rate(http_requests_total{service="api-gateway"}[2m]))
        threshold: "500"

    # Also scale on CPU
    - type: cpu
      metricType: Utilization
      metadata:
        value: "70"

    # Also scale on scheduled demand
    - type: cron
      metadata:
        timezone: America/New_York
        start: "0 9 * * 1-5"
        end: "0 17 * * 1-5"
        desiredReplicas: "10"
```

## Summary

KEDA with ArgoCD enables event-driven autoscaling managed through GitOps. Install KEDA as a separate ArgoCD Application to handle CRD dependencies. Use TriggerAuthentication to securely reference event source credentials. Configure ignoreDifferences to prevent replica count conflicts between ArgoCD and KEDA. Add custom health checks for ScaledObjects so ArgoCD accurately reports their status. For scale-to-zero workloads, ensure your Deployment health check accounts for KEDA-managed zero-replica states. Use Kustomize overlays to tune scaling parameters per environment - more aggressive in dev, more conservative in production.
