# How to Configure FluxInstance with Cluster Profiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, FluxInstance, Cluster Profiles, Kubernetes, GitOps, Multi-Cluster

Description: Learn how to use cluster profiles in FluxInstance to apply predefined configurations for different cluster types and environments.

---

## Introduction

Managing Flux configurations across clusters with different requirements can be challenging. A development cluster might need minimal resources and broad access, while a production cluster requires strict multi-tenancy, network policies, and higher resource allocations. The FluxInstance resource supports cluster configuration settings that can be used as reusable patterns for common cluster types, simplifying the process of configuring Flux appropriately for each environment.

This guide covers how to use cluster configuration settings in FluxInstance, the available options, and how to combine them with custom configurations for precise control over your Flux installations.

## Prerequisites

Before you begin, ensure you have:

- The Flux Operator installed on your Kubernetes clusters.
- `kubectl` installed and configured.
- Understanding of your cluster topology and requirements.

## Understanding Cluster Configuration

The `cluster` section in the FluxInstance resource provides a shorthand for applying configuration options that are appropriate for a particular cluster type and scale. The `cluster` section of the FluxInstance spec is where you define these settings.

```yaml
spec:
  cluster:
    type: kubernetes        # Cluster type: kubernetes, openshift, azure, aws, or gcp
    size: small             # Scaling profile: small, medium, or large
    multitenant: false      # Enable multi-tenancy isolation
    networkPolicy: true     # Create network policies for Flux
    domain: cluster.local   # Cluster DNS domain
```

## Kubernetes Standard Configuration

The default Kubernetes configuration installs Flux with standard settings suitable for most Kubernetes clusters.

```yaml
# flux-instance-kubernetes.yaml

# FluxInstance with standard Kubernetes configuration
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
  cluster:
    type: kubernetes
    size: small
    multitenant: false
    networkPolicy: true
    domain: cluster.local
```

This configuration creates network policies that restrict access to the Flux namespace from other namespaces and uses the standard cluster DNS domain for service discovery.

## OpenShift Configuration

For Red Hat OpenShift clusters, use the OpenShift cluster type. This adjusts the Flux installation to work with OpenShift's security context constraints.

```yaml
# flux-instance-openshift.yaml
# FluxInstance configured for OpenShift
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
  cluster:
    type: openshift
    multitenant: false
    networkPolicy: true
    domain: cluster.local
```

The OpenShift configuration ensures that Flux pods run with the appropriate OpenShift security context settings.

## Multi-Tenant Configuration

For clusters shared by multiple teams, enable multi-tenancy. This enables Flux multi-tenancy lockdown and helps enforce tenant isolation.

```yaml
# flux-instance-multitenant.yaml
# FluxInstance with multi-tenancy enabled
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
  cluster:
    type: kubernetes
    multitenant: true
    tenantDefaultServiceAccount: default
    networkPolicy: true
```

The multi-tenant configuration enables Flux multi-tenancy lockdown, including cross-namespace reference restrictions. Flux `Kustomization` and `HelmRelease` resources without an explicit service account use the configured tenant default service account in their namespace.

## Development Configuration

For development and testing clusters, configure a lightweight Flux installation with minimal resource requirements.

```yaml
# flux-instance-dev.yaml
# FluxInstance optimized for development clusters
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
  cluster:
    type: kubernetes
    size: small
    multitenant: false
    networkPolicy: false
  kustomize:
    patches:
      - target:
          kind: Deployment
        patch: |
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: all
          spec:
            replicas: 1
            template:
              spec:
                containers:
                  - name: manager
                    resources:
                      limits:
                        cpu: 500m
                        memory: 256Mi
                      requests:
                        cpu: 50m
                        memory: 64Mi
```

This configuration disables Flux network policies, reduces resource requirements, and omits the notification controller to minimize overhead.

## Production Scaling Configuration

For production clusters that manage many applications, configure Flux with a larger scaling profile and increased resource limits.

```yaml
# flux-instance-production.yaml
# FluxInstance configured for production scaling
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
  cluster:
    type: kubernetes
    size: large
    multitenant: false
    networkPolicy: true
  kustomize:
    patches:
      - target:
          kind: Deployment
          name: source-controller
        patch: |
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: source-controller
          spec:
            template:
              spec:
                containers:
                  - name: manager
                    resources:
                      limits:
                        cpu: 2000m
                        memory: 2Gi
                      requests:
                        cpu: 500m
                        memory: 512Mi
```

For horizontal scaling, use Flux Operator sharding rather than increasing controller deployment replicas directly.

## Edge Cluster Configuration

For resource-constrained edge clusters, use a minimal component set and the small scaling profile.

```yaml
# flux-instance-edge.yaml
# FluxInstance optimized for edge clusters
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
  cluster:
    type: kubernetes
    size: small
    networkPolicy: false
    domain: cluster.local
```

## Managing Configurations Through Git

Store your cluster configurations in a Git repository and apply them through GitOps. Organize configurations by cluster type and environment.

```text
fleet-infra/
  clusters/
    dev/
      flux-instance.yaml
    staging/
      flux-instance.yaml
    production/
      flux-instance.yaml
    edge/
      flux-instance.yaml
```

Each cluster bootstraps from its corresponding directory, applying the appropriate FluxInstance configuration automatically.

## Conclusion

FluxInstance cluster configuration provides a structured way to configure Flux for different cluster types and environments. By combining the built-in cluster type and size settings with kustomize patches for resource allocation and controller arguments, you can create configurations that match each cluster's specific requirements. Storing these configurations in Git enables consistent, version-controlled Flux configurations across your entire fleet.
