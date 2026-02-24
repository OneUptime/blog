# How to Configure Backend TLS Policy with Gateway API in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, TLS, BackendTLSPolicy, Kubernetes, Security

Description: Learn how to configure BackendTLSPolicy with the Kubernetes Gateway API and Istio to secure connections between gateways and backend services with TLS verification and certificate validation.

---

When your gateway terminates TLS from external clients, the connection between the gateway and your backend services is typically plaintext HTTP (within the mesh, Istio's mTLS handles encryption). But sometimes you need the gateway to connect to backends over TLS too - maybe the backend is outside the mesh, requires its own TLS, or compliance rules mandate end-to-end TLS. BackendTLSPolicy is the Gateway API resource that configures how the gateway verifies and connects to TLS-enabled backends.

## What BackendTLSPolicy Does

BackendTLSPolicy tells the gateway:

- The backend expects TLS connections
- What hostname to use for SNI when connecting to the backend
- Which CA certificates to use for validating the backend's certificate

Without BackendTLSPolicy, the gateway connects to backends using whatever protocol the Service port implies. With it, the gateway establishes a TLS connection to the backend and validates its certificate.

## Prerequisites

BackendTLSPolicy is part of the experimental Gateway API channel:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/experimental-install.yaml
```

Verify:

```bash
kubectl get crd backendtlspolicies.gateway.networking.k8s.io
```

## Basic BackendTLSPolicy

Here's a basic setup where the gateway connects to a backend service over TLS:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha3
kind: BackendTLSPolicy
metadata:
  name: backend-tls
  namespace: production
spec:
  targetRefs:
  - group: ""
    kind: Service
    name: secure-backend
  validation:
    caCertificateRefs:
    - name: backend-ca-cert
      group: ""
      kind: ConfigMap
    hostname: secure-backend.production.svc.cluster.local
```

This policy tells the gateway to:
1. Use TLS when connecting to the `secure-backend` service
2. Validate the backend's certificate against the CA in the `backend-ca-cert` ConfigMap
3. Use `secure-backend.production.svc.cluster.local` as the SNI hostname

## Setting Up the CA Certificate

The CA certificate that signed your backend's TLS certificate needs to be available as a ConfigMap:

```bash
kubectl create configmap backend-ca-cert \
  --from-file=ca.crt=path/to/ca-certificate.pem \
  -n production
```

The ConfigMap must contain a `ca.crt` key with the PEM-encoded CA certificate.

## The Complete Setup

Here's all the pieces together - gateway, route, backend TLS policy, and backend service:

**Gateway:**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: web-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: gateway-cert
    allowedRoutes:
      namespaces:
        from: Same
```

**HTTPRoute:**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: secure-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: secure-backend
      port: 443
```

**BackendTLSPolicy:**

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha3
kind: BackendTLSPolicy
metadata:
  name: secure-backend-tls
  namespace: production
spec:
  targetRefs:
  - group: ""
    kind: Service
    name: secure-backend
  validation:
    caCertificateRefs:
    - name: backend-ca-cert
      group: ""
      kind: ConfigMap
    hostname: secure-backend.production.svc.cluster.local
```

**Backend Service and Deployment:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: secure-backend
  namespace: production
spec:
  selector:
    app: secure-backend
  ports:
  - port: 443
    targetPort: 8443
    protocol: TCP
    appProtocol: https
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-backend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-backend
  template:
    metadata:
      labels:
        app: secure-backend
    spec:
      containers:
      - name: app
        image: secure-backend:latest
        ports:
        - containerPort: 8443
        volumeMounts:
        - name: tls
          mountPath: /etc/tls
          readOnly: true
      volumes:
      - name: tls
        secret:
          secretName: backend-server-cert
```

**CA Certificate ConfigMap:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-ca-cert
  namespace: production
data:
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    MIIBdjCCAR2gAwIBAgIUK... (your CA certificate)
    -----END CERTIFICATE-----
```

## Traffic Flow

With this setup, the traffic flow is:

1. Client sends HTTPS request to the gateway
2. Gateway terminates TLS (using gateway-cert)
3. Gateway re-encrypts traffic with a new TLS connection to the backend (using BackendTLSPolicy)
4. Gateway validates the backend's certificate against the CA in backend-ca-cert
5. Backend receives TLS connection and processes the request

This is sometimes called "TLS re-encryption" or "TLS bridging."

## Using Well-Known CAs

If your backend uses a certificate from a well-known CA (like Let's Encrypt), you can reference the system trust bundle instead of providing a specific CA:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha3
kind: BackendTLSPolicy
metadata:
  name: public-backend-tls
  namespace: production
spec:
  targetRefs:
  - group: ""
    kind: Service
    name: external-api
  validation:
    wellKnownCACertificates: System
    hostname: api.external-service.com
```

The `wellKnownCACertificates: System` setting uses the system's trusted CA bundle, which includes certificates from well-known CAs.

## Multiple Backend Services

Apply BackendTLSPolicy to multiple services:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha3
kind: BackendTLSPolicy
metadata:
  name: payments-backend-tls
  namespace: production
spec:
  targetRefs:
  - group: ""
    kind: Service
    name: payment-processor
  validation:
    caCertificateRefs:
    - name: payment-ca-cert
      group: ""
      kind: ConfigMap
    hostname: payment-processor.internal
---
apiVersion: gateway.networking.k8s.io/v1alpha3
kind: BackendTLSPolicy
metadata:
  name: auth-backend-tls
  namespace: production
spec:
  targetRefs:
  - group: ""
    kind: Service
    name: auth-service
  validation:
    caCertificateRefs:
    - name: auth-ca-cert
      group: ""
      kind: ConfigMap
    hostname: auth.internal
```

Each service can have its own CA certificate and hostname for validation.

## BackendTLSPolicy with Istio mTLS

In an Istio mesh, sidecars already encrypt traffic between pods using mTLS. BackendTLSPolicy adds application-level TLS on top of that. This means traffic gets double-encrypted:

1. Istio mTLS between the gateway sidecar and the backend sidecar
2. Application-level TLS from the gateway to the backend application

This is typically unnecessary within the mesh. Use BackendTLSPolicy mainly for:
- Backends outside the mesh (no sidecar)
- Backends that require their own TLS for compliance
- External services accessed through ServiceEntry

If the backend is within the mesh and has a sidecar, you can skip BackendTLSPolicy and rely on Istio's mTLS.

## Interaction with DestinationRule

If you also have an Istio DestinationRule for the same service with TLS settings, be aware of how they interact:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: secure-backend
  namespace: production
spec:
  host: secure-backend.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: SIMPLE
      caCertificates: /etc/certs/ca.pem
```

When both BackendTLSPolicy and DestinationRule configure TLS, the Gateway API policy takes precedence for gateway-initiated connections. DestinationRule TLS settings apply to sidecar-to-sidecar communication.

## Checking BackendTLSPolicy Status

```bash
kubectl get backendtlspolicy -n production
kubectl get backendtlspolicy secure-backend-tls -n production -o yaml
```

The status section shows whether the policy was accepted:

```yaml
status:
  ancestors:
  - ancestorRef:
      name: web-gateway
      namespace: production
    controllerName: istio.io/gateway-controller
    conditions:
    - type: Accepted
      status: "True"
```

## Debugging Backend TLS Issues

**Connection refused or timeout to backend:**

Check that the backend is actually listening on TLS:

```bash
kubectl exec -it <pod-name> -n production -- openssl s_client -connect localhost:8443
```

**Certificate validation failures:**

Check the gateway's Envoy logs:

```bash
kubectl logs deploy/web-gateway-istio -c istio-proxy -n production | grep -i "tls\|ssl\|certificate"
```

Common causes:
- CA certificate doesn't match the backend's certificate chain
- Hostname in BackendTLSPolicy doesn't match the certificate's CN or SAN
- Expired certificates

**Verify the Envoy cluster configuration:**

```bash
istioctl proxy-config cluster deploy/web-gateway-istio -n production --fqdn secure-backend.production.svc.cluster.local -o json
```

Look for `transportSocket` with TLS configuration and `validationContext` with the CA certificate.

**Test the full chain:**

```bash
# From inside the gateway pod, test TLS to the backend
kubectl exec -it deploy/web-gateway-istio -c istio-proxy -n production -- \
  openssl s_client -connect secure-backend.production:443 -servername secure-backend.production.svc.cluster.local -CAfile /etc/ssl/certs/ca-certificates.crt
```

BackendTLSPolicy completes the end-to-end TLS picture in the Gateway API. Together with TLS termination on the listener side and Istio's mTLS for mesh traffic, you have full control over encryption at every hop in the request path.
