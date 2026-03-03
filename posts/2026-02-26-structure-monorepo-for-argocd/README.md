# How to Structure a Monorepo for ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Monorepo, Repository Management

Description: Learn how to organize a monorepo for ArgoCD GitOps workflows with directory conventions, ApplicationSets, and environment management patterns.

---

A monorepo keeps all your Kubernetes manifests in a single Git repository. This is the most common starting point for teams adopting ArgoCD because it is simple to manage and easy to understand. But without a good structure, a monorepo quickly becomes a mess of YAML files that no one can navigate. Here is how to organize it properly.

## Why Choose a Monorepo

Before diving into structure, here are the reasons a monorepo works well with ArgoCD:

- **Single source of truth** - Everything is in one place. New team members know exactly where to look.
- **Atomic commits** - You can update multiple services in a single commit, which is useful for coordinated changes.
- **Easier ApplicationSet discovery** - ArgoCD ApplicationSets can scan directories and auto-create Applications.
- **Simpler access control** - One repository to manage permissions for.

The tradeoffs are that large repos can be slow to clone, and different teams might step on each other with merge conflicts. But for most organizations under 50 services, a monorepo works well.

## The Recommended Directory Structure

Here is a proven directory layout that scales well:

```text
gitops-repo/
├── apps/                          # ArgoCD Application definitions
│   ├── base/                      # Base application templates
│   │   ├── frontend.yaml
│   │   ├── backend-api.yaml
│   │   └── worker.yaml
│   ├── dev/                       # Dev environment overrides
│   │   ├── kustomization.yaml
│   │   └── patches/
│   ├── staging/                   # Staging environment overrides
│   │   ├── kustomization.yaml
│   │   └── patches/
│   └── production/                # Production environment overrides
│       ├── kustomization.yaml
│       └── patches/
├── manifests/                     # Kubernetes manifests per service
│   ├── frontend/
│   │   ├── base/
│   │   │   ├── kustomization.yaml
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── configmap.yaml
│   │   └── overlays/
│   │       ├── dev/
│   │       ├── staging/
│   │       └── production/
│   ├── backend-api/
│   │   ├── base/
│   │   └── overlays/
│   └── worker/
│       ├── base/
│       └── overlays/
├── platform/                      # Cluster-level resources
│   ├── namespaces/
│   ├── rbac/
│   ├── network-policies/
│   └── monitoring/
├── charts/                        # Internal Helm charts (if any)
│   └── common-service/
└── applicationsets/               # ApplicationSet definitions
    ├── services.yaml
    └── platform.yaml
```

## Service Manifests with Kustomize

Each service uses Kustomize with a base and environment-specific overlays. Here is the base for a typical service:

```yaml
# manifests/backend-api/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
  - hpa.yaml

commonLabels:
  app.kubernetes.io/name: backend-api
  app.kubernetes.io/part-of: my-platform
```

```yaml
# manifests/backend-api/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
spec:
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
        - name: api
          image: myorg/backend-api:latest  # Overridden per environment
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

The production overlay adds environment-specific settings:

```yaml
# manifests/backend-api/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

namespace: production

images:
  - name: myorg/backend-api
    newTag: "v2.3.1"  # Pinned production version

patches:
  - target:
      kind: Deployment
      name: backend-api
    patch: |
      - op: replace
        path: /spec/replicas
        value: 3
      - op: replace
        path: /spec/template/spec/containers/0/resources/requests/cpu
        value: "500m"
      - op: replace
        path: /spec/template/spec/containers/0/resources/requests/memory
        value: "512Mi"
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/cpu
        value: "2"
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/memory
        value: "2Gi"
```

## Using ApplicationSet for Auto-Discovery

Instead of creating an ArgoCD Application for every service manually, use an ApplicationSet with a Git generator that scans directories:

```yaml
# applicationsets/services.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: services
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          # First generator: discover services by directory
          - git:
              repoURL: https://github.com/myorg/gitops-repo
              revision: main
              directories:
                - path: manifests/*
          # Second generator: list environments
          - list:
              elements:
                - environment: dev
                  cluster: https://dev-cluster.example.com
                  namespace: dev
                - environment: staging
                  cluster: https://staging-cluster.example.com
                  namespace: staging
                - environment: production
                  cluster: https://prod-cluster.example.com
                  namespace: production
  template:
    metadata:
      name: "{{path.basename}}-{{environment}}"
      namespace: argocd
    spec:
      project: "{{environment}}"
      source:
        repoURL: https://github.com/myorg/gitops-repo
        targetRevision: main
        path: "manifests/{{path.basename}}/overlays/{{environment}}"
      destination:
        server: "{{cluster}}"
        namespace: "{{namespace}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

This automatically creates an Application for every service directory in every environment. Add a new service directory, and ArgoCD picks it up.

## Managing Environment Promotion

In a monorepo, promoting a change from dev to production means updating the image tag in each overlay. A clean workflow looks like this:

```mermaid
graph LR
    A[CI builds image v2.3.2] --> B[Update dev overlay]
    B --> C[ArgoCD syncs to dev]
    C --> D[Tests pass in dev]
    D --> E[Update staging overlay]
    E --> F[ArgoCD syncs to staging]
    F --> G[Tests pass in staging]
    G --> H[Update production overlay]
    H --> I[ArgoCD syncs to production]
```

You can automate the image tag updates with a CI pipeline that modifies the kustomization.yaml files:

```bash
# CI script to update image tag for an environment
cd manifests/backend-api/overlays/dev
kustomize edit set image myorg/backend-api:v2.3.2
git add .
git commit -m "chore: update backend-api to v2.3.2 in dev"
git push
```

## Platform Resources

Cluster-level resources like namespaces, RBAC, and network policies live in the `platform/` directory:

```yaml
# platform/namespaces/production.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
    managed-by: argocd

---
# platform/rbac/production-deployer.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployer
  namespace: production
subjects:
  - kind: ServiceAccount
    name: argocd-application-controller
    namespace: argocd
roleRef:
  kind: ClusterRole
  name: admin
  apiGroup: rbac.authorization.k8s.io
```

Create a separate ApplicationSet for platform resources:

```yaml
# applicationsets/platform.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: platform
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/gitops-repo
        revision: main
        directories:
          - path: platform/*
  template:
    metadata:
      name: "platform-{{path.basename}}"
    spec:
      project: platform
      source:
        repoURL: https://github.com/myorg/gitops-repo
        targetRevision: main
        path: "{{path}}"
      destination:
        server: https://kubernetes.default.svc
      syncPolicy:
        automated:
          selfHeal: true
```

## Handling Secrets in a Monorepo

Never commit plaintext secrets to your monorepo. Use one of these approaches:

1. **Sealed Secrets** - Encrypt secrets with the cluster's public key
2. **SOPS** - Encrypt secrets with AWS KMS, GCP KMS, or age keys
3. **External Secrets Operator** - Reference secrets from Vault, AWS Secrets Manager, etc.

```yaml
# manifests/backend-api/base/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: backend-api-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: backend-api-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: secret/data/backend-api
        property: database_url
```

## When a Monorepo Stops Working

Consider migrating to a multi-repo setup when:

- You have more than 50 services and Git operations become slow
- Different teams need different access controls per service
- CI pipelines take too long because every commit triggers everything
- Merge conflicts become a daily problem

For most teams starting with ArgoCD, the monorepo is the right choice. You can always migrate later when the pain points become real rather than theoretical.

## Summary

A well-structured monorepo for ArgoCD uses Kustomize for environment overlays, ApplicationSets for auto-discovery, and clear directory conventions that separate service manifests from platform resources. Keep your structure consistent across all services, automate image tag updates through CI, and use external secrets management instead of committing secrets to Git. This approach scales well for most teams and keeps the GitOps workflow simple.
