# How to Set Up Kiali with External Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kiali, Authentication, Security, OIDC, Service Mesh

Description: Configure Kiali to authenticate users through external providers like OIDC, OpenShift, and token-based authentication for production use.

---

By default, Kiali uses either anonymous access or a basic login token. That's fine for development, but for production you need real authentication. Kiali supports several external authentication strategies including OpenID Connect (OIDC), OpenShift OAuth, token-based auth, and header-based auth for reverse proxy setups.

This guide walks through setting up each strategy so you can secure your Kiali installation properly.

## Authentication Strategies Overview

Kiali supports these authentication strategies:

- **anonymous** - No authentication required. Anyone with network access can use Kiali.
- **token** - Users authenticate with a Kubernetes service account token.
- **openid** - Users authenticate through an OIDC provider (Keycloak, Okta, Auth0, Google, etc.).
- **openshift** - Uses OpenShift's built-in OAuth server.
- **header** - Trusts authentication headers set by a reverse proxy (like OAuth2 Proxy).

You set the strategy in the Kiali CR:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: "openid"
```

## Setting Up OIDC Authentication

OIDC is the most common choice for production Kiali deployments. It works with any OIDC-compliant identity provider.

### Step 1: Register Kiali with Your IdP

Create an OIDC client in your identity provider. You'll need:

- **Client ID**: A unique identifier (e.g., `kiali`)
- **Client Secret**: A secret for the client
- **Redirect URI**: `https://kiali.example.com/kiali` (your Kiali URL)

The exact steps depend on your provider. In Keycloak, for example, you'd create a new client under your realm with "Standard Flow" enabled.

### Step 2: Create a Secret for the Client Credentials

Store the OIDC client secret in a Kubernetes secret:

```bash
kubectl create secret generic kiali-oidc \
  --namespace istio-system \
  --from-literal=oidc-secret=your-client-secret-here
```

### Step 3: Configure Kiali CR

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: "openid"
    openid:
      client_id: "kiali"
      disable_rbac: false
      issuer_uri: "https://keycloak.example.com/realms/my-realm"
      scopes:
        - "openid"
        - "email"
      username_claim: "preferred_username"
  deployment:
    accessible_namespaces:
      - "**"
```

Apply this and wait for the Kiali pod to restart:

```bash
kubectl apply -f kiali-cr.yaml
kubectl rollout status deployment kiali -n istio-system
```

### Step 4: Test the Login

Open Kiali in your browser. You should be redirected to your identity provider's login page. After authenticating, you'll be redirected back to Kiali.

### OIDC with Keycloak Complete Example

Here's a full Keycloak setup:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: "openid"
    openid:
      client_id: "kiali"
      issuer_uri: "https://keycloak.example.com/realms/istio"
      scopes:
        - "openid"
        - "email"
        - "groups"
      username_claim: "preferred_username"
      additional_request_params:
        access_type: "offline"
  server:
    web_fqdn: "kiali.example.com"
    web_port: 443
    web_schema: "https"
    web_root: "/kiali"
```

The `server` section is important because Kiali needs to know its external URL to build correct redirect URIs.

## Setting Up Token Authentication

Token authentication is simpler than OIDC. Users provide a Kubernetes service account token to log in.

### Step 1: Configure the Auth Strategy

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: "token"
```

### Step 2: Create Service Accounts for Users

Create a service account for each user or team:

```bash
kubectl create serviceaccount kiali-user -n istio-system
```

Grant it the necessary permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kiali-user-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kiali-viewer
subjects:
  - kind: ServiceAccount
    name: kiali-user
    namespace: istio-system
```

### Step 3: Get the Token

```bash
kubectl create token kiali-user -n istio-system --duration=24h
```

Users paste this token into Kiali's login screen. The token determines what they can see and do in Kiali, based on their Kubernetes RBAC permissions.

## Setting Up Header-Based Authentication

If you're running Kiali behind a reverse proxy that handles authentication (like OAuth2 Proxy, Authelia, or an identity-aware proxy), use the header strategy.

### Step 1: Deploy OAuth2 Proxy

Here's an example using OAuth2 Proxy in front of Kiali:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: oauth2-proxy
  template:
    metadata:
      labels:
        app: oauth2-proxy
    spec:
      containers:
        - name: oauth2-proxy
          image: quay.io/oauth2-proxy/oauth2-proxy:v7.5.1
          args:
            - --provider=oidc
            - --oidc-issuer-url=https://keycloak.example.com/realms/istio
            - --client-id=kiali-proxy
            - --client-secret=$(CLIENT_SECRET)
            - --email-domain=*
            - --upstream=http://kiali.istio-system:20001
            - --http-address=0.0.0.0:4180
            - --pass-user-headers=true
            - --set-xauthrequest=true
          env:
            - name: CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secret
                  key: client-secret
          ports:
            - containerPort: 4180
```

### Step 2: Configure Kiali for Header Auth

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: "header"
    header:
      name: "X-Auth-Request-User"
```

Kiali trusts the `X-Auth-Request-User` header set by OAuth2 Proxy and uses its value as the authenticated username.

### Step 3: Route Traffic Through the Proxy

Create a Kubernetes Service for OAuth2 Proxy and point your Ingress/Gateway at it instead of directly at Kiali:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: oauth2-proxy
  namespace: istio-system
spec:
  selector:
    app: oauth2-proxy
  ports:
    - port: 4180
      targetPort: 4180
```

## RBAC with External Authentication

Regardless of which auth strategy you use, Kiali uses Kubernetes RBAC to determine what users can see. When RBAC is enabled (`disable_rbac: false`), Kiali impersonates the authenticated user when making Kubernetes API calls.

This means users only see the namespaces and resources they have access to in Kubernetes. To grant a user access to specific namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: kiali-viewer-binding
  namespace: my-app
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kiali-viewer
subjects:
  - kind: User
    name: "user@example.com"
    apiGroup: rbac.authorization.k8s.io
```

Kiali ships with two ClusterRoles:
- `kiali-viewer` - Read-only access
- `kiali` - Full access including configuration changes

## Troubleshooting Authentication Issues

**Redirect loop after login**: Check that `server.web_fqdn`, `server.web_port`, and `server.web_schema` match your actual Kiali URL. Mismatched URLs cause redirect loops.

**401 after OIDC login**: Verify the issuer URI matches exactly what your IdP expects. Trailing slashes matter.

**Header auth shows wrong user**: Make sure the reverse proxy is actually setting the header specified in `auth.header.name`. Check with a curl request to the proxy.

**Token expires too quickly**: For token auth, generate tokens with longer durations using the `--duration` flag. For OIDC, check your IdP's token lifetime settings.

Getting authentication right is essential before exposing Kiali outside your cluster. Pick the strategy that matches your organization's identity infrastructure and test it thoroughly before going to production.
