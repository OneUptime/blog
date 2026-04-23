# How to Enable Cluster API with Rancher Turtles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, Kubernetes, Rancher, Infrastructure

Description: Learn how to enable and configure Cluster API providers in Rancher Turtles for managing Kubernetes cluster infrastructure across multiple platforms.

## Introduction

Cluster API (CAPI) is a Kubernetes sub-project that provides declarative APIs for cluster lifecycle management. Rancher Turtles integrates CAPI into Rancher, enabling you to use CAPI's provider ecosystem while managing clusters through Rancher's unified interface.

## Understanding CAPI Components

CAPI has four main component types:

| Component | Function |
|-----------|----------|
| Core Provider | Core CAPI controllers and APIs |
| Bootstrap Provider | Generates bootstrap data for nodes (for example, kubeadm or RKE2 configuration) |
| Control Plane Provider | Manages control plane lifecycle |
| Infrastructure Provider | Creates cloud infrastructure (AWS, Azure, vSphere) |

## Enabling CAPI Providers via CAPIProvider CRD

Rancher Turtles introduces a `CAPIProvider` CRD for managing providers:

```yaml
# enable-aws-provider.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: capa-system
---
apiVersion: turtles-capi.cattle.io/v1alpha1
kind: CAPIProvider
metadata:
  name: aws
  namespace: capa-system
spec:
  name: aws
  type: infrastructure
  configSecret:
    name: aws-variables
```

```bash
kubectl apply -f enable-aws-provider.yaml

# Verify the provider resource exists; it becomes Ready after the config secret is created
kubectl get capiproviders -n capa-system
```

## Verifying Rancher Turtles and CAPI

On Rancher v2.13 and later, Rancher Turtles is installed as part of Rancher and providers are managed declaratively through `CAPIProvider` resources:

```bash
# Verify Rancher Turtles and the core CAPI controller are running
kubectl get deployment -n cattle-turtles-system rancher-turtles-controller-manager
kubectl get deployment -n cattle-capi-system capi-controller-manager

# Verify the CAPIProvider CRD is available
kubectl get crd capiproviders.turtles-capi.cattle.io
```

## Configuring the RKE2 Providers

RKE2-based clusters require both the bootstrap and control plane providers. The RKE2/Kubernetes version is set on the workload cluster resources, not on the `CAPIProvider` objects.

```yaml
# rke2-providers.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rke2-bootstrap-system
---
apiVersion: turtles-capi.cattle.io/v1alpha1
kind: CAPIProvider
metadata:
  name: rke2-bootstrap
  namespace: rke2-bootstrap-system
spec:
  name: rke2
  type: bootstrap
---
apiVersion: v1
kind: Namespace
metadata:
  name: rke2-control-plane-system
---
apiVersion: turtles-capi.cattle.io/v1alpha1
kind: CAPIProvider
metadata:
  name: rke2-control-plane
  namespace: rke2-control-plane-system
spec:
  name: rke2
  type: controlPlane
```

## Enabling Auto-Import for CAPI Clusters

Configure Rancher Turtles to automatically import CAPI clusters into Rancher:

```bash
# Label the namespace where CAPI clusters are created
kubectl label namespace capi-clusters \
  cluster-api.cattle.io/rancher-auto-import=true

# Or label an individual CAPI Cluster
kubectl label -n capi-clusters clusters.cluster.x-k8s.io cluster1 \
  cluster-api.cattle.io/rancher-auto-import=true
```

## Verifying Provider Status

```bash
# List all installed CAPIProvider resources
kubectl get capiproviders -A -o wide

# Check provider health
kubectl describe capiprovider -n capa-system aws

# Watch provider reconciliation
kubectl get capiproviders -A --watch

# Check controller logs for a provider, for example CAPA
kubectl logs -n capa-system \
  -l control-plane=controller-manager \
  --follow
```

## Configuring CAPI Variables

Set environment variables required by infrastructure providers. For CAPA, create the secret in the same namespace as the provider and store credentials in the format expected by CAPA. The provider reaches `Ready` after this secret is available:

```bash
# For AWS
export AWS_REGION=us-west-2
export AWS_ACCESS_KEY_ID=<your-key>
export AWS_SECRET_ACCESS_KEY=<your-secret>

# Encode credentials in the format expected by CAPA
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)

# Create the secret referenced by CAPIProvider.spec.configSecret
kubectl create secret generic aws-variables \
  --namespace capa-system \
  --from-literal=AWS_B64ENCODED_CREDENTIALS="${AWS_B64ENCODED_CREDENTIALS}"
```

## Conclusion

Enabling Cluster API with Rancher Turtles extends Rancher's cluster management capabilities to the full CAPI provider ecosystem. By installing infrastructure, bootstrap, and control plane providers, you gain the ability to provision Kubernetes clusters declaratively across any platform that has a CAPI provider, all managed through Rancher's unified interface.
