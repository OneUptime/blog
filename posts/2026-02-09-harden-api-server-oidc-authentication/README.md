# How to Harden the Kubernetes API Server with OIDC Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, OIDC

Description: Learn how to configure Kubernetes API server OIDC authentication for secure, centralized user management and eliminate the security risks of shared service account tokens.

---

Kubernetes service account tokens provide basic authentication but lack the security features of modern identity providers like multi-factor authentication, short-lived tokens, and centralized audit logging. OpenID Connect (OIDC) integration enables Kubernetes to delegate authentication to external identity providers like Google, Azure AD, or Okta, significantly improving security posture.

This guide demonstrates how to configure and harden Kubernetes API server authentication using OIDC.

## Understanding OIDC Authentication

OIDC is an identity layer on top of OAuth 2.0 that provides authentication services. When configured for Kubernetes:

1. Users authenticate with an identity provider (IdP)
2. IdP issues a JWT token containing user claims
3. Users present the token to Kubernetes API server
4. API server validates the token against IdP public keys
5. Kubernetes authorizes the request based on token claims

This eliminates shared credentials and enables centralized access control.

## Prerequisites

Ensure you have:

- Access to Kubernetes control plane nodes
- OIDC-compliant identity provider (Google, Azure AD, Okta, Keycloak)
- Ability to restart API servers
- Root or sudo access on control plane

## Configuring OIDC with Google

Set up Google as the OIDC provider.

Create OAuth credentials in Google Cloud Console:

```bash
# Go to: https://console.cloud.google.com/apis/credentials
# Create OAuth 2.0 Client ID
# Application type: Web application
# Authorized redirect URIs: http://localhost:8000 or your callback URL
```

Configure the API server:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
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
    - --oidc-client-id=<your-client-id>.apps.googleusercontent.com
    - --oidc-username-claim=email
    - --oidc-groups-claim=groups
    - --oidc-groups-prefix=google:
    # ... other flags ...
```

The API server will automatically restart after you save the file.

## Configuring OIDC with Azure AD

For Azure Active Directory:

```bash
# Register an application in Azure AD
az ad app create \
  --display-name kubernetes-oidc \
  --web-redirect-uris http://localhost:8000

# Get the application ID
APP_ID=$(az ad app list --display-name kubernetes-oidc --query '[0].appId' -o tsv)

# Get tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
```

Configure API server for Azure AD:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --oidc-issuer-url=https://login.microsoftonline.com/<tenant-id>/v2.0
    - --oidc-client-id=<app-id>
    - --oidc-username-claim=email
    - --oidc-username-prefix=azure:
    - --oidc-groups-claim=groups
    - --oidc-groups-prefix=azure:
    # ... other flags ...
```

## Configuring OIDC with Keycloak

For self-hosted Keycloak:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --oidc-issuer-url=https://keycloak.example.com/realms/kubernetes
    - --oidc-client-id=kubernetes
    - --oidc-username-claim=preferred_username
    - --oidc-groups-claim=groups
    - --oidc-ca-file=/etc/kubernetes/pki/keycloak-ca.crt
    # ... other flags ...
    volumeMounts:
    - name: keycloak-ca
      mountPath: /etc/kubernetes/pki/keycloak-ca.crt
      readOnly: true
  volumes:
  - name: keycloak-ca
    hostPath:
      path: /etc/kubernetes/pki/keycloak-ca.crt
      type: File
```

## Creating RBAC Bindings

Grant permissions to OIDC users:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oidc-admin-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: User
  name: google:admin@example.com
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers-binding
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: developer
subjects:
- kind: Group
  name: google:developers@example.com
  apiGroup: rbac.authorization.k8s.io
```

## Configuring kubectl

Users need to obtain OIDC tokens and configure kubectl:

```bash
# Install kubelogin plugin
kubectl krew install oidc-login

# Configure kubectl context
kubectl config set-credentials oidc-user \
  --exec-api-version=client.authentication.k8s.io/v1beta1 \
  --exec-command=kubectl \
  --exec-arg=oidc-login \
  --exec-arg=get-token \
  --exec-arg=--oidc-issuer-url=https://accounts.google.com \
  --exec-arg=--oidc-client-id=<client-id>.apps.googleusercontent.com \
  --exec-arg=--oidc-client-secret=<client-secret>

# Set context to use OIDC credentials
kubectl config set-context oidc-context \
  --cluster=my-cluster \
  --user=oidc-user

kubectl config use-context oidc-context
```

Test authentication:

```bash
kubectl get pods
# Browser will open for authentication
```

## Advanced OIDC Configuration

Enable additional security features:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --oidc-issuer-url=https://accounts.google.com
    - --oidc-client-id=<client-id>.apps.googleusercontent.com
    - --oidc-username-claim=email
    - --oidc-groups-claim=groups

    # Require specific claim values
    - --oidc-required-claim=hd=example.com

    # Sign token requests
    - --oidc-signing-algs=RS256,ES256

    # Use specific username prefix
    - --oidc-username-prefix=oidc:
    - --oidc-groups-prefix=oidc:
```

## Implementing MFA Requirements

Require multi-factor authentication via OIDC provider:

In Google Workspace:

```bash
# Enable 2FA requirement for the organization
# Go to: admin.google.com > Security > 2-Step Verification
# Enforce for all users
```

In Azure AD:

```bash
# Enable conditional access policy
az ad conditional-access policy create \
  --display-name "Require MFA for Kubernetes" \
  --state enabled \
  --conditions '{"applications":{"includeApplications":["<app-id>"]}}' \
  --grant-controls '{"builtInControls":["mfa"]}'
```

## Token Validation and Security

Ensure proper token validation:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver

    # CA bundle for OIDC issuer validation
    - --oidc-ca-file=/etc/kubernetes/pki/oidc-ca.crt

    # Skip insecure TLS (never use in production)
    # - --oidc-insecure-skip-verify=true  # DANGEROUS

    # Token expiry handling
    - --oidc-max-token-expiration=86400  # 24 hours max
```

## Monitoring OIDC Authentication

Track authentication events:

```yaml
# Enable audit logging for authentication events
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: RequestResponse
  resources:
  - group: "authentication.k8s.io"
    resources: ["tokenreviews"]
---
# Monitor failed authentications
apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-monitoring
data:
  query.promql: |
    # Failed OIDC authentications
    increase(apiserver_authentication_attempts_total{result="error"}[5m])

    # Successful OIDC authentications by user
    sum by (username) (increase(apiserver_authentication_attempts_total{result="success"}[1h]))
```

## Troubleshooting OIDC

Common issues and solutions:

```bash
# Check API server logs
kubectl logs -n kube-system kube-apiserver-<node>

# Test OIDC token manually
curl -H "Authorization: Bearer <oidc-token>" \
  https://api-server:6443/api/v1/namespaces

# Verify OIDC configuration
kubectl get --raw /api/v1 | jq '.serverAddressByClientCIDRs'

# Check certificate validation
openssl s_client -connect accounts.google.com:443 -showcerts
```

## Migration Strategy

Migrate from service accounts to OIDC gradually:

1. Configure OIDC authentication (authentication only, not authorization)
2. Create RBAC bindings for OIDC users
3. Test OIDC access in non-production
4. Gradually migrate users to OIDC
5. Revoke service account tokens for human users

```bash
# Audit current service account usage
kubectl get rolebindings,clusterrolebindings --all-namespaces \
  -o json | jq '.items[] | select(.subjects[]?.kind == "ServiceAccount")'
```

## Conclusion

Implementing OIDC authentication for the Kubernetes API server provides enterprise-grade security through centralized identity management, multi-factor authentication, and short-lived tokens. By delegating authentication to proven identity providers, you eliminate the security risks of long-lived service account tokens and gain comprehensive audit capabilities.

Configure OIDC with your organization's identity provider, create RBAC bindings for users and groups, enable MFA requirements, and monitor authentication events. Use OneUptime to track authentication failures and ensure continuous access to your Kubernetes clusters.
