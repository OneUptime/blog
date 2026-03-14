# How to Migrate from Weaveworks to Upstream Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Weaveworks, Migration, GitOps, Kubernetes, Open Source, Enterprise

Description: Learn how to migrate from Weaveworks enterprise Flux (Weave GitOps) to upstream open-source Flux CD following Weaveworks' wind-down.

---

## Introduction

Weaveworks, the company that created Flux CD and Weave GitOps Enterprise, wound down its operations in 2024. Organizations running Weave GitOps Enterprise need to migrate to upstream open-source Flux CD or another GitOps solution. The good news is that Weave GitOps Enterprise was built on top of upstream Flux CD, so the core reconciliation logic is identical. The migration primarily involves removing Weave GitOps Enterprise components and features not available in open-source Flux.

## Prerequisites

- Weave GitOps Enterprise installed on your cluster
- Access to the enterprise feature list you're currently using
- Upstream Flux CD CLI installed
- A Git repository for fleet configuration

## Step 1: Inventory Weave GitOps Enterprise Features in Use

```bash
# Check which Weave GitOps Enterprise components are installed
kubectl get pods -n flux-system | grep weave

# List GitOpsSets (enterprise feature)
kubectl get gitopssets -A 2>/dev/null && echo "GitOpsSets in use" || echo "No GitOpsSets"

# List Pipelines (enterprise feature)
kubectl get pipelines.pipelines.weave.works -A 2>/dev/null && echo "Pipelines in use"

# List Templates (enterprise feature)
kubectl get gitopstemplates -A 2>/dev/null && echo "Templates in use"

# List Policies (enterprise feature)
kubectl get policies -A 2>/dev/null && echo "Policies in use"

# Check standard Flux resources (these migrate automatically)
flux get kustomizations -A
flux get helmreleases -A
flux get sources git -A
```

## Step 2: Understand What Survives the Migration

```
Weave GitOps Feature             Migration Path
───────────────────────────────  ────────────────────────────────
Flux CDs (Kustomization, etc.)   Keep as-is - upstream compatible
HelmRelease                      Keep as-is - upstream compatible
GitRepository sources            Keep as-is - upstream compatible
SOPS decryption                  Keep as-is - upstream compatible
Notification Controller          Keep as-is - upstream compatible
Image Automation                 Keep as-is - upstream compatible
Weave GitOps UI                  Remove - use Capacitor or Grafana
GitOpsSets                       Convert to variable substitution
Pipelines CRD                    Replace with manual promotion scripts
Policy Controller                Replace with OPA Gatekeeper or Kyverno
Team Workspaces                  Replace with Kubernetes RBAC
Cluster Management               Replace with cluster bootstrapping scripts
```

## Step 3: Migrate GitOpsSets to Flux Variable Substitution

**Weave GitOps GitOpsSet** (enterprise):

```yaml
apiVersion: templates.weave.works/v1alpha1
kind: GitOpsSet
metadata:
  name: microservices
spec:
  generators:
    - list:
        elements:
          - name: frontend
            port: "3000"
          - name: backend
            port: "8080"
  templates:
    - content:
        apiVersion: kustomize.toolkit.fluxcd.io/v1
        kind: Kustomization
        metadata:
          name: "{{ .Element.name }}"
        spec:
          path: "./apps/{{ .Element.name }}"
          interval: 5m
          sourceRef:
            kind: GitRepository
            name: fleet-repo
```

**Upstream Flux equivalent** (explicit Kustomizations):

```yaml
# Explicit Kustomizations (no template engine needed for small lists)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/frontend
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  postBuild:
    substitute:
      SERVICE_NAME: "frontend"
      SERVICE_PORT: "3000"
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/backend
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  postBuild:
    substitute:
      SERVICE_NAME: "backend"
      SERVICE_PORT: "8080"
```

## Step 4: Replace Weave GitOps Policy Controller with Kyverno

```bash
# Install Kyverno via Flux
cat > clusters/production/infrastructure/kyverno.yaml << 'EOF'
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kyverno
  namespace: flux-system
spec:
  interval: 1h
  url: https://kyverno.github.io/kyverno/
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kyverno
  namespace: kyverno
spec:
  interval: 1h
  chart:
    spec:
      chart: kyverno
      version: "3.x.x"
      sourceRef:
        kind: HelmRepository
        name: kyverno
        namespace: flux-system
  values:
    replicaCount: 3
EOF
git add clusters/production/infrastructure/kyverno.yaml
git commit -m "feat: add Kyverno as Policy Controller replacement"
```

## Step 5: Install Upstream Flux CD Over Weave GitOps

```bash
# Uninstall Weave GitOps Enterprise UI components
kubectl delete deploy -n flux-system weave-gitops-enterprise 2>/dev/null || true
kubectl delete deploy -n flux-system weave-gitops 2>/dev/null || true

# Reinstall with upstream Flux (preserves existing Flux CRDs and resources)
flux install \
  --components=source-controller,kustomize-controller,helm-controller,notification-controller \
  --components-extra=image-reflector-controller,image-automation-controller

# Verify core Flux is running
flux check
```

## Step 6: Set Up Open-Source Monitoring as UI Replacement

```bash
# Install Capacitor (open-source Flux UI)
cat > clusters/production/infrastructure/capacitor.yaml << 'EOF'
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: capacitor
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: capacitor
      version: "0.x.x"
      sourceRef:
        kind: HelmRepository
        name: gimlet
        namespace: flux-system
EOF
```

## Best Practices

- Audit all Weave GitOps Enterprise CRDs in use before starting the migration; GitOpsSets and Pipelines require the most rework.
- The core Flux reconciliation resources (Kustomization, HelmRelease, GitRepository) are 100% compatible with upstream; they require no migration.
- Install OPA Gatekeeper or Kyverno before removing the Weave Policy Controller to maintain admission control continuity.
- Use Capacitor or Grafana dashboards as open-source replacements for the Weave GitOps UI.
- Reach out to CNCF-affiliated vendors for commercial support options for upstream Flux CD.

## Conclusion

Migrating from Weave GitOps Enterprise to upstream Flux CD is achievable with minimal disruption because the core GitOps engine is the same. The migration effort concentrates on replacing enterprise-only features (GitOpsSets, Pipelines, Policy Controller, UI) with open-source alternatives. Upstream Flux CD is actively maintained by the CNCF community, providing a stable foundation for long-term GitOps operations.
