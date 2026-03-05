# How to Configure Kustomization CommonAnnotations in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, Kustomization, Annotations

Description: Learn how to use the commonAnnotations field in kustomization.yaml to apply consistent annotations across all Kubernetes resources managed by Flux CD.

---

## Introduction

Annotations in Kubernetes are key-value pairs attached to resource metadata. Unlike labels, annotations are not used for selection or querying -- they store arbitrary metadata such as build information, contact details, configuration hints, or tool-specific directives.

The `commonAnnotations` field in a `kustomization.yaml` lets you inject a set of annotations into every resource that Kustomize builds. This is useful when you need uniform metadata across all resources in a Flux-managed deployment, such as linking resources to a CI/CD pipeline, marking ownership, or configuring ingress controllers.

## How CommonAnnotations Works

When you set `commonAnnotations` in a `kustomization.yaml`, Kustomize adds the specified annotations to:

- The `metadata.annotations` field of every resource
- The `spec.template.metadata.annotations` field of pod templates (Deployments, StatefulSets, DaemonSets, Jobs)

Unlike `commonLabels`, annotations are never added to selectors, so they are safe to change after resources have been created.

## Repository Structure

```
apps/
  api-server/
    base/
      deployment.yaml
      service.yaml
      ingress.yaml
      kustomization.yaml
    overlays/
      staging/
        kustomization.yaml
      production/
        kustomization.yaml
```

## Step 1: Create the Base Manifests

Define the base deployment, service, and ingress.

```yaml
# apps/api-server/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api-server
          image: api-server:2.0.0
          ports:
            - containerPort: 3000
```

```yaml
# apps/api-server/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-server
spec:
  selector:
    app: api-server
  ports:
    - port: 80
      targetPort: 3000
```

```yaml
# apps/api-server/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-server
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 80
```

```yaml
# apps/api-server/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml
```

## Step 2: Add CommonAnnotations in Overlays

In the staging overlay, add annotations for ownership, documentation links, and tool-specific configuration.

```yaml
# apps/api-server/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

# These annotations will be added to all resources
commonAnnotations:
  # Team ownership information
  owner: platform-team@example.com
  # Link to runbook for on-call engineers
  runbook: "https://wiki.example.com/api-server/runbook"
  # Prometheus scraping configuration (applied to pod template too)
  prometheus.io/scrape: "true"
  prometheus.io/port: "3000"
  prometheus.io/path: "/metrics"
```

For production, add different or additional annotations.

```yaml
# apps/api-server/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

commonAnnotations:
  owner: platform-team@example.com
  runbook: "https://wiki.example.com/api-server/runbook"
  prometheus.io/scrape: "true"
  prometheus.io/port: "3000"
  prometheus.io/path: "/metrics"
  # Production-specific: enable PodDisruptionBudget awareness
  cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
```

## Step 3: Verify the Output

Build the staging overlay to inspect the rendered manifests.

```bash
# Build and review the output
kustomize build apps/api-server/overlays/staging
```

The deployment output will show annotations on both the resource metadata and the pod template.

```yaml
# Expected output for the Deployment (abbreviated)
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    owner: platform-team@example.com
    prometheus.io/path: /metrics
    prometheus.io/port: "3000"
    prometheus.io/scrape: "true"
    runbook: https://wiki.example.com/api-server/runbook
  name: api-server
spec:
  template:
    metadata:
      annotations:
        owner: platform-team@example.com
        prometheus.io/path: /metrics
        prometheus.io/port: "3000"
        prometheus.io/scrape: "true"
        runbook: https://wiki.example.com/api-server/runbook
```

The Ingress and Service resources will also have the annotations in their `metadata.annotations` field.

## Step 4: Configure Flux Kustomization

Create Flux Kustomization resources pointing to the overlays.

```yaml
# clusters/my-cluster/api-server-staging.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-server-staging
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/api-server/overlays/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: staging
```

```yaml
# clusters/my-cluster/api-server-production.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-server-production
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/api-server/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: production
```

## Step 5: Reconcile and Verify

```bash
# Trigger reconciliation
flux reconcile kustomization api-server-staging --with-source

# Check annotations on the deployment
kubectl get deployment api-server -n staging -o jsonpath='{.metadata.annotations}' | jq .

# Check annotations on pods (inherited from pod template)
kubectl get pods -n staging -l app=api-server -o jsonpath='{.items[0].metadata.annotations}' | jq .

# Check annotations on the ingress
kubectl get ingress api-server -n staging -o jsonpath='{.metadata.annotations}' | jq .
```

## Combining CommonAnnotations with Existing Annotations

If your base manifests already have annotations, `commonAnnotations` will merge with them. Existing annotations are preserved, and common annotations are added alongside them. If a key appears in both, the `commonAnnotations` value takes precedence.

For example, if the base ingress already has an annotation:

```yaml
# base ingress with existing annotation
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-server
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
```

After applying `commonAnnotations`, the ingress will have both the existing `nginx.ingress.kubernetes.io/rewrite-target` annotation and all the common annotations.

## Practical Use Cases

### Forcing Pod Restarts on Config Changes

You can use annotations with Flux variable substitution to trigger rolling restarts when configuration changes.

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

commonAnnotations:
  config-hash: "${CONFIG_HASH}"
```

```yaml
# Flux Kustomization with postBuild substitution
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-server-staging
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/api-server/overlays/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CONFIG_HASH: "abc123"
```

When you update the `CONFIG_HASH` value, the pod template annotation changes, triggering a rolling restart of the deployment.

### Tracking Deployment Metadata

Use annotations to record build and deployment metadata for auditing purposes.

```yaml
commonAnnotations:
  deploy-repo: "https://github.com/myorg/fleet-infra"
  deploy-tool: "flux"
  last-reviewed-by: "platform-team"
```

## Conclusion

The `commonAnnotations` field in `kustomization.yaml` is a simple and effective way to attach consistent metadata across all resources in a Flux-managed deployment. Because annotations do not affect selectors, they are safe to add, modify, or remove at any time without causing reconciliation errors. Use them for ownership information, monitoring configuration, documentation links, and deployment tracking.
