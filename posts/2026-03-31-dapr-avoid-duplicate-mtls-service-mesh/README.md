# How to Avoid Duplicate mTLS When Using Dapr with a Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, mTLS, Service Mesh, Security, Configuration

Description: Prevent duplicate mTLS encryption and TLS handshake failures when running Dapr alongside Istio, Linkerd, or other service meshes.

---

Dapr has built-in mTLS for sidecar-to-sidecar communication. Service meshes like Istio and Linkerd also encrypt traffic with mTLS. Running both simultaneously causes double encryption, increased CPU overhead, and sometimes TLS handshake failures.

## Why Duplicate mTLS Is Problematic

When both Dapr and a service mesh encrypt traffic:

1. Dapr sidecar encrypts the request with Dapr's certificates
2. The service mesh proxy (Envoy or Linkerd proxy) re-encrypts with mesh certificates
3. At the destination: the mesh proxy decrypts, then Dapr sidecar decrypts again

This double encryption doubles CPU overhead and can cause certificate validation failures if the proxies interfere with each other's TLS handshakes.

## Detecting Duplicate mTLS

Check if both systems have mTLS enabled:

```bash
# Check Dapr mTLS status
kubectl get configuration -A -o yaml | grep -A5 "mtls"

# Check Istio PeerAuthentication
kubectl get peerauthentication -A

# Check Linkerd mTLS
linkerd viz edges deployment -n default
```

If both show mTLS active, you have duplicate encryption.

## Solution: Disable Dapr mTLS

The standard approach is to disable Dapr's mTLS and let the service mesh handle network encryption:

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

Apply to each namespace where your apps run:

```bash
kubectl apply -f dapr-config.yaml -n production
kubectl apply -f dapr-config.yaml -n staging
```

Reference the configuration in your pod annotations:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myapp"
  dapr.io/config: "appconfig"
```

## Global Configuration

Set the default Dapr configuration for the entire cluster via Helm:

```bash
helm upgrade dapr dapr/dapr -n dapr-system \
  --set global.mtls.enabled=false \
  --reuse-values
```

## Keeping Dapr mTLS Active (Alternative)

If you want Dapr mTLS but need the service mesh for other features, configure the service mesh to not enforce mTLS for Dapr ports:

```yaml
# Istio - exclude Dapr ports from mTLS requirement
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: dapr-ports-exception
  namespace: default
spec:
  portLevelMtls:
    3500:
      mode: PERMISSIVE
    50001:
      mode: PERMISSIVE
```

## Verifying the Configuration

After disabling Dapr mTLS, verify that service mesh mTLS is still active:

```bash
# Istio
istioctl proxy-config secret <pod> -n <namespace>

# Linkerd
linkerd viz edges pod/<pod-name> -n <namespace>
```

And confirm Dapr services still communicate correctly:

```bash
curl http://localhost:3500/v1.0/invoke/target-service/method/ping
```

## Security Considerations

When relying solely on the service mesh for mTLS, ensure the mesh enforces STRICT mode (not PERMISSIVE) in production:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

## Summary

Avoid duplicate mTLS by disabling Dapr's built-in mTLS when running alongside Istio or Linkerd. Set `mtls.enabled: false` in the Dapr Configuration resource and reference it via pod annotations. Configure the service mesh in STRICT mTLS mode to maintain security without double encryption. This reduces CPU overhead and eliminates potential TLS handshake conflicts between the two systems.
