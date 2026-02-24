# How to Configure TLS Settings in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, Security, Service Mesh, Encryption

Description: A comprehensive guide to configuring TLS settings across Istio including DestinationRules, PeerAuthentication, and Gateway resources.

---

TLS configuration in Istio spans multiple resources and affects different parts of the traffic flow. You configure TLS at the gateway for external traffic, between sidecars for service-to-service communication, and on destination rules for upstream connections. Each layer has its own knobs, and understanding which resource controls what is key to getting TLS right.

## TLS Modes in Istio

Istio supports several TLS modes depending on where you are configuring it:

**PeerAuthentication modes** (sidecar-to-sidecar):
- `STRICT` - Only accept mTLS connections
- `PERMISSIVE` - Accept both mTLS and plaintext (default during migration)
- `DISABLE` - No mTLS
- `UNSET` - Inherit from parent scope

**DestinationRule TLS modes** (outbound connections):
- `DISABLE` - No TLS
- `SIMPLE` - TLS without client certificates (one-way TLS)
- `MUTUAL` - mTLS with explicit certificate configuration
- `ISTIO_MUTUAL` - mTLS using Istio-provisioned certificates (most common)

**Gateway TLS modes** (ingress):
- `PASSTHROUGH` - Forward TLS as-is to the backend
- `SIMPLE` - Standard TLS termination
- `MUTUAL` - TLS termination with client certificate verification
- `AUTO_PASSTHROUGH` - Automatic SNI-based routing without termination
- `ISTIO_MUTUAL` - mTLS using Istio certificates

## Configuring PeerAuthentication

PeerAuthentication controls how sidecars accept incoming connections. You can set it at the mesh, namespace, or workload level.

Mesh-wide strict mTLS:

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

Namespace-level configuration:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

Workload-level with port-specific settings:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: payment-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
    9090:
      mode: DISABLE
```

This configuration makes port 8080 accept both mTLS and plaintext (useful for health check endpoints), port 9090 accepts only plaintext, and all other ports require strict mTLS.

## Configuring DestinationRule TLS

DestinationRules control the TLS settings for outbound connections from the sidecar. This is where you tell Istio how to connect to upstream services.

For services within the mesh, use ISTIO_MUTUAL:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

For external services with one-way TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api
spec:
  host: api.external-service.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

For external services requiring client certificates (mutual TLS):

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: partner-api
spec:
  host: api.partner.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/certs/client-cert.pem
      privateKey: /etc/certs/client-key.pem
      caCertificates: /etc/certs/ca-cert.pem
```

You can also use credential references instead of file paths:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: partner-api
spec:
  host: api.partner.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      credentialName: partner-api-certs
```

The `credentialName` references a Kubernetes secret containing the certificates.

## Configuring Gateway TLS

For ingress traffic, TLS is configured on the Gateway resource:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
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
        credentialName: main-tls-cert
      hosts:
        - "app.example.com"
```

For mutual TLS at the gateway (client certificate verification):

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: secure-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https-mutual
        protocol: HTTPS
      tls:
        mode: MUTUAL
        credentialName: gateway-tls-cert
      hosts:
        - "secure.example.com"
```

The secret referenced by `credentialName` for MUTUAL mode needs to include the CA certificate for validating client certificates. Create the secret with:

```bash
kubectl create secret generic gateway-tls-cert -n istio-system \
  --from-file=tls.crt=server-cert.pem \
  --from-file=tls.key=server-key.pem \
  --from-file=ca.crt=client-ca-cert.pem
```

## Combining TLS Settings

A common pattern is to have strict mTLS inside the mesh, TLS termination at the gateway, and TLS origination for external services. Here is what that looks like:

```yaml
# Mesh-wide strict mTLS
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
# Gateway TLS termination
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: app-gateway
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
        credentialName: app-tls-cert
      hosts:
        - "app.example.com"
---
# TLS origination for external service
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.external.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api
spec:
  host: api.external.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      sni: api.external.com
```

## Verifying TLS Configuration

Check the effective TLS settings on a workload:

```bash
# Check what TLS mode a pod uses for inbound connections
istioctl proxy-config listener <pod-name> --port 15006 -o json | \
  jq '.[].filterChains[].transportSocket'

# Check outbound TLS configuration
istioctl proxy-config cluster <pod-name> -o json | \
  jq '.[] | select(.name | contains("payment")) | .transportSocket'
```

Use `istioctl analyze` to catch TLS misconfigurations:

```bash
istioctl analyze --all-namespaces
```

This will flag common issues like missing destination rules, conflicting peer authentication policies, or gateway certificate problems.

## Common Pitfalls

**Forgetting the DestinationRule when PeerAuthentication is STRICT**: If you enable strict mTLS via PeerAuthentication but a client does not have a matching DestinationRule with ISTIO_MUTUAL, connections will fail. Inside the mesh, Istio auto-detects this and uses mTLS, but for services without sidecars you need explicit configuration.

**TLS conflict between ServiceEntry and DestinationRule**: If you define a ServiceEntry with protocol TLS on port 443, and also set a DestinationRule with TLS mode SIMPLE, Istio will try to do double TLS encryption. Make sure the protocol and TLS mode are consistent.

**Certificate secret in wrong namespace**: Gateway TLS secrets must be in the same namespace as the gateway deployment (usually `istio-system`). DestinationRule credential secrets must be in the same namespace as the workload.

TLS configuration in Istio is powerful but has many moving parts. Start with the defaults (permissive mTLS mesh-wide), get your applications working, then tighten things up to strict mTLS. Always verify with `istioctl proxy-config` after making changes.
