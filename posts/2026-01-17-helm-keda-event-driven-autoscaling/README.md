# Event-Driven Autoscaling with Helm and KEDA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, DevOps, KEDA, Autoscaling, Event-Driven, Serverless

Description: Complete guide to deploying KEDA with Helm for event-driven autoscaling based on external metrics and queue depths.

> KEDA (Kubernetes Event-Driven Autoscaling) enables scaling based on external events and metrics. This guide covers deploying KEDA with Helm and configuring scalers for various event sources.

## KEDA Architecture

```mermaid
flowchart TB
  subgraph "KEDA Components"
    operator[KEDA Operator]
    metrics[Metrics Server]
    admission[Admission Webhooks]
  end
  
  subgraph "Custom Resources"
    scaledobject[ScaledObject]
    scaledjob[ScaledJob]
    triggerauth[TriggerAuthentication]
    clusterauth[ClusterTriggerAuthentication]
  end
  
  subgraph "Event Sources"
    kafka[Kafka]
    rabbitmq[RabbitMQ]
    redis[Redis]
    prometheus[Prometheus]
    azure[Azure Services]
    aws[AWS Services]
    http[HTTP Metrics]
  end
  
  subgraph "Targets"
    deployment[Deployment]
    statefulset[StatefulSet]
    job[Job]
  end
  
  operator --> scaledobject
  operator --> scaledjob
  scaledobject --> triggerauth
  scaledjob --> clusterauth
  
  metrics --> operator
  admission --> operator
  
  scaledobject --> deployment
  scaledobject --> statefulset
  scaledjob --> job
  
  kafka --> scaledobject
  rabbitmq --> scaledobject
  redis --> scaledobject
  prometheus --> scaledobject
  azure --> scaledobject
  aws --> scaledobject
  http --> scaledobject
```

## Installing KEDA

### Add Helm Repository

```bash
# Add KEDA Helm repository
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Create namespace
kubectl create namespace keda
```

### Basic Installation

```bash
helm install keda kedacore/keda \
  --namespace keda \
  --wait
```

### Production Configuration

```yaml
# keda-values.yaml
# Operator configuration
operator:
  name: keda-operator
  replicaCount: 2
  
  resources:
    requests:
      cpu: 100m
      memory: 100Mi
    limits:
      cpu: 1000m
      memory: 1000Mi
      
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchExpressions:
                - key: app
                  operator: In
                  values:
                    - keda-operator
            topologyKey: kubernetes.io/hostname

# Metrics server configuration
metricsServer:
  replicaCount: 2
  
  resources:
    requests:
      cpu: 100m
      memory: 100Mi
    limits:
      cpu: 1000m
      memory: 1000Mi

# Admission webhooks
webhooks:
  enabled: true
  replicaCount: 2
  
  resources:
    requests:
      cpu: 50m
      memory: 50Mi
    limits:
      cpu: 200m
      memory: 200Mi

# Pod disruption budget
podDisruptionBudget:
  operator:
    minAvailable: 1
  metricsServer:
    minAvailable: 1
  webhooks:
    minAvailable: 1

# Service account
serviceAccount:
  create: true
  name: keda-operator
  annotations: {}

# Prometheus integration
prometheus:
  metricServer:
    enabled: true
    port: 8080
    portName: metrics
  operator:
    enabled: true
    port: 8080
    portName: metrics
  webhooks:
    enabled: true
    port: 8080

# Logging
logging:
  operator:
    level: info
    format: console
  metricsServer:
    level: "0"
  webhooks:
    level: info

# Watch specific namespaces (empty = all namespaces)
watchNamespace: ""
```

```bash
# Install with production values
helm install keda kedacore/keda \
  --namespace keda \
  -f keda-values.yaml
```

## ScaledObject Examples

### Kafka Scaler

```yaml
# kafka-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: kafka-consumer
    kind: Deployment
    
  # Minimum and maximum replicas
  minReplicaCount: 1
  maxReplicaCount: 100
  
  # Cooldown periods
  cooldownPeriod: 300
  
  # Polling interval
  pollingInterval: 30
  
  # Advanced settings
  advanced:
    restoreToOriginalReplicaCount: true
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
            - type: Percent
              value: 50
              periodSeconds: 60
        scaleUp:
          stabilizationWindowSeconds: 0
          policies:
            - type: Percent
              value: 100
              periodSeconds: 15
              
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka-bootstrap:9092
        consumerGroup: my-consumer-group
        topic: my-topic
        lagThreshold: "100"
        activationLagThreshold: "10"
      authenticationRef:
        name: kafka-auth
```

### Kafka TriggerAuthentication

```yaml
# kafka-trigger-auth.yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: kafka-auth
  namespace: default
spec:
  secretTargetRef:
    - parameter: sasl
      name: kafka-credentials
      key: sasl
    - parameter: username
      name: kafka-credentials
      key: username
    - parameter: password
      name: kafka-credentials
      key: password
    - parameter: tls
      name: kafka-credentials
      key: tls
    - parameter: ca
      name: kafka-credentials
      key: ca
```

### RabbitMQ Scaler

```yaml
# rabbitmq-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-consumer-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-consumer
    
  minReplicaCount: 0
  maxReplicaCount: 50
  pollingInterval: 15
  cooldownPeriod: 60
  
  triggers:
    - type: rabbitmq
      metadata:
        protocol: amqp
        queueName: tasks
        mode: QueueLength
        value: "10"
        activationValue: "5"
        host: amqp://guest:guest@rabbitmq:5672/
        
---
# Or using HTTP API
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-http-scaler
spec:
  scaleTargetRef:
    name: rabbitmq-consumer
    
  triggers:
    - type: rabbitmq
      metadata:
        protocol: http
        queueName: tasks
        mode: MessageRate
        value: "100"
        host: http://rabbitmq:15672
        vhostName: /
      authenticationRef:
        name: rabbitmq-auth
```

### Redis Scaler

```yaml
# redis-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: redis-worker-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: redis-worker
    
  minReplicaCount: 1
  maxReplicaCount: 20
  
  triggers:
    - type: redis
      metadata:
        address: redis:6379
        listName: jobs
        listLength: "10"
        activationListLength: "5"
        databaseIndex: "0"
      authenticationRef:
        name: redis-auth
        
---
# Redis Streams
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: redis-streams-scaler
spec:
  scaleTargetRef:
    name: stream-processor
    
  triggers:
    - type: redis-streams
      metadata:
        address: redis:6379
        stream: mystream
        consumerGroup: mygroup
        pendingEntriesCount: "100"
        enableTLS: "false"
```

### AWS SQS Scaler

```yaml
# sqs-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-consumer-scaler
spec:
  scaleTargetRef:
    name: sqs-consumer
    
  minReplicaCount: 0
  maxReplicaCount: 100
  
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/my-queue
        queueLength: "10"
        awsRegion: us-east-1
        scaleOnInFlight: "true"
      authenticationRef:
        name: aws-auth

---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: aws-auth
spec:
  podIdentity:
    provider: aws-eks
    # Or use secrets
  # secretTargetRef:
  #   - parameter: awsAccessKeyID
  #     name: aws-credentials
  #     key: AWS_ACCESS_KEY_ID
  #   - parameter: awsSecretAccessKey
  #     name: aws-credentials
  #     key: AWS_SECRET_ACCESS_KEY
```

### Prometheus Scaler

```yaml
# prometheus-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: http-requests-scaler
spec:
  scaleTargetRef:
    name: web-api
    
  minReplicaCount: 2
  maxReplicaCount: 50
  pollingInterval: 15
  
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        metricName: http_requests_total
        query: |
          sum(rate(http_requests_total{deployment="web-api"}[2m]))
        threshold: "100"
        activationThreshold: "50"
        
---
# Custom business metric
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pending-orders-scaler
spec:
  scaleTargetRef:
    name: order-processor
    
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        metricName: pending_orders
        query: |
          sum(pending_orders{status="waiting"})
        threshold: "50"
```

### HTTP Scaler (KEDA HTTP Add-on)

```yaml
# http-scaledobject.yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: web-app-scaler
spec:
  hosts:
    - myapp.example.com
    
  pathPrefixes:
    - /api
    
  targetPendingRequests: 100
  
  scaleTargetRef:
    deployment: web-app
    service: web-app-svc
    port: 80
    
  replicas:
    min: 2
    max: 100
```

### Cron Scaler

```yaml
# cron-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cron-scaler
spec:
  scaleTargetRef:
    name: batch-processor
    
  minReplicaCount: 1
  maxReplicaCount: 10
  
  triggers:
    - type: cron
      metadata:
        timezone: America/New_York
        start: "0 8 * * *"    # 8 AM
        end: "0 20 * * *"     # 8 PM
        desiredReplicas: "10"
    - type: cron
      metadata:
        timezone: America/New_York
        start: "0 20 * * *"   # 8 PM
        end: "0 8 * * *"      # 8 AM
        desiredReplicas: "2"
```

## ScaledJob for Batch Processing

```yaml
# kafka-scaledjob.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: kafka-batch-processor
spec:
  jobTargetRef:
    parallelism: 1
    completions: 1
    backoffLimit: 3
    template:
      spec:
        containers:
          - name: processor
            image: myprocessor:latest
            env:
              - name: KAFKA_BROKERS
                value: kafka-bootstrap:9092
        restartPolicy: Never
        
  pollingInterval: 30
  minReplicaCount: 0
  maxReplicaCount: 100
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 5
  
  # Scaling strategy
  scalingStrategy:
    strategy: custom
    customScalingQueueLengthDeduction: 1
    customScalingRunningJobPercentage: "0.5"
    
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka-bootstrap:9092
        consumerGroup: batch-group
        topic: batch-topic
        lagThreshold: "10"
```

## Helm Chart Integration

### Chart with KEDA ScaledObjects

```yaml
# values.yaml
autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 100
  
  keda:
    enabled: true
    pollingInterval: 30
    cooldownPeriod: 300
    
    triggers:
      kafka:
        enabled: true
        bootstrapServers: kafka:9092
        consumerGroup: my-group
        topic: my-topic
        lagThreshold: "100"
        
      prometheus:
        enabled: false
        serverAddress: http://prometheus:9090
        query: ""
        threshold: "100"
        
      sqs:
        enabled: false
        queueURL: ""
        queueLength: "10"
```

### ScaledObject Template

```yaml
# templates/scaledobject.yaml
{{- if and .Values.autoscaling.enabled .Values.autoscaling.keda.enabled }}
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    name: {{ include "myapp.fullname" . }}
    
  minReplicaCount: {{ .Values.autoscaling.minReplicas }}
  maxReplicaCount: {{ .Values.autoscaling.maxReplicas }}
  pollingInterval: {{ .Values.autoscaling.keda.pollingInterval }}
  cooldownPeriod: {{ .Values.autoscaling.keda.cooldownPeriod }}
  
  triggers:
    {{- if .Values.autoscaling.keda.triggers.kafka.enabled }}
    - type: kafka
      metadata:
        bootstrapServers: {{ .Values.autoscaling.keda.triggers.kafka.bootstrapServers }}
        consumerGroup: {{ .Values.autoscaling.keda.triggers.kafka.consumerGroup }}
        topic: {{ .Values.autoscaling.keda.triggers.kafka.topic }}
        lagThreshold: {{ .Values.autoscaling.keda.triggers.kafka.lagThreshold | quote }}
      {{- if .Values.autoscaling.keda.triggers.kafka.authRef }}
      authenticationRef:
        name: {{ .Values.autoscaling.keda.triggers.kafka.authRef }}
      {{- end }}
    {{- end }}
    
    {{- if .Values.autoscaling.keda.triggers.prometheus.enabled }}
    - type: prometheus
      metadata:
        serverAddress: {{ .Values.autoscaling.keda.triggers.prometheus.serverAddress }}
        metricName: {{ include "myapp.fullname" . }}_requests
        query: {{ .Values.autoscaling.keda.triggers.prometheus.query | quote }}
        threshold: {{ .Values.autoscaling.keda.triggers.prometheus.threshold | quote }}
    {{- end }}
    
    {{- if .Values.autoscaling.keda.triggers.sqs.enabled }}
    - type: aws-sqs-queue
      metadata:
        queueURL: {{ .Values.autoscaling.keda.triggers.sqs.queueURL }}
        queueLength: {{ .Values.autoscaling.keda.triggers.sqs.queueLength | quote }}
        awsRegion: {{ .Values.autoscaling.keda.triggers.sqs.awsRegion }}
    {{- end }}
{{- end }}
```

## Monitoring

### ServiceMonitor

```yaml
# keda-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: keda
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: keda-operator
  namespaceSelector:
    matchNames:
      - keda
  endpoints:
    - port: metrics
      interval: 30s
```

### Prometheus Alerts

```yaml
# keda-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: keda-alerts
  namespace: monitoring
spec:
  groups:
    - name: keda
      rules:
        - alert: KEDAScalerErrors
          expr: |
            sum(rate(keda_scaler_errors_total[5m])) by (scaler) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: KEDA scaler errors detected
            description: Scaler {{ $labels.scaler }} is experiencing errors
            
        - alert: KEDAScaledObjectNotActive
          expr: |
            keda_scaled_object_paused == 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: ScaledObject is paused
            
        - alert: KEDAMaxReplicasReached
          expr: |
            keda_scaler_active == 1 and
            kube_deployment_spec_replicas >= kube_deployment_spec_replicas_max
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: Deployment at max replicas
```

## Troubleshooting

```bash
# Check KEDA pods
kubectl get pods -n keda

# Check ScaledObjects
kubectl get scaledobject -A
kubectl describe scaledobject my-scaler

# Check ScaledJobs
kubectl get scaledjob -A

# Check HPA created by KEDA
kubectl get hpa -A

# View KEDA operator logs
kubectl logs -n keda -l app=keda-operator -f

# View metrics server logs
kubectl logs -n keda -l app=keda-metrics-apiserver

# Debug scaler
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1"

# Check trigger authentication
kubectl get triggerauthentication -A
kubectl describe triggerauthentication my-auth
```

## Best Practices

| Practice | Recommendation |
|----------|----------------|
| **Min replicas** | Set minReplicaCount > 0 for critical services |
| **Cooldown** | Use cooldownPeriod to prevent flapping |
| **Activation threshold** | Set activationThreshold to prevent unnecessary scaling |
| **Multiple triggers** | Combine triggers for complex scaling scenarios |
| **Resource limits** | Always set resource limits on scaled workloads |
| **Monitoring** | Enable Prometheus metrics for visibility |
| **Authentication** | Use TriggerAuthentication for secure credential handling |

## Wrap-up

KEDA enables event-driven autoscaling for Kubernetes workloads based on external metrics and events. Use Helm to deploy KEDA with production settings, configure ScaledObjects for various event sources, and integrate with your existing monitoring stack for comprehensive observability of scaling behavior.
