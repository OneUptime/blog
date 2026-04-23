# How to Configure Rancher Turtles for Air-Gapped Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, Air-Gap, Kubernetes, Security

Description: Set up Rancher Turtles and CAPI providers in air-gapped environments using mirrored images and offline installations.

## Introduction

Configuring Rancher Turtles for air-gapped environments requires more than applying a generic `Cluster` manifest. Rancher Turtles uses the `CAPIProvider` resource to manage Cluster API providers declaratively, and air-gapped setups must provide provider manifests from an internal source such as a private OCI registry or pre-created `ConfigMap` objects.

## Prerequisites

- Rancher Turtles installed on the management cluster
- `kubectl` access to the management cluster
- A private OCI registry reachable from the management cluster
- Rancher's `system-default-registry` configured if you want Rancher Turtles to rewrite provider image registries automatically
- Mirrored CAPI provider controller images in that registry
- Mirrored provider manifests available as OCI artifacts or `ConfigMap` objects

## Overview

Rancher Turtles integrates Cluster API (CAPI) with Rancher by using the Cluster API Operator and the `CAPIProvider` custom resource. In an air-gapped environment, the core CAPI provider can run from the manifest embedded in the chart, but additional providers must fetch manifests from an internal source and pull controller images from a registry that is reachable inside the isolated environment. When Rancher's `system-default-registry` is configured, Rancher Turtles can automatically rewrite provider image registries to that internal registry as long as the mirrored image paths preserve the upstream namespace and image names.

## Step 1: Prepare Your Environment

The commands below assume the default namespaces used by Rancher-installed Rancher Turtles.

```bash
# Verify the Rancher Turtles controller is running
kubectl get pods -n cattle-turtles-system

# Review any existing Rancher Turtles provider definitions
kubectl get capiproviders.turtles-capi.cattle.io -A

# If you want downstream CAPI clusters to be imported into Rancher,
# label the namespace where those Cluster objects will be created
kubectl create namespace capi-clusters --dry-run=client -o yaml | kubectl apply -f -
kubectl label namespace capi-clusters cluster-api.cattle.io/rancher-auto-import=true --overwrite
```

## Step 2: Configure Resources

```yaml
# Example air-gapped provider configuration using a mirrored OCI artifact.
# This assumes the provider images have also been mirrored to the registry
# referenced by Rancher's system-default-registry.
apiVersion: v1
kind: Namespace
metadata:
  name: capz-system
---
apiVersion: turtles-capi.cattle.io/v1alpha1
kind: CAPIProvider
metadata:
  name: azure
  namespace: capz-system
spec:
  type: infrastructure
  name: azure
  version: v1.19.4
  fetchConfig:
    oci: registry.example.com/cluster-api-azure-controller-components:v1.19.4
```

```bash
# Push the mirrored provider manifests to your private registry
oras push registry.example.com/cluster-api-azure-controller-components:v1.19.4 \
  infrastructure-components.yaml:application/vnd.test.file \
  metadata.yaml:application/vnd.test.file

# Apply the provider configuration
kubectl apply -f capz-provider-oci.yaml

# Monitor the provider until it becomes ready
kubectl get capiproviders.turtles-capi.cattle.io azure -n capz-system --watch
```

## Step 3: Verify the Configuration

```bash
# Check provider status
kubectl get capiproviders.turtles-capi.cattle.io -A

# Describe the provider for detailed status
kubectl describe capiproviders.turtles-capi.cattle.io azure -n capz-system

# Verify the provider controller deployment exists
kubectl get deployments -n capz-system

# After a downstream CAPI cluster reaches ControlPlaneAvailable,
# Rancher Turtles creates a Rancher management cluster resource
kubectl get clusters.management.cattle.io
```

## Step 4: Validate in Rancher UI

1. Navigate to **Cluster Management** in Rancher.
2. Create or apply your downstream CAPI cluster in the namespace you labeled for auto-import.
3. Wait for the CAPI cluster to reach `ControlPlaneAvailable=True`.
4. Verify the imported cluster appears in Rancher after the `cattle-cluster-agent` is deployed.

## Common Operations

```bash
# Mirror another version of the provider artifact into the private registry
oras push registry.example.com/cluster-api-azure-controller-components:v1.19.5 \
  infrastructure-components.yaml:application/vnd.test.file \
  metadata.yaml:application/vnd.test.file

# Update the provider version in-place
kubectl patch capiproviders.turtles-capi.cattle.io azure -n capz-system \
  --type merge \
  -p '{"spec":{"version":"v1.19.5","fetchConfig":{"oci":"registry.example.com/cluster-api-azure-controller-components:v1.19.5"}}}'

# Get the kubeconfig for a workload cluster once it has been provisioned
clusterctl get kubeconfig example-cluster --namespace capi-clusters > cluster-kubeconfig.yaml
```

## Troubleshooting

```bash
# Check Rancher Turtles controller logs
kubectl logs -n cattle-turtles-system -l control-plane=controller-manager --follow

# Check core CAPI controller logs
kubectl logs -n cattle-capi-system -l control-plane=controller-manager --follow

# Check provider controller logs
kubectl logs -n capz-system -l control-plane=controller-manager --follow

# Get recent events for the provider namespace
kubectl get events -n capz-system --sort-by=.lastTimestamp
```

## Conclusion

Configuring Rancher Turtles for air-gapped environments centers on mirroring provider manifests and images, then pointing `CAPIProvider` resources at those internal artifacts. Once the provider is installed and the target namespace is labeled for auto-import, downstream CAPI clusters can be registered in Rancher without depending on direct Internet access.
