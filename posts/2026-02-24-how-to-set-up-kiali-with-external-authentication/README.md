# How to Set Up Kiali with External Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kiali, Authentication, Security, OIDC, Service Mesh

Description: Configure Kiali to authenticate users through external providers like OIDC, OpenShift, and token-based authentication for production use.

---

By default, Kiali uses OpenShift OAuth on OpenShift clusters and Kubernetes service account token authentication on other Kubernetes clusters. That's fine for development, but for production you need real authentication. Kiali supports several external authentication strategies including OpenID Connect (OIDC), OpenShift OAuth, token-based auth, and header-based auth for reverse proxy setups.

This guide walks through setting up each strategy so you can secure your Kiali installation properly.

## Authentication Strategies Overview

Kiali supports these authentication strategies:

- **anonymous** - No authentication required. Anyone with network access can use Kiali.
- **token** - Users authenticate with a Kubernetes service account token.
- **openid** - Users authenticate through an OIDC provider (Keycloak, Okta, Auth0, Google, etc.).
- **openshift** - Uses OpenShift's built-in OAuth server.
- **header** - Uses a bearer token, or impersonation headers with an authorized bearer token, injected by a reverse proxy (like OAuth2 Proxy).

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

Create an OIDC client in your identity provider. If you want Kiali to enforce namespace access with Kubernetes RBAC, your Kubernetes API server also needs to trust the same OIDC issuer, and Kiali's `client_id` and `issuer_uri` must match that cluster OIDC configuration. You'll need:

- **Client ID**: A unique identifier (e.g., `kiali`)
- **Client Secret**: A secret for the client
- **Redirect URI**: `https://kiali.example.com/kiali` (your Kiali URL)

The exact steps depend on your provider. In Keycloak, for example, you'd create a new client under your realm with "Standard Flow" enabled.

### Step 2: Create a Secret for the Client Credentials

Store the OIDC client secret in a Kubernetes secret:

```bash
kubectl create secret generic kiali \
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
    cluster_wide_access: true
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
    web_port: "443"
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

Grant it the necessary permissions for the namespaces it should access. First create a ClusterRole that lets Kiali authorize namespace access:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kiali-namespace-authorization
rules:
  - apiGroups: [""]
    resources:
      - namespaces
      - pods/log
    verbs:
      - get
```

Then bind that role in each namespace the service account should see:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: kiali-user-binding
  namespace: my-app
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kiali-namespace-authorization
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

If you're running Kiali behind a reverse proxy that handles authentication and can inject a Kubernetes-recognized bearer token or impersonation headers (like OAuth2 Proxy, Authelia, or an identity-aware proxy), use the header strategy.

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
            - --cookie-secret=$(COOKIE_SECRET)
            - --email-domain=*
            - --upstream=http://kiali.istio-system:20001
            - --http-address=0.0.0.0:4180
            - --pass-user-headers=true
            - --pass-authorization-header=true
          env:
            - name: CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secret
                  key: client-secret
            - name: COOKIE_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secret
                  key: cookie-secret
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
```

Kiali's header strategy does not read an arbitrary username header. It expects the reverse proxy to send an `Authorization: Bearer TOKEN` header, where the token is recognized by the Kubernetes API server, or to send Kubernetes impersonation headers along with an authorized bearer token.

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

Regardless of which auth strategy you use, Kiali uses Kubernetes RBAC to determine which namespaces users can see. With strategies that support namespace access control, Kiali checks the authenticated user's Kubernetes permissions, or uses the token or impersonation headers provided by the reverse proxy.

This means users only see the namespaces they are authorized to access, while write operations still require the relevant Kubernetes RBAC permissions. To grant a user access to specific namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: kiali-viewer-binding
  namespace: my-app
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kiali-namespace-authorization
subjects:
  - kind: User
    name: "user@example.com"
    apiGroup: rbac.authorization.k8s.io
```

For read and write operations, create and bind a ClusterRole with the additional write privileges your users need. Kiali's documentation provides a `kiali-write-privileges` example that includes the Kubernetes and Istio resources Kiali can update.

## Troubleshooting Authentication Issues

**Redirect loop after login**: Check that `server.web_fqdn`, `server.web_port`, and `server.web_schema` match your actual Kiali URL. Mismatched URLs cause redirect loops.

**401 after OIDC login**: Verify the issuer URI matches exactly what your IdP expects. Trailing slashes matter.

**Header auth fails**: Make sure the reverse proxy is sending an `Authorization: Bearer TOKEN` header that the Kubernetes API server accepts, or valid impersonation headers with an authorized bearer token. Check with a curl request to the proxy.

**Token expires too quickly**: For token auth, generate tokens with longer durations using the `--duration` flag. For OIDC, check your IdP's token lifetime settings.

Getting authentication right is essential before exposing Kiali outside your cluster. Pick the strategy that matches your organization's identity infrastructure and test it thoroughly before going to production.
