# How to Organize Namespace Creation with Kustomization Dependencies in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Namespace, Dependencies, Repository Structure

Description: Learn how to organize namespace creation as a dependency in your Flux repository to ensure namespaces exist before resources are deployed into them.

---

Namespaces must exist before Kubernetes resources can be created inside them. In a Flux GitOps repository, this means namespace creation needs to happen before the Kustomizations that deploy resources into those namespaces. Without proper ordering, Flux will fail to apply resources to non-existent namespaces.

This guide explains how to organize namespace creation using Kustomization dependencies.

## The Problem

When Flux reconciles a Kustomization that creates a Deployment in a namespace that does not yet exist, the apply fails with a "namespace not found" error. This commonly happens when:

- A namespace and its resources are defined in different Kustomizations
- Infrastructure components create namespaces that applications depend on
- Multiple teams manage different parts of the repository

## Approaches to Namespace Creation

There are several ways to handle namespace creation in Flux. Each has trade-offs.

### Approach 1: Dedicated Namespaces Kustomization

Create a separate Kustomization that manages all namespaces:

```text
fleet-repo/
  clusters/
    production/
      namespaces.yaml
      infrastructure.yaml
      apps.yaml
  namespaces/
    kustomization.yaml
    infrastructure-namespaces.yaml
    app-namespaces.yaml
```

```yaml
# namespaces/infrastructure-namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
  labels:
    purpose: infrastructure
---
apiVersion: v1
kind: Namespace
metadata:
  name: ingress-nginx
  labels:
    purpose: infrastructure
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    purpose: infrastructure
```

```yaml
# namespaces/app-namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: app-one
  labels:
    purpose: application
    team: team-alpha
---
apiVersion: v1
kind: Namespace
metadata:
  name: app-two
  labels:
    purpose: application
    team: team-beta
```

```yaml
# namespaces/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - infrastructure-namespaces.yaml
  - app-namespaces.yaml
```

The Flux Kustomization and dependency chain:

```yaml
# clusters/production/namespaces.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: namespaces
  namespace: flux-system
spec:
  interval: 30m
  path: ./namespaces
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
```

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 30m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: namespaces
  wait: true
```

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: namespaces
    - name: infrastructure
```

Setting `prune: false` on namespaces prevents accidental namespace deletion, which would cascade-delete all resources within it.

### Approach 2: Inline Namespace with Each Component

Include namespace definitions alongside the resources that use them:

```yaml
# infrastructure/controllers/cert-manager/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
```

```yaml
# infrastructure/controllers/cert-manager/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrelease.yaml
```

This is simpler but scatters namespace definitions throughout the repository.

### Approach 3: Using targetNamespace

Flux Kustomization supports `targetNamespace` which overrides the namespace for all resources:

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-one
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/app-one
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: app-one
  dependsOn:
    - name: namespaces
```

This requires the namespace to already exist, so it still depends on the namespaces Kustomization.

## Namespace Labels and Annotations

Namespaces often carry important labels and annotations for policies, monitoring, and access control:

```yaml
# namespaces/app-namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: app-one
  labels:
    purpose: application
    team: team-alpha
    istio-injection: enabled
    pod-security.kubernetes.io/enforce: restricted
  annotations:
    scheduler.alpha.kubernetes.io/node-selector: "workload=apps"
```

Keeping these in a dedicated namespaces directory makes it easy to audit and update namespace configurations across the cluster.

## Adding Resource Quotas and Limit Ranges

Combine namespace creation with resource governance:

```yaml
# namespaces/app-one/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: app-one
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: default-quota
  namespace: app-one
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
---
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: app-one
spec:
  limits:
    - default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      type: Container
```

```yaml
# namespaces/app-one/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
```

## Automating Namespace Creation for New Applications

Create a script or template for onboarding new applications:

```bash
#!/bin/bash
set -euo pipefail

APP_NAME=$1
TEAM=$2

mkdir -p "namespaces/${APP_NAME}"

cat > "namespaces/${APP_NAME}/namespace.yaml" << EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ${APP_NAME}
  labels:
    purpose: application
    team: ${TEAM}
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: default-quota
  namespace: ${APP_NAME}
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    pods: "10"
EOF

cat > "namespaces/${APP_NAME}/kustomization.yaml" << EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
EOF

# Add to parent kustomization
echo "  - ${APP_NAME}" >> namespaces/kustomization.yaml

echo "Namespace configuration created for ${APP_NAME}"
```

## Network Policies per Namespace

Include default network policies with namespace creation:

```yaml
# namespaces/app-one/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: app-one
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

```yaml
# namespaces/app-one/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - network-policy.yaml
```

## Verifying Namespace Dependencies

Check that namespaces are created before dependent resources:

```bash
# Verify namespace Kustomization is ready
flux get kustomization namespaces -n flux-system

# List all namespaces managed by Flux
kubectl get namespaces -l purpose=application

# Check dependency status
flux get kustomization --all-namespaces
```

## Handling Namespace Deletion

Be cautious with namespace deletion. Deleting a namespace removes everything inside it. Recommended safeguards:

- Set `prune: false` on the namespaces Kustomization
- Use Kubernetes finalizers on critical namespaces
- Require manual approval for namespace removal

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: critical-app
  annotations:
    flux.kustomize.toolkit.fluxcd.io/prune: disabled
```

The `prune: disabled` annotation prevents Flux from pruning this specific namespace even if the Kustomization has `prune: true`.

## Conclusion

Organizing namespace creation as a dependency in your Flux repository prevents "namespace not found" errors and ensures a clean deployment order. Whether you use a dedicated namespaces Kustomization, inline namespaces, or a combination of both, the key is making sure namespaces exist before any resources are deployed into them. The dedicated namespaces Kustomization approach provides the most control, visibility, and safety for production environments.
