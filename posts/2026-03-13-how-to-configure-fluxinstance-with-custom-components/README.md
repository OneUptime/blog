# How to Configure FluxInstance with Custom Components

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, FluxInstance, Custom Components, Kubernetes, GitOps

Description: Learn how to configure a FluxInstance with custom component selections and resource customizations for tailored Flux deployments.

---

## Introduction

Flux CD consists of several controllers, each responsible for a specific aspect of GitOps automation. Not every cluster needs all Flux components. A cluster that only uses Kustomize overlays does not need the Helm controller, and a cluster without image automation does not need the image reflector or image automation controllers. The FluxInstance resource lets you select exactly which components to install and customize their resource allocations, replicas, and other settings.

This guide covers configuring FluxInstance with custom component selections and applying customizations to individual controllers for optimized Flux deployments.

## Prerequisites

Before you begin, ensure you have:

- The Flux Operator installed on your Kubernetes cluster.
- `kubectl` installed and configured.
- Understanding of Flux CD components and their roles.

## Understanding Flux Components

Flux CD includes the following controllers:

- **source-controller**: Manages GitRepository, OCIRepository, HelmRepository, and Bucket sources.
- **kustomize-controller**: Applies Kustomization resources to reconcile Kubernetes manifests.
- **helm-controller**: Manages HelmRelease resources for Helm chart deployments.
- **notification-controller**: Handles alerts and event notifications.
- **image-reflector-controller**: Scans container registries for new image tags.
- **image-automation-controller**: Automates image updates in Git repositories.

## Minimal Component Selection

For clusters that only need basic GitOps with Kustomize, install the minimum set of controllers.

```yaml
# flux-instance-minimal.yaml
# FluxInstance with minimal components for Kustomize-only GitOps
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
```

This installs only the source controller for fetching manifests and the kustomize controller for applying them. No Helm or notification capabilities will be available.

## Full Component Selection with Image Automation

For clusters that need the full Flux feature set including automated image updates, install all components.

```yaml
# flux-instance-full.yaml
# FluxInstance with all Flux components including image automation
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
    - image-reflector-controller
    - image-automation-controller
```

## Helm-Only Configuration

For clusters managed entirely through Helm charts, include only the source and Helm controllers.

```yaml
# flux-instance-helm-only.yaml
# FluxInstance for Helm-only GitOps
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
    - helm-controller
    - notification-controller
```

## Customizing Component Resources

Use the kustomize patches section to customize resource allocations for individual controllers. This is important for production clusters where controllers manage many resources and need more memory or CPU.

```yaml
# flux-instance-custom-resources.yaml
# FluxInstance with custom resource allocations
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
                        cpu: 1000m
                        memory: 2Gi
                      requests:
                        cpu: 200m
                        memory: 512Mi
      - target:
          kind: Deployment
          name: kustomize-controller
        patch: |
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: kustomize-controller
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

## Adding Controller Arguments

Customize controller behavior by adding command-line arguments through patches.

```yaml
# flux-instance-custom-args.yaml
# FluxInstance with custom controller arguments
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
  kustomize:
    patches:
      - target:
          kind: Deployment
          name: kustomize-controller
        patch: |
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: kustomize-controller
          spec:
            template:
              spec:
                containers:
                  - name: manager
                    args:
                      - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                      - --watch-all-namespaces=true
                      - --log-level=info
                      - --log-encoding=json
                      - --concurrent=10
                      - --requeue-dependency=10s
      - target:
          kind: Deployment
          name: helm-controller
        patch: |
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: helm-controller
          spec:
            template:
              spec:
                containers:
                  - name: manager
                    args:
                      - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                      - --watch-all-namespaces=true
                      - --log-level=info
                      - --concurrent=8
```

## Configuring Node Affinity and Tolerations

For clusters with dedicated infrastructure nodes, configure the Flux components to run on specific nodes.

```yaml
# flux-instance-node-placement.yaml
# FluxInstance with node affinity and tolerations
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
            template:
              spec:
                nodeSelector:
                  node-role.kubernetes.io/infra: "true"
                tolerations:
                  - key: node-role.kubernetes.io/infra
                    operator: Exists
                    effect: NoSchedule
```

## Verifying Custom Components

After applying the FluxInstance, verify that only the selected components are running with the correct configuration.

```bash
# Check which deployments are running
kubectl get deployments -n flux-system

# Verify resource limits on a specific controller
kubectl get deployment source-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].resources}'

# Check controller arguments
kubectl get deployment kustomize-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].args}'
```

## Conclusion

Configuring FluxInstance with custom components allows you to optimize your Flux installation for each cluster's specific needs. By selecting only the required controllers, you reduce resource usage and attack surface. By customizing resource allocations, controller arguments, and node placement, you ensure Flux runs reliably in your specific environment. The kustomize patches mechanism provides the flexibility to modify any aspect of the Flux deployment without forking the upstream configuration.
