# How to Integrate Active Directory with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Active Directory, LDAP, Authentication, Kubernetes, Windows

Description: A complete guide to integrating Microsoft Active Directory with Talos Linux Kubernetes clusters for enterprise authentication and group-based access control.

---

Most enterprises run Microsoft Active Directory (AD) for user management. When those enterprises adopt Kubernetes on Talos Linux, they need their existing AD users and groups to work for cluster access. Nobody wants to maintain a separate set of credentials for Kubernetes. This guide shows you how to integrate Active Directory with your Talos Linux cluster so that AD users can authenticate using their corporate credentials and AD group memberships translate directly to Kubernetes RBAC permissions.

## Integration Architecture

There are two main approaches to integrating AD with Kubernetes on Talos Linux:

1. **Dex with LDAP connector** - Dex acts as an OIDC bridge between AD (via LDAP) and the Kubernetes API server
2. **AD Federation Services (ADFS) with OIDC** - If your organization runs ADFS, you can use it directly as an OIDC provider

This guide covers both approaches, starting with the more common Dex method.

## Prerequisites

Before starting, gather this information from your AD administrator:

- AD domain controller hostname and port (typically 636 for LDAPS)
- Base DN for user searches (e.g., `OU=Users,DC=company,DC=com`)
- Base DN for group searches (e.g., `OU=Groups,DC=company,DC=com`)
- A service account DN and password for LDAP binding
- The AD CA certificate (for LDAPS)

```bash
# Test connectivity to your AD domain controller
# Run this from a machine that can reach AD
openssl s_client -connect ad.company.com:636 < /dev/null 2>/dev/null | \
    openssl x509 -noout -subject -issuer
```

## Approach 1: Dex with LDAP Connector

### Step 1: Deploy Dex

Create the namespace and secrets:

```bash
# Create the namespace
kubectl create namespace dex

# Store the AD service account credentials
kubectl create secret generic ad-bind-credentials \
    -n dex \
    --from-literal=bindDN="CN=k8s-svc,OU=ServiceAccounts,DC=company,DC=com" \
    --from-literal=bindPW="service-account-password"

# Store the AD CA certificate
kubectl create secret generic ad-ca-cert \
    -n dex \
    --from-file=ca.crt=/path/to/ad-ca.crt
```

Create the Dex configuration that connects to AD:

```yaml
# dex-ad-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dex-config
  namespace: dex
data:
  config.yaml: |
    issuer: https://dex.company.com

    storage:
      type: kubernetes
      config:
        inCluster: true

    web:
      http: 0.0.0.0:5556

    oauth2:
      skipApprovalScreen: true

    connectors:
    - type: ldap
      id: active-directory
      name: "Corporate Active Directory"
      config:
        # AD connection settings
        host: ad.company.com:636
        insecureNoSSL: false
        insecureSkipVerify: false
        rootCA: /etc/dex/tls/ad-ca.crt

        # Service account for LDAP binding
        bindDN: "${AD_BIND_DN}"
        bindPW: "${AD_BIND_PW}"

        # User search configuration
        userSearch:
          # Where to look for users
          baseDN: OU=Users,DC=company,DC=com

          # Filter for user objects
          # This filter finds enabled user accounts
          filter: "(&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))"

          # AD attribute that matches the login username
          username: sAMAccountName

          # Unique identifier for the user
          idAttr: sAMAccountName

          # Email attribute
          emailAttr: userPrincipalName

          # Display name attribute
          nameAttr: displayName

        # Group search configuration
        groupSearch:
          baseDN: OU=Groups,DC=company,DC=com

          # Filter for security groups
          filter: "(objectClass=group)"

          # How to match users to groups
          userMatchers:
            - userAttr: DN
              groupAttr: member

          # Attribute to use as the group name
          nameAttr: cn

    staticClients:
    - id: kubernetes
      name: Kubernetes
      secret: kubernetes-dex-secret
      redirectURIs:
        - http://localhost:8000
        - http://localhost:18000
```

Deploy Dex:

```yaml
# dex-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dex
  namespace: dex
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dex
  template:
    metadata:
      labels:
        app: dex
    spec:
      containers:
      - name: dex
        image: ghcr.io/dexidp/dex:v2.39.0
        ports:
        - containerPort: 5556
        command: ["/usr/local/bin/dex", "serve", "/etc/dex/config.yaml"]
        env:
        - name: AD_BIND_DN
          valueFrom:
            secretKeyRef:
              name: ad-bind-credentials
              key: bindDN
        - name: AD_BIND_PW
          valueFrom:
            secretKeyRef:
              name: ad-bind-credentials
              key: bindPW
        volumeMounts:
        - name: config
          mountPath: /etc/dex
        - name: ad-ca
          mountPath: /etc/dex/tls
      volumes:
      - name: config
        configMap:
          name: dex-config
      - name: ad-ca
        secret:
          secretName: ad-ca-cert
---
apiVersion: v1
kind: Service
metadata:
  name: dex
  namespace: dex
spec:
  ports:
  - port: 5556
    targetPort: 5556
  selector:
    app: dex
```

```bash
kubectl apply -f dex-ad-config.yaml
kubectl apply -f dex-deployment.yaml
```

### Step 2: Configure the Talos API Server

Point the API server to Dex:

```yaml
# ad-oidc-patch.yaml
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: "https://dex.company.com"
      oidc-client-id: "kubernetes"
      oidc-username-claim: "email"
      oidc-username-prefix: "ad:"
      oidc-groups-claim: "groups"
      oidc-groups-prefix: "ad:"
```

```bash
talosctl patch machineconfig \
    --patch @ad-oidc-patch.yaml \
    -n 10.0.0.1

talosctl patch machineconfig \
    --patch @ad-oidc-patch.yaml \
    -n 10.0.0.2

talosctl patch machineconfig \
    --patch @ad-oidc-patch.yaml \
    -n 10.0.0.3
```

### Step 3: Map AD Groups to Kubernetes RBAC

Create RBAC rules that map AD groups to Kubernetes permissions:

```yaml
# ad-rbac-mappings.yaml

# Domain Admins get cluster-admin
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ad-domain-admins
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: Group
  name: "ad:Domain Admins"
  apiGroup: rbac.authorization.k8s.io

---
# K8s-Operators AD group gets admin access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ad-k8s-operators
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: admin
subjects:
- kind: Group
  name: "ad:K8s-Operators"
  apiGroup: rbac.authorization.k8s.io

---
# Developers AD group gets edit access in dev namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ad-developers-edit
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- kind: Group
  name: "ad:K8s-Developers"
  apiGroup: rbac.authorization.k8s.io

---
# QA team gets view access in staging
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ad-qa-view
  namespace: staging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
- kind: Group
  name: "ad:QA-Team"
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f ad-rbac-mappings.yaml
```

## Approach 2: Using ADFS Directly

If your organization runs AD Federation Services (ADFS), you can use it as an OIDC provider directly, without Dex.

### Step 1: Configure ADFS

In ADFS, create a new Application Group:

1. Add a new Server Application
2. Set the Redirect URI to `http://localhost:8000`
3. Generate a client secret
4. Configure claims to include UPN, groups, and email

### Step 2: Configure the API Server for ADFS

```yaml
# adfs-oidc-patch.yaml
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: "https://adfs.company.com/adfs"
      oidc-client-id: "kubernetes-client-id"
      oidc-username-claim: "upn"
      oidc-username-prefix: "ad:"
      oidc-groups-claim: "groups"
      oidc-groups-prefix: "ad:"
```

## Setting Up kubectl for AD Users

Distribute a kubeconfig that integrates with the authentication flow:

```yaml
# ad-kubeconfig.yaml
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://k8s-api.company.com:6443
    certificate-authority-data: <base64-ca>
  name: production
contexts:
- context:
    cluster: production
    user: ad-user
  name: production
current-context: production
users:
- name: ad-user
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: kubectl
      args:
      - oidc-login
      - get-token
      - --oidc-issuer-url=https://dex.company.com
      - --oidc-client-id=kubernetes
      - --oidc-client-secret=kubernetes-dex-secret
      - --oidc-extra-scope=groups
      - --oidc-extra-scope=email
```

## Handling Nested AD Groups

Active Directory supports nested groups (groups within groups). By default, LDAP searches may not resolve nested memberships. To handle this, use the `LDAP_MATCHING_RULE_IN_CHAIN` OID in your group filter:

```yaml
groupSearch:
  baseDN: OU=Groups,DC=company,DC=com
  filter: "(objectClass=group)"
  userMatchers:
    - userAttr: DN
      groupAttr: "member:1.2.840.113556.1.4.1941:"
  nameAttr: cn
```

The OID `1.2.840.113556.1.4.1941` tells AD to recursively resolve group memberships.

## Troubleshooting AD Integration

```bash
# Test LDAP connectivity from inside the cluster
kubectl run ldap-test --image=bitnami/openldap --restart=Never -- \
    ldapsearch -x -H ldaps://ad.company.com:636 \
    -D "CN=k8s-svc,OU=ServiceAccounts,DC=company,DC=com" \
    -w "password" \
    -b "OU=Users,DC=company,DC=com" \
    "(sAMAccountName=testuser)" \
    sAMAccountName userPrincipalName memberOf

# Check Dex logs
kubectl logs -n dex -l app=dex | grep -i "error\|failed\|ldap"

# Check API server for OIDC issues
talosctl logs kube-apiserver -n 10.0.0.1 | grep -i "oidc\|token"
```

## Conclusion

Integrating Active Directory with Talos Linux Kubernetes clusters bridges the gap between enterprise identity management and container orchestration. The Dex-based approach is the most flexible, supporting both LDAP and SAML connections to AD, while the ADFS approach is simpler if you already have Federation Services running. Once configured, users log in with their AD credentials, and their group memberships automatically map to Kubernetes RBAC permissions. This means onboarding and offboarding happen through your existing AD processes, and there are no Kubernetes-specific credentials to manage.
