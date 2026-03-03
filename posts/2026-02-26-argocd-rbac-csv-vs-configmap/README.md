# How to Use RBAC CSV vs RBAC ConfigMap in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Configuration

Description: Understand the differences between inline RBAC CSV policies and ConfigMap-based RBAC configuration in ArgoCD, and learn which approach works best for your team.

---

ArgoCD gives you two main ways to define RBAC policies: the inline `policy.csv` field within the `argocd-rbac-cm` ConfigMap and external policy files referenced by the ArgoCD server. Both achieve the same result but have different trade-offs for management, version control, and scalability.

This guide breaks down both approaches and helps you choose the right one for your setup.

## The argocd-rbac-cm ConfigMap

The primary and most common way to configure RBAC in ArgoCD is through the `argocd-rbac-cm` ConfigMap in the argocd namespace. It has three key fields:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  # Inline CSV policy
  policy.csv: |
    p, role:deployer, applications, get, */*, allow
    p, role:deployer, applications, sync, */*, allow
    g, developers, role:deployer

  # Default role for unauthenticated users
  policy.default: role:readonly

  # Token claims to use for group matching
  scopes: '[groups]'
```

### policy.csv Field

The `policy.csv` field contains your RBAC policies written in Casbin CSV format. Every policy rule and group mapping goes here as a multiline string:

```yaml
data:
  policy.csv: |
    # Policy rules (p lines)
    p, role:admin, *, *, *, allow
    p, role:viewer, applications, get, */*, allow
    p, role:deployer, applications, get, */*, allow
    p, role:deployer, applications, sync, */*, allow

    # Group mappings (g lines)
    g, platform-team, role:admin
    g, developers, role:deployer
    g, stakeholders, role:viewer
```

Everything is in one place, one field, one ConfigMap.

### Advantages of Inline CSV

- **Simple** - Everything in one file, easy to understand
- **Standard** - This is the approach used in all ArgoCD documentation and examples
- **GitOps-friendly** - Store the ConfigMap YAML in Git and deploy with ArgoCD
- **Immediate** - Changes apply immediately when the ConfigMap is updated
- **No restart needed** - ArgoCD watches the ConfigMap and reloads policies automatically

### Disadvantages of Inline CSV

- **Scale issues** - With hundreds of policy lines, the ConfigMap gets unwieldy
- **No modularity** - Cannot split policies across multiple files
- **YAML escaping** - Multiline strings in YAML can be tricky to get right
- **Limited size** - Kubernetes ConfigMaps have a 1MB size limit

## External Policy Files (policy.csv File)

ArgoCD also supports loading RBAC policies from a file mounted into the ArgoCD server pod. This is less common but useful for large policies:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          # Mount the policy file
          volumeMounts:
            - name: rbac-policy
              mountPath: /etc/argocd-rbac
      volumes:
        - name: rbac-policy
          configMap:
            name: argocd-rbac-policy-file
```

Then create a ConfigMap with the policy file:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-policy-file
  namespace: argocd
data:
  policy.csv: |
    p, role:deployer, applications, get, */*, allow
    p, role:deployer, applications, sync, */*, allow
    g, developers, role:deployer
```

### Advantages of External File

- **Separation** - RBAC policy is a separate resource from ArgoCD config
- **Larger policies** - Can use multiple ConfigMaps or even mount from a Secret
- **Team ownership** - Different teams can own different policy files

### Disadvantages of External File

- **More complex setup** - Requires volume mounts and deployment changes
- **Restart required** - Changes to mounted volumes require pod restart
- **Less standard** - Most tutorials and examples use the inline approach

## Combining Both Approaches

You can actually use both inline and external policies together. ArgoCD merges them:

```yaml
# argocd-rbac-cm with inline policy
data:
  policy.csv: |
    # Core policies
    g, platform-admins, role:admin
    policy.default: role:readonly
```

Plus an external file with additional policies. The policies are combined - both sets of rules are evaluated.

## Project-Level RBAC as an Alternative

For large organizations, consider using project-level RBAC instead of cramming everything into global policies:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: frontend
  namespace: argocd
spec:
  roles:
    - name: deployer
      policies:
        - p, proj:frontend:deployer, applications, get, frontend/*, allow
        - p, proj:frontend:deployer, applications, sync, frontend/*, allow
      groups:
        - frontend-developers
```

This approach:
- Distributes policy management across projects
- Lets project owners manage their own access
- Keeps the global policy small and manageable
- Scales better for large organizations

## Managing RBAC in Git

Regardless of which approach you use, store your RBAC configuration in Git. Here is a recommended repository structure:

```text
argocd-config/
  base/
    argocd-rbac-cm.yaml      # Global RBAC policy
    argocd-cm.yaml            # ArgoCD server config
  projects/
    frontend.yaml             # Frontend project with roles
    backend.yaml              # Backend project with roles
    data.yaml                 # Data project with roles
  kustomization.yaml
```

Deploy the RBAC config with ArgoCD itself (the app-of-apps pattern):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argocd-config
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/argocd-config
    targetRevision: main
    path: .
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      selfHeal: true
```

## YAML Formatting Tips for Inline CSV

Getting the YAML right for inline CSV is a common pain point. Here are the patterns that work:

```yaml
# Use literal block scalar (|) for multiline
data:
  policy.csv: |
    p, role:deployer, applications, get, */*, allow
    p, role:deployer, applications, sync, */*, allow
    g, developers, role:deployer

# NOT this (quoted strings cause problems):
data:
  policy.csv: "p, role:deployer, applications, get, */*, allow\ng, developers, role:deployer"

# NOT this (folded scalar joins lines):
data:
  policy.csv: >
    p, role:deployer, applications, get, */*, allow
    p, role:deployer, applications, sync, */*, allow
```

Always use the `|` (literal) block scalar for `policy.csv`. This preserves line breaks exactly as written.

## When Policies Get Large

If your policy grows beyond a few hundred lines, consider these strategies:

### Strategy 1: Move Policies to Projects

Move team-specific policies into AppProject resources and keep only global policies in `argocd-rbac-cm`:

```yaml
# argocd-rbac-cm (stays small)
data:
  policy.csv: |
    g, platform-admins, role:admin
    p, role:global-viewer, applications, get, */*, allow
    g, all-employees, role:global-viewer
  policy.default: ""
```

### Strategy 2: Generate Policies

Use a script or template to generate the policy.csv from a higher-level configuration:

```python
#!/usr/bin/env python3
# generate-rbac.py
import yaml

teams = {
    "frontend": {"groups": ["frontend-devs"], "projects": ["frontend"]},
    "backend": {"groups": ["backend-devs"], "projects": ["backend"]},
    "data": {"groups": ["data-eng"], "projects": ["data-pipeline"]},
}

policies = []
for team, config in teams.items():
    for project in config["projects"]:
        policies.append(f"p, role:{team}-deployer, applications, get, {project}/*, allow")
        policies.append(f"p, role:{team}-deployer, applications, sync, {project}/*, allow")
    for group in config["groups"]:
        policies.append(f"g, {group}, role:{team}-deployer")

print("\n".join(policies))
```

### Strategy 3: Use Multiple ArgoCD Instances

For very large organizations, running separate ArgoCD instances per business unit is sometimes simpler than one massive shared instance.

## Validating Both Approaches

Regardless of how you store your policies, validate them the same way:

```bash
# Validate inline policy from ConfigMap
kubectl get configmap argocd-rbac-cm -n argocd -o jsonpath='{.data.policy\.csv}' > /tmp/policy.csv
argocd admin settings rbac validate --policy-file /tmp/policy.csv

# Test specific permissions
argocd admin settings rbac can role:deployer sync applications 'frontend/web-app' \
  --policy-file /tmp/policy.csv
```

## Summary

For most ArgoCD deployments, the inline `policy.csv` in `argocd-rbac-cm` is the right choice. It is simple, well-documented, and works well for small to medium policy sizes. When policies grow large, distribute them across AppProject resources or use tooling to generate the CSV. The external file approach works but adds complexity that is rarely needed. Whichever approach you choose, store your RBAC config in Git and test every change before applying it.
