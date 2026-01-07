# How to Use Namespaces and RBAC to Keep Dev, Stage, and Prod Isolated

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevOps, Security, Environments

Description: Practical steps for carving clusters into dev/stage/prod namespaces, applying least-privilege RBAC, and verifying isolation so accidents in testing never spill into production.

---

A single cluster can safely host dev, stage, and prod-but only if you isolate workloads and permissions. Namespaces give you separate resource scopes, while RBAC enforces who can touch each scope. Follow these steps to stand up a minimal, auditable guardrail system.

## 1. Pick a Namespace Strategy

Keep names simple and descriptive:

- `dev`, `stage`, `prod` for environment-aligned workloads.
- Optional `platform` or `shared` namespace for cluster-wide controllers.
- Avoid per-person namespaces in shared clusters; prefer per-team or per-service to limit sprawl.

Document the mapping (team, namespace, owner) in Git to keep everyone aligned.

## 2. Create the Namespaces

Create separate namespaces for each environment to isolate workloads. Each namespace acts as a virtual cluster with its own resource quotas, network policies, and RBAC bindings.

```bash
# Create the three environment namespaces
kubectl create namespace dev
kubectl create namespace stage
kubectl create namespace prod
```

Add labels so policies and automation can react to environment type:

```bash
# Loop through each namespace and apply consistent labels/annotations
for ns in dev stage prod; do
  # Label helps NetworkPolicies and admission controllers identify environment
  kubectl label namespace "$ns" env="$ns" --overwrite
  # Annotation tracks ownership for auditing
  kubectl annotate namespace "$ns" owner="platform-team" --overwrite
done
```

## 3. Define Environment Roles

Create a Role per namespace with only the verbs each team needs. Example: allow Devs to change Deployments/ConfigMaps inside `dev`, but only read access elsewhere.

`roles/dev-admin.yaml`

This Role grants full CRUD permissions on common resources within the `dev` namespace only. Roles are namespace-scoped, so these permissions do not leak into stage or prod.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: dev                    # Role only applies within this namespace
  name: dev-admin
rules:
  - apiGroups: [""]                 # Core API group (pods, services, etc.)
    resources: ["pods", "services", "configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
  - apiGroups: ["apps"]             # apps API group (deployments, etc.)
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
```

Apply each Role to its corresponding namespace:

```bash
# Full access for developers in dev
kubectl apply -f roles/dev-admin.yaml
# Similar role for stage (adjust verbs as needed)
kubectl apply -f roles/stage-admin.yaml
# Read-only for prod to prevent accidental changes
kubectl apply -f roles/prod-readonly.yaml
```

Stage/Prod roles typically omit `create`/`delete` verbs to avoid surprise rollouts.

## 4. Bind Roles to Groups or Service Accounts

Use RoleBindings so permissions stay namespace-scoped. Reference SSO groups (e.g., from OIDC) or Kubernetes service accounts.

`bindings/dev-admins.yaml`

A RoleBinding connects a Role to users, groups, or service accounts. This binding grants the `dev-admin` Role to everyone in the `corp:k8s-devs` SSO group, but only within the `dev` namespace.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-admins
  namespace: dev                    # Binding is scoped to this namespace
subjects:
  - kind: Group
    name: corp:k8s-devs             # SSO/OIDC group from your identity provider
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: dev-admin                   # References the Role defined above
```

Repeat for stage/prod with the correct groups. For automated workloads (e.g., GitHub Actions runner), create service accounts per namespace and bind them to custom Roles with only the verbs their deployments require.

## 5. Grant Cluster-Wide Read Access Safely

Most engineers need to list namespaces or nodes while debugging. This ClusterRole grants read-only access across all namespaces and resource types, making troubleshooting possible without risking accidental changes.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-readonly
rules:
  - apiGroups: ["*"]                # All API groups
    resources: ["*"]                # All resources (pods, nodes, secrets, etc.)
    verbs: ["get", "list", "watch"] # Read-only verbs only
```

Then bind to a `Group` such as `corp:k8s-viewers`. Pair this with namespace-specific RoleBindings for write actions so prod remains protected.

## 6. Verify Isolation with `kubectl auth can-i`

These commands test whether your current credentials (or an impersonated user) can perform specific actions. Run them to verify your RBAC rules work as intended before relying on them in production.

```bash
# Should return "yes" for dev admins
kubectl auth can-i delete deployments --namespace=dev
# Should return "no" for dev admins (they only have read access to prod)
kubectl auth can-i delete deployments --namespace=prod
```

Expect `yes` in dev for admin groups and `no` elsewhere. Automate these checks in CI to catch accidental RBAC drift by running a matrix of verbs/namespaces after each manifest change.

## 7. Automate Namespace Defaults

Set per-context default namespaces so accidental `kubectl apply` commands do not hit prod. Each context binds a cluster, user, and default namespace together.

```bash
# Create a dev context that defaults to the dev namespace
kubectl config set-context dev --cluster=cluster --user=dev --namespace=dev
# Create a prod context - requires explicit switch to use
kubectl config set-context prod --cluster=cluster --user=prod --namespace=prod
```

Encourage engineers to switch contexts intentionally (`kubectl config use-context dev`). Combine with shell prompts or `kubectx` to display the active namespace.

## 8. Enforce Network and Resource Policies (Optional but Recommended)

- Attach NetworkPolicies per namespace to block cross-env traffic unless explicitly allowed.
- Apply ResourceQuotas/LimitRanges so runaway dev workloads cannot starve prod nodes.

These policies live alongside RBAC manifests in Git, making rollbacks trivial.

## 9. Operate Like Code

- Store namespace + RBAC YAML in Git.
- Require pull requests for changes.
- Run `kubectl diff -f` or `kustomize build` in CI to preview updates.
- Tag releases so you can answer “who granted prod write access?” in seconds.

---

Namespaces separate the blast radius; RBAC keeps humans honest. Layer both, verify with `kubectl auth can-i`, and your dev/stage/prod workflows can share a cluster without sharing disasters.
