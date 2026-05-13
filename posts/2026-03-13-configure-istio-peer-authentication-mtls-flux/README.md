# How to Configure Istio Peer Authentication for mTLS with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Istio, PeerAuthentication, mTLS, Service Mesh, Security

Description: Configure Istio PeerAuthentication for mutual TLS using Flux CD to enforce encrypted, authenticated communication between services.

---

## Introduction

Istio's PeerAuthentication resource controls whether mutual TLS (mTLS) is required for traffic between services. With mTLS enabled, both the client and server present certificates - managed automatically by Istio's certificate authority - ensuring all service-to-service traffic is encrypted and both parties are authenticated.

Managing PeerAuthentication through Flux CD ensures your mTLS policy is consistently enforced across namespaces and tracked in version control. Security policy changes - such as moving from PERMISSIVE to STRICT mode - are reviewed and applied safely through the GitOps pipeline.

This guide covers configuring Istio PeerAuthentication at the mesh, namespace, and service levels using Flux CD.

## Prerequisites

- Kubernetes cluster with Istio installed
- Flux CD v2 bootstrapped to your Git repository
- Services running in Istio-injected namespaces

## Step 1: Enable Strict mTLS Mesh-Wide

Start with PERMISSIVE mode (allow both plain text and mTLS) and migrate to STRICT:

```yaml
# clusters/my-cluster/istio-mtls/mesh-peer-auth.yaml

# Mesh-wide policy: applied to the Istio root namespace
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system  # Mesh-wide when istio-system is the configured root namespace
spec:
  mtls:
    # STRICT: only mTLS traffic allowed (recommended for production)
    # PERMISSIVE: both mTLS and plaintext allowed (use during migration)
    mode: STRICT
```

## Step 2: Set Namespace-Level mTLS Policy

Override the mesh-wide policy for specific namespaces:

```yaml
# clusters/my-cluster/istio-mtls/namespace-peer-auth.yaml
# Production namespace: strict mTLS
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
---
# Legacy namespace: allow plaintext for migration period
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: legacy-apps
spec:
  mtls:
    mode: PERMISSIVE
```

## Step 3: Apply Workload-Level mTLS Exceptions

For specific workloads that cannot use mTLS on a port (e.g., metrics or health checks from external probers):

```yaml
# clusters/my-cluster/istio-mtls/service-exceptions.yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: database-exception
  namespace: production
spec:
  selector:
    matchLabels:
      app: external-db-proxy
  mtls:
    mode: PERMISSIVE
  # Disable mTLS only on the workload metrics port
  portLevelMtls:
    "9090":
      mode: DISABLE
    "5432":
      mode: STRICT
```

## Step 4: Configure Outbound mTLS Explicitly

```yaml
# clusters/my-cluster/istio-mtls/destination-rule.yaml
# Optional DestinationRule to configure outbound mTLS from clients.
# Istio auto mTLS already sends mTLS between mesh workloads when possible.
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: enable-mtls-production
  namespace: production
spec:
  host: "*.production.svc.cluster.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL  # Use Istio-managed mTLS certificates
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/istio-mtls/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - mesh-peer-auth.yaml
  - namespace-peer-auth.yaml
  - service-exceptions.yaml
  - destination-rule.yaml
---
# clusters/my-cluster/flux-kustomization-istio-mtls.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-peer-auth
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: istio
  path: ./clusters/my-cluster/istio-mtls
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Verify mTLS is Working

```bash
# Apply via Flux
flux reconcile kustomization istio-peer-auth

# Check PeerAuthentication resources
kubectl get peerauthentication --all-namespaces

# Verify the mTLS policy applied to a pod
istioctl experimental describe pod <pod-name> -n production

# Check that Envoy configuration has synced
istioctl proxy-status

# View the certificates used by a pod
istioctl proxy-config secret <pod-name>.production

# Test that plaintext is rejected in STRICT mode from a pod without an Istio sidecar
kubectl exec -n legacy-apps deploy/plaintext-client -- \
  curl http://api-service.production.svc.cluster.local:8080/health
# Should fail with: Connection refused or 000 (TLS required)
```

## Best Practices

- Migrate to STRICT mTLS progressively: start with PERMISSIVE mesh-wide, enable STRICT per namespace, then enable mesh-wide STRICT only after all namespaces are confirmed working.
- Check `istioctl analyze` before switching namespaces to STRICT mode - it reports configuration issues such as workloads without matching selectors, namespaces without injection labels, or pods missing sidecars.
- Use `portLevelMtls` exceptions only for specific ports (e.g., Prometheus scraping on metrics ports if your scraper does not support mTLS) rather than disabling mTLS at the service level.
- Commit the migration timeline as comments in the PeerAuthentication YAML so future operators understand why PERMISSIVE mode is in place for specific namespaces.
- Combine PeerAuthentication STRICT mode with AuthorizationPolicy using `source.principals` for defense-in-depth: mTLS authenticates the identity, AuthorizationPolicy controls what that identity can do.

## Conclusion

Configuring Istio PeerAuthentication through Flux CD ensures your mTLS security policy is consistently enforced and version-controlled across all namespaces. The migration from plaintext to encrypted service communication becomes a pull-request-driven, phased process - giving security teams the visibility and control they need to enforce zero-trust networking across the entire cluster.
