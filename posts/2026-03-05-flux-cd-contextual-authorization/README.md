# How to Configure Flux CD with Contextual Authorization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, RBAC, Authorization, Multi-Tenancy

Description: Learn how to implement contextual authorization in Flux CD where permissions are scoped based on the source, target namespace, and deploying team.

---

Contextual authorization in Flux CD means that the permissions granted during reconciliation depend on the context: which Git repository the change came from, which namespace it targets, and which team owns the deployment. This approach provides fine-grained access control that goes beyond static RBAC rules.

## What is Contextual Authorization

Traditional RBAC grants static permissions to service accounts. Contextual authorization adds dynamic constraints:

- A Git repository for team A can only deploy to namespace A.
- A Kustomization targeting production has different permissions than one targeting staging.
- Helm charts from untrusted repositories have fewer permissions than internal charts.

Flux achieves this through a combination of service account impersonation, source separation, and cross-namespace restrictions.

## Step 1: Map Git Sources to Service Accounts

Create separate GitRepository sources for each team, each mapped to a dedicated service account:

```yaml
# team-sources.yaml
# Separate Git sources for each team
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-frontend
  namespace: team-frontend
spec:
  interval: 5m
  url: https://github.com/myorg/frontend-apps.git
  secretRef:
    name: team-frontend-git-creds
  ref:
    branch: main
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-backend
  namespace: team-backend
spec:
  interval: 5m
  url: https://github.com/myorg/backend-apps.git
  secretRef:
    name: team-backend-git-creds
  ref:
    branch: main
```

## Step 2: Create Context-Specific Service Accounts

Each team gets service accounts with permissions appropriate to their context:

```yaml
# contextual-rbac.yaml
# Team Frontend: can deploy web apps but not databases
apiVersion: v1
kind: ServiceAccount
metadata:
  name: frontend-deployer
  namespace: team-frontend
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: frontend-deployer
  namespace: team-frontend
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # No access to StatefulSets, PersistentVolumeClaims, or Secrets
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: frontend-deployer
  namespace: team-frontend
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: frontend-deployer
subjects:
  - kind: ServiceAccount
    name: frontend-deployer
    namespace: team-frontend
---
# Team Backend: can deploy databases and stateful workloads
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-deployer
  namespace: team-backend
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backend-deployer
  namespace: team-backend
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backend-deployer
  namespace: team-backend
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: backend-deployer
subjects:
  - kind: ServiceAccount
    name: backend-deployer
    namespace: team-backend
```

## Step 3: Create Context-Bound Kustomizations

Bind each Kustomization to its team's Git source and service account:

```yaml
# contextual-kustomizations.yaml
# Frontend Kustomization - bound to frontend source and service account
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-frontend-apps
  namespace: team-frontend
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-frontend
    # No cross-namespace ref - source must be in same namespace
  path: ./apps
  prune: true
  targetNamespace: team-frontend
  serviceAccountName: frontend-deployer
---
# Backend Kustomization - bound to backend source and service account
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-backend-apps
  namespace: team-backend
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-backend
  path: ./apps
  prune: true
  targetNamespace: team-backend
  serviceAccountName: backend-deployer
```

## Step 4: Environment-Specific Authorization

Grant different permissions based on the target environment:

```yaml
# environment-contextual-rbac.yaml
# Staging service account - broader permissions for testing
apiVersion: v1
kind: ServiceAccount
metadata:
  name: staging-deployer
  namespace: staging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: staging-deployer
  namespace: staging
rules:
  # Broader permissions in staging for testing
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs: ["*"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "serviceaccounts", "pods"]
    verbs: ["*"]
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["*"]
---
# Production service account - strict permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: production-deployer
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: production-deployer
  namespace: production
rules:
  # Only Deployments and Services in production
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
    # Note: no "delete" verb in production
  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
```

## Step 5: Use OPA Gatekeeper for Dynamic Authorization

Add a policy layer that enforces contextual rules beyond RBAC:

```yaml
# contextual-gatekeeper-policy.yaml
# Ensure resources in a namespace match the team label
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8steamownership
spec:
  crd:
    spec:
      names:
        kind: K8sTeamOwnership
      validation:
        openAPIV3Schema:
          type: object
          properties:
            team:
              type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8steamownership

        violation[{"msg": msg}] {
          ns := input.review.object.metadata.namespace
          ns_labels := data.inventory.cluster.v1.Namespace[ns].metadata.labels
          required_team := ns_labels["team"]
          resource_team := input.review.object.metadata.labels["team"]
          required_team != resource_team
          msg := sprintf("Resource team label '%v' does not match namespace team '%v'", [resource_team, required_team])
        }
```

## Step 6: Verify Contextual Authorization

Test that authorization is properly context-dependent:

```bash
# Frontend deployer can create Deployments in team-frontend
kubectl auth can-i create deployments \
  --as=system:serviceaccount:team-frontend:frontend-deployer \
  -n team-frontend
# Expected: yes

# Frontend deployer cannot create StatefulSets (context: web apps only)
kubectl auth can-i create statefulsets \
  --as=system:serviceaccount:team-frontend:frontend-deployer \
  -n team-frontend
# Expected: no

# Frontend deployer cannot deploy to team-backend namespace
kubectl auth can-i create deployments \
  --as=system:serviceaccount:team-frontend:frontend-deployer \
  -n team-backend
# Expected: no

# Production deployer cannot delete Deployments (context: production safety)
kubectl auth can-i delete deployments \
  --as=system:serviceaccount:production:production-deployer \
  -n production
# Expected: no
```

## Best Practices

1. **Separate sources per team**: Each team should have its own GitRepository to prevent cross-team access.
2. **Match service accounts to context**: Create service accounts that reflect the deployment context (team, environment, application type).
3. **Use policy engines for dynamic rules**: RBAC alone cannot enforce all contextual constraints. Add OPA Gatekeeper or Kyverno for dynamic validation.
4. **Enable cross-namespace restrictions**: Use `--no-cross-namespace-refs` to enforce source-namespace binding.
5. **Document authorization matrix**: Maintain a matrix documenting which teams, sources, and environments map to which permissions.

Contextual authorization ensures that Flux CD permissions are not just about who is deploying, but also about what is being deployed, where it comes from, and where it goes. This provides the most granular and secure GitOps authorization model.
