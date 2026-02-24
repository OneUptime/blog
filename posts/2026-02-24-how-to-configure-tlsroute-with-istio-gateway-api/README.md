# How to Configure TLSRoute with Istio Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, TLSRoute, TLS, Kubernetes

Description: Learn how to configure TLSRoute resources with Istio and the Kubernetes Gateway API for TLS passthrough routing based on SNI, including multi-backend setups and cross-namespace routing.

---

TLSRoute is a Kubernetes Gateway API resource designed for routing encrypted TLS traffic without terminating it at the gateway. Unlike HTTPS listeners that decrypt traffic, TLSRoute performs SNI-based routing - it reads the Server Name Indication from the TLS ClientHello message and forwards the encrypted connection to the appropriate backend. The backend service handles the actual TLS termination.

## When to Use TLSRoute

TLSRoute is the right choice when:

- Your backend services manage their own TLS certificates
- You need end-to-end encryption where the gateway never sees plaintext
- You're routing to services that require client certificate authentication (mTLS at the application level)
- Regulatory requirements dictate that TLS termination happens at the application, not the gateway

If you want the gateway to terminate TLS and forward plaintext HTTP to backends, use an HTTPS listener with HTTPRoute instead.

## Prerequisites

TLSRoute is part of the experimental Gateway API channel. Install the experimental CRDs:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/experimental-install.yaml
```

Verify the TLSRoute CRD is installed:

```bash
kubectl get crd tlsroutes.gateway.networking.k8s.io
```

## Setting Up the Gateway for TLS Passthrough

For TLSRoute to work, the Gateway listener must be configured with TLS passthrough mode:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: tls-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: tls-passthrough
    protocol: TLS
    port: 443
    tls:
      mode: Passthrough
    allowedRoutes:
      namespaces:
        from: Same
      kinds:
      - kind: TLSRoute
```

Key points:
- The `protocol` is `TLS` (not `HTTPS`)
- The `tls.mode` is `Passthrough` (not `Terminate`)
- No `certificateRefs` are needed since the gateway doesn't terminate TLS
- The `allowedRoutes.kinds` specifies that only TLSRoute resources can attach

## Basic TLSRoute

Route TLS traffic based on SNI hostname:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: backend-tls-route
  namespace: production
spec:
  parentRefs:
  - name: tls-gateway
  hostnames:
  - "api.example.com"
  rules:
  - backendRefs:
    - name: api-service
      port: 443
```

When a client connects to the gateway with SNI set to `api.example.com`, the encrypted traffic gets forwarded to `api-service` on port 443 without any decryption.

## Multi-Host TLS Routing

Route different hostnames to different backends:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: app-a-route
  namespace: production
spec:
  parentRefs:
  - name: tls-gateway
  hostnames:
  - "app-a.example.com"
  rules:
  - backendRefs:
    - name: app-a-service
      port: 443
---
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: app-b-route
  namespace: production
spec:
  parentRefs:
  - name: tls-gateway
  hostnames:
  - "app-b.example.com"
  rules:
  - backendRefs:
    - name: app-b-service
      port: 443
```

Each TLSRoute handles a different hostname. The gateway reads the SNI from the TLS handshake to decide which route to use.

## Wildcard Hostnames

You can use wildcard hostnames for sub-domain routing:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: wildcard-route
  namespace: production
spec:
  parentRefs:
  - name: tls-gateway
  hostnames:
  - "*.example.com"
  rules:
  - backendRefs:
    - name: wildcard-service
      port: 443
```

This catches any subdomain of example.com that doesn't match a more specific TLSRoute. More specific hostnames take precedence over wildcards, so `api.example.com` would match a specific route before falling back to `*.example.com`.

## Multiple Backend References

Distribute TLS traffic across multiple backends:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: distributed-tls-route
  namespace: production
spec:
  parentRefs:
  - name: tls-gateway
  hostnames:
  - "api.example.com"
  rules:
  - backendRefs:
    - name: api-primary
      port: 443
      weight: 80
    - name: api-secondary
      port: 443
      weight: 20
```

This sends 80% of connections to the primary backend and 20% to the secondary. Note that since this is TLS passthrough, the traffic is routed at the connection level, not the request level. Once a connection is established with a backend, all data on that connection goes to the same backend.

## Cross-Namespace TLS Routing

To route TLS traffic to services in other namespaces, you need both the Gateway to allow it and a ReferenceGrant in the target namespace:

Gateway allowing cross-namespace routes:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-tls-gateway
  namespace: istio-ingress
spec:
  gatewayClassName: istio
  listeners:
  - name: tls-passthrough
    protocol: TLS
    port: 443
    tls:
      mode: Passthrough
    allowedRoutes:
      namespaces:
        from: All
      kinds:
      - kind: TLSRoute
```

TLSRoute in a different namespace referencing the gateway and a backend:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: team-a-tls-route
  namespace: team-a
spec:
  parentRefs:
  - name: shared-tls-gateway
    namespace: istio-ingress
  hostnames:
  - "team-a.example.com"
  rules:
  - backendRefs:
    - name: team-a-service
      port: 443
```

If the TLSRoute references a backend in yet another namespace, a ReferenceGrant is needed:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-tls-from-team-a
  namespace: shared-services
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: TLSRoute
    namespace: team-a
  to:
  - group: ""
    kind: Service
```

## Combining TLS Passthrough and Termination

A single Gateway can have both passthrough and terminating listeners on different ports:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: hybrid-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: https-terminate
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: gateway-cert
    allowedRoutes:
      namespaces:
        from: Same
  - name: tls-passthrough
    protocol: TLS
    port: 8443
    tls:
      mode: Passthrough
    allowedRoutes:
      namespaces:
        from: Same
      kinds:
      - kind: TLSRoute
```

HTTPRoutes attach to the HTTPS terminating listener, and TLSRoutes attach to the TLS passthrough listener.

## Preparing Backend Services

Your backend services need to have their own TLS certificates configured since the gateway isn't terminating TLS. Here's an example of a Kubernetes deployment with TLS:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
      - name: api
        image: my-api:latest
        ports:
        - containerPort: 443
        volumeMounts:
        - name: tls-certs
          mountPath: /etc/tls
          readOnly: true
      volumes:
      - name: tls-certs
        secret:
          secretName: api-tls-cert
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
spec:
  selector:
    app: api-service
  ports:
  - port: 443
    targetPort: 443
    protocol: TCP
```

## Checking TLSRoute Status

```bash
kubectl get tlsroute -n production
kubectl get tlsroute backend-tls-route -n production -o yaml
```

Check the status conditions:

```yaml
status:
  parents:
  - parentRef:
      name: tls-gateway
    controllerName: istio.io/gateway-controller
    conditions:
    - type: Accepted
      status: "True"
    - type: ResolvedRefs
      status: "True"
```

## Debugging TLSRoute

Verify the gateway listener is configured for passthrough:

```bash
istioctl proxy-config listener deploy/tls-gateway-istio -n production -o json
```

Look for the TLS inspector filter and the SNI-based filter chain match. The listener should not have TLS termination configured.

Test the connection:

```bash
# Use openssl to verify SNI routing
openssl s_client -connect <gateway-ip>:443 -servername api.example.com
```

If the certificate returned belongs to your backend service (not the gateway), passthrough is working correctly.

Check Envoy stats for TLS connection metrics:

```bash
kubectl exec -it deploy/tls-gateway-istio -c istio-proxy -n production -- curl -s localhost:15000/stats | grep ssl
```

TLSRoute fills an important niche - it lets you route encrypted traffic without the gateway needing to know the encryption keys. For services that need true end-to-end encryption or that manage their own certificates, it's the right tool.
