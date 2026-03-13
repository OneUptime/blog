# How to Configure FluxInstance with Cluster Profiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, FluxInstance, Cluster Profiles, Kubernetes, GitOps, Multi-Cluster

Description: Learn how to use cluster profiles in FluxInstance to apply predefined configurations for different cluster types and environments.

---

## Introduction

Managing Flux configurations across clusters with different requirements can be challenging. A development cluster might need minimal resources and broad access, while a production cluster requires strict multi-tenancy, network policies, and higher resource allocations. The FluxInstance resource supports cluster profiles that provide predefined configuration templates for common cluster types, simplifying the process of configuring Flux appropriately for each environment.

This guide covers how to use cluster profiles in FluxInstance, the available profile options, and how to combine profiles with custom configurations for precise control over your Flux installations.

## Prerequisites

Before you begin, ensure you have:

- The Flux Operator installed on your Kubernetes clusters.
- `kubectl` installed and configured.
- Understanding of your cluster topology and requirements.

## Understanding Cluster Profiles

Cluster profiles in the FluxInstance resource provide a shorthand for applying a set of configuration options that are appropriate for a particular cluster type. The `cluster` section of the FluxInstance spec is where you define the profile settings.

```yaml
spec:
  cluster:
    type: kubernetes        # Cluster type: kubernetes or openshift
    multitenant: false      # Enable multi-tenancy isolation
    networkPolicy: true     # Create network policies for Flux
    domain: cluster.local   # Cluster DNS domain
```

## Kubernetes Standard Profile

The default Kubernetes profile installs Flux with standard settings suitable for most Kubernetes clusters.

```yaml
# flux-instance-kubernetes.yaml
# FluxInstance with standard Kubernetes profile
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
    multitenant: false
    networkPolicy: true
    domain: cluster.local
```

This profile creates network policies that restrict traffic to and from Flux components and uses the standard cluster DNS domain for service discovery.

## OpenShift Profile

For Red Hat OpenShift clusters, use the OpenShift cluster type. This adjusts the Flux installation to work with OpenShift's security context constraints and routing.

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
    networkPolicy: true
```

The OpenShift profile ensures that Flux pods run with the appropriate security context and that OpenShift-specific features like Routes are handled correctly.

## Multi-Tenant Profile

For clusters shared by multiple teams, enable the multi-tenant profile. This restricts Flux's access to specific namespaces and enforces tenant isolation.

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
    networkPolicy: true
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
                    args:
                      - --no-cross-namespace-refs=true
                      - --default-service-account=default
                      - --watch-all-namespaces=true
                      - --log-level=info
```

The multi-tenant configuration disables cross-namespace references, preventing tenants from accessing resources in other namespaces. Each tenant uses their own service account for reconciliation.

## Development Profile

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

This profile disables network policies, reduces resource requirements, and omits the notification controller to minimize overhead.

## Production High-Availability Profile

For production clusters requiring high availability, configure Flux with increased replicas and resources.

```yaml
# flux-instance-production-ha.yaml
# FluxInstance configured for production high availability
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
            replicas: 2
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
                topologySpreadConstraints:
                  - maxSkew: 1
                    topologyKey: kubernetes.io/hostname
                    whenUnsatisfiable: ScheduleAnyway
                    labelSelector:
                      matchLabels:
                        app: source-controller
```

## Edge Cluster Profile

For resource-constrained edge clusters, use a minimal profile with tight resource limits.

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
    networkPolicy: false
    domain: cluster.local
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
                        cpu: 250m
                        memory: 128Mi
                      requests:
                        cpu: 25m
                        memory: 32Mi
```

## Managing Profiles Through Git

Store your cluster profiles in a Git repository and apply them through GitOps. Organize profiles by cluster type and environment.

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

Cluster profiles in FluxInstance provide a structured way to configure Flux for different cluster types and environments. By combining the built-in cluster type settings with kustomize patches for resource allocation, replica counts, and controller arguments, you can create profiles that match each cluster's specific requirements. Storing these profiles in Git enables consistent, version-controlled Flux configurations across your entire fleet.
