# How to Automate Cluster Scaling in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Autoscaling, Cluster-autoscaler, Kubernetes, Automation

Description: A guide to automating cluster scaling in Rancher using the Cluster Autoscaler, node pool scaling via the API, and HPA for workload scaling.

## Overview

Kubernetes provides multiple layers of autoscaling: Horizontal Pod Autoscaler (HPA) scales workloads, and Cluster Autoscaler scales the underlying node infrastructure. Rancher integrates with cloud-provider Cluster Autoscalers, and Rancher-provisioned RKE2/K3s clusters that use machine pools backed by an infrastructure provider can also be scaled through the Rancher Kubernetes API. Imported/custom node clusters must be scaled outside Rancher. This guide covers setting up automated cluster scaling for Rancher-managed clusters.

## Horizontal Pod Autoscaling

HPA scales application pods based on CPU, memory, or custom metrics. CPU and memory scaling requires Metrics Server, while custom metrics require a custom or external metrics API adapter such as Prometheus Adapter:

### Basic CPU-based HPA

```yaml
# HPA that scales based on CPU utilization

apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 3
  maxReplicas: 20
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

### HPA with Custom Metrics

```yaml
# HPA using a Pods metric exposed through the custom metrics API
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa-custom
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 2
  maxReplicas: 50
  metrics:
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"   # 1000 RPS per pod
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0     # Scale up immediately
      policies:
        - type: Pods
          value: 5
          periodSeconds: 60    # Add max 5 pods per minute
    scaleDown:
      stabilizationWindowSeconds: 300   # Wait 5 min before scale down
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60    # Remove max 2 pods per minute
```

## Cluster Autoscaler for AWS (EKS on Rancher)

Match the Cluster Autoscaler image tag to your cluster's Kubernetes major/minor version; the example below shows a 1.34.x release. Ensure the `cluster-autoscaler` ServiceAccount and RBAC are already installed.

```yaml
# Cluster Autoscaler deployment for EKS clusters managed by Rancher
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
  labels:
    app: cluster-autoscaler
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
        - name: cluster-autoscaler
          image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.34.2
          command:
            - ./cluster-autoscaler
            - --cloud-provider=aws
            - --namespace=kube-system
            - --nodes=3:15:eks-worker-group-1   # min:max:ASG-name
            - --scale-down-delay-after-add=10m
            - --scale-down-unneeded-time=10m
            - --scale-down-utilization-threshold=0.5
            - --skip-nodes-with-local-storage=false
            - --expander=least-waste
          env:
            - name: AWS_REGION
              value: us-east-1
          resources:
            requests:
              cpu: 100m
              memory: 300Mi
```

## Scaling Rancher Machine Pools via API

For Rancher-provisioned RKE2/K3s clusters that use machine pools backed by an infrastructure provider, scale the machine pool by updating `.spec.rkeConfig.machinePools[].quantity` through the Rancher Kubernetes API:

```bash
#!/bin/bash
# scale-machinepool.sh - Scale a Rancher machine pool through the Rancher Kubernetes API
set -euo pipefail

: "${KUBECONFIG:?Set KUBECONFIG to a Rancher RK-API kubeconfig}"
: "${CLUSTER_NAMESPACE:?Set CLUSTER_NAMESPACE}"
: "${CLUSTER_NAME:?Set CLUSTER_NAME}"
: "${MACHINE_POOL_NAME:?Set MACHINE_POOL_NAME}"
: "${TARGET_QUANTITY:?Set TARGET_QUANTITY}"

echo "Scaling machine pool ${MACHINE_POOL_NAME} to ${TARGET_QUANTITY} nodes..."

MACHINE_POOL_INDEX=$(
  kubectl get clusters.provisioning.cattle.io "${CLUSTER_NAME}" \
    -n "${CLUSTER_NAMESPACE}" \
    -o json \
    | jq -er --arg pool "${MACHINE_POOL_NAME}" '
        .spec.rkeConfig.machinePools
        | to_entries[]
        | select(.value.name == $pool)
        | .key
      '
)

kubectl patch clusters.provisioning.cattle.io "${CLUSTER_NAME}" \
  -n "${CLUSTER_NAMESPACE}" \
  --type='json' \
  -p="[{\"op\":\"replace\",\"path\":\"/spec/rkeConfig/machinePools/${MACHINE_POOL_INDEX}/quantity\",\"value\":${TARGET_QUANTITY}}]"

echo "Scaling request submitted."
```

## Scheduled Scaling with CronJobs

Scale clusters up before business hours and down on weekends:

```yaml
# CronJob: Scale up Monday morning
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up-weekday
  namespace: automation
spec:
  schedule: "0 6 * * 1-5"    # 6 AM Mon-Fri
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: scaler-sa
          containers:
            - name: scaler
              image: registry.example.com/rancher-scaler:latest
              env:
                - name: KUBECONFIG
                  value: /kubeconfig/config
                - name: CLUSTER_NAMESPACE
                  value: "fleet-default"
                - name: CLUSTER_NAME
                  value: "production-cluster"
                - name: MACHINE_POOL_NAME
                  value: "worker-pool"
                - name: TARGET_QUANTITY
                  value: "10"
              volumeMounts:
                - name: rancher-rkapi-kubeconfig
                  mountPath: /kubeconfig
                  readOnly: true
              command: ["/scripts/scale-machinepool.sh"]
          volumes:
            - name: rancher-rkapi-kubeconfig
              secret:
                secretName: rancher-rkapi-kubeconfig
          restartPolicy: OnFailure
---
# CronJob: Scale down Friday evening
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-weekend
  namespace: automation
spec:
  schedule: "0 19 * * 5"    # 7 PM Friday
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: scaler-sa
          containers:
            - name: scaler
              image: registry.example.com/rancher-scaler:latest
              env:
                - name: KUBECONFIG
                  value: /kubeconfig/config
                - name: CLUSTER_NAMESPACE
                  value: "fleet-default"
                - name: CLUSTER_NAME
                  value: "production-cluster"
                - name: MACHINE_POOL_NAME
                  value: "worker-pool"
                - name: TARGET_QUANTITY
                  value: "3"    # Weekend minimum
              volumeMounts:
                - name: rancher-rkapi-kubeconfig
                  mountPath: /kubeconfig
                  readOnly: true
              command: ["/scripts/scale-machinepool.sh"]
          volumes:
            - name: rancher-rkapi-kubeconfig
              secret:
                secretName: rancher-rkapi-kubeconfig
          restartPolicy: OnFailure
```

## Vertical Pod Autoscaler

VPA adjusts resource requests/limits automatically:

```yaml
# Install VPA (if not already installed):
# git clone https://github.com/kubernetes/autoscaler.git
# cd autoscaler/vertical-pod-autoscaler
# ./hack/vpa-up.sh

# VPA for database workload - auto-tune resource requests
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: database-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: postgresql
  updatePolicy:
    updateMode: Recreate    # Use an explicit mode; Auto is deprecated
  resourcePolicy:
    containerPolicies:
      - containerName: postgresql
        minAllowed:
          cpu: 500m
          memory: 2Gi
        maxAllowed:
          cpu: 8
          memory: 32Gi
```

## Scaling Metrics and Alerts

```yaml
# Alert if cluster is near capacity
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cluster-capacity-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: cluster-capacity
      rules:
        - alert: ClusterNearCapacity
          expr: |
            sum(kube_node_status_allocatable{resource="cpu"}) -
            sum(kube_pod_container_resource_requests{resource="cpu"})
            < 4
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Cluster has less than 4 CPU cores available"
```

## Conclusion

Automating cluster scaling in Rancher requires multiple complementary mechanisms: HPA for workload scaling, Cluster Autoscaler for node-level scaling in cloud environments, Rancher Kubernetes API automation for machine-pool scaling in Rancher-provisioned clusters, and CronJobs for predictable schedule-based scaling. VPA provides intelligent resource tuning. Combine these with Prometheus alerting to ensure your clusters scale before performance degradation occurs, and scale down to save costs during low-traffic periods.
