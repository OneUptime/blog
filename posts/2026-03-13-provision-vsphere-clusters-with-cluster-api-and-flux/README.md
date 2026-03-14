# Provision vSphere Clusters with Cluster API and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cluster API, CAPI, VSphere, CAPV, GitOps, Kubernetes, On-Premise

Description: Learn how to provision and manage on-premises Kubernetes clusters on VMware vSphere using Cluster API Provider vSphere (CAPV) and Flux CD, creating a GitOps-driven workflow for VM-based cluster...

---

## Introduction

Many enterprises run VMware vSphere as their primary on-premises virtualization platform, and Cluster API Provider vSphere (CAPV) brings the declarative Kubernetes cluster management model to vSphere-hosted VMs. By combining CAPV with Flux CD, you can manage your on-premises Kubernetes clusters with the same GitOps rigor as cloud-hosted clusters.

This matters for organizations with strict data residency requirements, air-gapped environments, or existing VMware investments. CAPV provisions VMs, configures networking, installs Kubernetes, and joins nodes to the cluster - all driven by YAML manifests stored in Git. Flux reconciles those manifests continuously, ensuring your on-premises clusters match their desired state.

This guide covers setting up CAPV on a management cluster, creating vSphere cluster manifests, and managing cluster lifecycle through Flux.

## Prerequisites

- A management Kubernetes cluster with Flux CD bootstrapped
- VMware vSphere 7.0+ with appropriate permissions
- A vSphere template (OVA) with the target OS and kubeadm pre-installed
- `clusterctl` CLI installed
- `govc` CLI for vSphere interaction
- `kubectl` and `flux` CLIs installed

## Step 1: Prepare the vSphere Environment

Create a VM template and configure vSphere permissions for CAPV.
```bash
# Download and import the CAPV OVA template into vSphere
export GOVC_URL=https://vcenter.example.com
export GOVC_USERNAME=administrator@vsphere.local
export GOVC_PASSWORD=<password>
export GOVC_INSECURE=false

# Import the pre-built Kubernetes OVA
govc import.ova \
  --name=ubuntu-2204-kube-v1.29.0 \
  --folder=/Datacenter/vm/templates \
  https://storage.googleapis.com/capv-images/release/v1.29.0/ubuntu-2204-kube-v1.29.0.ova
```

## Step 2: Initialize the CAPV Provider

Install the Cluster API vSphere provider on the management cluster.
```bash
# Set vSphere credentials as environment variables
export VSPHERE_USERNAME=administrator@vsphere.local
export VSPHERE_PASSWORD=<password>

# Initialize the CAPV provider
clusterctl init --infrastructure vsphere --core cluster-api \
  --bootstrap kubeadm --control-plane kubeadm
```

## Step 3: Generate the vSphere Cluster Manifest

Create the cluster manifest using clusterctl and commit it to Git.
```bash
# Generate a vSphere cluster template
clusterctl generate cluster vsphere-prod-01 \
  --infrastructure vsphere \
  --kubernetes-version v1.29.0 \
  --control-plane-machine-count 3 \
  --worker-machine-count 5 \
  > clusters/vsphere/vsphere-prod-01/cluster.yaml
```

The VSphereCluster resource defines the infrastructure specifics:
```yaml
# clusters/vsphere/vsphere-prod-01/cluster.yaml (excerpt)
# VSphereCluster resource defining the target vSphere environment
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: VSphereCluster
metadata:
  name: vsphere-prod-01
  namespace: default
spec:
  # vCenter server address
  server: vcenter.example.com
  # vSphere datacenter where VMs will be created
  thumbprint: "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD"
  identityRef:
    kind: Secret
    name: vsphere-credentials
```

## Step 4: Create a Flux Kustomization for the vSphere Cluster

Wire the cluster manifest into Flux for GitOps-managed lifecycle.
```yaml
# clusters/management/workload-clusters/vsphere-prod-01.yaml
# Flux Kustomization managing the vSphere cluster lifecycle
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vsphere-prod-01
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/vsphere/vsphere-prod-01
  prune: true
  timeout: 45m
  # Health check waits for cluster to be fully provisioned
  healthChecks:
    - apiVersion: cluster.x-k8s.io/v1beta1
      kind: Cluster
      name: vsphere-prod-01
      namespace: default
```

## Step 5: Monitor Cluster Provisioning

Track VM provisioning and cluster bootstrap progress.
```bash
# Watch the cluster provisioning status
kubectl get cluster vsphere-prod-01 -w

# Check vSphere machine status
kubectl get vspheremachines -l cluster.x-k8s.io/cluster-name=vsphere-prod-01

# Retrieve the kubeconfig for the new cluster
clusterctl get kubeconfig vsphere-prod-01 > ~/.kube/vsphere-prod-01.yaml
```

## Best Practices

- Use a dedicated vSphere service account with least-privilege permissions for CAPV
- Create VM templates for each supported Kubernetes version to enable rapid upgrades
- Store vSphere credentials in a Kubernetes secret managed by External Secrets Operator
- Use `MachineHealthCheck` resources to automatically replace unhealthy nodes
- Plan vSphere resource pools and storage policies before deploying clusters
- Test cluster creation and deletion workflows in a development vCenter before production

## Conclusion

CAPV and Flux CD bring GitOps-driven cluster lifecycle management to on-premises vSphere environments. By storing cluster manifests in Git and letting Flux reconcile them, your VMware-hosted Kubernetes clusters get the same change management rigor as cloud clusters. As your vSphere fleet grows, this pattern enables consistent governance across dozens of clusters without manual vCenter intervention.
