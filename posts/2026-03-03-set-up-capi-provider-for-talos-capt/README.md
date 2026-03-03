# How to Set Up CAPI Provider for Talos (CAPT)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CAPI, CAPT, Kubernetes, Cluster Management

Description: A step-by-step guide to installing and configuring the Cluster API Provider for Talos (CAPT) on your management cluster.

---

The Cluster API Provider for Talos, commonly known as CAPT, is the bridge between Cluster API and Talos Linux. It consists of two components: a bootstrap provider that generates Talos machine configurations and a control plane provider that manages the Talos control plane lifecycle. Setting up CAPT correctly is the foundation for managing Talos clusters through CAPI. This guide walks through the complete installation and configuration process.

## What CAPT Provides

CAPT includes two separate Kubernetes controllers that extend the Cluster API framework:

**Bootstrap Provider (CABPT)** - This controller generates Talos machine configurations for new machines. When CAPI creates a new Machine resource, the bootstrap provider generates the appropriate `controlplane.yaml` or `worker.yaml` configuration and passes it to the infrastructure provider as bootstrap data.

**Control Plane Provider (CACPPT)** - This controller manages the lifecycle of the Talos control plane. It handles scaling control plane nodes up and down, rolling out upgrades, and ensuring that etcd membership is managed correctly during these operations.

Together, these providers enable CAPI to create, scale, upgrade, and delete Talos Linux clusters just like it would with any other bootstrap/control plane combination.

## Prerequisites

Before installing CAPT, you need:

- A Kubernetes cluster to serve as the management cluster (kind, k3s, or a dedicated cluster)
- `kubectl` configured to access the management cluster
- `clusterctl` CLI installed (v1.7.0 or later)
- An infrastructure provider installed (AWS, Azure, vSphere, etc.)

Install `clusterctl` if you have not already:

```bash
# Download clusterctl
curl -L https://github.com/kubernetes-sigs/cluster-api/releases/download/v1.7.0/clusterctl-linux-amd64 -o clusterctl
chmod +x clusterctl
sudo mv clusterctl /usr/local/bin/

# Verify installation
clusterctl version
```

## Installing CAPT with clusterctl

The simplest way to install CAPT is through `clusterctl init`:

```bash
# Initialize CAPI with Talos bootstrap and control plane providers
# along with your chosen infrastructure provider
clusterctl init \
  --bootstrap talos \
  --control-plane talos \
  --infrastructure aws

# For Azure
clusterctl init \
  --bootstrap talos \
  --control-plane talos \
  --infrastructure azure

# For vSphere
clusterctl init \
  --bootstrap talos \
  --control-plane talos \
  --infrastructure vsphere
```

This command installs the core CAPI components, the Talos bootstrap and control plane providers, and the specified infrastructure provider.

## Verifying the Installation

Check that all CAPT components are running:

```bash
# Check CAPI core components
kubectl get pods -n capi-system
# Expected: capi-controller-manager running

# Check Talos bootstrap provider
kubectl get pods -n cabpt-system
# Expected: cabpt-controller-manager running

# Check Talos control plane provider
kubectl get pods -n cacppt-system
# Expected: cacppt-controller-manager running

# Check infrastructure provider (example: AWS)
kubectl get pods -n capa-system
# Expected: capa-controller-manager running
```

Verify that the custom resource definitions are installed:

```bash
# List Talos-related CRDs
kubectl get crds | grep talos

# Expected output includes:
# talosconfigs.bootstrap.cluster.x-k8s.io
# talosconfigtemplates.bootstrap.cluster.x-k8s.io
# taloscontrolplanes.controlplane.cluster.x-k8s.io
```

## Manual Installation

If you need more control over the installation, you can install the providers manually from their release manifests:

```bash
# Install the Talos bootstrap provider
kubectl apply -f https://github.com/siderolabs/cluster-api-bootstrap-provider-talos/releases/download/v0.6.5/bootstrap-components.yaml

# Install the Talos control plane provider
kubectl apply -f https://github.com/siderolabs/cluster-api-control-plane-provider-talos/releases/download/v0.5.6/control-plane-components.yaml

# Wait for deployments to be ready
kubectl wait --for=condition=Available --timeout=300s \
  deployment/cabpt-controller-manager -n cabpt-system

kubectl wait --for=condition=Available --timeout=300s \
  deployment/cacppt-controller-manager -n cacppt-system
```

## Configuring the clusterctl Configuration File

For repeatable installations, configure `clusterctl` through its configuration file:

```yaml
# ~/.cluster-api/clusterctl.yaml

# Provider repository overrides (optional)
providers:
  - name: "talos"
    url: "https://github.com/siderolabs/cluster-api-bootstrap-provider-talos/releases/latest/bootstrap-components.yaml"
    type: "BootstrapProvider"
  - name: "talos"
    url: "https://github.com/siderolabs/cluster-api-control-plane-provider-talos/releases/latest/control-plane-components.yaml"
    type: "ControlPlaneProvider"

# Infrastructure provider credentials
# AWS example
AWS_B64ENCODED_CREDENTIALS: "<base64-encoded-credentials>"

# Azure example
AZURE_SUBSCRIPTION_ID: "<subscription-id>"
AZURE_TENANT_ID: "<tenant-id>"
AZURE_CLIENT_ID: "<client-id>"
AZURE_CLIENT_SECRET: "<client-secret>"
```

## Setting Up Infrastructure Provider Credentials

Each infrastructure provider needs credentials configured. Here are examples for common providers:

### AWS Credentials

```bash
# Export AWS credentials
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=<your-access-key>
export AWS_SECRET_ACCESS_KEY=<your-secret-key>

# Encode credentials for CAPI
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)

# Initialize with AWS provider
clusterctl init --bootstrap talos --control-plane talos --infrastructure aws
```

### Azure Credentials

```bash
# Export Azure credentials
export AZURE_SUBSCRIPTION_ID="<subscription-id>"
export AZURE_TENANT_ID="<tenant-id>"
export AZURE_CLIENT_ID="<client-id>"
export AZURE_CLIENT_SECRET="<client-secret>"
export AZURE_SUBSCRIPTION_ID_B64="$(echo -n "$AZURE_SUBSCRIPTION_ID" | base64)"
export AZURE_TENANT_ID_B64="$(echo -n "$AZURE_TENANT_ID" | base64)"
export AZURE_CLIENT_ID_B64="$(echo -n "$AZURE_CLIENT_ID" | base64)"
export AZURE_CLIENT_SECRET_B64="$(echo -n "$AZURE_CLIENT_SECRET" | base64)"

# Initialize with Azure provider
clusterctl init --bootstrap talos --control-plane talos --infrastructure azure
```

### vSphere Credentials

```bash
# Export vSphere credentials
export VSPHERE_USERNAME="administrator@vsphere.local"
export VSPHERE_PASSWORD="<password>"
export VSPHERE_SERVER="vcenter.example.com"
export VSPHERE_TLS_THUMBPRINT="<thumbprint>"

# Initialize with vSphere provider
clusterctl init --bootstrap talos --control-plane talos --infrastructure vsphere
```

## Testing the Provider Setup

Create a simple test cluster to verify everything works:

```yaml
# test-cluster.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: test-cluster
  namespace: default
spec:
  clusterNetwork:
    pods:
      cidrBlocks: ["10.244.0.0/16"]
    services:
      cidrBlocks: ["10.96.0.0/12"]
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
    kind: TalosControlPlane
    name: test-cluster-cp
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSCluster
    name: test-cluster

---
apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
kind: TalosControlPlane
metadata:
  name: test-cluster-cp
  namespace: default
spec:
  version: v1.30.0
  replicas: 1
  infrastructureTemplate:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSMachineTemplate
    name: test-cluster-cp
  controlPlaneConfig:
    controlplane:
      generateType: controlplane
      talosVersion: v1.7.0
```

```bash
# Apply the test cluster
kubectl apply -f test-cluster.yaml

# Watch the provisioning
kubectl get clusters -w

# Clean up after testing
kubectl delete cluster test-cluster
```

## Upgrading CAPT

To upgrade the CAPT providers:

```bash
# Check current provider versions
clusterctl upgrade plan

# Upgrade all providers
clusterctl upgrade apply --contract v1beta1

# Or upgrade specific providers
clusterctl upgrade apply \
  --bootstrap talos:v0.6.6 \
  --control-plane talos:v0.5.7
```

## Troubleshooting the Setup

If providers are not starting correctly, check the logs:

```bash
# Check bootstrap provider logs
kubectl logs -n cabpt-system deployment/cabpt-controller-manager -f

# Check control plane provider logs
kubectl logs -n cacppt-system deployment/cacppt-controller-manager -f

# Check for events
kubectl get events --sort-by='.metadata.creationTimestamp' -A | grep -i talos
```

Common issues include missing credentials for the infrastructure provider, network connectivity problems from the management cluster to the target infrastructure, and version incompatibilities between the CAPI core and the Talos providers. Always check the compatibility matrix in the CAPT documentation before upgrading.

Setting up CAPT is a one-time effort that unlocks powerful cluster management capabilities. Once the providers are running on your management cluster, you can create and manage as many Talos workload clusters as you need through simple Kubernetes resource definitions.
