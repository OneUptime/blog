# Install Cluster API with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cluster API, CAPI, GitOps, Kubernetes, Multi-Cluster

Description: Learn how to use Flux CD to manage Cluster API workload clusters declaratively, enabling GitOps-driven Kubernetes cluster provisioning.

---

## Introduction

Cluster API (CAPI) enables declarative, Kubernetes-native infrastructure management for provisioning and managing Kubernetes clusters. When combined with Flux CD, the entire cluster lifecycle - creation, upgrades, and deletion - can be managed through GitOps workflows.

This guide covers installing Cluster API on a management cluster with Flux and provisioning workload clusters declaratively through Git commits.

## Prerequisites

- Management Kubernetes cluster with Flux CD installed
- `clusterctl` CLI installed: `curl -L https://github.com/kubernetes-sigs/cluster-api/releases/latest/download/clusterctl-linux-amd64 -o clusterctl && chmod +x clusterctl && sudo mv clusterctl /usr/local/bin/clusterctl`
- `clusterawsadm` CLI installed when using AWS
- Cloud provider credentials (AWS, GCP, or Azure)
- `kubectl` cluster-admin access to the management cluster

## Step 1: Install Cluster API Components

Create namespaces for CAPI providers and related cluster definitions:

```yaml
# capi-namespace.yaml - Create namespaces for CAPI providers

apiVersion: v1
kind: Namespace
metadata:
  name: capi-system
---
apiVersion: v1
kind: Namespace
metadata:
  name: capa-system  # AWS provider
```

Bootstrap CAPI using the `clusterctl` init for initial installation, then manage via Flux:

```bash
# Initialize Cluster API on the management cluster
# Replace with your cloud provider credentials
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=<your-access-key>
export AWS_SECRET_ACCESS_KEY=<your-secret-key>

# Create the IAM resources required by Cluster API Provider AWS
clusterawsadm bootstrap iam create-cloudformation-stack

# Encode credentials for the AWS provider manager
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)

# Initialize with AWS provider
clusterctl init --infrastructure aws

# Inspect required variables for generated AWS workload cluster templates
clusterctl generate cluster --infrastructure aws --list-variables production-workload

# Check CAPI is running
kubectl get pods -n capi-system
kubectl get pods -n capa-system
```

## Step 2: Manage Cluster Definitions via Flux

Store workload cluster definitions in Git. Generate a complete provider template with `clusterctl`, commit it under the Flux path, and let Flux reconcile it:

```bash
clusterctl generate cluster production-workload \
  --kubernetes-version v1.34.0 \
  --control-plane-machine-count=3 \
  --worker-machine-count=3 \
  --infrastructure aws \
  > clusters/workloads/production-workload.yaml
```

A shortened excerpt of that generated manifest looks like this:

```yaml
# workload-cluster-aws.yaml - CAPI workload cluster on AWS
apiVersion: cluster.x-k8s.io/v1beta2
kind: Cluster
metadata:
  name: production-workload
  namespace: default
  labels:
    managed-by: flux
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
        - 192.168.0.0/16
  infrastructureRef:
    apiGroup: infrastructure.cluster.x-k8s.io
    kind: AWSCluster
    name: production-workload
  controlPlaneRef:
    apiGroup: controlplane.cluster.x-k8s.io
    kind: KubeadmControlPlane
    name: production-workload-control-plane
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSCluster
metadata:
  name: production-workload
  namespace: default
spec:
  region: us-east-1
  sshKeyName: my-ssh-key
---
apiVersion: controlplane.cluster.x-k8s.io/v1beta2
kind: KubeadmControlPlane
metadata:
  name: production-workload-control-plane
  namespace: default
spec:
  replicas: 3
  version: "v1.34.0"
  machineTemplate:
    spec:
      infrastructureRef:
        apiGroup: infrastructure.cluster.x-k8s.io
        kind: AWSMachineTemplate
        name: production-workload-control-plane
  kubeadmConfigSpec:
    initConfiguration:
      nodeRegistration:
        name: "{{ ds.meta_data.local_hostname }}"
    clusterConfiguration:
      apiServer:
        extraArgs:
          - name: cloud-provider
            value: external
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: production-workload-control-plane
  namespace: default
spec:
  template:
    spec:
      instanceType: m5.large
      iamInstanceProfile: control-plane.cluster-api-provider-aws.sigs.k8s.io
```

Create a Flux Kustomization to manage cluster definitions:

```yaml
# capi-clusters-kustomization.yaml - Flux Kustomization for cluster definitions
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: capi-clusters
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/workloads
  prune: true    # Deleting from Git will delete the cluster
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  # Ensure CAPI is ready before creating clusters
  dependsOn:
    - name: capi-providers
  healthChecks:
    - apiVersion: cluster.x-k8s.io/v1beta2
      kind: Cluster
      name: production-workload
      namespace: default
```

## Step 3: Bootstrap Flux on New Workload Clusters

When CAPI provisions a new cluster, automatically bootstrap Flux on it using a `ClusterResourceSet`:

```yaml
# cluster-resource-set.yaml - Automatically apply Flux bootstrap to new clusters
apiVersion: addons.cluster.x-k8s.io/v1beta2
kind: ClusterResourceSet
metadata:
  name: flux-bootstrap
  namespace: default
spec:
  strategy: Reconcile
  # Apply to all clusters with this label
  clusterSelector:
    matchLabels:
      managed-by: flux
  resources:
    - name: flux-components
      kind: ConfigMap
---
# ConfigMap containing Flux installation manifests
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-components
  namespace: default
data:
  flux-components.yaml: |
    # Flux component manifests go here
    # Generate with: flux install --export
```

## Step 4: Monitor Cluster Provisioning

```bash
# Watch cluster provisioning status
kubectl get clusters -A --watch

# Check all CAPI resources
kubectl get machines,machinedeployments,machinepools -A

# View CAPI events for a specific cluster
kubectl describe cluster production-workload -n default

# Get kubeconfig for the provisioned workload cluster
clusterctl get kubeconfig production-workload > workload-kubeconfig.yaml
kubectl get nodes --kubeconfig workload-kubeconfig.yaml
```

## Best Practices

- Store all cluster definitions in Git and use Flux `prune: true` for complete lifecycle management
- Use `ClusterResourceSet` to automatically install CNI and Flux on newly provisioned clusters
- Implement separate Git paths for cluster definitions per environment (development, staging, production)
- Use CAPI's `MachineHealthCheck` for automatic node remediation
- Test cluster upgrades by creating a new cluster version and migrating workloads before deleting the old cluster

## Conclusion

Combining Flux CD with Cluster API creates a fully GitOps-managed Kubernetes infrastructure where cluster creation, upgrades, and deletion are all driven by Git commits. This approach gives platform teams an auditable, declarative cluster management system with automatic reconciliation. The initial setup requires more configuration than imperative tools, but the operational benefits - reproducibility, auditability, and self-healing - make it the recommended approach for organizations managing multiple Kubernetes clusters.
