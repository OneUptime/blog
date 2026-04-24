# How to Segment Environments with Namespace Access in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Namespace, RBAC, Security

Description: Learn how to use Kubernetes namespaces with Portainer's access control to segment environments by team, ensuring each team only sees and manages their own workloads.

## Introduction

Namespace-based segmentation is the primary method for multi-tenancy in Kubernetes. Portainer's Business Edition extends this with its own RBAC layer, allowing you to map Portainer teams to Kubernetes namespaces so developers only see namespaces they have been granted access to. This guide covers complete namespace segmentation setup.

## Prerequisites

- Portainer BE with a Kubernetes environment
- Multiple teams already created in Portainer
- Admin access to Portainer
- kubectl access for namespace management

## Architecture: Team-to-Namespace Mapping

```text
Portainer Team: backend-engineers
    → Kubernetes Namespace: backend
    → Portainer role: Standard User
    → Cannot see: frontend, operations, monitoring namespaces

Portainer Team: frontend-engineers
    → Kubernetes Namespace: frontend
    → Portainer role: Standard User

Portainer Team: platform-devops
    → All namespaces
    → Portainer role: Environment Administrator
```

## Step 1: Create Namespaces

```bash
# Create team-specific namespaces

kubectl create namespace backend
kubectl create namespace frontend
kubectl create namespace operations
kubectl create namespace monitoring
kubectl create namespace staging

# Apply labels for organization
kubectl label namespace backend team=backend env=production
kubectl label namespace frontend team=frontend env=production
kubectl label namespace staging env=staging
```

Or via Portainer UI:
1. Select your Kubernetes environment.
2. Go to **Namespaces** → **Add with form**.
3. Enter the namespace name.
4. Configure resource quotas if desired.

## Step 2: Assign Namespaces to Teams in Portainer

### Via Portainer UI

1. Go to **Namespaces** in your Kubernetes environment.
2. Click **Manage access** on the `backend` namespace row.
3. Select the team: `backend-engineers`
4. Click **Create access**.

Repeat for each namespace-team pair.

The team must already have access to the environment with an appropriate Portainer role, such as **Standard User**, **Read-Only User**, or **Namespace Operator**.

### Via Portainer API

```bash
PORTAINER_URL="https://portainer.example.com"
API_KEY="your-admin-api-key"
ENDPOINT_ID=1

# Grant backend team access to the backend namespace.
# The team must already have environment access.
BACKEND_TEAM_ID=$(curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/teams" | \
  jq -r '.[] | select(.Name == "backend-engineers") | .Id')

BACKEND_NAMESPACE_ID=$(curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/kubernetes/${ENDPOINT_ID}/namespaces?withResourceQuota=false&withUnhealthyEvents=false" | \
  jq -r '.[] | select(.Name == "backend") | .Id')

curl -s -o /dev/null -w "%{http_code}\n" -X PUT \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/pools/${BACKEND_NAMESPACE_ID}/access" \
  -d "{
    \"TeamsToAdd\": [${BACKEND_TEAM_ID}],
    \"TeamsToRemove\": [],
    \"UsersToAdd\": [],
    \"UsersToRemove\": []
  }"
```

## Step 3: Enable Namespace Isolation

Portainer enforces namespace visibility once Kubernetes RBAC is enabled and namespace access has been assigned. To stop standard users from also seeing the `default` namespace:

1. Go to **Cluster** → **Setup**.
2. Under **Security**, enable **Restrict access to the default namespace**.
3. Save.

After this:
- Backend team users see only the `backend` namespace
- Frontend team users see only the `frontend` namespace
- DevOps team (with environment admin) sees all namespaces

## Step 4: Kubernetes Network Policies for Hard Isolation

If your CNI plugin supports NetworkPolicy enforcement, add Kubernetes NetworkPolicies to prevent cross-namespace communication:

```yaml
# network-policy-isolate.yaml - Deny all cross-namespace traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace
  namespace: backend
spec:
  podSelector: {}  # Applies to all pods in this namespace
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector: {}          # Allow from same namespace
  egress:
    - to:
        - podSelector: {}          # Allow to same namespace
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system  # Allow DNS
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

```bash
# Apply to each team namespace
for NS in backend frontend operations; do
  sed "s/namespace: backend/namespace: $NS/" network-policy-isolate.yaml | \
    kubectl apply -f -
  echo "Applied isolation policy to namespace: $NS"
done
```

## Step 5: RBAC at the Kubernetes Level

Portainer works alongside Kubernetes RBAC. If you also need native Kubernetes RBAC outside Portainer, create namespace-scoped Roles and bind them to the relevant Kubernetes users, groups, or service accounts:

```yaml
# role-developer.yaml - Developer role for a namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: backend
# Namespace-scoped Role; does not grant cluster-scoped access such as nodes.
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]  # Can read but not create/delete secrets
```

## Step 6: View Access Configuration

```bash
# See what namespaces a user has access to (from their kubeconfig)
kubectl auth can-i list pods --all-namespaces  # Should be false for non-admin
kubectl auth can-i list pods -n backend         # Should be true for backend team

# Check RBAC bindings
kubectl get rolebindings -n backend
kubectl describe rolebinding -n backend

# Check namespace visibility from Portainer using the user's own API key
PORTAINER_URL="https://portainer.example.com"
ENDPOINT_ID=1
USER_API_KEY="api-key-for-a-backend-team-user"

curl -s -H "X-API-Key: $USER_API_KEY" \
  "${PORTAINER_URL}/api/kubernetes/${ENDPOINT_ID}/namespaces?withResourceQuota=false&withUnhealthyEvents=false" | \
  jq '.[].Name'
```

## Step 7: Namespace Provisioning Script

```bash
#!/bin/bash
# provision-team-namespace.sh

set -euo pipefail

TEAM_NAME=${1:-}
NAMESPACE_NAME=${2:-$TEAM_NAME}
PORTAINER_URL="https://portainer.example.com"
API_KEY="your-admin-api-key"
ENDPOINT_ID=1

if [ -z "$TEAM_NAME" ]; then
  echo "Usage: $0 <team-name> [namespace-name]"
  exit 1
fi

# Create namespace
kubectl create namespace "$NAMESPACE_NAME" --dry-run=client -o yaml | kubectl apply -f -

# Apply resource quota (4 CPU, 8GB memory for standard team)
cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: $NAMESPACE_NAME
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"
    pods: "20"
EOF

# Find Portainer team ID
TEAM_ID=$(curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/teams" | \
  jq -r --arg n "$TEAM_NAME" '.[] | select(.Name == $n) | .Id')

NAMESPACE_ID=$(curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/kubernetes/${ENDPOINT_ID}/namespaces?withResourceQuota=false&withUnhealthyEvents=false" | \
  jq -r --arg n "$NAMESPACE_NAME" '.[] | select(.Name == $n) | .Id')

if [ "$TEAM_ID" = "null" ] || [ "$NAMESPACE_ID" = "null" ]; then
  echo "Unable to find team $TEAM_NAME or namespace $NAMESPACE_NAME in Portainer"
  exit 1
fi

# Grant namespace access
curl -s -o /dev/null -X PUT -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/pools/${NAMESPACE_ID}/access" \
  -d "{\"TeamsToAdd\": [${TEAM_ID}], \"TeamsToRemove\": [], \"UsersToAdd\": [], \"UsersToRemove\": []}"

echo "Namespace $NAMESPACE_NAME provisioned for team $TEAM_NAME"
```

## Conclusion

Namespace-based segmentation in Portainer creates clear boundaries between teams, preventing accidental cross-team interference and enforcing the principle of least privilege. Map Portainer teams to Kubernetes namespaces, grant namespace access in Portainer, restrict access to the default namespace when needed, add Kubernetes NetworkPolicies for hard network isolation, and script namespace provisioning to ensure consistent configuration for every new team.
