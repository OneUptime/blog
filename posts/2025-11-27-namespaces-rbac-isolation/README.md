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

```bash
kubectl create namespace dev
kubectl create namespace stage
kubectl create namespace prod
```

Add labels so policies and automation can react to environment type:

```bash
for ns in dev stage prod; do
  kubectl label namespace "$ns" env="$ns" --overwrite
  kubectl annotate namespace "$ns" owner="platform-team" --overwrite
done
```

## 3. Define Environment Roles

Create a Role per namespace with only the verbs each team needs. Example: allow Devs to change Deployments/ConfigMaps inside `dev`, but only read access elsewhere.

`roles/dev-admin.yaml`

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: dev
  name: dev-admin
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
```

Apply per namespace:

```bash
kubectl apply -f roles/dev-admin.yaml
kubectl apply -f roles/stage-admin.yaml
kubectl apply -f roles/prod-readonly.yaml
```

Stage/Prod roles typically omit `create`/`delete` verbs to avoid surprise rollouts.

## 4. Bind Roles to Groups or Service Accounts

Use RoleBindings so permissions stay namespace-scoped. Reference SSO groups (e.g., from OIDC) or Kubernetes service accounts.

`bindings/dev-admins.yaml`

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-admins
  namespace: dev
subjects:
  - kind: Group
    name: corp:k8s-devs
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: dev-admin
```

Repeat for stage/prod with the correct groups. For automated workloads (e.g., GitHub Actions runner), create service accounts per namespace and bind them to custom Roles with only the verbs their deployments require.

## 5. Grant Cluster-Wide Read Access Safely

Most engineers need to list namespaces or nodes while debugging. Use a limited `ClusterRole` + `ClusterRoleBinding` for read-only access:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-readonly
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
```

Then bind to a `Group` such as `corp:k8s-viewers`. Pair this with namespace-specific RoleBindings for write actions so prod remains protected.

## 6. Verify Isolation with `kubectl auth can-i`

Run checks from each user context:

```bash
kubectl auth can-i delete deployments --namespace=dev
kubectl auth can-i delete deployments --namespace=prod
```

Expect `yes` in dev for admin groups and `no` elsewhere. Automate these checks in CI to catch accidental RBAC drift by running a matrix of verbs/namespaces after each manifest change.

## 7. Automate Namespace Defaults

Set per-context default namespaces so accidental `kubectl apply` commands do not hit prod:

```bash
kubectl config set-context dev --cluster=cluster --user=dev --namespace=dev
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
