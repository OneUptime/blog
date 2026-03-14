# How to Implement Separation of Duties with Flux CD Multi-Tenancy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Separation of Duties, RBAC, Compliance

Description: Use Flux CD multi-tenancy features to enforce separation of duties between platform teams and application teams, preventing any single team from having unrestricted access to production infrastructure.

---

## Introduction

Separation of duties (SoD) is a fundamental internal control that divides responsibilities between different people or teams so that no single individual can complete a high-risk process alone. For Kubernetes infrastructure, SoD means the team that builds an application should not also have unrestricted access to deploy it to production — a separate platform or operations team should control that gate.

Flux CD's multi-tenancy model uses Kubernetes RBAC and namespace isolation to enforce SoD declaratively. Platform teams manage the Flux control plane (what sources it watches, what Kustomizations exist), while application teams manage only the content within their designated namespace paths. Neither team can reach the other's resources without an explicit cross-team PR review.

This guide walks through configuring Flux multi-tenancy with tenant-scoped permissions and cross-team enforcement using Git CODEOWNERS.

## Prerequisites

- Flux CD bootstrapped with the `--multi-tenant` flag or with explicit RBAC configuration
- Multiple teams that need isolated deployment permissions
- `flux` CLI and `kubectl` installed
- Admin access to configure namespace RBAC

## Step 1: Bootstrap Flux with Multi-Tenant Configuration

When bootstrapping, configure Flux to scope reconcilers to specific service accounts:

```yaml
# clusters/production/flux-system/kustomization.yaml
# Enable Flux multi-tenancy lockdown
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Patch all Flux controllers to run with multi-tenant enabled
  - patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --no-cross-namespace-refs=true
    target:
      kind: Deployment
      name: kustomize-controller
  - patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --no-cross-namespace-refs=true
    target:
      kind: Deployment
      name: helm-controller
```

The `--no-cross-namespace-refs=true` flag prevents a Kustomization in one namespace from referencing a GitRepository in another — enforcing namespace boundaries.

## Step 2: Create Tenant Service Accounts and RBAC

Each team (tenant) gets a dedicated namespace and service account with scoped permissions:

```yaml
# clusters/production/tenants/team-alpha.yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    tenant: team-alpha
    toolkit.fluxcd.io/tenant: team-alpha
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-alpha
  namespace: team-alpha
---
# Platform role: what team-alpha's Flux reconciler can do in its namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]       # Full access within their own namespace
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha
subjects:
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
roleRef:
  kind: Role
  name: team-alpha-reconciler
  apiGroup: rbac.authorization.k8s.io
```

## Step 3: Create Tenant-Scoped Kustomizations

The platform team creates Kustomizations for each tenant. These Kustomizations run with the tenant's service account, limiting their scope:

```yaml
# clusters/production/tenants/team-alpha-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha
  namespace: flux-system       # Owned by platform team in flux-system
spec:
  interval: 5m
  path: ./apps/team-alpha      # Team Alpha's app manifests live here
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Run with team-alpha's service account — limits permissions to their namespace
  serviceAccountName: team-alpha
  targetNamespace: team-alpha  # Force all resources into team-alpha namespace
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      namespace: team-alpha
      name: "*"
```

## Step 4: Enforce SoD with CODEOWNERS

The Git-level SoD enforcement: platform team controls the Kustomization definitions (which determine what teams can deploy), while application teams control only their app manifests:

```
# .github/CODEOWNERS

# === PLATFORM TEAM SCOPE ===
# Only platform team can modify the Flux control plane and tenant definitions
/clusters/                     @your-org/platform-team
/clusters/production/tenants/  @your-org/platform-team    # Who gets what access

# === APPLICATION TEAM SCOPES ===
# Team Alpha can only modify their own application manifests
/apps/team-alpha/              @your-org/team-alpha

# Team Beta can only modify their own application manifests
/apps/team-beta/               @your-org/team-beta

# === CROSS-TEAM CHANGES ===
# Changes that affect multiple tenants require platform team review
/apps/                         @your-org/platform-team    # Fallback: platform reviews

# === SHARED INFRASTRUCTURE ===
# No single team can modify shared infrastructure alone
/infrastructure/               @your-org/platform-team @your-org/security-team
```

This means:
- Team Alpha cannot modify Team Beta's application manifests (different CODEOWNER)
- No application team can modify which Kustomizations exist (platform-only CODEOWNER)
- No application team can grant themselves access to other namespaces (platform controls RBAC)

## Step 5: Verify Tenant Isolation

Test that multi-tenancy isolation is working:

```bash
# Confirm team-alpha service account cannot create resources in team-beta
kubectl auth can-i create deployments \
  --as=system:serviceaccount:team-alpha:team-alpha \
  -n team-beta
# Expected: no

# Confirm team-alpha can create resources in their own namespace
kubectl auth can-i create deployments \
  --as=system:serviceaccount:team-alpha:team-alpha \
  -n team-alpha
# Expected: yes

# Confirm flux-system reconciler cannot deploy to team namespaces directly
kubectl auth can-i create deployments \
  --as=system:serviceaccount:flux-system:kustomize-controller \
  -n team-alpha
# Expected: no (controller uses team-alpha SA for team-alpha Kustomization)
```

## Step 6: Audit Tenant Activity

Each tenant's deployments are recorded in their Kustomization events:

```bash
# View all deployments for team-alpha
flux events --for Kustomization/team-alpha

# Who opened and approved PRs to team-alpha's paths
gh pr list --state merged --json title,author,reviews \
  --jq '[.[] | select(.title | contains("team-alpha"))]'

# Flux reconciliation history per tenant
kubectl get events -n flux-system \
  --field-selector involvedObject.name=team-alpha \
  --sort-by='.lastTimestamp'
```

The SoD enforcement flow:

```mermaid
flowchart TD
    PlatformTeam[Platform Team] -->|Can modify| ClusterConfig[/clusters/ — Kustomization definitions]
    PlatformTeam -->|Can modify| TenantRBAC[Tenant RBAC and namespaces]
    TeamAlpha[Team Alpha] -->|Can modify| AlphaApps[/apps/team-alpha/ — their apps only]
    TeamBeta[Team Beta] -->|Can modify| BetaApps[/apps/team-beta/ — their apps only]
    TeamAlpha -->|Cannot modify| BetaApps
    TeamBeta -->|Cannot modify| AlphaApps
    TeamAlpha -->|Cannot modify| ClusterConfig
    TeamBeta -->|Cannot modify| ClusterConfig
```

## Best Practices

- Run quarterly SoD reviews: check CODEOWNERS lists, RBAC bindings, and GitHub team memberships to ensure they accurately reflect current team structures.
- Use GitHub Teams (not individual usernames) in CODEOWNERS so team membership changes automatically update the approval requirements.
- Document the SoD matrix in your Information Security Management System (ISMS) and reference the specific CODEOWNERS file path and branch protection settings as technical controls.
- Test SoD controls after any reorganization or team restructuring — it is easy for CODEOWNERS to become stale.
- Include SoD verification in your CI pipeline by checking that the CODEOWNERS file is present and covers all sensitive paths.

## Conclusion

Flux CD multi-tenancy with RBAC and CODEOWNERS-based SoD enforcement creates a deployment model where no single team has the ability to unilaterally make production changes across the entire system. The platform team controls the structure (what Kustomizations exist, who has which permissions), while application teams control only their own manifests. Every cross-boundary change requires collaboration — enforced at both the Git level (CODEOWNERS) and the Kubernetes level (scoped service accounts), providing strong, auditable separation of duties.
