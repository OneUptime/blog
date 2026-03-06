# How to Deploy Serverless Workloads with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, kubernetes, serverless, gitops, openfaas, keda, scale-to-zero

Description: Learn how to deploy and manage serverless workloads on Kubernetes using Flux CD with tools like OpenFaaS, KEDA, and native Kubernetes patterns.

---

## Introduction

Serverless workloads on Kubernetes allow you to run functions and microservices that automatically scale based on demand, including scaling to zero when idle. By managing serverless deployments through Flux CD, you maintain GitOps workflows while benefiting from event-driven, pay-per-use compute models.

This guide covers multiple serverless approaches on Kubernetes: OpenFaaS for function-as-a-service, KEDA for event-driven autoscaling, and native Kubernetes patterns for scale-to-zero workloads.

## Prerequisites

- Kubernetes cluster v1.26 or later
- Flux CD v2 installed and bootstrapped
- Helm controller enabled in Flux
- kubectl access to the cluster

## Installing OpenFaaS with Flux

Deploy OpenFaaS as a serverless platform:

```yaml
# infrastructure/serverless/openfaas-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: openfaas
  labels:
    role: openfaas-system
---
apiVersion: v1
kind: Namespace
metadata:
  name: openfaas-fn
  labels:
    role: openfaas-fn
```

```yaml
# infrastructure/serverless/openfaas-helmrepo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: openfaas
  namespace: flux-system
spec:
  interval: 1h
  url: https://openfaas.github.io/faas-netes/
```

```yaml
# infrastructure/serverless/openfaas-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: openfaas
  namespace: openfaas
spec:
  interval: 30m
  chart:
    spec:
      chart: openfaas
      version: "14.x"
      sourceRef:
        kind: HelmRepository
        name: openfaas
        namespace: flux-system
  values:
    # Enable scale-to-zero functionality
    faasIdler:
      enabled: true
      # Scale to zero after 5 minutes of inactivity
      inactivityDuration: 5m
    gateway:
      replicas: 2
      # Enable direct invocation for lower latency
      directFunctions: true
    operator:
      # Use the operator for CRD-based function deployment
      create: true
    basicAuthPlugin:
      replicas: 1
```

## Deploying OpenFaaS Functions with Flux

```yaml
# apps/serverless/functions/image-processor.yaml
apiVersion: openfaas.com/v1
kind: Function
metadata:
  name: image-processor
  namespace: openfaas-fn
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  name: image-processor
  image: ghcr.io/myorg/image-processor:v1.2.0
  # Scale based on demand
  labels:
    com.openfaas.scale.min: "0"
    com.openfaas.scale.max: "20"
    com.openfaas.scale.zero: "true"
    com.openfaas.scale.target: "50"
    com.openfaas.scale.type: "capacity"
  environment:
    write_timeout: "60s"
    read_timeout: "60s"
    exec_timeout: "60s"
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

```yaml
# apps/serverless/functions/email-sender.yaml
apiVersion: openfaas.com/v1
kind: Function
metadata:
  name: email-sender
  namespace: openfaas-fn
spec:
  name: email-sender
  image: ghcr.io/myorg/email-sender:v1.0.0
  labels:
    com.openfaas.scale.min: "1"
    com.openfaas.scale.max: "10"
  environment:
    write_timeout: "30s"
    read_timeout: "30s"
  # Reference secrets for SMTP credentials
  secrets:
    - smtp-credentials
```

## Installing KEDA with Flux

KEDA provides event-driven autoscaling for any Kubernetes workload:

```yaml
# infrastructure/serverless/keda-helmrepo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kedacore
  namespace: flux-system
spec:
  interval: 1h
  url: https://kedacore.github.io/charts
```

```yaml
# infrastructure/serverless/keda-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: keda
  namespace: keda
spec:
  interval: 30m
  chart:
    spec:
      chart: keda
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: kedacore
        namespace: flux-system
  install:
    createNamespace: true
  values:
    operator:
      replicaCount: 2
    metricsServer:
      replicaCount: 1
    resources:
      operator:
        requests:
          cpu: 100m
          memory: 128Mi
```

## KEDA ScaledObject for Event-Driven Scaling

Scale deployments based on external event sources:

```yaml
# apps/serverless/keda/queue-processor.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-processor
  namespace: production
spec:
  replicas: 0
  selector:
    matchLabels:
      app: queue-processor
  template:
    metadata:
      labels:
        app: queue-processor
    spec:
      containers:
        - name: processor
          image: ghcr.io/myorg/queue-processor:v1.3.0
          env:
            - name: RABBITMQ_HOST
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-credentials
                  key: host
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
---
# KEDA ScaledObject to drive scaling based on RabbitMQ queue depth
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: queue-processor-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: queue-processor
  # Scale to zero when no messages in queue
  minReplicaCount: 0
  maxReplicaCount: 30
  # Cooldown period before scaling back down
  cooldownPeriod: 60
  pollingInterval: 15
  triggers:
    - type: rabbitmq
      metadata:
        # Scale based on queue length
        queueName: orders
        mode: QueueLength
        value: "10"
      authenticationRef:
        name: rabbitmq-auth
---
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
```

## KEDA with Kafka Trigger

```yaml
# apps/serverless/keda/kafka-consumer.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: kafka-consumer
  minReplicaCount: 0
  maxReplicaCount: 20
  triggers:
    - type: kafka
      metadata:
        # Scale based on Kafka consumer group lag
        bootstrapServers: kafka-bootstrap.kafka:9092
        consumerGroup: order-consumer-group
        topic: orders
        lagThreshold: "50"
        activationLagThreshold: "5"
      authenticationRef:
        name: kafka-auth
```

## KEDA with HTTP Trigger for Scale-to-Zero HTTP Services

```yaml
# apps/serverless/keda/http-service.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: http-service-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: http-service
  minReplicaCount: 0
  maxReplicaCount: 15
  triggers:
    - type: prometheus
      metadata:
        # Scale based on HTTP request rate from Prometheus
        serverAddress: http://prometheus.monitoring:9090
        query: sum(rate(http_requests_total{service="http-service"}[2m]))
        threshold: "100"
        activationThreshold: "5"
```

## KEDA ScaledJob for Batch Processing

Run Kubernetes Jobs that scale based on events:

```yaml
# apps/serverless/keda/batch-job.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: batch-processor
  namespace: production
spec:
  jobTargetRef:
    template:
      spec:
        containers:
          - name: processor
            image: ghcr.io/myorg/batch-processor:v2.0.0
            env:
              - name: SQS_QUEUE_URL
                value: "https://sqs.us-east-1.amazonaws.com/123456789/batch-queue"
            resources:
              requests:
                cpu: 500m
                memory: 512Mi
        restartPolicy: Never
    backoffLimit: 3
  pollingInterval: 30
  # Maximum concurrent jobs
  maxReplicaCount: 10
  # Minimum time a job runs before being considered for cleanup
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: "https://sqs.us-east-1.amazonaws.com/123456789/batch-queue"
        queueLength: "5"
        awsRegion: us-east-1
      authenticationRef:
        name: aws-credentials
```

## Flux Kustomization for Serverless Workloads

```yaml
# clusters/my-cluster/serverless.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: serverless-apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/serverless
  prune: true
  wait: true
  dependsOn:
    - name: keda
    - name: openfaas
```

## Monitoring Serverless Workloads

```yaml
# infrastructure/serverless/monitoring/podmonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: serverless-functions
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
      - openfaas-fn
      - production
  selector:
    matchLabels:
      app.kubernetes.io/part-of: serverless
  podMetricsEndpoints:
    - port: metrics
      interval: 15s
```

## Verifying Serverless Deployments

```bash
# Check KEDA ScaledObjects
kubectl get scaledobjects --all-namespaces

# View KEDA scaling activity
kubectl describe scaledobject queue-processor-scaler -n production

# Check OpenFaaS functions
kubectl get functions -n openfaas-fn

# Verify Flux reconciliation
flux get kustomizations serverless-apps

# Check if workloads have scaled to zero
kubectl get deployments -n production -l app.kubernetes.io/part-of=serverless
```

## Best Practices

1. Set appropriate cooldown periods to prevent rapid scaling oscillation
2. Use activation thresholds to prevent scaling from zero on noise
3. Configure resource limits on all serverless functions to prevent resource starvation
4. Use KEDA ScaledJobs for batch processing instead of long-running deployments
5. Monitor cold start latency and set minReplicaCount accordingly for latency-sensitive services
6. Version-control all ScaledObjects and function definitions in Git

## Conclusion

Flux CD provides a robust GitOps foundation for managing serverless workloads on Kubernetes. Whether you choose OpenFaaS for function-as-a-service, KEDA for event-driven autoscaling, or a combination of both, Flux ensures your serverless configurations are version-controlled, automatically reconciled, and consistently deployed across environments. This approach gives you the flexibility of serverless computing with the reliability of GitOps.
