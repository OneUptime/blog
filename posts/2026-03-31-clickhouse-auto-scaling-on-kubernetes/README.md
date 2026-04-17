# How to Set Up ClickHouse Auto-Scaling on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kubernetes, Auto-Scaling, HPA, VPA, KEDA, K8s

Description: Configure auto-scaling for ClickHouse on Kubernetes using HPA, VPA, and KEDA to dynamically adjust resources based on CPU, memory, and query load.

---

Auto-scaling ClickHouse on Kubernetes helps manage variable query loads without over-provisioning. This guide covers Horizontal Pod Autoscaler (HPA), Vertical Pod Autoscaler (VPA), and KEDA for custom metric-based scaling.

## Understanding Auto-Scaling Options

| Tool | What It Scales | Trigger |
|------|---------------|---------|
| HPA  | Number of replicas (pods) | CPU / memory / custom metrics |
| VPA  | CPU and memory per pod | Resource utilization |
| KEDA | Number of replicas | Kafka lag, queue depth, custom |

Note: Because ClickHouse uses StatefulSets with local storage, horizontal scaling requires care - adding replicas means adding new shards or replicas with replication configured.

## Horizontal Pod Autoscaler

Enable metrics-server in your cluster first:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Create an HPA targeting CPU utilization:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: clickhouse-hpa
  namespace: analytics
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: clickhouse
  minReplicas: 2
  maxReplicas: 6
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

```bash
kubectl apply -f clickhouse-hpa.yaml
kubectl get hpa -n analytics -w
```

## Vertical Pod Autoscaler

VPA adjusts CPU and memory requests/limits based on actual usage. Install VPA:

```bash
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh
```

Create a VPA object:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: clickhouse-vpa
  namespace: analytics
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: clickhouse
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: clickhouse
        minAllowed:
          cpu: "1"
          memory: 2Gi
        maxAllowed:
          cpu: "8"
          memory: 32Gi
```

## KEDA for Custom Metrics

KEDA enables scaling based on custom metrics such as active ClickHouse query count. Install KEDA:

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm install keda kedacore/keda --namespace keda --create-namespace
```

Scale based on Prometheus metrics:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: clickhouse-scaler
  namespace: analytics
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: clickhouse
  minReplicaCount: 2
  maxReplicaCount: 8
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        query: clickhouse_active_queries{instance="clickhouse:9000"}
        threshold: "20"
```

## Monitoring Scaling Events

```bash
kubectl describe hpa clickhouse-hpa -n analytics
kubectl get events -n analytics | grep -i scale
```

## Summary

Auto-scaling ClickHouse on Kubernetes combines HPA for replica-level scaling, VPA for right-sizing pod resources, and KEDA for workload-specific triggers. For ClickHouse specifically, ensure your cluster topology supports adding replicas by pre-configuring distributed tables and ZooKeeper-based replication before enabling horizontal scaling.
