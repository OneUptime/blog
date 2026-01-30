# How to Build Auto-Scaling Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Auto-Scaling, SRE, Infrastructure

Description: Learn how to configure horizontal and vertical pod autoscaling in Kubernetes for dynamic workloads.

---

## Introduction

Auto-scaling is a critical capability for running production workloads in Kubernetes. It allows your applications to automatically adjust resource allocation based on demand, ensuring optimal performance during traffic spikes while minimizing costs during low-usage periods.

In this guide, we will explore three primary auto-scaling mechanisms in Kubernetes:

1. **Horizontal Pod Autoscaler (HPA)** - Scales the number of pod replicas
2. **Vertical Pod Autoscaler (VPA)** - Adjusts CPU and memory requests for containers
3. **KEDA (Kubernetes Event-Driven Autoscaling)** - Enables scaling based on external event sources

## Auto-Scaling Architecture Overview

Before diving into configurations, let us understand how these components interact within a Kubernetes cluster:

```mermaid
flowchart TB
    subgraph Kubernetes Cluster
        subgraph Control Plane
            API[API Server]
            MS[Metrics Server]
            HPA[HPA Controller]
            VPA[VPA Controller]
            KEDA[KEDA Operator]
        end

        subgraph Worker Nodes
            D1[Deployment]
            RS[ReplicaSet]
            P1[Pod 1]
            P2[Pod 2]
            P3[Pod N...]
        end

        subgraph External Sources
            PRM[Prometheus]
            MQ[Message Queue]
            CDB[Custom DB]
        end
    end

    MS -->|Metrics| HPA
    MS -->|Metrics| VPA
    PRM -->|Custom Metrics| HPA
    MQ -->|Event Triggers| KEDA
    CDB -->|External Metrics| KEDA

    HPA -->|Scale Replicas| D1
    VPA -->|Adjust Resources| P1
    KEDA -->|Scale to Zero/N| D1

    D1 --> RS
    RS --> P1
    RS --> P2
    RS --> P3
```

## Prerequisites

Before configuring auto-scaling, ensure you have the following components installed:

```bash
# Install Metrics Server (required for HPA and VPA)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify Metrics Server is running
kubectl get deployment metrics-server -n kube-system
```

## Horizontal Pod Autoscaler (HPA)

The Horizontal Pod Autoscaler automatically scales the number of pods in a deployment, replica set, or stateful set based on observed metrics.

### HPA Scaling Decision Flow

```mermaid
flowchart LR
    A[Metrics Server] -->|CPU/Memory| B[HPA Controller]
    C[Custom Metrics API] -->|App Metrics| B
    D[External Metrics API] -->|External Data| B

    B -->|Calculate Desired Replicas| E{Current != Desired?}
    E -->|Yes| F[Scale Deployment]
    E -->|No| G[No Action]

    F --> H[Update ReplicaSet]
    H --> I[Create/Delete Pods]
```

### Basic HPA Configuration

Here is a complete example of an HPA configuration that scales based on CPU utilization:

```yaml
# hpa-basic.yaml
# This HPA configuration scales a web application between 2 and 10 replicas
# based on CPU utilization targeting 50% average usage

apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: production
  labels:
    app: web-app
    tier: frontend
spec:
  # Reference to the deployment that will be scaled
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app

  # Minimum and maximum number of replicas
  minReplicas: 2
  maxReplicas: 10

  # Metrics used for scaling decisions
  metrics:
    # Scale based on average CPU utilization across all pods
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          # Target 50% CPU usage - scale up when exceeded
          averageUtilization: 50

    # Also consider memory utilization
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          # Target 70% memory usage
          averageUtilization: 70

  # Behavior configuration for fine-grained control
  behavior:
    # Scale up configuration
    scaleUp:
      # Stabilization window prevents flapping during scale up
      stabilizationWindowSeconds: 60
      policies:
        # Allow scaling up by 100% of current replicas
        - type: Percent
          value: 100
          periodSeconds: 60
        # Or scale up by 4 pods maximum
        - type: Pods
          value: 4
          periodSeconds: 60
      # Use the policy that allows the most change
      selectPolicy: Max

    # Scale down configuration
    scaleDown:
      # Wait 5 minutes before scaling down to avoid thrashing
      stabilizationWindowSeconds: 300
      policies:
        # Scale down by at most 50% of current replicas
        - type: Percent
          value: 50
          periodSeconds: 120
        # Or scale down by at most 2 pods
        - type: Pods
          value: 2
          periodSeconds: 120
      # Use the policy that allows the least change (more conservative)
      selectPolicy: Min
```

### HPA with Custom Metrics

For more sophisticated scaling, you can use custom application metrics exposed via Prometheus:

```yaml
# hpa-custom-metrics.yaml
# This HPA scales based on custom application metrics
# Requires prometheus-adapter to be installed

apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server

  minReplicas: 3
  maxReplicas: 50

  metrics:
    # Custom metric: requests per second per pod
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          # Scale when average RPS exceeds 1000 per pod
          averageValue: "1000"

    # Custom metric: queue depth from application
    - type: Object
      object:
        metric:
          name: queue_messages_ready
        describedObject:
          apiVersion: v1
          kind: Service
          name: message-queue
        target:
          type: Value
          # Scale when queue depth exceeds 100 messages
          value: "100"

    # External metric: messages in Kafka topic
    - type: External
      external:
        metric:
          name: kafka_consumer_lag
          selector:
            matchLabels:
              topic: orders
        target:
          type: AverageValue
          # Scale based on consumer lag per pod
          averageValue: "50"
```

### Prometheus Adapter Configuration

To use custom metrics with HPA, you need to configure the Prometheus adapter:

```yaml
# prometheus-adapter-config.yaml
# ConfigMap for prometheus-adapter to expose custom metrics

apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-adapter-config
  namespace: monitoring
data:
  config.yaml: |
    # Rules for converting Prometheus metrics to Kubernetes metrics API
    rules:
      # HTTP requests per second metric
      - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
        resources:
          overrides:
            namespace:
              resource: namespace
            pod:
              resource: pod
        name:
          matches: "^(.*)_total$"
          as: "${1}_per_second"
        metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'

      # Queue depth metric
      - seriesQuery: 'rabbitmq_queue_messages{namespace!=""}'
        resources:
          overrides:
            namespace:
              resource: namespace
        name:
          matches: "^(.*)$"
          as: "queue_messages_ready"
        metricsQuery: 'sum(<<.Series>>{<<.LabelMatchers>>}) by (namespace)'

      # Response latency percentile
      - seriesQuery: 'http_request_duration_seconds_bucket{namespace!="",pod!=""}'
        resources:
          overrides:
            namespace:
              resource: namespace
            pod:
              resource: pod
        name:
          matches: "^(.*)_bucket$"
          as: "${1}_p99"
        metricsQuery: 'histogram_quantile(0.99, rate(<<.Series>>{<<.LabelMatchers>>}[5m]))'
```

## Vertical Pod Autoscaler (VPA)

The Vertical Pod Autoscaler automatically adjusts the CPU and memory requests for containers based on historical usage patterns.

### VPA Operation Flow

```mermaid
flowchart TB
    subgraph VPA Components
        R[VPA Recommender]
        U[VPA Updater]
        A[VPA Admission Controller]
    end

    subgraph Data Flow
        M[Metrics Server] -->|Historical Usage| R
        R -->|Recommendations| VPA_CR[VPA Custom Resource]
        VPA_CR -->|Target Update| U
        U -->|Evict Pods| P[Running Pods]
        P -->|Recreate| A
        A -->|Apply New Resources| NP[New Pods]
    end
```

### Installing VPA

```bash
# Clone the VPA repository
git clone https://github.com/kubernetes/autoscaler.git

# Navigate to the VPA directory
cd autoscaler/vertical-pod-autoscaler

# Install VPA components
./hack/vpa-up.sh

# Verify installation
kubectl get pods -n kube-system | grep vpa
```

### VPA Configuration

```yaml
# vpa-config.yaml
# Vertical Pod Autoscaler configuration for a backend service

apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: backend-service-vpa
  namespace: production
spec:
  # Target deployment for VPA
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-service

  # Update policy determines how VPA applies recommendations
  updatePolicy:
    # Options: "Off", "Initial", "Recreate", "Auto"
    # - Off: VPA only provides recommendations, no automatic updates
    # - Initial: VPA only assigns resources on pod creation
    # - Recreate: VPA evicts pods to apply new resources
    # - Auto: VPA updates resources using available mechanisms
    updateMode: "Auto"

  # Resource policy to control VPA behavior per container
  resourcePolicy:
    containerPolicies:
      # Policy for the main application container
      - containerName: backend
        # Minimum allowed resources
        minAllowed:
          cpu: 100m
          memory: 128Mi
        # Maximum allowed resources
        maxAllowed:
          cpu: 4
          memory: 8Gi
        # Control which resources VPA manages
        controlledResources: ["cpu", "memory"]
        # Control whether VPA updates requests, limits, or both
        controlledValues: RequestsAndLimits

      # Policy for sidecar container - VPA should not modify
      - containerName: sidecar-proxy
        mode: "Off"
```

### VPA with Update Mode Off (Recommendation Only)

For production environments, you might want VPA to only provide recommendations without automatic updates:

```yaml
# vpa-recommendation-only.yaml
# VPA in recommendation mode - useful for gathering data before enabling auto-updates

apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-frontend-vpa
  namespace: production
  annotations:
    description: "Recommendation-only VPA for monitoring resource usage patterns"
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-frontend

  # Off mode means VPA will not modify pods
  # Check recommendations with: kubectl describe vpa web-frontend-vpa
  updatePolicy:
    updateMode: "Off"

  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: 8
          memory: 16Gi
```

To view VPA recommendations:

```bash
# Get VPA recommendations
kubectl describe vpa web-frontend-vpa -n production

# Output shows recommendations like:
# Recommendation:
#   Container Recommendations:
#     Container Name: web-frontend
#     Lower Bound:
#       Cpu:     100m
#       Memory:  256Mi
#     Target:
#       Cpu:     250m
#       Memory:  512Mi
#     Upper Bound:
#       Cpu:     1
#       Memory:  1Gi
```

## KEDA: Event-Driven Autoscaling

KEDA (Kubernetes Event-Driven Autoscaling) extends Kubernetes with event-driven scaling capabilities, allowing you to scale based on external event sources and even scale to zero.

### KEDA Architecture

```mermaid
flowchart TB
    subgraph KEDA Components
        KO[KEDA Operator]
        KMA[KEDA Metrics Adapter]
        SO[ScaledObject]
    end

    subgraph Event Sources
        KAFKA[Apache Kafka]
        RABBIT[RabbitMQ]
        REDIS[Redis]
        PROM[Prometheus]
        CRON[Cron Schedule]
        AWS[AWS SQS/SNS]
        AZURE[Azure Service Bus]
    end

    subgraph Kubernetes
        HPA2[HPA]
        D2[Deployment]
        P4[Pods]
    end

    KAFKA -->|Consumer Lag| SO
    RABBIT -->|Queue Length| SO
    REDIS -->|List Length| SO
    PROM -->|Custom Query| SO
    CRON -->|Time-based| SO
    AWS -->|Message Count| SO
    AZURE -->|Message Count| SO

    SO -->|Create/Update| HPA2
    KO -->|Manage| SO
    KMA -->|Metrics| HPA2
    HPA2 -->|Scale| D2
    D2 --> P4
```

### Installing KEDA

```bash
# Install KEDA using Helm
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Install KEDA in the keda namespace
helm install keda kedacore/keda \
  --namespace keda \
  --create-namespace \
  --set prometheus.metricServer.enabled=true \
  --set prometheus.operator.enabled=true

# Verify installation
kubectl get pods -n keda
```

### KEDA ScaledObject for Kafka

```yaml
# keda-kafka-scaledobject.yaml
# Scale a consumer deployment based on Kafka consumer lag

apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
  namespace: production
  labels:
    app: order-processor
spec:
  # Target deployment to scale
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-processor

  # Polling interval for checking metrics
  pollingInterval: 15

  # Cooldown period after scaling down before scaling again
  cooldownPeriod: 300

  # Idle replica count - set to 0 for scale to zero capability
  idleReplicaCount: 0

  # Minimum replicas when active (not idle)
  minReplicaCount: 1

  # Maximum replicas
  maxReplicaCount: 100

  # Fallback configuration if scaler fails
  fallback:
    failureThreshold: 3
    replicas: 6

  # Advanced scaling behavior
  advanced:
    restoreToOriginalReplicaCount: false
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
            - type: Percent
              value: 50
              periodSeconds: 60

  # Trigger definitions
  triggers:
    # Kafka trigger based on consumer group lag
    - type: kafka
      metadata:
        # Kafka bootstrap servers
        bootstrapServers: kafka-cluster.kafka:9092
        # Consumer group to monitor
        consumerGroup: order-processor-group
        # Topic to monitor
        topic: orders
        # Lag threshold per partition
        lagThreshold: "100"
        # Offset reset policy
        offsetResetPolicy: earliest
        # TLS settings
        tls: "enable"
        # SASL authentication
        sasl: "plaintext"
      authenticationRef:
        name: kafka-credentials
```

### KEDA ScaledObject for RabbitMQ

```yaml
# keda-rabbitmq-scaledobject.yaml
# Scale workers based on RabbitMQ queue depth

apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-worker-scaler
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: message-worker

  pollingInterval: 10
  cooldownPeriod: 120
  idleReplicaCount: 0
  minReplicaCount: 1
  maxReplicaCount: 30

  triggers:
    # RabbitMQ queue trigger
    - type: rabbitmq
      metadata:
        # Queue name to monitor
        queueName: tasks-queue
        # Host URL with credentials reference
        host: amqp://guest:guest@rabbitmq.messaging:5672/
        # Mode: QueueLength or MessageRate
        mode: QueueLength
        # Target queue length per replica
        value: "50"
        # Activate scaling when queue length exceeds this
        activationValue: "5"
        # Virtual host
        vhostName: /

---
# TriggerAuthentication for RabbitMQ credentials
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: rabbitmq-auth
  namespace: production
spec:
  secretTargetRef:
    - parameter: host
      name: rabbitmq-secret
      key: connection-string
```

### KEDA ScaledObject for Prometheus Metrics

```yaml
# keda-prometheus-scaledobject.yaml
# Scale based on custom Prometheus metrics

apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: prometheus-scaler
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway

  pollingInterval: 30
  cooldownPeriod: 300
  minReplicaCount: 2
  maxReplicaCount: 20

  triggers:
    # Prometheus trigger for HTTP request rate
    - type: prometheus
      metadata:
        # Prometheus server address
        serverAddress: http://prometheus.monitoring:9090
        # PromQL query to execute
        query: |
          sum(rate(http_requests_total{
            namespace="production",
            deployment="api-gateway"
          }[2m]))
        # Threshold value that triggers scaling
        threshold: "1000"
        # Activation threshold - minimum value to start scaling
        activationThreshold: "100"
        # Ignore null values in query results
        ignoreNullValues: "true"

    # Additional trigger for error rate
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring:9090
        query: |
          sum(rate(http_requests_total{
            namespace="production",
            deployment="api-gateway",
            status=~"5.."
          }[5m])) /
          sum(rate(http_requests_total{
            namespace="production",
            deployment="api-gateway"
          }[5m])) * 100
        # Scale up when error rate exceeds 5%
        threshold: "5"
        activationThreshold: "1"
```

### KEDA ScaledObject with Cron Schedule

```yaml
# keda-cron-scaledobject.yaml
# Scale based on time-based schedules for predictable traffic patterns

apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cron-scaler
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-frontend

  pollingInterval: 60
  cooldownPeriod: 300
  minReplicaCount: 2
  maxReplicaCount: 50

  triggers:
    # Business hours scaling - weekdays 9 AM to 6 PM
    - type: cron
      metadata:
        timezone: America/New_York
        # Scale up during business hours
        start: "0 9 * * 1-5"
        end: "0 18 * * 1-5"
        desiredReplicas: "20"

    # Peak hours scaling - weekdays 12 PM to 2 PM
    - type: cron
      metadata:
        timezone: America/New_York
        start: "0 12 * * 1-5"
        end: "0 14 * * 1-5"
        desiredReplicas: "35"

    # Weekend minimal scaling
    - type: cron
      metadata:
        timezone: America/New_York
        start: "0 0 * * 0,6"
        end: "0 23 * * 0,6"
        desiredReplicas: "5"

    # Also scale based on actual CPU usage
    - type: cpu
      metricType: Utilization
      metadata:
        value: "70"
```

### KEDA ScaledJob for Batch Processing

```yaml
# keda-scaledjob.yaml
# ScaledJob for batch processing workloads that need to scale to zero

apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: batch-processor
  namespace: production
spec:
  jobTargetRef:
    # Job template for processing
    parallelism: 1
    completions: 1
    backoffLimit: 3
    template:
      spec:
        containers:
          - name: processor
            image: batch-processor:v1.0
            env:
              - name: QUEUE_URL
                valueFrom:
                  secretKeyRef:
                    name: queue-credentials
                    key: url
            resources:
              requests:
                cpu: 500m
                memory: 512Mi
              limits:
                cpu: 2
                memory: 2Gi
        restartPolicy: Never

  # Polling interval
  pollingInterval: 30

  # Successful jobs history limit
  successfulJobsHistoryLimit: 5

  # Failed jobs history limit
  failedJobsHistoryLimit: 5

  # Maximum replica count for parallel jobs
  maxReplicaCount: 50

  # Scaling strategy
  scalingStrategy:
    # Options: default, custom, accurate
    strategy: "default"

  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123456789/batch-jobs
        queueLength: "5"
        awsRegion: us-east-1
      authenticationRef:
        name: aws-credentials
```

## Combining HPA, VPA, and KEDA

### Best Practices for Multi-Scaler Environments

```mermaid
flowchart TB
    subgraph "Scaling Strategy Decision Tree"
        Q1{Workload Type?}
        Q1 -->|Web/API| Q2{Traffic Pattern?}
        Q1 -->|Worker/Consumer| Q3{Event Source?}
        Q1 -->|Batch Job| KEDA_JOB[Use KEDA ScaledJob]

        Q2 -->|Predictable| HPA_CRON[HPA + KEDA Cron]
        Q2 -->|Variable| HPA_METRICS[HPA with Custom Metrics]
        Q2 -->|Spiky| KEDA_MULTI[KEDA Multi-trigger]

        Q3 -->|Message Queue| KEDA_MQ[KEDA Queue Scaler]
        Q3 -->|Database| KEDA_DB[KEDA with Prometheus]
        Q3 -->|HTTP Events| HPA_RPS[HPA with RPS Metric]
    end
```

### Combined Configuration Example

```yaml
# combined-autoscaling.yaml
# Example showing how to combine different autoscaling strategies

---
# Deployment with proper resource requests for VPA
apiVersion: apps/v1
kind: Deployment
metadata:
  name: microservice
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: microservice
  template:
    metadata:
      labels:
        app: microservice
      annotations:
        # Annotation to enable VPA recommendations
        vpa-recommender.kubernetes.io/enable: "true"
    spec:
      containers:
        - name: app
          image: microservice:v2.0
          ports:
            - containerPort: 8080
          resources:
            # Initial resource requests - VPA will optimize these
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1
              memory: 1Gi
          # Readiness probe for proper scaling
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          # Liveness probe
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10

---
# VPA for right-sizing container resources
# Note: VPA updateMode should be "Off" or "Initial" when using with HPA
# to avoid conflicts
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: microservice-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: microservice
  updatePolicy:
    # Use "Initial" mode when combining with HPA
    # This sets resources only when pods are created
    updateMode: "Initial"
  resourcePolicy:
    containerPolicies:
      - containerName: app
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 4
          memory: 4Gi
        controlledResources: ["cpu", "memory"]

---
# KEDA ScaledObject with multiple triggers
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: microservice-keda
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: microservice

  pollingInterval: 15
  cooldownPeriod: 300
  idleReplicaCount: 1
  minReplicaCount: 2
  maxReplicaCount: 100

  triggers:
    # CPU-based scaling
    - type: cpu
      metricType: Utilization
      metadata:
        value: "60"

    # Memory-based scaling
    - type: memory
      metricType: Utilization
      metadata:
        value: "70"

    # Request rate from Prometheus
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring:9090
        query: |
          sum(rate(http_requests_total{
            deployment="microservice",
            namespace="production"
          }[2m]))
        threshold: "500"

    # Cron-based pre-scaling for known traffic patterns
    - type: cron
      metadata:
        timezone: UTC
        start: "0 8 * * 1-5"
        end: "0 20 * * 1-5"
        desiredReplicas: "10"
```

## Monitoring Auto-Scaling

### Prometheus Alerts for Scaling Issues

```yaml
# autoscaling-alerts.yaml
# PrometheusRule for monitoring autoscaling health

apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: autoscaling-alerts
  namespace: monitoring
spec:
  groups:
    - name: autoscaling
      interval: 30s
      rules:
        # Alert when HPA is at max replicas
        - alert: HPAMaxedOut
          expr: |
            kube_horizontalpodautoscaler_status_current_replicas
              == kube_horizontalpodautoscaler_spec_max_replicas
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "HPA {{ $labels.horizontalpodautoscaler }} is at maximum replicas"
            description: "HPA has been at maximum replicas for 15 minutes. Consider increasing max replicas."

        # Alert when HPA cannot scale due to resource constraints
        - alert: HPAScalingLimited
          expr: |
            kube_horizontalpodautoscaler_status_condition{condition="ScalingLimited",status="true"} == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "HPA {{ $labels.horizontalpodautoscaler }} scaling is limited"
            description: "HPA cannot scale as expected. Check resource quotas and node capacity."

        # Alert when VPA recommendations differ significantly
        - alert: VPARecommendationDrift
          expr: |
            abs(
              kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target{resource="cpu"}
              - on(namespace, target_name)
              kube_pod_container_resource_requests{resource="cpu"}
            ) / kube_pod_container_resource_requests{resource="cpu"} > 0.5
          for: 1h
          labels:
            severity: info
          annotations:
            summary: "VPA recommendation differs significantly from current requests"
            description: "Container {{ $labels.container }} has VPA recommendation that differs by more than 50% from current requests."

        # Alert when KEDA scaler fails
        - alert: KEDAScalerError
          expr: |
            keda_scaler_errors_total > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "KEDA scaler {{ $labels.scaler }} is experiencing errors"
            description: "KEDA scaler has errors connecting to the event source."
```

### Grafana Dashboard Query Examples

```promql
# HPA current vs desired replicas
sum by (horizontalpodautoscaler, namespace) (
  kube_horizontalpodautoscaler_status_current_replicas
)
/
sum by (horizontalpodautoscaler, namespace) (
  kube_horizontalpodautoscaler_status_desired_replicas
)

# Scaling events over time
sum by (horizontalpodautoscaler) (
  increase(kube_horizontalpodautoscaler_status_current_replicas[1h])
)

# VPA recommendations vs actual usage
avg by (container, namespace) (
  kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target{resource="cpu"}
)

# KEDA scaling activity
sum by (scaledObject) (
  keda_scaler_metrics_value
)
```

## Troubleshooting Guide

### Common Issues and Solutions

```mermaid
flowchart TB
    subgraph "Troubleshooting Decision Tree"
        START[Scaling Issue] --> Q1{Pods scaling?}

        Q1 -->|No| CHECK_HPA[Check HPA Status]
        Q1 -->|Too slow| CHECK_BEHAVIOR[Check Behavior Settings]
        Q1 -->|Too aggressive| TUNE_THRESHOLD[Tune Thresholds]

        CHECK_HPA --> Q2{Metrics available?}
        Q2 -->|No| FIX_METRICS[Install/Fix Metrics Server]
        Q2 -->|Yes| Q3{Resource constraints?}

        Q3 -->|Yes| SCALE_CLUSTER[Scale Cluster/Adjust Quotas]
        Q3 -->|No| CHECK_DEPLOYMENT[Check Deployment Config]

        CHECK_BEHAVIOR --> ADJUST_WINDOW[Adjust Stabilization Window]
        TUNE_THRESHOLD --> LOWER_TARGET[Lower Target Utilization]
    end
```

### Debugging Commands

```bash
# Check HPA status and events
kubectl describe hpa <hpa-name> -n <namespace>

# View HPA metrics
kubectl get hpa <hpa-name> -n <namespace> -o yaml

# Check if metrics server is working
kubectl top pods -n <namespace>
kubectl top nodes

# View VPA recommendations
kubectl describe vpa <vpa-name> -n <namespace>

# Check KEDA ScaledObject status
kubectl get scaledobject <name> -n <namespace> -o yaml
kubectl describe scaledobject <name> -n <namespace>

# View KEDA operator logs
kubectl logs -n keda -l app=keda-operator --tail=100

# Check KEDA metrics adapter
kubectl logs -n keda -l app=keda-metrics-apiserver --tail=100

# List all HPA events
kubectl get events --field-selector reason=SuccessfulRescale -n <namespace>

# Check resource quotas that might limit scaling
kubectl describe resourcequota -n <namespace>

# View pod disruption budgets
kubectl get pdb -n <namespace>
```

## Summary

Auto-scaling in Kubernetes is a multi-faceted capability that, when properly configured, ensures your applications remain responsive under varying loads while optimizing resource utilization and costs.

Key takeaways:

1. **Use HPA for horizontal scaling** based on CPU, memory, or custom metrics
2. **Use VPA for right-sizing** container resource requests and limits
3. **Use KEDA for event-driven scaling** and scale-to-zero capabilities
4. **Combine strategies carefully** - use VPA in "Initial" mode when paired with HPA/KEDA
5. **Monitor your autoscalers** with proper alerts and dashboards
6. **Test your scaling configurations** before deploying to production

By implementing these auto-scaling configurations, you can build resilient, cost-effective Kubernetes deployments that automatically adapt to your workload demands.

## Additional Resources

- [Kubernetes HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes VPA Documentation](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler)
- [KEDA Documentation](https://keda.sh/docs/)
- [Prometheus Adapter](https://github.com/kubernetes-sigs/prometheus-adapter)
