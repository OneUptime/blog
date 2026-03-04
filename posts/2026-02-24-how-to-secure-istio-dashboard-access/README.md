# How to Secure Istio Dashboard Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Dashboards, Security, Kiali, Grafana, Authentication

Description: How to secure access to Istio dashboards like Kiali, Grafana, Prometheus, and Jaeger with authentication, authorization, and network controls.

---

Istio comes with several dashboards - Kiali for mesh visualization, Grafana for metrics, Prometheus for time-series data, and Jaeger or Zipkin for distributed tracing. Out of the box, these dashboards often have minimal authentication. In a production environment, leaving dashboards exposed without proper security is asking for trouble. Anyone who can reach the dashboard can see your entire service topology, traffic patterns, and potentially sensitive data in traces.

## The Risk of Unsecured Dashboards

An unsecured Kiali dashboard reveals:
- Complete service dependency map
- Request rates and error rates for every service
- mTLS status (showing which services are vulnerable)
- Istio configuration details (authorization policies, routing rules)

An unsecured Grafana instance shows:
- Detailed metrics for every service
- Resource utilization patterns
- Performance characteristics that could inform an attack

An unsecured Jaeger instance might expose:
- Request headers (potentially including tokens)
- Request/response payloads in traces
- Internal service endpoints and API structures

## Step 1: Restrict Network Access

The first line of defense is making sure dashboards are not exposed to the internet. By default, Istio addon dashboards are only accessible within the cluster via ClusterIP services.

Verify your dashboard services are not exposed:

```bash
kubectl get svc -n istio-system | grep -E "kiali|grafana|prometheus|jaeger"
```

They should all be ClusterIP type, not LoadBalancer or NodePort.

If someone has created an Ingress or Gateway for a dashboard, evaluate whether it is necessary. If it is, add authentication.

## Step 2: Secure Kiali

Kiali supports several authentication strategies. The recommended approach for production is OpenID Connect (OIDC).

### Configure Kiali with OIDC

Edit the Kiali configuration:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: openid
    openid:
      client_id: "kiali-client"
      disable_rbac: false
      issuer_uri: "https://auth.example.com"
      scopes:
        - openid
        - profile
        - email
      username_claim: "email"
```

This requires users to authenticate through your OIDC provider (like Keycloak, Okta, or Auth0) before accessing Kiali.

### Kiali RBAC

Kiali supports role-based access control that maps to your OIDC claims:

```yaml
spec:
  auth:
    openid:
      role_claim: "groups"
      role_mapping:
        admin:
          - "platform-team"
        viewer:
          - "developers"
          - "sre-team"
```

This gives the platform team full admin access while developers and SREs get read-only access.

### Alternative: Token-Based Authentication

If OIDC is not available, use token-based authentication:

```yaml
spec:
  auth:
    strategy: token
```

Users must provide a Kubernetes service account token to log in. Create a service account for dashboard access:

```bash
kubectl create serviceaccount kiali-user -n istio-system

kubectl create clusterrolebinding kiali-user-binding \
  --clusterrole=kiali-viewer \
  --serviceaccount=istio-system:kiali-user
```

Generate a token:

```bash
kubectl create token kiali-user -n istio-system --duration=8h
```

## Step 3: Secure Grafana

Grafana has built-in authentication that should be enabled for production.

### Enable Grafana Authentication

Update the Grafana deployment or Helm values:

```yaml
# grafana.ini configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-config
  namespace: istio-system
data:
  grafana.ini: |
    [auth]
    disable_login_form = false

    [auth.generic_oauth]
    enabled = true
    name = OAuth
    client_id = grafana-client
    client_secret = your-client-secret
    scopes = openid profile email
    auth_url = https://auth.example.com/authorize
    token_url = https://auth.example.com/token
    api_url = https://auth.example.com/userinfo
    role_attribute_path = contains(groups[*], 'admin') && 'Admin' || 'Viewer'

    [security]
    admin_user = admin
    admin_password = change-this-password
    disable_gravatar = true

    [users]
    allow_sign_up = false
```

### Disable Anonymous Access

Make sure anonymous access is disabled:

```yaml
[auth.anonymous]
enabled = false
```

## Step 4: Secure Prometheus

Prometheus does not have built-in authentication. You need to add it externally.

### Use OAuth2 Proxy

Deploy an OAuth2 proxy in front of Prometheus:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus-auth-proxy
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus-auth-proxy
  template:
    metadata:
      labels:
        app: prometheus-auth-proxy
    spec:
      containers:
        - name: oauth2-proxy
          image: quay.io/oauth2-proxy/oauth2-proxy:latest
          args:
            - --provider=oidc
            - --oidc-issuer-url=https://auth.example.com
            - --client-id=prometheus-client
            - --client-secret=$(CLIENT_SECRET)
            - --upstream=http://prometheus.istio-system.svc:9090
            - --http-address=0.0.0.0:4180
            - --cookie-secret=$(COOKIE_SECRET)
            - --email-domain=example.com
          env:
            - name: CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secrets
                  key: client-secret
            - name: COOKIE_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secrets
                  key: cookie-secret
          ports:
            - containerPort: 4180
```

## Step 5: Secure Jaeger/Tracing

Jaeger traces can contain sensitive information. Apply the same OAuth2 proxy pattern or use Jaeger's built-in authentication if available.

For Jaeger with OIDC:

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
  namespace: istio-system
spec:
  ingress:
    security: oauth-proxy
    openshift:
      sar: '{"namespace": "istio-system", "resource": "pods", "verb": "get"}'
```

## Step 6: Expose Dashboards Securely Through Istio Gateway

If you need to expose dashboards externally, route them through the Istio ingress gateway with proper TLS and authentication:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: dashboard-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: dashboard-tls
      hosts:
        - "kiali.internal.example.com"
        - "grafana.internal.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: kiali-vs
  namespace: istio-system
spec:
  hosts:
    - "kiali.internal.example.com"
  gateways:
    - dashboard-gateway
  http:
    - route:
        - destination:
            host: kiali
            port:
              number: 20001
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grafana-vs
  namespace: istio-system
spec:
  hosts:
    - "grafana.internal.example.com"
  gateways:
    - dashboard-gateway
  http:
    - route:
        - destination:
            host: grafana
            port:
              number: 3000
```

Add an authorization policy to restrict dashboard access to specific users or networks:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: dashboard-access
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  rules:
    - from:
        - source:
            ipBlocks: ["10.0.0.0/8", "172.16.0.0/12"]
      to:
        - operation:
            hosts:
              - "kiali.internal.example.com"
              - "grafana.internal.example.com"
```

This restricts dashboard access to internal IP ranges.

## Step 7: Use kubectl Port-Forward for Development

For day-to-day access during development, use port-forwarding instead of exposing dashboards:

```bash
# Kiali
kubectl port-forward svc/kiali -n istio-system 20001:20001

# Grafana
kubectl port-forward svc/grafana -n istio-system 3000:3000

# Prometheus
kubectl port-forward svc/prometheus -n istio-system 9090:9090

# Jaeger
kubectl port-forward svc/jaeger-query -n istio-system 16686:16686
```

This requires kubectl access with appropriate RBAC, which provides an implicit authentication layer.

## Monitoring Dashboard Access

Set up alerting for unusual dashboard access patterns:

```bash
# Monitor access logs on the dashboard gateway
kubectl logs -l istio=ingressgateway -n istio-system | \
  grep -E "kiali|grafana|prometheus|jaeger"
```

Track login attempts in Kiali and Grafana audit logs. Failed authentication attempts could indicate an attack.

Securing dashboards might seem like a low priority compared to securing the data plane, but dashboards provide a map of your entire infrastructure. An attacker with dashboard access knows exactly how your services connect, where the weak points are, and what to target. Lock them down as seriously as you would any other production system.
