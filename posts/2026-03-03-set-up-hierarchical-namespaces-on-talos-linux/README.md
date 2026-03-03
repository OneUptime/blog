# How to Set Up Hierarchical Namespaces on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Hierarchical Namespace, Multi-Tenancy, HNC

Description: Learn how to implement hierarchical namespaces on Talos Linux using the Hierarchical Namespace Controller for organized multi-team cluster management.

---

As organizations grow and more teams share a Talos Linux cluster, flat namespace structures become difficult to manage. You end up with dozens or hundreds of namespaces with no clear relationship between them. Hierarchical namespaces solve this by letting you create parent-child relationships between namespaces, where child namespaces inherit policies, RBAC, and other resources from their parents. This maps naturally to organizational structures where a department has multiple teams, each with their own projects.

This post covers how to set up hierarchical namespaces on Talos Linux using the Hierarchical Namespace Controller (HNC) and how to use them effectively for multi-team cluster management.

## What Are Hierarchical Namespaces?

The Hierarchical Namespace Controller (HNC) is a Kubernetes project that adds parent-child relationships to namespaces. When you create a child namespace under a parent, the child automatically inherits certain resources from the parent, such as Roles, RoleBindings, NetworkPolicies, and other objects you configure.

For example, if you have a parent namespace "engineering" with a NetworkPolicy that allows DNS access, all child namespaces (team-backend, team-frontend, team-data) automatically get that same NetworkPolicy. If you update the parent's policy, all children get the update.

```
engineering (parent)
  - team-backend (child)
    - backend-staging (subchild)
    - backend-production (subchild)
  - team-frontend (child)
  - team-data (child)
```

## Installing the Hierarchical Namespace Controller

HNC runs as a controller in your Talos Linux cluster. Install it using kubectl.

```bash
# Install HNC v1.1.0 (check for latest version)
kubectl apply -f https://github.com/kubernetes-sigs/hierarchical-namespaces/releases/download/v1.1.0/default.yaml

# Verify the installation
kubectl get pods -n hnc-system

# Install the kubectl HNC plugin for easier management
# On macOS
brew install kubectl-hns

# Or download directly
curl -L https://github.com/kubernetes-sigs/hierarchical-namespaces/releases/download/v1.1.0/kubectl-hns_darwin_amd64 -o kubectl-hns
chmod +x kubectl-hns
sudo mv kubectl-hns /usr/local/bin/
```

Verify HNC is working:

```bash
# Check HNC status
kubectl hns config describe

# You should see the default propagation rules
# RoleBindings: Propagate
# Roles: Propagate
# etc.
```

## Creating a Namespace Hierarchy

Let us create a hierarchy that maps to an engineering organization.

### Create the Parent Namespace

```bash
# Create the parent namespace
kubectl create namespace engineering

# Apply organization-wide policies to the parent
kubectl -n engineering apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: engineering-admins
subjects:
  - kind: Group
    name: engineering-leads
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: admin
  apiGroup: rbac.authorization.k8s.io
EOF
```

### Create Child Namespaces

Use the HNC kubectl plugin to create child namespaces.

```bash
# Create child namespaces under engineering
kubectl hns create team-backend -n engineering
kubectl hns create team-frontend -n engineering
kubectl hns create team-data -n engineering

# Verify the hierarchy
kubectl hns tree engineering

# Expected output:
# engineering
# ├── team-backend
# ├── team-data
# └── team-frontend
```

### Create Sub-Children

You can nest namespaces further. This is useful for separating environments within a team.

```bash
# Create environment namespaces under team-backend
kubectl hns create backend-dev -n team-backend
kubectl hns create backend-staging -n team-backend
kubectl hns create backend-prod -n team-backend

# View the full hierarchy
kubectl hns tree engineering

# Expected output:
# engineering
# ├── team-backend
# │   ├── backend-dev
# │   ├── backend-prod
# │   └── backend-staging
# ├── team-data
# └── team-frontend
```

## How Resource Propagation Works

When you create a resource in a parent namespace, HNC automatically copies it to all child namespaces. The copied resources have labels that identify them as propagated.

```bash
# The allow-dns NetworkPolicy we created in engineering
# should now exist in all child namespaces
kubectl -n team-backend get networkpolicies
# Output: allow-dns (propagated from engineering)

kubectl -n backend-dev get networkpolicies
# Output: allow-dns (propagated from engineering -> team-backend)

# The engineering-admins RoleBinding is also propagated
kubectl -n team-backend get rolebindings
# Output: engineering-admins (propagated from engineering)
```

Propagated resources have specific labels that HNC uses to track them:

```bash
# Check if a resource was propagated
kubectl -n team-backend get networkpolicy allow-dns -o yaml | grep -A 3 labels
# Should show hnc.x-k8s.io/inherited-from: engineering
```

## Configuring What Gets Propagated

By default, HNC propagates Roles, RoleBindings, and a few other resource types. You can configure which resources are propagated.

```bash
# View current propagation configuration
kubectl hns config describe

# Add NetworkPolicy to propagated resources
kubectl hns config set-resource networkpolicies --group networking.k8s.io --mode Propagate

# Add ResourceQuota to propagated resources
kubectl hns config set-resource resourcequotas --mode Propagate

# Add LimitRange to propagated resources
kubectl hns config set-resource limitranges --mode Propagate

# Remove a resource type from propagation
kubectl hns config set-resource configmaps --mode Ignore
```

Available modes:

- **Propagate**: Copy resources from parent to child namespaces
- **Remove**: Delete propagated resources and stop propagating
- **Ignore**: Do not propagate, but do not remove existing copies

## Team-Specific Policies

Each child namespace can have its own policies in addition to those inherited from the parent. Child policies are additive, not a replacement.

```yaml
# Additional RBAC for team-backend only
# This does NOT get propagated to team-frontend or team-data
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backend-developers
  namespace: team-backend
subjects:
  - kind: Group
    name: backend-devs
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: edit
  apiGroup: rbac.authorization.k8s.io
```

This binding is local to team-backend and its children (backend-dev, backend-staging, backend-prod). It does not affect team-frontend or team-data.

## Managing Resource Quotas in a Hierarchy

Resource quotas need special handling in hierarchical namespaces. You do not want the parent quota to conflict with child quotas.

One approach is to set quotas only at the leaf namespaces (the lowest level that actually runs workloads) and use the parent namespaces purely for policy inheritance.

```yaml
# Quota on the leaf namespace (where workloads run)
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: backend-prod
spec:
  hard:
    requests.cpu: "16"
    limits.cpu: "32"
    requests.memory: 32Gi
    limits.memory: 64Gi
```

Another approach is to use the Capsule operator or a similar tool that understands tenant-level quotas and can distribute them across namespaces in a hierarchy.

## Exceptions to Propagation

Sometimes you need a child namespace to not inherit a specific resource from its parent. HNC supports exceptions through annotations.

```yaml
# Prevent a specific resource from being propagated to a child
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: strict-egress
  namespace: engineering
  annotations:
    # Do not propagate to team-data (it has different egress needs)
    hnc.x-k8s.io/exceptions: team-data
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector: {}
```

## Delegating Namespace Creation

One powerful feature of HNC is the ability to let team leads create their own sub-namespaces without needing cluster-level permissions.

```yaml
# Grant team-backend admin the ability to create child namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: subnamespace-admin
  namespace: team-backend
subjects:
  - kind: User
    name: backend-lead@company.com
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: hnc.x-k8s.io:admin
  apiGroup: rbac.authorization.k8s.io
```

With this binding, the backend lead can create sub-namespaces under team-backend:

```bash
# The backend lead can create new environments
kubectl hns create backend-feature-x -n team-backend

# But cannot create namespaces outside their tree
kubectl hns create rogue-namespace -n engineering
# This fails because they only have admin on team-backend
```

## Monitoring the Hierarchy

Keep track of your namespace hierarchy and catch issues.

```bash
# View the complete hierarchy
kubectl hns tree --all-namespaces

# Check for hierarchy issues
kubectl hns config describe

# Look for namespaces with propagation errors
kubectl get hierarchyconfigurations.hnc.x-k8s.io --all-namespaces -o json | \
  jq '.items[] | select(.status.conditions != null) |
      {namespace: .metadata.namespace, conditions: .status.conditions}'
```

## Moving Namespaces in the Hierarchy

You can restructure the hierarchy by changing parent-child relationships.

```bash
# Move team-data from engineering to a new parent
kubectl create namespace data-division
kubectl hns set team-data --parent data-division

# Verify the change
kubectl hns tree data-division
# data-division
# └── team-data
```

When you move a namespace, it stops inheriting from the old parent and starts inheriting from the new one. Propagated resources from the old parent are removed, and resources from the new parent are propagated.

## Practical Hierarchy Patterns

### Pattern 1: Organization Structure

```
company
├── engineering
│   ├── backend
│   ├── frontend
│   └── platform
├── data-science
│   ├── ml-team
│   └── analytics
└── operations
    ├── monitoring
    └── security
```

### Pattern 2: Environment Separation

```
production
├── app-a-prod
├── app-b-prod
└── app-c-prod
staging
├── app-a-staging
├── app-b-staging
└── app-c-staging
development
├── app-a-dev
├── app-b-dev
└── app-c-dev
```

### Pattern 3: Project-Based

```
project-alpha
├── alpha-api
├── alpha-workers
└── alpha-database
project-beta
├── beta-api
└── beta-frontend
```

## Conclusion

Hierarchical namespaces on Talos Linux bring order to multi-team clusters by letting you organize namespaces into trees that mirror your organization. Policies defined at higher levels propagate automatically to all descendants, ensuring consistency without duplication. HNC is straightforward to install and configure, and it integrates well with existing RBAC, network policies, and resource management. Start with a simple hierarchy that matches your team structure, configure propagation for the resources that should be inherited, and delegate sub-namespace creation to team leads for a self-service workflow. The result is a cluster that is easier to manage as the number of teams and namespaces grows.
