# How to Set Up Kiali Authentication Methods

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kiali, Authentication, Security, Observability

Description: Configure authentication methods for Kiali in Istio including token, OpenID Connect, and anonymous access strategies.

---

Kiali is the observability console for Istio. It shows you the topology of your mesh, traffic flows, configuration health, and more. But out of the box, it's often deployed with minimal authentication, which is a security risk if anyone on your network can access it. You should configure proper authentication before exposing Kiali to your team.

## Kiali Authentication Options

Kiali supports several authentication strategies:

- **anonymous**: No authentication (not recommended for production)
- **token**: Kubernetes service account token
- **openid**: OpenID Connect (OIDC) integration with providers like Keycloak, Okta, or Google
- **header**: Custom header-based authentication (for use behind an authenticating reverse proxy)

## Installing Kiali

If you haven't deployed Kiali yet:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml
```

Check that it's running:

```bash
kubectl get pods -n istio-system -l app=kiali
```

Access it:

```bash
istioctl dashboard kiali
```

## Token-Based Authentication

Token authentication requires users to provide a Kubernetes service account token. This is the default for many Kiali installations and is a good balance between security and simplicity.

First, create a service account for Kiali users:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kiali-user
  namespace: istio-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kiali-viewer
rules:
  - apiGroups: [""]
    resources: ["namespaces", "pods", "replicationcontrollers", "services"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["networking.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["security.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
---
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

Configure Kiali to use token authentication:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kiali
  namespace: istio-system
data:
  config.yaml: |
    auth:
      strategy: token
    server:
      web_root: /kiali
    external_services:
      prometheus:
        url: http://prometheus.istio-system:9090
      grafana:
        url: http://grafana.istio-system:3000
      tracing:
        url: http://tracing.istio-system:80
```

Get the token for your service account:

```bash
# For Kubernetes 1.24+, create a token
kubectl create token kiali-user -n istio-system --duration=8760h
```

Users paste this token into the Kiali login screen to authenticate.

## OpenID Connect (OIDC) Authentication

OIDC is the best option for production because it integrates with your existing identity provider. Users log in with their corporate credentials.

Here is an example with Keycloak as the OIDC provider:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kiali
  namespace: istio-system
data:
  config.yaml: |
    auth:
      strategy: openid
      openid:
        client_id: kiali
        issuer_uri: https://keycloak.example.com/realms/istio
        scopes:
          - openid
          - email
        username_claim: preferred_username
    server:
      web_root: /kiali
      web_fqdn: kiali.example.com
      web_schema: https
    external_services:
      prometheus:
        url: http://prometheus.istio-system:9090
```

You also need to create a client in Keycloak:

1. Create a new client with Client ID `kiali`
2. Set the access type to `confidential`
3. Set the valid redirect URIs to `https://kiali.example.com/kiali/*`
4. Note the client secret

Then create a Kubernetes secret with the client secret:

```bash
kubectl create secret generic kiali-oidc \
  -n istio-system \
  --from-literal=oidc-secret=YOUR_CLIENT_SECRET
```

Update the Kiali config to reference the secret:

```yaml
    auth:
      strategy: openid
      openid:
        client_id: kiali
        client_secret: oidcSecret:kiali-oidc:oidc-secret
        issuer_uri: https://keycloak.example.com/realms/istio
```

### OIDC with Google

For Google as an OIDC provider:

```yaml
    auth:
      strategy: openid
      openid:
        client_id: YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
        issuer_uri: https://accounts.google.com
        scopes:
          - openid
          - email
        username_claim: email
        allowed_domains:
          - yourcompany.com
```

The `allowed_domains` field restricts access to users with email addresses from your company domain.

### OIDC with Okta

```yaml
    auth:
      strategy: openid
      openid:
        client_id: YOUR_OKTA_CLIENT_ID
        issuer_uri: https://yourcompany.okta.com/oauth2/default
        scopes:
          - openid
          - profile
          - email
        username_claim: email
```

## Header-Based Authentication

If Kiali sits behind a reverse proxy that handles authentication (like OAuth2 Proxy or Nginx with auth), use header-based auth:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kiali
  namespace: istio-system
data:
  config.yaml: |
    auth:
      strategy: header
      header:
        header_name: X-Forwarded-User
```

Set up an OAuth2 Proxy in front of Kiali:

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
            - --client-secret=YOUR_SECRET
            - --cookie-secret=RANDOM_SECRET
            - --upstream=http://kiali.istio-system:20001
            - --http-address=0.0.0.0:4180
            - --set-xauthrequest=true
            - --pass-user-headers=true
          ports:
            - containerPort: 4180
```

## Anonymous Access (Development Only)

For development or demo environments where security isn't a concern:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kiali
  namespace: istio-system
data:
  config.yaml: |
    auth:
      strategy: anonymous
    server:
      web_root: /kiali
```

Never use anonymous mode in production. Anyone who can reach the Kiali URL can see your entire mesh topology, traffic patterns, and configuration.

## Restricting Namespace Access

Regardless of the authentication method, you can restrict which namespaces a user can see. Use Kubernetes RBAC for this:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: kiali-namespace-viewer
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["pods", "services"]
    verbs: ["get", "list"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: kiali-user-production
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: kiali-namespace-viewer
subjects:
  - kind: ServiceAccount
    name: kiali-user
    namespace: istio-system
```

Kiali respects Kubernetes RBAC, so users only see namespaces and resources they have permission to access.

## Verifying Authentication

After configuring authentication, restart Kiali to pick up the new configuration:

```bash
kubectl rollout restart deployment kiali -n istio-system
```

Test by accessing the Kiali UI:

```bash
istioctl dashboard kiali
```

You should see the login screen for your chosen authentication method. Try logging in with valid and invalid credentials to confirm both acceptance and rejection work.

## Summary

Kiali supports multiple authentication strategies to fit different environments. Use token authentication for quick setups with service account tokens. Use OpenID Connect for production environments where you want integration with corporate identity providers like Keycloak, Okta, or Google. Use header-based auth when Kiali sits behind an authenticating reverse proxy. Combine any authentication strategy with Kubernetes RBAC to control namespace-level access.
