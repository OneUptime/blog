# How to Build a Self-Service Developer Platform with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Platform Engineering, Developer Platform

Description: Build a self-service developer platform using Flux CD as the GitOps engine, enabling teams to deploy applications autonomously without platform team bottlenecks.

---

## Introduction

Platform engineering has fundamentally changed how organizations deliver software. The goal is simple: give developers a paved road to production without requiring them to understand every layer of infrastructure beneath them. Flux CD, with its GitOps-native design, is an excellent foundation for building such a platform because Git itself becomes the interface between developers and infrastructure.

A self-service developer platform powered by Flux CD means developers submit pull requests to request new environments, deploy services, or configure resources. The platform team defines the guardrails, and Flux enforces them continuously. This model scales horizontally — adding a new team costs a PR, not an ops ticket.

In this guide you will learn how to structure a Flux-based platform repository, define tenant namespaces with appropriate RBAC, and give developers a Git-native workflow for deploying their own workloads within policy boundaries.

## Prerequisites

- A running Kubernetes cluster (1.25+)
- Flux CD v2 bootstrapped into the cluster
- kubectl configured with cluster-admin access
- A Git repository (GitHub, GitLab, or Gitea) for the platform

## Step 1: Structure the Platform Repository

Organize your platform repository into layers so the platform team owns the foundation and developers own their application directories.

```
platform-gitops/
├── clusters/
│   └── production/
│       ├── flux-system/          # Flux bootstrap components
│       ├── infrastructure.yaml   # Infrastructure Kustomization
│       └── tenants.yaml          # Tenant onboarding Kustomization
├── infrastructure/
│   ├── controllers/              # Ingress, cert-manager, etc.
│   └── configs/                  # Cluster-wide configs
└── tenants/
    ├── base/                     # Base tenant template
    └── overlays/
        ├── team-alpha/
        └── team-beta/
```

Create the top-level Kustomization for tenants:

```yaml
# clusters/production/tenants.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenants
  namespace: flux-system
spec:
  interval: 5m
  path: ./tenants/overlays
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
```

## Step 2: Define the Base Tenant Template

Create a reusable base that every tenant inherits. This establishes namespace, RBAC, and resource quotas.

```yaml
# tenants/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: placeholder   # Overridden per tenant via Kustomize patch
  labels:
    platform.io/managed-by: flux
    platform.io/tenant: placeholder
```

```yaml
# tenants/base/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-developer
  namespace: placeholder
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
  - kind: Group
    name: placeholder-developers
    apiGroup: rbac.authorization.k8s.io
```

```yaml
# tenants/base/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: placeholder
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    count/pods: "20"
```

## Step 3: Create a Tenant Kustomization Overlay

Each team gets an overlay that patches names and optionally extends the base quotas.

```yaml
# tenants/overlays/team-alpha/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - gitrepository.yaml
  - kustomization.yaml
namePrefix: ""
patches:
  - patch: |-
      - op: replace
        path: /metadata/name
        value: team-alpha
      - op: replace
        path: /metadata/labels/platform.io~1tenant
        value: team-alpha
    target:
      kind: Namespace
  - patch: |-
      - op: replace
        path: /metadata/namespace
        value: team-alpha
      - op: replace
        path: /subjects/0/name
        value: team-alpha-developers
    target:
      kind: RoleBinding
```

## Step 4: Give Developers Their Own GitRepository Source

Each team gets a GitRepository pointing to their own application repository.

```yaml
# tenants/overlays/team-alpha/gitrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 1m
  url: https://github.com/acme/team-alpha-apps
  ref:
    branch: main
  secretRef:
    name: team-alpha-git-credentials
```

```yaml
# tenants/overlays/team-alpha/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 5m
  path: ./deploy
  prune: true
  serviceAccountName: flux-reconciler   # Least-privilege reconciliation
  sourceRef:
    kind: GitRepository
    name: team-alpha-apps
  targetNamespace: team-alpha
```

## Step 5: Implement Policy Guardrails with Kyverno

Platform teams enforce policy without blocking developer velocity. Use Kyverno to prevent tenants from escaping their namespace.

```yaml
# infrastructure/policies/tenant-isolation.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-tenant-namespace
spec:
  validationFailureAction: Enforce
  rules:
    - name: deny-cross-namespace
      match:
        any:
          - resources:
              kinds: ["Kustomization"]
              namespaces: ["team-*"]
      validate:
        message: "Tenants may only deploy to their own namespace."
        pattern:
          spec:
            targetNamespace: "{{ request.object.metadata.namespace }}"
```

## Step 6: Automate Tenant Onboarding

Create a simple script the platform team runs to onboard a new tenant via a PR.

```bash
#!/bin/bash
# scripts/onboard-tenant.sh
TENANT=$1
TEAM_REPO=$2

mkdir -p tenants/overlays/${TENANT}

# Copy base overlay template and substitute team name
sed "s/team-alpha/${TENANT}/g" tenants/overlays/team-alpha/kustomization.yaml \
  > tenants/overlays/${TENANT}/kustomization.yaml

sed "s|team-alpha-apps|${TENANT}-apps|g; s|acme/team-alpha-apps|acme/${TEAM_REPO}|g" \
  tenants/overlays/team-alpha/gitrepository.yaml \
  > tenants/overlays/${TENANT}/gitrepository.yaml

echo "Tenant ${TENANT} scaffold created. Open a PR to onboard."
```

## Best Practices

- Use Flux's `serviceAccountName` in Kustomizations to scope reconciler permissions per tenant
- Enable `prune: true` so removing an app from Git removes it from the cluster
- Set `interval` conservatively (5m) for tenant Kustomizations to reduce API server pressure
- Store tenant Git credentials as Kubernetes Secrets created by the platform team, not developers
- Use OCI artifacts for distributing approved Helm charts to tenants instead of raw Git access
- Monitor Kustomization `.status.conditions` with alerts to catch drift quickly

## Conclusion

Flux CD transforms a Kubernetes cluster into a true self-service platform by making Git the single interface between developers and infrastructure. The structure outlined here — layered repositories, tenant overlays, and least-privilege reconcilers — lets platform teams set the rules once and let Flux enforce them continuously, freeing developers to ship without waiting on ops tickets.
