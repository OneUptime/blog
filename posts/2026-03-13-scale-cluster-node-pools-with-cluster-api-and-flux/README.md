# How to Scale Cluster Node Pools with Cluster API and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cluster API, CAPI, Scaling, MachineDeployment, GitOps, Kubernetes

Description: Scale MachineDeployment node pools using Cluster API and Flux CD for declarative, GitOps-driven Kubernetes node pool management.

---

## Introduction

Scaling Kubernetes node pools is one of the most frequent infrastructure operations. With Cluster API and Flux, scaling is a Git operation: change the `replicas` field in a MachineDeployment manifest, commit it, and CAPI provisions or terminates nodes accordingly. This brings the same auditability and review process to scaling events that you apply to application deployments.

Beyond manual scaling, CAPI integrates with the Cluster Autoscaler for automatic scale-out and scale-in based on pod pending states. You can configure the autoscaler's min/max bounds through CAPI annotations while Flux manages the static desired count for development and staging environments.

This guide covers manual scaling through Git, configuring autoscaler annotations, and implementing different node pool strategies for different workload types.

## Prerequisites

- Cluster API with a cloud provider installed
- Flux CD bootstrapped on the management cluster
- Existing MachineDeployments for the cluster
- `kubectl` CLI installed

## Step 1: Manual Scale-Out via Git

The simplest scaling operation: increase replicas in a pull request.

```yaml
# clusters/workloads/production-cluster/workers.yaml
# Before: 3 nodes
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: production-cluster-workers-default
  namespace: default
spec:
  clusterName: production-cluster
  replicas: 6  # Scale from 3 to 6 for increased load
  selector:
    matchLabels:
      cluster.x-k8s.io/cluster-name: production-cluster
      pool: default
  template:
    spec:
      clusterName: production-cluster
      version: v1.29.2
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
          kind: KubeadmConfigTemplate
          name: production-cluster-workers-default
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: production-cluster-workers-default
```

```bash
# After merging the PR, watch nodes scale out
kubectl get machinedeployment production-cluster-workers-default \
  -n default --watch

# Verify nodes appear in the workload cluster
clusterctl get kubeconfig production-cluster > prod.kubeconfig
kubectl --kubeconfig=prod.kubeconfig get nodes --watch
```

## Step 2: Configure Cluster Autoscaler Integration

CAPI annotations enable the Cluster Autoscaler to manage the replica count automatically within bounds.

```yaml
# clusters/workloads/production-cluster/workers-autoscaled.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: production-cluster-workers-autoscaled
  namespace: default
  annotations:
    # Minimum number of nodes (autoscaler will not scale below this)
    cluster.x-k8s.io/cluster-api-autoscaler-node-group-min-size: "2"
    # Maximum number of nodes (autoscaler will not scale above this)
    cluster.x-k8s.io/cluster-api-autoscaler-node-group-max-size: "20"
spec:
  clusterName: production-cluster
  # Initial replica count - autoscaler takes over after this
  replicas: 3
  selector:
    matchLabels:
      cluster.x-k8s.io/cluster-name: production-cluster
      pool: autoscaled
  template:
    metadata:
      labels:
        cluster.x-k8s.io/cluster-name: production-cluster
        pool: autoscaled
    spec:
      clusterName: production-cluster
      version: v1.29.2
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
          kind: KubeadmConfigTemplate
          name: production-cluster-workers-autoscaled
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: production-cluster-workers-autoscaled
```

## Step 3: Deploy Cluster Autoscaler on the Workload Cluster

```yaml
# apps/production-cluster/cluster-autoscaler.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  interval: 10m
  chart:
    spec:
      chart: cluster-autoscaler
      version: "9.35.x"
      sourceRef:
        kind: HelmRepository
        name: autoscaler
        namespace: flux-system
  values:
    autoDiscovery:
      clusterName: production-cluster
    cloudProvider: clusterapi
    clusterAPIMode: incluster-incluster
    # The autoscaler runs on the workload cluster but manages CAPI on management cluster
    clusterAPIKubeconfigSecret: management-cluster-kubeconfig
    extraArgs:
      # Scale down when a node is underutilized for 10 minutes
      scale-down-unneeded-time: "10m"
      scale-down-utilization-threshold: "0.5"
      # Skip nodes with local storage
      skip-nodes-with-local-storage: "false"
```

## Step 4: Add an Emergency Scale-Down for Cost Control

For dev/staging clusters, add scheduled scale-down during off-hours.

```yaml
# clusters/workloads/dev-cluster/workers-schedule.yaml
# Scale down at night and weekends
# (Use a CronJob or Kyverno policy to modify the MachineDeployment replicas)
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-dev-nodes
  namespace: default
spec:
  # Scale down weekdays at 7 PM UTC
  schedule: "0 19 * * 1-5"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cluster-scaler
          containers:
            - name: kubectl
              image: bitnami/kubectl:latest
              command:
                - kubectl
                - patch
                - machinedeployment
                - dev-cluster-workers-default
                - -n
                - default
                - --type=merge
                - -p
                - '{"spec":{"replicas": 1}}'
          restartPolicy: OnFailure

---
# Scale back up weekdays at 7 AM UTC
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up-dev-nodes
  namespace: default
spec:
  schedule: "0 7 * * 1-5"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cluster-scaler
          containers:
            - name: kubectl
              image: bitnami/kubectl:latest
              command:
                - kubectl
                - patch
                - machinedeployment
                - dev-cluster-workers-default
                - -n
                - default
                - --type=merge
                - -p
                - '{"spec":{"replicas": 3}}'
          restartPolicy: OnFailure
```

## Step 5: Verify Scaling Operations

```bash
# Monitor scale-out progress
kubectl get machinedeployment -n default --watch

# Check individual machine status
kubectl get machines -n default \
  -l cluster.x-k8s.io/cluster-name=production-cluster

# View current replica counts for all node pools
kubectl get machinedeployments -n default \
  -o custom-columns=\
'NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas,AVAILABLE:.status.availableReplicas'

# Check autoscaler activity (in the workload cluster)
kubectl --kubeconfig=prod.kubeconfig logs \
  -n kube-system \
  -l app.kubernetes.io/name=cluster-autoscaler \
  --tail=50
```

## Best Practices

- Use Cluster Autoscaler for production workload clusters and manual scaling via Git for development. The autoscaler handles unpredictable load patterns while Git-based scaling provides auditability for capacity planning.
- Set autoscaler `min-size` to at least 2 (or 3 for multi-AZ) to maintain availability during node failures. A single-node pool has no redundancy.
- Annotate MachineDeployments with their purpose and cost tier (`annotations: cost-tier: spot`) to enable cost allocation and chargeback by node pool.
- Use the `scaleToZero` feature for development clusters. Configure Cluster Autoscaler to scale to zero during off-hours and back up when pending pods appear.
- Implement a scale-down budget: use `PodDisruptionBudgets` on critical workloads to prevent the autoscaler from removing nodes that would violate availability guarantees.

## Conclusion

Node pool scaling in Kubernetes clusters managed by Cluster API and Flux CD is now a Git-driven operation. Manual scaling is achieved through pull requests, and automatic scaling is configured through autoscaler annotations. Every scaling event is traceable to a Git commit or an autoscaler decision, providing full operational visibility into cluster capacity changes.
