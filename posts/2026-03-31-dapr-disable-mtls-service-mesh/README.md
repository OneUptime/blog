# How to Disable Dapr mTLS When Using Service Mesh mTLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, mTLS, Service Mesh, Security, Kubernetes

Description: Learn when and how to disable Dapr's built-in mTLS to avoid double-encryption when a service mesh already provides transport security.

---

Dapr ships with mTLS enabled by default to encrypt all sidecar-to-sidecar communication. When you run Dapr alongside a service mesh like Istio, Linkerd, or Consul Connect - all of which also provide mTLS - you end up with double encryption. This adds CPU overhead and certificate management complexity without security benefit. This guide explains how to safely disable Dapr mTLS.

## Understand the Double-Encryption Problem

When both Dapr and a service mesh provide mTLS, each packet is encrypted twice:

1. Dapr encrypts the gRPC payload using its own certificates managed by the Dapr Sentry service.
2. The service mesh proxy (Envoy, Linkerd-proxy, or Consul proxy) encrypts the TCP stream using its own certificates.

This doubles the TLS handshake overhead and requires managing two separate certificate authorities.

## Verify Your Service Mesh Is Enforcing mTLS

Before disabling Dapr mTLS, confirm the service mesh is actively encrypting traffic.

For Istio:

```bash
kubectl exec <pod> -c istio-proxy -- \
  pilot-agent request GET stats | grep ssl.handshake
```

For Linkerd:

```bash
linkerd viz edges deploy
# Look for a checkmark in the SECURED column
```

## Disable Dapr mTLS via Configuration

Create or update the Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: default
spec:
  mtls:
    enabled: false
```

Apply it:

```bash
kubectl apply -f appconfig.yaml
```

Reference this configuration from your deployments:

```yaml
annotations:
  dapr.io/config: "appconfig"
```

## Disable mTLS Cluster-Wide

To disable mTLS for all services in a namespace, apply the configuration at the namespace level and reference it in your Dapr operator settings:

```bash
helm upgrade dapr dapr/dapr \
  --set global.mtls.enabled=false \
  -n dapr-system
```

## Verify mTLS Is Disabled

Check that the Dapr sidecar is no longer performing TLS handshakes:

```bash
kubectl logs <pod> -c daprd | grep -i mtls
# Should see: "mTLS is disabled"
```

Also verify Dapr Sentry is not issuing certificates to your pods after the change.

## Maintain Network Policies for Defense-in-Depth

Even with service mesh mTLS handling encryption, maintain Kubernetes NetworkPolicies to restrict traffic at the IP layer:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dapr-only
spec:
  podSelector:
    matchLabels:
      app: order-service
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: dapr
  policyTypes:
  - Ingress
```

## Summary

Disabling Dapr mTLS when a service mesh already provides encryption eliminates redundant TLS processing and simplifies certificate management. Confirm your service mesh enforces mTLS before making this change, then update the Dapr Configuration resource to set `mtls.enabled: false`. Always supplement with Kubernetes NetworkPolicies to maintain defense-in-depth security.
