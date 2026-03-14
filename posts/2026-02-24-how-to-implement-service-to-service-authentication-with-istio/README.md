# How to Implement Service-to-Service Authentication with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authentication, MTLS, Security, Kubernetes, Service Mesh

Description: A hands-on guide to implementing service-to-service authentication in Istio using mutual TLS, peer authentication policies, and authorization rules.

---

When services communicate inside a Kubernetes cluster, the traffic is unencrypted by default. Any pod in the cluster can potentially intercept or spoof requests to other services. That's a problem, especially when your services handle sensitive data like payment information or personal records.

Istio solves this with mutual TLS (mTLS) and identity-based authentication. Every service gets a cryptographic identity, and the mesh verifies both sides of every connection. No code changes required in your applications.

## Understanding Istio's Identity Model

Istio assigns each service a SPIFFE identity based on its Kubernetes service account. The format looks like this:

```text
spiffe://cluster.local/ns/<namespace>/sa/<service-account>
```

For example, a service running under the `order-service` service account in the `production` namespace gets the identity:

```text
spiffe://cluster.local/ns/production/sa/order-service
```

Istio's control plane (istiod) acts as the certificate authority. It generates X.509 certificates for each workload, rotates them automatically, and distributes them through the Envoy sidecars.

## Checking Current mTLS Status

Before making changes, check the current mTLS configuration in your cluster:

```bash
# Check mesh-wide peer authentication
kubectl get peerauthentication --all-namespaces

# Check if mTLS is working between services
istioctl x describe pod <pod-name> -n <namespace>
```

You can also check what Istio is actually doing at the proxy level:

```bash
istioctl proxy-config secret deploy/order-service -n default
```

This shows the certificates loaded by the sidecar proxy.

## Enabling Strict mTLS Mesh-Wide

The simplest approach is to enable strict mTLS across the entire mesh. Create a PeerAuthentication resource in the `istio-system` namespace:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

With strict mode, every service-to-service connection must use mTLS. Plaintext connections are rejected. This means:

- All traffic between sidecars is encrypted
- Both client and server verify each other's identity
- Services without sidecars cannot communicate with mesh services

Apply it:

```bash
kubectl apply -f mesh-peer-auth.yaml
```

## Gradual Rollout with PERMISSIVE Mode

If you can't switch everything to strict mTLS at once (maybe you have services that haven't been onboarded to the mesh yet), use PERMISSIVE mode:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

PERMISSIVE mode accepts both plaintext and mTLS connections. This lets you gradually add sidecars to services without breaking existing communication. Once all services are in the mesh, switch to STRICT.

## Namespace-Level mTLS

You can also control mTLS at the namespace level. This is useful when different teams manage different namespaces:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: staging
spec:
  mtls:
    mode: PERMISSIVE
```

Namespace-level policies override the mesh-wide policy. Service-level policies override namespace-level policies. So you have fine-grained control over which parts of your system require mutual authentication.

## Service-Level mTLS with Port Exceptions

Some services have specific ports that need to accept plaintext traffic (for example, health check endpoints from load balancers outside the mesh):

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: order-service-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: order-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: DISABLE
```

This keeps mTLS strict on all ports except 8081, where plaintext is allowed.

## Setting Up Authorization Policies

mTLS verifies identity, but it doesn't control who can call what. For that, you need AuthorizationPolicy resources. Here's how to restrict the order service so only specific services can access it:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: order-service-authz
  namespace: production
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - cluster.local/ns/production/sa/frontend
        - cluster.local/ns/production/sa/admin-dashboard
    to:
    - operation:
        methods:
        - GET
        - POST
        - PUT
  - from:
    - source:
        principals:
        - cluster.local/ns/production/sa/analytics-service
    to:
    - operation:
        methods:
        - GET
```

This policy says: the frontend and admin-dashboard can call GET, POST, and PUT on the order service. The analytics service can only call GET. Everything else is denied.

## Default Deny Policy

For maximum security, start with a default deny policy and then explicitly allow traffic:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}
```

An empty spec with no rules means deny everything. Then add ALLOW policies for each legitimate communication path:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-order
  namespace: production
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - cluster.local/ns/production/sa/frontend
```

## Debugging Authentication Issues

When mTLS or authorization blocks traffic, you'll see errors. Here's how to debug them:

```bash
# Check if mTLS is active between two pods
istioctl authn tls-check <pod-name> <destination-service>

# Look at Envoy logs for connection errors
kubectl logs deploy/order-service -c istio-proxy -n production | grep "403\|rbac"

# Check the authorization policy applied to a workload
istioctl x authz check <pod-name> -n production
```

Common issues include:

1. Service account mismatch - the calling service uses a different service account than what's in the authorization policy
2. Namespace mismatch - the principal includes the wrong namespace
3. Missing sidecar - a service without a sidecar can't participate in mTLS

## Certificate Rotation

Istio handles certificate rotation automatically. By default, workload certificates are valid for 24 hours and get rotated before expiry. You can customize this in the Istio mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: 12h
```

To verify certificates are being rotated:

```bash
istioctl proxy-config secret deploy/order-service -n production
```

This shows the certificate chain, expiration time, and when it was last updated.

## Creating Dedicated Service Accounts

For proper authentication, each service should have its own Kubernetes service account. Don't use the `default` service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: production
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  template:
    spec:
      serviceAccountName: order-service
      containers:
      - name: order-service
        image: myregistry/order-service:latest
```

This gives the order service a unique identity that you can reference in authorization policies.

## Monitoring Authentication

Istio exposes metrics that help you track authentication. The `istio_tcp_connections_closed_total` metric with the `connection_security_policy` label tells you whether connections are using mTLS:

```bash
# Check via Prometheus
istio_requests_total{connection_security_policy="mutual_tls"}
```

You can set up alerts for any plaintext connections when you expect all traffic to use mTLS. This catches misconfigurations early.

Service-to-service authentication with Istio gives you encryption, identity verification, and access control without touching your application code. Start with PERMISSIVE mode, verify everything works, then switch to STRICT. Add authorization policies to control which services can talk to each other, and use dedicated service accounts for each workload.
