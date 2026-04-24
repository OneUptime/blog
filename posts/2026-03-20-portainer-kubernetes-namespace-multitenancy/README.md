# How to Implement Namespace-Based Multi-Tenancy in Portainer for Kubernetes (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Namespace, Multi-Tenancy, RBAC, Access Control

Description: Learn how to implement namespace-based multi-tenancy in Portainer for Kubernetes environments, giving each team isolated access to their own namespace.

---

Kubernetes namespaces provide natural isolation boundaries for multi-tenant deployments. In Portainer Business Edition, you can layer namespace-level access control on top of Kubernetes RBAC so each team sees only its assigned namespace, with enforcement handled at the cluster level.

## Namespace Isolation Architecture

```mermaid
graph TD
    Portainer --> K8sCluster[Kubernetes Cluster]
    K8sCluster --> NSTeamA[Namespace: team-a]
    K8sCluster --> NSTeamB[Namespace: team-b]
    K8sCluster --> NSShared[Namespace: shared-infra]
    TeamAUsers[Team A Users] -->|Access only| NSTeamA
    TeamBUsers[Team B Users] -->|Access only| NSTeamB
    AdminUsers[Admin Users] --> NSTeamA
    AdminUsers --> NSTeamB
    AdminUsers --> NSShared
```

## Step 1: Create Namespaces

```bash
# Create namespaces for each tenant

kubectl create namespace team-a
kubectl create namespace team-b
kubectl create namespace shared-infra

# Add labels for tenancy metadata and policy tools
kubectl label namespace team-a tenant=team-a environment=production
kubectl label namespace team-b tenant=team-b environment=production
```

## Step 2: Create Kubernetes RBAC

Create a Role and RoleBinding for each team to restrict them to their namespace:

```yaml
# team-a-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: team-a-role
  namespace: team-a
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["get", "create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-binding
  namespace: team-a
subjects:
  - kind: Group
    name: team-a-group    # Kubernetes group name (from OIDC/LDAP)
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: team-a-role
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f team-a-rbac.yaml
```

## Step 3: Configure Portainer Namespace Access

In Portainer Business Edition, and with Kubernetes RBAC enabled, configure which teams can see which namespaces:

1. Open the Kubernetes environment and go to **Namespaces**.
2. On the `team-a` row, click **Manage access**.
3. Add Team A and click **Create access**.

This ensures Team A users only see the `team-a` namespace in the Portainer UI - all other namespaces are hidden.

## Step 4: Apply ResourceQuotas per Namespace

Prevent resource overconsumption per tenant:

```yaml
# team-a-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"
    pods: "20"
    services: "10"
    persistentvolumeclaims: "5"
    services.loadbalancers: "2"
```

## Step 5: Apply NetworkPolicies for Traffic Isolation

If your CNI implements NetworkPolicy, use a policy like the following to enforce strict namespace isolation for `team-a` (add separate DNS or external egress rules only if the workloads need them):

```yaml
# deny-cross-namespace.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector: {}   # Only allow traffic from pods in team-a
  egress:
    - to:
        - podSelector: {}   # Only allow traffic to pods in team-a
```

## Verifying Namespace Isolation

Log in as a Team A user via Portainer and verify they cannot see Team B's namespace:

```bash
# Using Team A's kubeconfig or token
kubectl get pods -n team-b
# Should return: Error from server (Forbidden)

kubectl get pods -n team-a
# Should work - shows Team A's pods
```

In Portainer's Kubernetes view, Team A users see only the `team-a` namespace in the namespace dropdown.
