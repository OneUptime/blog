# GitOps Best Practices for Rancher Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, GitOps, Kubernetes, Fleet, CI/CD, DevOps, Best Practice

Description: Learn best practices for implementing GitOps workflows with Rancher, including repository structure, branch strategies, environment promotion, and security considerations.

---

GitOps uses Git as the single source of truth for infrastructure and application configuration. Rancher Fleet natively supports GitOps, synchronizing Kubernetes cluster state from Git repositories. This guide covers proven best practices for GitOps with Rancher.

---

## Core GitOps Principles

1. **Declarative**: All desired state is described declaratively in Git
2. **Versioned**: All changes are tracked with commit history
3. **Automated**: Changes are applied automatically when Git state changes
4. **Reconciled**: Agents continuously ensure actual state matches desired state

---

## Repository Structure

### Monorepo Pattern

```text
gitops-repo/
├── clusters/
│   ├── production/
│   │   ├── fleet.yaml
│   │   └── kustomization.yaml
│   ├── staging/
│   │   ├── fleet.yaml
│   │   └── kustomization.yaml
│   └── dev/
├── apps/
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── kustomization.yaml
│   └── backend/
│       ├── deployment.yaml
│       └── service.yaml
└── infrastructure/
    ├── monitoring/
    ├── ingress/
    └── cert-manager/
```

### Multi-Repo Pattern (Recommended for Large Teams)

```text
config-repo/         # Platform/infrastructure config
  ├── clusters/
  └── global/

app-frontend-repo/   # Frontend team owns this
  ├── manifests/
  └── fleet.yaml

app-backend-repo/    # Backend team owns this
  ├── manifests/
  └── fleet.yaml
```

---

## Fleet GitRepo Configuration

```yaml
# clusters/production/fleet.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: production-apps
  namespace: fleet-default
spec:
  repo: https://github.com/myorg/gitops-repo
  branch: main
  paths:
    - apps/frontend
    - apps/backend
  targets:
    - name: production
      clusterSelector:
        matchLabels:
          env: production
  clientSecretName: github-credentials
```

---

## Branch Strategy

### Recommended: Environment Branches

```text
main        → Production (protected, requires PR + review)
staging     → Staging (requires PR)
develop     → Development (direct push allowed)
feature/*   → Feature branches (PR to develop)
```

### Promotion Workflow

```bash
# 1. Developer creates feature branch
git checkout -b feature/new-payment-service

# 2. PR to develop → triggers dev deployment
# 3. Test in dev environment
# 4. PR from develop to staging → triggers staging deployment
# 5. Test in staging
# 6. PR from staging to main → triggers production deployment
```

---

## Kustomize for Environment-Specific Config

```yaml
# apps/frontend/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: myorg/frontend:latest
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
```

```yaml
# apps/frontend/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/deployment.yaml
patches:
  - patch: |-
      - op: replace
        path: /spec/replicas
        value: 3
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
    target:
      kind: Deployment
      name: frontend
images:
  - name: myorg/frontend
    newTag: "v1.2.3"  # Pin exact version in prod
```

---

## Image Update Automation

```bash
# Use Flux image automation or manual PRs for image updates

# Recommended: PR-based image updates
# CI pipeline creates PR to update image tag:
# git checkout -b chore/update-frontend-$NEW_TAG
# sed -i "s/newTag: .*/newTag: \"$NEW_TAG\"/" overlays/production/kustomization.yaml
# git add overlays/production/kustomization.yaml
# git commit -m "chore: update frontend to $NEW_TAG"
# git push -u origin "$(git branch --show-current)"
# gh pr create --base main --title "Deploy frontend $NEW_TAG to production" --body "Update frontend image tag to $NEW_TAG."
```

---

## Secret Management

Never store plaintext secrets in Git. Use external secret management:

```yaml
# Use External Secrets Operator with Vault
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: vault-backend
  target:
    name: app-secrets
  data:
    - secretKey: db-password
      remoteRef:
        key: secret/app/database
        property: password
```

---

## RBAC for GitOps

```yaml
# Rancher Fleet service account
# Only Fleet should have cluster write access
# Developers get read-only access to verify deployments

apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-readonly
  namespace: app-namespace
subjects:
  - kind: Group
    name: developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: view
  apiGroup: rbac.authorization.k8s.io
```

---

## Drift Detection and Auto-Remediation

Rancher Fleet detects drift, and you can enable automatic correction:

```yaml
# gitrepo.yaml
spec:
  # Automatically revert manual changes to match Git
  correctDrift:
    enabled: true
    force: false
```

---

## Best Practices Summary

1. **Pin image tags** in production - never use `latest` in prod manifests
2. **Use PRs for all production changes** - peer review before deployment
3. **Never store plaintext secrets in Git** - use External Secrets or Sealed Secrets
4. **Test in dev/staging first** - enforce environment promotion gates
5. **Monitor Fleet sync status** - alert on out-of-sync clusters
6. **Use resource quotas** in Git manifests to prevent runaway resource usage
7. **Audit Git history** for compliance - every deployment is traceable

---

## Monitoring GitOps Health

```bash
# Check Fleet bundle status
kubectl get bundles -A

# Check GitRepo sync status
kubectl get gitrepos -A

# Inspect bundle health, including Modified and OutOfSync states
kubectl get bundles -A -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,STATE:.status.display.state,MESSAGE:.status.display.message'
```

---

## Conclusion

GitOps with Rancher Fleet provides automated, auditable Kubernetes deployments. Use environment branches for promotion workflows, Kustomize for environment-specific configuration, and external secrets management for security. Monitor Fleet sync status continuously to detect and alert on drift.

---

*Monitor your Rancher clusters and GitOps pipeline health with [OneUptime](https://oneuptime.com).*
