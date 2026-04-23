# How to Implement RBAC Best Practices in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, RBAC, Security, Access Control, Kubernetes, Authorization

Description: Implement RBAC best practices in Rancher using least-privilege roles, Rancher Projects for team isolation, service account management, and regular access reviews to secure Kubernetes cluster access.

## Introduction

Role-Based Access Control in Rancher uses Rancher global permissions plus cluster and project roles, and Rancher implements these on top of Kubernetes RBAC. Global permissions determine what users can do outside a specific cluster, while cluster and project roles control access within downstream clusters. Effective RBAC implementation follows least-privilege principles and requires regular review.

## Rancher RBAC Hierarchy

```text
Rancher Authorization
  ├── Global Permissions (Rancher-level)
  │   ├── Administrator: full platform access
  │   ├── Standard User: create and use their own clusters
  │   └── Custom: specific global permissions
  └── Cluster and Project Roles (per downstream cluster)
      ├── Cluster Roles
      │   ├── Cluster Owner: full control
      │   ├── Cluster Member: view most cluster resources + create projects
      │   └── Custom: specific permissions
      └── Project Roles
          ├── Project Owner: full control of project resources
          ├── Project Member: manage namespaces and workloads
          └── Read Only: view resources
```

## Step 1: Create Role Templates for Teams

```yaml
# Custom role for developers - view + deploy, no delete

apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: developer
displayName: Developer
context: project
rules:
  - apiGroups: ["", "apps", "batch", "networking.k8s.io"]
    resources:
      - pods
      - deployments
      - replicasets
      - services
      - ingresses
      - jobs
      - cronjobs
      - configmaps
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods/log", "pods/exec", "pods/portforward"]
    verbs: ["get", "create"]
  # No delete on production resources
  # No access to secrets
---
# Read-only role for stakeholders
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: viewer
displayName: Viewer
context: project
rules:
  - apiGroups: ["", "apps", "batch"]
    resources: ["pods", "deployments", "services", "jobs"]
    verbs: ["get", "list", "watch"]
```

## Step 2: Never Use Cluster-Level Admin for Developers

```bash
# Assign users to Projects, not Clusters
# Bad: giving developer cluster-member role
# Good: giving developer a project-scoped role for a specific project

# In Rancher UI:
# Cluster Management > <cluster> > Explore > Cluster > Projects/Namespaces
# <project> > Edit Config > Members > Add

# Via kubectl (Rancher CRD)
kubectl apply -f - <<EOF
apiVersion: management.cattle.io/v3
kind: ProjectRoleTemplateBinding
metadata:
  name: dev-team-binding
  namespace: <project-backing-namespace>
projectName: <cluster-id>:<project-id>
roleTemplateName: developer
userPrincipalName: <user-principal-name>
EOF
```

## Step 3: Service Account Best Practices

```yaml
# Create dedicated service accounts per application
# Never use the default service account

apiVersion: v1
kind: ServiceAccount
metadata:
  name: payment-api
  namespace: production
automountServiceAccountToken: false    # Opt-in per pod, not default
---
# Grant only required permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: payment-api-role
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["payment-config"]   # Specific resource names only
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["payment-secrets"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payment-api-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: payment-api
    namespace: production
roleRef:
  kind: Role
  name: payment-api-role
  apiGroup: rbac.authorization.k8s.io
```

## Step 4: Disable Default Service Account Token Automount

```text
# Patch the default service account to disable auto-mount in this namespace
kubectl patch serviceaccount default \
  -p '{"automountServiceAccountToken": false}' \
  -n production

# For pods that need the token, explicitly enable it in the Pod spec:
spec:
  automountServiceAccountToken: true
  serviceAccountName: payment-api
```

## Step 5: Regular Access Review

```bash
# Audit who has cluster admin access
kubectl get clusterrolebindings \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.roleRef.name}{"\t"}{range .subjects[*]}{.kind}/{.name}{", "}{end}{"\n"}{end}' \
  | awk -F '\t' '$2 == "cluster-admin"'

# List namespaced RoleBindings in a namespace
kubectl get rolebindings -n production \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.roleRef.name}{"\t"}{range .subjects[*]}{.kind}/{.name}{", "}{end}{"\n"}{end}'

# Check service account permissions
kubectl auth can-i --list --as=system:serviceaccount:production:payment-api -n production
```

## Step 6: Integrate with SSO/OIDC

```text
# Rancher supports external auth providers such as Active Directory,
# GitHub, SAML providers, and Generic OIDC.
# Configure authentication in:
# Rancher UI > Users & Authentication > Auth Provider

# Key settings:
# - Map groups to Rancher roles (avoid per-user bindings)
# - Group membership is refreshed on login; use Refresh Group Memberships when needed
# - Set session timeout for compliance

# Example group-to-role mappings:
# Cluster Management > <cluster> > Explore > Cluster > Cluster Members
# Group: AD\k8s-cluster-admins → Cluster Owner
# Cluster Management > <cluster> > Explore > Cluster > Projects/Namespaces > <project> > Edit Config > Members
# Group: AD\k8s-developers → Developer (custom project role)
```

## RBAC Checklist

- No developer has Cluster Owner or cluster-admin
- Dedicated service accounts per application (not default)
- Service account token auto-mount disabled by default
- Project-level RBAC for all team members
- Read-only role for stakeholders and auditors
- SSO/OIDC group-based access (no per-user bindings)
- Access review scheduled quarterly
- Privileged namespace access audited monthly
- `kubectl auth can-i` used to verify permissions

## Conclusion

Effective RBAC in Rancher requires using the right level of access: Project roles for developers, Cluster roles only for platform engineers, and custom roles that follow least-privilege. Tie access to SSO groups rather than individual users for scalability. Run quarterly access reviews using `kubectl auth can-i`, `get rolebindings`, and `get clusterrolebindings` to identify over-privileged accounts before they become security incidents.
