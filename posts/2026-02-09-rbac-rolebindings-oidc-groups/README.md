# How to Implement RBAC RoleBindings with Group-Based Authentication from OIDC Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Authentication

Description: Implement Kubernetes RBAC RoleBindings that integrate with OIDC providers for group-based authentication, enabling centralized user management and dynamic permissions.

---

Group-based authentication from OIDC providers allows Kubernetes to use external identity systems like Azure AD, Okta, or Google Workspace for access control. Users authenticate through their identity provider, and Kubernetes maps their groups to RoleBindings. This eliminates manual user management in Kubernetes.

## Understanding OIDC Group Integration

OpenID Connect providers return user information including group memberships during authentication. Kubernetes extracts these groups and uses them in RBAC authorization decisions. When you bind roles to groups instead of individual users, permissions automatically update when users join or leave groups in your identity provider.

The Kubernetes API server validates JWT tokens from the OIDC provider and extracts the groups claim. These groups become subjects in RoleBindings and ClusterRoleBindings.

## Configuring API Server for OIDC

Configure the Kubernetes API server to use an OIDC provider.

```yaml
# kube-apiserver configuration
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --oidc-issuer-url=https://accounts.google.com
    - --oidc-client-id=kubernetes
    - --oidc-username-claim=email
    - --oidc-groups-claim=groups
    - --oidc-groups-prefix=oidc:
    # Additional API server flags...
```

For managed Kubernetes services, configuration varies.

```bash
# Azure AKS - OIDC is configured through Azure AD integration
az aks update -g myResourceGroup -n myAKSCluster \
  --enable-aad \
  --aad-admin-group-object-ids <group-id>

# GKE - Uses Google identity automatically
gcloud container clusters create my-cluster \
  --enable-cloud-logging \
  --enable-cloud-monitoring \
  --enable-autoscaling

# EKS - Configure OIDC identity provider
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --approve
```

## Creating Group-Based RoleBindings

Bind roles to groups from your identity provider.

```yaml
# rbac-developer-group.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers-binding
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: developer-role
subjects:
# Azure AD group
- kind: Group
  name: "oidc:developers@company.com"
  apiGroup: rbac.authorization.k8s.io
```

```yaml
# rbac-developer-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-role
  namespace: development
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
```

## Implementing Multi-Tier Access

Create different permission levels for different groups.

```yaml
# rbac-multi-tier.yaml
---
# Read-only access for all engineers
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: engineers-viewer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
- kind: Group
  name: "oidc:engineers@company.com"
  apiGroup: rbac.authorization.k8s.io
---
# Edit access for senior engineers in dev namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: senior-engineers-edit
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- kind: Group
  name: "oidc:senior-engineers@company.com"
  apiGroup: rbac.authorization.k8s.io
---
# Admin access for platform team in all namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: platform-team-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: Group
  name: "oidc:platform-team@company.com"
  apiGroup: rbac.authorization.k8s.io
```

## Configuring Azure AD Integration

Set up RBAC with Azure AD groups.

```yaml
# rbac-azure-ad.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: aks-admins
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: Group
  # Azure AD group object ID
  name: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: aks-developers
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- kind: Group
  # Another Azure AD group
  name: "ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj"
  apiGroup: rbac.authorization.k8s.io
```

Get Azure AD group object IDs.

```bash
# List Azure AD groups
az ad group list --query "[].{Name:displayName, ObjectId:objectId}" -o table

# Get specific group
az ad group show --group "Kubernetes Admins" --query objectId -o tsv
```

## Implementing Okta OIDC Integration

Configure Kubernetes to use Okta groups.

```yaml
# kube-apiserver-okta.yaml
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --oidc-issuer-url=https://company.okta.com
    - --oidc-client-id=0oa1234567890abcdef
    - --oidc-username-claim=email
    - --oidc-groups-claim=groups
    - --oidc-ca-file=/etc/kubernetes/okta-ca.pem
```

Create RoleBindings for Okta groups.

```yaml
# rbac-okta-groups.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: okta-developers
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: developer-access
subjects:
- kind: Group
  name: "Kubernetes-Developers"
  apiGroup: rbac.authorization.k8s.io
```

## Using Google Workspace Groups

Configure GKE with Google Groups.

```bash
# Enable Google Groups for RBAC
gcloud beta container clusters update my-cluster \
  --enable-google-groups-for-rbac \
  --security-group=gke-security-groups@company.com
```

Create group-based bindings.

```yaml
# rbac-google-groups.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: google-cluster-admins
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: Group
  name: "gke-admins@company.com"
  apiGroup: rbac.authorization.k8s.io
```

## Implementing Namespace-Scoped Group Access

Grant groups access to specific namespaces.

```yaml
# rbac-namespace-groups.yaml
---
# Team A access to namespace-a
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-access
  namespace: namespace-a
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- kind: Group
  name: "oidc:team-a@company.com"
  apiGroup: rbac.authorization.k8s.io
---
# Team B access to namespace-b
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-b-access
  namespace: namespace-b
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- kind: Group
  name: "oidc:team-b@company.com"
  apiGroup: rbac.authorization.k8s.io
---
# Cross-team read access
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cross-team-view
  namespace: shared
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
- kind: Group
  name: "oidc:team-a@company.com"
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: "oidc:team-b@company.com"
  apiGroup: rbac.authorization.k8s.io
```

## Testing Group-Based Access

Verify group membership and permissions.

```bash
# Get user's groups from OIDC token
kubectl config view --raw -o jsonpath='{.users[0].user.auth-provider.config.id-token}' | \
  cut -d '.' -f2 | base64 -d | jq .groups

# Test permission as user
kubectl auth can-i create deployment -n development --as=user@company.com

# Test permission for group
kubectl auth can-i create deployment -n development \
  --as-group=oidc:developers@company.com

# List all permissions for group
kubectl auth can-i --list --as-group=oidc:developers@company.com -n development
```

## Automating Group Synchronization

Create a controller that syncs OIDC groups to RoleBindings.

```yaml
# rbac-group-sync-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: group-sync-config
  namespace: kube-system
data:
  config.yaml: |
    groups:
      - name: "oidc:platform-team@company.com"
        clusterRole: cluster-admin
        type: ClusterRoleBinding

      - name: "oidc:developers@company.com"
        role: developer-role
        namespaces:
          - development
          - staging
        type: RoleBinding

      - name: "oidc:viewers@company.com"
        clusterRole: view
        type: ClusterRoleBinding
```

## Implementing Just-In-Time Access

Grant temporary group memberships for elevated access.

```yaml
# rbac-temporary-admin.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: temporary-admin-access
  annotations:
    expires: "2026-02-10T00:00:00Z"
    requester: "oncall-engineer@company.com"
    ticket: "INC-12345"
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: Group
  name: "oidc:oncall-rotation@company.com"
  apiGroup: rbac.authorization.k8s.io
```

Use a controller to automatically remove expired bindings.

## Auditing Group-Based Access

Monitor which groups have access to resources.

```bash
# List all group bindings
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.subjects[]?.kind=="Group") |
    {name: .metadata.name, groups: [.subjects[]?.name]}'

# List bindings for specific group
kubectl get rolebindings,clusterrolebindings --all-namespaces -o json | \
  jq -r '.items[] | select(.subjects[]?.name=="oidc:developers@company.com") |
    {namespace: .metadata.namespace, name: .metadata.name, role: .roleRef.name}'

# Check which users are in groups (requires OIDC provider API access)
# Implementation varies by provider
```

Group-based RBAC with OIDC providers centralizes access control and eliminates manual user management in Kubernetes. Configure your API server to trust your identity provider, create RoleBindings that reference groups, and let your identity system handle user membership. This approach scales better than individual user bindings and automatically reflects organizational changes.
