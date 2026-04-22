# How to Configure Serverless Autoscaling in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Serverless, Autoscaling, Kubernetes, KEDA, Knative

Description: Guide to configuring autoscaling for serverless workloads in Rancher using KEDA, Knative, and HPA for demand-driven scaling.

## Introduction

Serverless autoscaling automatically adjusts the number of running function instances based on demand, scaling to zero when idle and scaling up to handle traffic bursts. This guide covers configuring autoscaling in Rancher serverless environments.

## Autoscaling Strategies

1. **Request-based scaling**: Scale based on concurrent requests
2. **Queue-based scaling**: Scale based on queue depth
3. **CPU/Memory scaling**: Traditional HPA
4. **Custom metrics scaling**: KEDA for any metric source

## Knative Autoscaling Configuration

```yaml
# knative-autoscaling.yaml

apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: auto-scaling-demo
  namespace: default
spec:
  template:
    metadata:
      annotations:
        # KPA (Knative Pod Autoscaler) settings
        autoscaling.knative.dev/class: kpa.autoscaling.knative.dev
        autoscaling.knative.dev/metric: "concurrency"
        
        # Allow scale to zero when cluster-level scale-to-zero is enabled
        autoscaling.knative.dev/min-scale: "0"
        autoscaling.knative.dev/max-scale: "20"
        
        # Target concurrent requests per pod
        autoscaling.knative.dev/target: "50"
        
        # Utilization percentage of target before scaling
        autoscaling.knative.dev/target-utilization-percentage: "70"
    spec:
      containers:
      - image: registry.example.com/my-function:latest
        resources:
          limits:
            cpu: "1"
            memory: "512Mi"
```

## KEDA Installation

```bash
# Install KEDA via Helm
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

helm install keda kedacore/keda \
  --namespace keda \
  --create-namespace \
  --set operator.replicaCount=2
```

## KEDA ScaledObject for HTTP Workloads

```yaml
# keda-http-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: http-function-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: my-function-deployment
  
  # Scaling bounds
  minReplicaCount: 0           # Scale to zero
  maxReplicaCount: 30
  
  # How quickly to scale down to zero after the trigger becomes inactive
  cooldownPeriod: 60           # 60 seconds after Prometheus reports inactivity
  
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.cattle-monitoring-system.svc.cluster.local:9090
      threshold: "10"           # 10 RPS per replica
      query: |
        sum(rate(nginx_ingress_controller_requests{
          service="my-function-service"
        }[1m]))
```

## KEDA with Kafka Trigger

```yaml
# keda-kafka-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: kafka-consumer-deployment
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka.default.svc.cluster.local:9092
      consumerGroup: my-consumer-group
      topic: events-input
      lagThreshold: "100"       # 100 messages per replica
      activationLagThreshold: "5"
```

## OpenFaaS Autoscaling

```yaml
# openfaas-function with autoscaling labels
functions:
  data-processor:
    lang: python3
    handler: ./data-processor
    image: registry.example.com/functions/data-processor:latest
    labels:
      # OpenFaaS autoscaling labels
      com.openfaas.scale.min: "1"
      com.openfaas.scale.max: "20"
      com.openfaas.scale.type: "rps"       # Scale on RPS
      com.openfaas.scale.target: "50"      # Target 50 RPS per replica
      com.openfaas.scale.target-proportion: "0.90"
      com.openfaas.scale.zero: "true"
      com.openfaas.scale.zero-duration: "2m"
```

## Cluster Autoscaler Integration

For serverless workloads that need node-level scaling:

```yaml
# AWS worker Auto Scaling Group tags for Rancher custom clusters
tags:
  "kubernetes.io/cluster/c-xxxxx": "owned"
  "k8s.io/cluster-autoscaler/my-cluster": "true"
  "k8s.io/cluster-autoscaler/enabled": "true"
```

```yaml
# cluster-autoscaler deployment args
command:
- ./cluster-autoscaler
- --cloud-provider=aws
- --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/my-cluster
```

## Monitoring Autoscaling

```bash
# Watch Knative pod autoscaler
kubectl get kpa -A -w

# Watch KEDA scaled objects
kubectl get scaledobject -A

# Watch HPA
kubectl get hpa -A -w

# Prometheus metrics for scaling events
# actual_pods / requested_pods for Knative autoscaler metrics
# keda_scaler_active
```

## Conclusion

Serverless autoscaling in Rancher can be achieved through multiple mechanisms: Knative's built-in KPA for HTTP workloads, KEDA for event-driven scaling based on external metrics, and OpenFaaS's built-in autoscaler. Choose the approach that matches your trigger source and scaling requirements.
