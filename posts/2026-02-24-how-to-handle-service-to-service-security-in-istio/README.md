# How to Handle Service-to-Service Security in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Service Security, Zero Trust, Kubernetes, Authorization

Description: How to secure service-to-service communication in Istio with mutual TLS, authorization policies, and identity-based access control.

---

In a microservices architecture, the majority of traffic is service-to-service (east-west) communication within the cluster. Securing this internal traffic is where Istio provides the most value. Without a service mesh, internal communication is typically unencrypted and unauthenticated. Any pod in the cluster can impersonate any other service just by sending traffic to the right endpoint.

Istio changes this by providing mutual TLS between all services, cryptographic identity verification, and fine-grained authorization policies. Each service gets a verifiable identity, and you can control exactly which services can communicate with each other.

## Mutual TLS Fundamentals

When Istio injects a sidecar into your pod, it also provisions a certificate for that workload. The certificate contains a SPIFFE identity that looks like:

```text
spiffe://cluster.local/ns/<namespace>/sa/<service-account>
```

For example, a pod running with the `order-service` service account in the `production` namespace gets:

```text
spiffe://cluster.local/ns/production/sa/order-service
```

When two services communicate, their sidecars perform a mutual TLS handshake. Both sides present their certificates, and both sides verify the other's identity. This happens transparently - the application code doesn't need to handle any TLS.

## Enforcing Strict mTLS

Enable strict mTLS at the mesh level to ensure all service communication is encrypted and authenticated:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Applying this in the `istio-system` namespace makes it a mesh-wide default. Every service must use mTLS, and plain-text connections are rejected.

If you have services that haven't been onboarded to the mesh yet, start with `PERMISSIVE` mode:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

In `PERMISSIVE` mode, the sidecar accepts both mTLS and plain-text connections. This is a transition state. Once all services have sidecars, switch to `STRICT`.

## Service Account Best Practices

Istio's identity model is based on Kubernetes service accounts. By default, all pods in a namespace use the `default` service account, which means they all share the same identity. This undermines the security model because you can't distinguish between services in authorization policies.

Create a dedicated service account for each service:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payment-service
  namespace: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: inventory-service
  namespace: production
```

Reference them in your deployments:

```yaml
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
          image: order-service:latest
```

Now each service has a unique SPIFFE identity, and you can write precise authorization policies.

## Authorization Policies for Service Communication

Define which services can talk to each other:

```yaml
# Order service can call payment and inventory
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/order-service
      to:
        - operation:
            methods:
              - POST
            paths:
              - /api/v1/payments
              - /api/v1/refunds
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: inventory-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: inventory-service
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/order-service
      to:
        - operation:
            methods:
              - GET
              - PUT
            paths:
              - /api/v1/inventory/*
```

The payment service only accepts POST requests from the order service on specific paths. The inventory service only accepts GET and PUT requests from the order service. Any other service trying to reach these endpoints gets denied.

## Multi-Method Authorization

Some services need to support multiple callers with different permissions:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: user-service-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: user-service
  rules:
    # API gateway can read user profiles
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/api-gateway
      to:
        - operation:
            methods:
              - GET
            paths:
              - /api/v1/users/*
    # Admin service can read and modify users
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/admin-service
      to:
        - operation:
            methods:
              - GET
              - POST
              - PUT
              - DELETE
            paths:
              - /api/v1/users/*
    # Analytics service can only read aggregated data
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/analytics-service
      to:
        - operation:
            methods:
              - GET
            paths:
              - /api/v1/users/stats
```

Each caller has different access levels based on their identity.

## Verifying mTLS is Active

Check that mTLS is working between services:

```bash
# Check the mTLS status between services
istioctl x describe pod <pod-name> -n production
```

The output shows whether mTLS is active for each connection.

Check the certificate details:

```bash
istioctl proxy-config secret <pod-name> -n production
```

This shows the certificate's SPIFFE identity, expiration, and trust domain.

You can also check from the Envoy side:

```bash
kubectl exec -it <pod-name> -c istio-proxy -n production -- \
  pilot-agent request GET stats | grep "ssl.handshake"
```

A non-zero `ssl.handshake` count confirms mTLS connections are happening.

## Handling Services Without Sidecars

Not all services in your cluster will have Istio sidecars. External controllers, some infrastructure components, and legacy services might run without sidecars. These services can't participate in mTLS.

For services that need to accept traffic from non-mesh sources:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: allow-legacy
  namespace: production
spec:
  selector:
    matchLabels:
      app: legacy-compatible-service
  mtls:
    mode: PERMISSIVE
```

For authorization, you can match on IP blocks for non-mesh sources:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-legacy-callers
  namespace: production
spec:
  selector:
    matchLabels:
      app: legacy-compatible-service
  rules:
    # Allow mesh traffic based on identity
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/frontend
    # Allow specific non-mesh IPs
    - from:
        - source:
            ipBlocks:
              - 10.244.0.0/16
```

## Certificate Rotation

Istio automatically rotates workload certificates. The default certificate lifetime is 24 hours, and certificates are rotated well before they expire. This happens without any downtime.

You can adjust the certificate lifetime through the mesh configuration:

```yaml
meshConfig:
  defaultConfig:
    proxyMetadata:
      SECRET_TTL: 12h
```

Shorter lifetimes reduce the window of exposure if a certificate is compromised, but increase the load on the certificate authority (istiod).

## Auditing Service-to-Service Communication

Enable access logging to audit all service communication:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
```

The access logs include the source and destination identities, making it easy to see which services are communicating.

Check the logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n production --tail=20
```

Each log entry includes fields like `upstream_peer_identity` and `downstream_peer_identity` that show the SPIFFE identities of the communicating services.

Service-to-service security in Istio is built on three pillars: mutual TLS for encryption and authentication, service accounts for identity, and authorization policies for access control. Use dedicated service accounts for each service, enforce strict mTLS, and write explicit authorization policies that follow the principle of least privilege. This gives you a true zero-trust network inside your cluster.
