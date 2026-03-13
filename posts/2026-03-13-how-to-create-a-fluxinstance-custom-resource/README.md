# How to Create a FluxInstance Custom Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, FluxInstance, Kubernetes, GitOps, Flux Operator

Description: Learn how to create and configure a FluxInstance custom resource to deploy Flux CD components through the Flux Operator.

---

## Introduction

The FluxInstance custom resource is the primary interface for managing Flux CD installations through the Flux Operator. It defines which Flux components to install, their configuration, and the desired version. By creating a FluxInstance resource, you tell the Flux Operator exactly how Flux should be deployed on your cluster.

This guide covers creating a FluxInstance from scratch, understanding its specification fields, and configuring it for common deployment scenarios. You will learn how to define component selections, set up source synchronization, and manage the lifecycle of your Flux installation through the FluxInstance resource.

## Prerequisites

Before you begin, ensure you have:

- The Flux Operator installed on your Kubernetes cluster.
- `kubectl` installed and configured.
- Cluster admin permissions.

## Creating a Basic FluxInstance

Start with a minimal FluxInstance that installs Flux with default settings.

```yaml
# flux-instance-basic.yaml
# Minimal FluxInstance resource
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
    registry: ghcr.io/fluxcd
```

Apply the resource.

```bash
kubectl apply -f flux-instance-basic.yaml
```

The Flux Operator will install the default set of Flux components using the latest 2.x version from the specified registry.

## Understanding FluxInstance Spec Fields

The FluxInstance specification has several important sections that control the Flux installation.

### Distribution

The distribution section specifies the Flux version and container registry.

```yaml
spec:
  distribution:
    version: "2.4.0"          # Specific version or semver range
    registry: ghcr.io/fluxcd  # Container registry for Flux images
    imagePullSecret: regcred  # Optional: secret for private registries
```

### Components

The components section lists which Flux controllers to install.

```yaml
spec:
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
    - image-reflector-controller
    - image-automation-controller
```

### Cluster

The cluster section defines cluster-specific settings.

```yaml
spec:
  cluster:
    type: kubernetes       # kubernetes or openshift
    multitenant: false     # Enable multi-tenancy
    networkPolicy: true    # Create network policies
    domain: cluster.local  # Cluster DNS domain
```

## Creating a Full FluxInstance

Here is a comprehensive FluxInstance configuration suitable for production environments.

```yaml
# flux-instance-full.yaml
# Production FluxInstance with all configuration options
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.4.0"
    registry: ghcr.io/fluxcd
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  cluster:
    type: kubernetes
    multitenant: false
    networkPolicy: true
    domain: cluster.local
  kustomize:
    patches:
      - target:
          kind: Deployment
          name: "(kustomize-controller|helm-controller)"
        patch: |
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: all
          spec:
            template:
              spec:
                containers:
                  - name: manager
                    resources:
                      limits:
                        cpu: 1000m
                        memory: 1Gi
                      requests:
                        cpu: 200m
                        memory: 256Mi
```

Apply the resource.

```bash
kubectl apply -f flux-instance-full.yaml
```

## Configuring Sync with a Git Repository

To set up GitOps immediately after Flux installation, you can configure a sync section in the FluxInstance that points to your infrastructure repository.

```yaml
# flux-instance-with-sync.yaml
# FluxInstance with Git repository synchronization
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
    registry: ghcr.io/fluxcd
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  sync:
    kind: GitRepository
    url: https://github.com/myorg/fleet-infra.git
    ref: refs/heads/main
    path: clusters/production
    pullSecret: flux-git-auth
```

Create the Git authentication secret.

```bash
kubectl create secret generic flux-git-auth \
  --namespace flux-system \
  --from-literal=username=git \
  --from-literal=password=YOUR_GITHUB_TOKEN
```

## Configuring Sync with an OCI Repository

If you prefer OCI artifacts over Git repositories, configure the sync section to use an OCI source.

```yaml
# flux-instance-oci.yaml
# FluxInstance with OCI repository synchronization
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.x"
    registry: ghcr.io/fluxcd
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  sync:
    kind: OCIRepository
    url: oci://ghcr.io/myorg/fleet-infra
    ref: latest
    path: clusters/production
    pullSecret: ghcr-auth
```

## Checking FluxInstance Status

After creating the FluxInstance, monitor its reconciliation status.

```bash
# Get FluxInstance status
kubectl get fluxinstance -n flux-system

# Get detailed status with conditions
kubectl describe fluxinstance flux -n flux-system

# Check if all components are ready
kubectl get pods -n flux-system
```

The FluxInstance status will show conditions indicating whether the installation was successful, which components were deployed, and any errors encountered.

```bash
# Check the status conditions
kubectl get fluxinstance flux -n flux-system -o jsonpath='{.status.conditions[*].message}'
```

## Modifying a FluxInstance

To modify the Flux installation, update the FluxInstance resource. The Flux Operator will reconcile the changes.

```bash
# Edit the FluxInstance
kubectl edit fluxinstance flux -n flux-system

# Or apply an updated manifest
kubectl apply -f flux-instance-updated.yaml
```

For example, to add the image automation controllers:

```yaml
spec:
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
    - image-reflector-controller      # Added
    - image-automation-controller     # Added
```

## Deleting a FluxInstance

When you delete a FluxInstance, the Flux Operator removes all Flux components from the cluster.

```bash
# Delete the FluxInstance
kubectl delete fluxinstance flux -n flux-system

# Verify Flux components are removed
kubectl get pods -n flux-system
```

Only the Flux Operator pod should remain after deletion.

## Conclusion

The FluxInstance custom resource provides a clean, declarative way to manage Flux CD installations through the Flux Operator. By defining the distribution version, component selection, cluster configuration, and optional Git or OCI synchronization, you can fully configure your Flux installation as a Kubernetes resource. This approach makes Flux installations reproducible, version-controlled, and manageable through the same GitOps workflows that Flux itself provides for your applications.
