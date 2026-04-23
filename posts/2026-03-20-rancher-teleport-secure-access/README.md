# How to Configure Rancher with Teleport for Secure Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Teleport, Secure-access, Kubernetes, Zero-trust, PAM

Description: A guide to integrating Rancher with Teleport for zero-trust privileged access management, covering Kubernetes access, audit trails, and role-based access via Teleport.

## Overview

Teleport is an open-source privileged access management (PAM) platform that provides secure, audited access to Kubernetes clusters, SSH servers, databases, and web applications. Integrating Teleport with Rancher provides zero-trust access to Kubernetes clusters with full session recording, certificate-based authentication, and per-request authorization. This guide covers the integration setup.

## Architecture

```text
Developer/Operator
      |
   [MFA Authentication]
      |
   Teleport Proxy (public)
      |
   [Teleport Auth Server]
      |
   Teleport Kubernetes Agent (in each cluster)
      |
   Kubernetes API Server (via Rancher-managed cluster)
```

## Prerequisites

- Teleport v14+ (open source or enterprise)
- Rancher v2.7+ with managed Kubernetes clusters
- Valid TLS certificates for Teleport
- If you plan to use the same SSO provider as Rancher, configure a Teleport auth connector (GitHub in open source; OIDC/SAML in Teleport Enterprise)

## Step 1: Install Teleport Auth and Proxy

```yaml
# Teleport Helm values (teleport-cluster)
clusterName: "teleport.company.com"
# enterprise: true   # Required if you plan to use OIDC/SAML connectors
proxyListenerMode: separate

publicAddr:
  - "teleport.company.com:443"
kubePublicAddr:
  - "teleport.company.com:3026"

authentication:
  type: github   # or oidc, saml in Teleport Enterprise
  connectorName: github   # must match your auth connector name
```

```bash
# Install Teleport Cluster
helm repo add teleport https://charts.releases.teleport.dev
helm repo update
helm install teleport-cluster teleport/teleport-cluster \
  --namespace teleport \
  --create-namespace \
  --values teleport-values.yaml
```

## Step 2: Configure Teleport Kubernetes Access

### Connect Rancher-Managed Clusters to Teleport

Deploy the Teleport Kubernetes agent on each Rancher-managed cluster:

```yaml
# teleport-agent-values.yaml
roles: kube
kubeClusterName: "prod-us-east-01"

authToken: "replace-with-join-token"
proxyAddr: "teleport.company.com:443"

# Teleport labels used for RBAC
labels:
  env: production
  cluster: prod-us-east-01
  managed-by: rancher
```

```bash
# Generate a join token for the agent
tctl tokens add --type=kube --ttl=1h --format=text

# Install Teleport agent on each Rancher cluster
helm install teleport-agent teleport/teleport-kube-agent \
  --namespace teleport \
  --create-namespace \
  --values teleport-agent-values.yaml
```

## Step 3: Create Teleport Kubernetes Roles

```yaml
# Teleport role for developers - limited access
kind: role
version: v7
metadata:
  name: k8s-developer
spec:
  allow:
    kubernetes_labels:
      env: ["staging", "development"]
    kubernetes_groups:
      - developers
    kubernetes_resources:
      - kind: pod
        name: "*"
        namespace: "*"
        verbs:
          - get
          - list
          - watch
      - kind: pod
        name: "*"
        namespace: "*"
        verbs:
          - exec    # Allow exec for debugging
  options:
    max_session_ttl: 8h
    require_session_mfa: "hardware_key"
---
# Teleport role for cluster admins
kind: role
version: v7
metadata:
  name: k8s-admin
spec:
  allow:
    kubernetes_labels:
      "*": "*"    # Access all clusters
    kubernetes_groups:
      - system:masters
    kubernetes_resources:
      - kind: "*"
        name: "*"
        namespace: "*"
        verbs: ["*"]
  options:
    max_session_ttl: 4h
    require_session_mfa: "hardware_key"
```

## Step 4: Configure RBAC in Kubernetes

Map Teleport groups to Kubernetes RBAC:

```yaml
# ClusterRoleBinding: Map Teleport "developers" group to k8s role
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: teleport-developers
subjects:
  - kind: Group
    name: developers    # Matches kubernetes_groups in Teleport role
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: view
  apiGroup: rbac.authorization.k8s.io
---
# Custom ClusterRole allowing kubectl exec
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: exec-pods
rules:
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]
---
# Allow pod exec for developers in specific namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: teleport-dev-exec
  namespace: development
subjects:
  - kind: Group
    name: developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: exec-pods    # Custom role allowing pod/exec
  apiGroup: rbac.authorization.k8s.io
```

## Step 5: Configure Session Recording

```yaml
# Teleport Helm values - enable session recording
sessionRecording: proxy   # or proxy-sync if you want synchronous uploads
```

## Step 6: Access Clusters via Teleport

```bash
# Developer workflow: Access a staging cluster
# Step 1: Login to Teleport with MFA
tsh login --proxy=teleport.company.com

# Step 2: List available clusters
tsh kube ls
# Output:
# Kube Cluster Name        Labels                  Selected
# ------------------------ ----------------------- --------
# staging-us-east-01       env=staging              -
# development-01           env=development          -

# Step 3: Switch to a cluster
tsh kube login staging-us-east-01

# Step 4: Use kubectl normally - all commands are audited
kubectl get pods -n development

# Step 5: Session recording - all output is recorded
kubectl exec -it -n development pod/my-app-xxx -- /bin/bash
```

## Step 7: Integration with Rancher SSO

You can configure Teleport Enterprise to use the same identity provider as Rancher:

```yaml
# oidc-connector.yaml - OIDC connector for the same IdP as Rancher SSO
kind: oidc
version: v3
metadata:
  name: entra-id
spec:
  display: Microsoft Entra ID (same as Rancher SSO)
  redirect_url: https://teleport.company.com:443/v1/webapi/oidc/callback
  client_id: "<ENTRA_APP_CLIENT_ID>"
  client_secret: "<ENTRA_APP_CLIENT_SECRET>"
  issuer_url: "https://login.microsoftonline.com/<TENANT_ID>/v2.0"

  scope: ["openid", "email", "profile"]

  claims_to_roles:
    - claim: groups
      value: "<K8S_ADMINS_GROUP_OBJECT_ID>"
      roles: ["k8s-admin"]
    - claim: groups
      value: "<K8S_DEVELOPERS_GROUP_OBJECT_ID>"
      roles: ["k8s-developer"]
```

## Step 8: Audit and Compliance

Teleport records all Kubernetes API calls and shell sessions:

```bash
# View audit events for a user
tctl audit query exec \
  "select time, user, verb, cluster_name from kube_request where user = 'jane.doe' limit 50"

# List recorded shell sessions for a compliance window
tctl recordings ls \
  --from-utc=2026-03-01 \
  --to-utc=2026-03-19

# Download a specific session recording for review
tctl recordings download <session-id>
```

## Conclusion

Integrating Rancher with Teleport provides a zero-trust access layer over your Kubernetes clusters. Every access request requires authentication with MFA, all sessions are recorded for audit purposes, and access is scoped by roles that align with your identity provider's groups. This combination is particularly valuable for compliance-heavy environments (SOC 2, PCI DSS, HIPAA) that require detailed access logs and session recordings for every privileged operation.
