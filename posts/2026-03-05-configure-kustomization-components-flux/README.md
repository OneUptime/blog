# How to Configure Kustomization Components in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, Kustomization, Components

Description: Learn how to use Kustomize components within Flux Kustomization resources to create reusable, composable configuration fragments for your Kubernetes deployments.

---

## Introduction

Kustomize components were introduced in Kustomize v3.7.0 as a way to define reusable pieces of configuration that can be included across multiple overlays. Unlike bases, which are always applied in full, components are optional building blocks that add, modify, or delete resources and patches selectively.

When working with Flux CD, you can leverage components inside your `kustomization.yaml` files that Flux applies through its Kustomization custom resource. This guide walks you through setting up and using Kustomize components in a Flux-managed repository.

## What Are Kustomize Components?

A Kustomize component is declared with `kind: Component` in its `kustomization.yaml` file. Components can contain resources, patches, transformers, and other Kustomize features. The key difference from a base is that a component is designed to be mixed in optionally -- you include it only in overlays that need it.

Common use cases include:

- Adding a sidecar container (such as a logging agent) to selected environments
- Injecting environment-specific ConfigMaps or Secrets
- Enabling monitoring or observability features on a per-overlay basis

## Repository Structure

Here is an example directory layout for a Flux-managed repository that uses components.

```text
apps/
  myapp/
    base/
      deployment.yaml
      service.yaml
      kustomization.yaml
    components/
      logging-sidecar/
        kustomization.yaml
        patch.yaml
      monitoring/
        kustomization.yaml
        service-monitor.yaml
    overlays/
      staging/
        kustomization.yaml
      production/
        kustomization.yaml
```

## Step 1: Define the Base

Start with a standard base that contains your core Kubernetes manifests.

```yaml
# apps/myapp/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

Below is a minimal deployment for the base.

```yaml
# apps/myapp/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:1.0.0
          ports:
            - containerPort: 8080
```

## Step 2: Create a Component

Define a component that adds a logging sidecar container. Note the `kind: Component` declaration.

```yaml
# apps/myapp/components/logging-sidecar/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

# This patch adds a fluent-bit sidecar to the deployment
patches:
  - path: patch.yaml
    target:
      kind: Deployment
      name: myapp
```

The patch file injects the sidecar container into the pod spec.

```yaml
# apps/myapp/components/logging-sidecar/patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:2.1
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
```

## Step 3: Create a Second Component

Create a monitoring component that adds a ServiceMonitor resource.

```yaml
# apps/myapp/components/monitoring/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

# This component adds a Prometheus ServiceMonitor
resources:
  - service-monitor.yaml
```

```yaml
# apps/myapp/components/monitoring/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp
spec:
  selector:
    matchLabels:
      app: myapp
  endpoints:
    - port: http
      interval: 30s
```

## Step 4: Use Components in Overlays

In the staging overlay, include both components. The `components` field references paths to component directories.

```yaml
# apps/myapp/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

# Include both logging and monitoring components in staging
components:
  - ../../components/logging-sidecar
  - ../../components/monitoring
```

In production, you might only want monitoring but not the logging sidecar.

```yaml
# apps/myapp/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

# Production only includes the monitoring component
components:
  - ../../components/monitoring
```

## Step 5: Configure Flux Kustomization Resources

Create Flux Kustomization resources that point to each overlay. Flux will read the `kustomization.yaml` in the specified path and apply it, including any referenced components.

```yaml
# clusters/my-cluster/myapp-staging.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-staging
  namespace: flux-system
spec:
  interval: 10m
  # Path to the overlay directory containing the kustomization.yaml
  path: ./apps/myapp/overlays/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: staging
```

```yaml
# clusters/my-cluster/myapp-production.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-production
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/myapp/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: production
```

## Step 6: Verify the Build Locally

Before pushing to Git, validate the output with the Kustomize CLI.

```bash
# Build the staging overlay to see the merged output
kustomize build apps/myapp/overlays/staging

# Build the production overlay to compare
kustomize build apps/myapp/overlays/production
```

The staging build should include the fluent-bit sidecar container and the ServiceMonitor, while the production build should only include the ServiceMonitor.

## Step 7: Reconcile and Verify in Cluster

After pushing to your Git repository, Flux will automatically pick up the changes.

```bash
# Force an immediate reconciliation
flux reconcile kustomization myapp-staging --with-source

# Check the status of the Kustomization
flux get kustomizations myapp-staging

# Verify the deployment has the sidecar in staging
kubectl get deployment myapp -n staging -o jsonpath='{.spec.template.spec.containers[*].name}'
```

## Best Practices

1. **Keep components focused.** Each component should do one thing. A logging component should only add logging; a monitoring component should only add monitoring.

2. **Use descriptive directory names.** Name component directories after their function so it is clear what each one does.

3. **Test components independently.** Use `kustomize build` locally before committing to ensure components merge correctly with the base.

4. **Document component dependencies.** If a component requires a CRD (like ServiceMonitor requires the Prometheus operator), note that in comments or a README in the component directory.

5. **Version your components.** When components change in breaking ways, consider creating a new version directory rather than modifying the existing one in place.

## Conclusion

Kustomize components give you a modular way to compose Kubernetes configurations. Combined with Flux Kustomization resources, you can selectively enable features across different environments without duplicating manifests. This approach keeps your GitOps repository clean, maintainable, and easy to reason about.
