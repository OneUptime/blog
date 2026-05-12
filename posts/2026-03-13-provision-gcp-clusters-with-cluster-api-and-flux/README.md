# How to Provision GCP Clusters with Cluster API and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cluster API, CAPI, GCP, CAPG, GitOps, Kubernetes, Multi-Cluster

Description: Provision GCP GKE clusters using Cluster API and Flux CD for declarative, GitOps-driven Kubernetes cluster lifecycle management on Google Cloud.

---

## Introduction

The Cluster API GCP provider (CAPG) supports two modes: provisioning self-managed Kubernetes on GCP Compute Engine instances, and provisioning managed GKE clusters through the `GCPManagedCluster` resource. This guide covers GKE-managed clusters, which delegate the control plane lifecycle to Google while still using CAPI's declarative model for the node pools.

Using GKE through CAPG gives you the best of both worlds: Google manages the control plane (upgrades, security patches, etcd backups), while CAPI manages the node pool configuration through Git. Flux CD ensures the cluster manifests are continuously reconciled, and any drift-such as a node pool being manually scaled or configured outside Git-is detected and corrected.

## Prerequisites

- Cluster API with CAPG installed on the management cluster
- Flux CD bootstrapped on the management cluster
- A GCP project with GKE API enabled
- GCP service account with `roles/container.admin` and `roles/compute.admin`
- `kubectl`, `clusterctl`, and `gcloud` CLIs installed

## Step 1: Install the CAPG Provider

```bash
# Set GCP environment variables

export GCP_PROJECT_ID="my-gcp-project"
export GCP_REGION="us-central1"

# Create service account for CAPG
gcloud iam service-accounts create capg-controller \
  --display-name="CAPG Controller" \
  --project="${GCP_PROJECT_ID}"

# Grant necessary roles
gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:capg-controller@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/container.admin"

gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:capg-controller@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/compute.admin"

# Create and encode credentials
gcloud iam service-accounts keys create /tmp/capg-credentials.json \
  --iam-account="capg-controller@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

export GCP_B64ENCODED_CREDENTIALS=$(base64 -w0 /tmp/capg-credentials.json)
rm /tmp/capg-credentials.json

# Generate CAPG components
clusterctl generate provider --infrastructure gcp:v1.11.1 \
  > infrastructure/cluster-api/components/provider-gcp.yaml
```

## Step 2: Define the GKE Managed Cluster

```yaml
# clusters/workloads/gke-production-01/cluster.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: gke-production-01
  namespace: default
  labels:
    environment: production
    cloud: gcp
    region: us-central1
spec:
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: GCPManagedCluster
    name: gke-production-01
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: GCPManagedControlPlane
    name: gke-production-01-control-plane
```

## Step 3: Define the GCP Managed Cluster and Control Plane

```yaml
# clusters/workloads/gke-production-01/gcpmanagedcluster.yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: GCPManagedCluster
metadata:
  name: gke-production-01
  namespace: default
spec:
  project: my-gcp-project
  region: us-central1

---
# clusters/workloads/gke-production-01/control-plane.yaml
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: GCPManagedControlPlane
metadata:
  name: gke-production-01-control-plane
  namespace: default
spec:
  project: my-gcp-project
  location: us-central1
  # GKE channel controls automatic upgrade behavior
  releaseChannel: regular  # Options: rapid, regular, stable
  # Minimum Kubernetes version (GKE manages the patch version within the channel)
  controlPlaneVersion: "1.29"
  # Authorized networks for API server access
  master_authorized_networks_config:
    cidr_blocks:
      - cidr_block: "10.0.0.0/8"
        display_name: "Internal networks"
```

## Step 4: Define Node Pools

```yaml
# clusters/workloads/gke-production-01/nodepool-default.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachinePool
metadata:
  name: gke-production-01-default-pool
  namespace: default
spec:
  clusterName: gke-production-01
  replicas: 3
  template:
    spec:
      clusterName: gke-production-01
      version: v1.29.2
      bootstrap:
        dataSecretName: ""  # Not used for GKE managed nodes
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
        kind: GCPManagedMachinePool
        name: gke-production-01-default-pool

---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: GCPManagedMachinePool
metadata:
  name: gke-production-01-default-pool
  namespace: default
spec:
  nodePoolName: default-pool
  machineType: n2-standard-4
  diskSizeGb: 100
  diskType: pd-ssd
  # Enable autoscaling for the node pool
  scaling:
    enableAutoscaling: true
    minCount: 2
    maxCount: 10
  # Service account and OAuth scopes for node VMs
  nodeSecurity:
    serviceAccount:
      scopes:
        - https://www.googleapis.com/auth/cloud-platform
  # Labels applied to nodes
  kubernetesLabels:
    pool: default
    environment: production
  # Taints for specialized workloads (optional) - omitted for the default pool
  management:
    autoRepair: true   # Automatically repair unhealthy nodes
    autoUpgrade: true  # Allow GKE to upgrade node versions
```

## Step 5: Define a Spot Node Pool for Cost Savings

```yaml
# clusters/workloads/gke-production-01/nodepool-spot.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachinePool
metadata:
  name: gke-production-01-spot-pool
  namespace: default
spec:
  clusterName: gke-production-01
  replicas: 0  # Start at zero - autoscaler manages this
  template:
    spec:
      clusterName: gke-production-01
      version: v1.29.2
      bootstrap:
        dataSecretName: ""
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
        kind: GCPManagedMachinePool
        name: gke-production-01-spot-pool

---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: GCPManagedMachinePool
metadata:
  name: gke-production-01-spot-pool
  namespace: default
spec:
  nodePoolName: spot-pool
  machineType: n2-standard-8
  diskSizeGb: 100
  diskType: pd-standard
  scaling:
    enableAutoscaling: true
    minCount: 0
    maxCount: 20
  nodeSecurity:
    serviceAccount:
      scopes:
        - https://www.googleapis.com/auth/cloud-platform
  kubernetesLabels:
    pool: spot
  kubernetesTaints:
    - key: cloud.google.com/gke-spot
      value: "true"
      effect: NoSchedule
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/management/workloads/gke-production-01.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: workload-cluster-gke-production-01
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/workloads/gke-production-01
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: cluster-api
  healthChecks:
    - apiVersion: cluster.x-k8s.io/v1beta1
      kind: Cluster
      name: gke-production-01
      namespace: default
  timeout: 30m
```

## Best Practices

- Use the `regular` release channel for production GKE clusters. It provides a balance between stability and access to new features.
- Workload Identity is enabled by default on GKE clusters created through CAPG and is the recommended way for pods to authenticate to GCP services. Bind Kubernetes service accounts to GCP service accounts using the `iam.gke.io/gcp-service-account` annotation.
- Use a dedicated node pool with a taint for batch and stateless workloads. Configure `PodDisruptionBudgets` and `tolerations` appropriately. To run on Spot VMs, configure the GKE node pool's provisioning model directly with `gcloud` or in the GKE console, as CAPG v1.11 does not yet expose Spot mode on `GCPManagedMachinePool`.
- Enable `autoRepair: true` and `autoUpgrade: true` on node pools to let GKE handle node maintenance automatically.
- Restrict `master_authorized_networks_config` to internal CIDRs for production clusters to limit API server exposure.

## Conclusion

A GKE cluster with multiple node pools is now provisioned and managed through Cluster API and Flux CD. Google manages the control plane lifecycle while CAPI manages the node pool configuration declaratively from Git. Workload Identity is enabled by default for secure GCP access, and a dedicated pool with taints provides a place to schedule batch workloads.
