# How to Set Up Flux Multi-Tenancy with Workspace Isolation and RBAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, GitOps, Multi-Tenancy, RBAC, Kubernetes

Description: Learn how to configure Flux for multi-tenant Kubernetes environments with proper workspace isolation, RBAC controls, and tenant-specific Git repositories for secure self-service deployments.

---

Multi-tenant Kubernetes clusters require strict isolation between teams. Each tenant needs their own Git repository, namespace boundaries, and RBAC controls. Flux provides built-in multi-tenancy features that let platform teams define boundaries while giving application teams self-service GitOps capabilities.

This guide demonstrates how to architect and implement secure multi-tenant Flux deployments.

## Understanding Flux Multi-Tenancy Architecture

Flux supports two multi-tenancy models. In the centralized model, platform administrators manage a single Flux installation that reconciles multiple tenant repositories. In the distributed model, each tenant runs their own Flux instance in their namespaces.

The centralized model provides better resource efficiency and easier platform upgrades. The distributed model offers stronger isolation but requires more overhead.

## Setting Up Platform Flux Installation

Install Flux at the cluster level:

```bash
flux bootstrap github \
  --owner=platform-team \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal=false
```

Create the platform directory structure:

```bash
mkdir -p clusters/production/{platform,tenants}
```

## Creating Tenant Namespaces with Isolation

Define tenant namespaces with RBAC:

```yaml
# clusters/production/tenants/team-alpha/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    tenant: team-alpha
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-reconciler
  namespace: team-alpha
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flux-reconciler
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: admin  # Or custom role with restricted permissions
subjects:
- kind: ServiceAccount
  name: flux-reconciler
  namespace: team-alpha
```

## Configuring Tenant Git Repositories

Create GitRepository resources for each tenant:

```yaml
# clusters/production/tenants/team-alpha/gitrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-repo
  namespace: team-alpha
spec:
  interval: 1m
  url: https://github.com/team-alpha/applications
  ref:
    branch: main
  secretRef:
    name: team-alpha-git-credentials
```

Create scoped Kustomization:

```yaml
# clusters/production/tenants/team-alpha/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 5m
  path: ./production
  prune: true
  sourceRef:
    kind: GitRepository
    name: team-alpha-repo
  serviceAccountName: flux-reconciler
  targetNamespace: team-alpha
  validation: client
```

The `serviceAccountName` ensures reconciliation uses tenant-specific RBAC.

## Implementing Resource Quotas

Enforce resource limits per tenant:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-alpha-quota
  namespace: team-alpha
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    persistentvolumeclaims: "10"
    services.loadbalancers: "2"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: team-alpha-limits
  namespace: team-alpha
spec:
  limits:
  - max:
      cpu: "4"
      memory: 8Gi
    min:
      cpu: 100m
      memory: 128Mi
    default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    type: Container
```

## Creating Custom RBAC for Tenants

Define restricted ClusterRole for tenant reconcilers:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tenant-reconciler
rules:
# Allow managing standard resources
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets", "daemonsets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# Allow Flux resources in tenant namespace only
- apiGroups: ["source.toolkit.fluxcd.io"]
  resources: ["*"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["kustomize.toolkit.fluxcd.io"]
  resources: ["*"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# Deny cluster-wide resources
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["clusterroles", "clusterrolebindings"]
  verbs: []
```

Bind to tenant ServiceAccount:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tenant-reconciler
subjects:
- kind: ServiceAccount
  name: flux-reconciler
  namespace: team-alpha
```

## Isolating Network Traffic

Apply NetworkPolicies for tenant isolation:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-tenant
  namespace: team-alpha
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Allow from same namespace
  - from:
    - podSelector: {}
  # Allow from ingress controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  # Allow to same namespace
  - to:
    - podSelector: {}
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
  # Allow internet egress
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
```

## Monitoring Tenant Resources

Create monitoring for each tenant:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tenant-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "panels": [
        {
          "title": "Tenant Resource Usage",
          "targets": [
            {
              "expr": "sum by (namespace) (kube_pod_container_resource_requests{namespace=~\"team-.*\"})"
            }
          ]
        }
      ]
    }
```

## Implementing Tenant Onboarding Automation

Create a script to onboard new tenants:

```bash
#!/bin/bash
# onboard-tenant.sh

TENANT_NAME=$1
GITHUB_REPO=$2

# Create tenant directory
mkdir -p clusters/production/tenants/${TENANT_NAME}

# Generate namespace manifest
cat > clusters/production/tenants/${TENANT_NAME}/namespace.yaml <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ${TENANT_NAME}
  labels:
    tenant: ${TENANT_NAME}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-reconciler
  namespace: ${TENANT_NAME}
EOF

# Generate GitRepository
cat > clusters/production/tenants/${TENANT_NAME}/gitrepository.yaml <<EOF
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: ${TENANT_NAME}-repo
  namespace: ${TENANT_NAME}
spec:
  interval: 1m
  url: ${GITHUB_REPO}
  ref:
    branch: main
EOF

# Commit and push
git add clusters/production/tenants/${TENANT_NAME}
git commit -m "Onboard tenant: ${TENANT_NAME}"
git push

echo "Tenant ${TENANT_NAME} onboarded successfully"
```

Usage:

```bash
./onboard-tenant.sh team-beta https://github.com/team-beta/applications
```

## Best Practices and Security

Always use `serviceAccountName` in tenant Kustomizations to enforce RBAC boundaries. Never allow tenants to create ClusterRole or ClusterRoleBinding resources.

Set `targetNamespace` to prevent tenants from deploying to other namespaces. Enable `validation: client` to catch errors before applying to the cluster.

Use separate Git repositories per tenant. Avoid monorepos where tenants could view each other's manifests.

Monitor for privilege escalation attempts by tracking RBAC changes and reviewing Flux controller logs for authorization failures.

Implement proper Git access controls. Tenants should only have write access to their own repositories, not the platform fleet-infra repo.

Flux multi-tenancy enables platform teams to provide self-service GitOps while maintaining security boundaries and resource controls across multiple teams.
