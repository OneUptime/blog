# How to Enable Istio mTLS in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Istio, mTLS, Security, Service Mesh

Description: Learn how to enable and configure mutual TLS (mTLS) in Istio to encrypt and authenticate all service-to-service communication in Rancher-managed Kubernetes clusters.

Mutual TLS (mTLS) is one of Istio's most important security features. With auto mTLS, traffic between workloads with sidecars is encrypted automatically, and PeerAuthentication policies let you require mTLS for workloads in the mesh. Istio provides strong identity-based authentication using X.509 certificates managed by Istio's certificate authority (istiod). This guide covers how to enable and configure mTLS in a Rancher-managed environment.

## Prerequisites

- Istio installed and running in your Rancher cluster
- Services deployed with Istio sidecar injection enabled
- `kubectl` and `istioctl` access to the cluster

## Understanding Istio mTLS Modes

Istio supports three explicit peer authentication modes, plus an inherited mode:

- **PERMISSIVE**: Accepts both plaintext and mTLS traffic (default, useful for migration)
- **STRICT**: Only accepts mTLS traffic (recommended for production)
- **DISABLE**: Disables mTLS, only accepts plaintext
- **UNSET**: Inherits the parent policy; if there is no parent, it behaves like `PERMISSIVE`

## Step 1: Check Current mTLS Status

```bash
# Check the current peer authentication policies

kubectl get peerauthentication -A

# Verify the default mesh-wide policy in the root namespace (commonly istio-system)
kubectl get peerauthentication default -n istio-system

# Inspect a workload and check whether Istio reports mTLS or any TLS conflicts
istioctl experimental describe pod <pod-name> -n <namespace>

# Example
istioctl experimental describe pod reviews-v1-xxxxxxx -n bookinfo
```

## Step 2: Enable Strict mTLS Mesh-Wide

Enable strict mTLS for the entire service mesh:

```yaml
# mesh-wide-mtls.yaml - Enable strict mTLS for all services in the mesh
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  # When applied to the root namespace (commonly istio-system), this becomes the mesh-wide policy
  namespace: istio-system
spec:
  mtls:
    # STRICT: Only accept mTLS connections
    mode: STRICT
```

```bash
# Apply the mesh-wide mTLS policy
kubectl apply -f mesh-wide-mtls.yaml

# Verify the policy was applied
kubectl get peerauthentication -n istio-system
```

## Step 3: Enable mTLS at Namespace Level

Apply mTLS to a specific namespace:

```yaml
# namespace-mtls.yaml - Enable strict mTLS for a specific namespace
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  # Apply to the my-app namespace
  namespace: my-app
spec:
  mtls:
    mode: STRICT
```

```bash
kubectl apply -f namespace-mtls.yaml
```

## Step 4: Enable mTLS at Service Level

For fine-grained control, apply mTLS policies to specific services:

```yaml
# service-mtls.yaml - Configure mTLS for a specific service
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: reviews-mtls
  namespace: bookinfo
spec:
  selector:
    matchLabels:
      # Apply to pods with this label
      app: reviews
  mtls:
    mode: STRICT
  # Override mTLS mode for specific ports
  portLevelMtls:
    "9080":
      mode: STRICT
    "9090":
      # Allow plaintext on port 9090 (e.g., for health checks)
      mode: PERMISSIVE
```

## Step 5: Configure DestinationRule for mTLS

If you want to configure client TLS behavior explicitly, add a DestinationRule. In many meshes, auto mTLS handles this automatically when there is no conflicting TLS setting:

```yaml
# destination-rule-mtls.yaml - Configure clients to send mTLS traffic
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-mtls-dr
  namespace: bookinfo
spec:
  host: reviews.bookinfo.svc.cluster.local
  trafficPolicy:
    tls:
      # Use Istio-managed certificates for mTLS
      mode: ISTIO_MUTUAL
```

## Step 6: Gradual Migration from Permissive to Strict mTLS

For production environments, migrate gradually:

```yaml
# Step 1: Ensure namespace is in PERMISSIVE mode (default)
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: my-app
spec:
  mtls:
    mode: PERMISSIVE
```

```bash
# Step 2: Verify workloads are already using mTLS and check for TLS conflicts
istioctl experimental describe pod <pod-name> -n my-app

# Step 3: Look for output confirming the pod enforces mTLS and clients speak mTLS,
# or warnings about TLS conflicts between PeerAuthentication and DestinationRule resources
```

```yaml
# Step 4: Switch to STRICT mode after verification
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: my-app
spec:
  mtls:
    mode: STRICT
```

## Step 7: Verify mTLS is Working

```bash
# Check that strict mTLS is in effect for a workload
istioctl experimental describe pod reviews-v1-xxxxxxx -n bookinfo

# Expected output includes a line similar to:
# Pilot reports that pod enforces mTLS and clients speak mTLS

# Use Kiali to visualize mTLS status (look for lock icons on service edges)

# Inspect the Envoy outbound cluster entry for the destination service
istioctl proxy-config clusters deployment/productpage-v1.bookinfo \
  --fqdn reviews.bookinfo.svc.cluster.local --port 9080

# Inspect the certificate chain presented by the destination proxy
kubectl exec -n bookinfo -c istio-proxy \
  $(kubectl get pod -n bookinfo -l app=productpage -o jsonpath='{.items[0].metadata.name}') \
  -- openssl s_client -showcerts -connect reviews.bookinfo:9080 2>/dev/null | head -20
```

## Step 8: Certificate Management

Istio manages certificates automatically, but you can customize the configuration:

```bash
# View the mesh root CA certificate distributed to the workload
kubectl exec -n bookinfo -c istio-proxy \
  $(kubectl get pod -n bookinfo -l app=reviews -o jsonpath='{.items[0].metadata.name}') \
  -- openssl x509 -in /var/run/secrets/istio/root-cert.pem -noout -text

# Check the workload certificate and its expiration as loaded into Envoy
istioctl proxy-config secret deployment/reviews-v1.bookinfo
```

## Conclusion

Enabling mTLS in Istio provides a zero-trust security model where in-mesh service-to-service communication is encrypted and authenticated without any changes to your application code. By gradually migrating from PERMISSIVE to STRICT mode, you can safely enable mTLS in production environments. Rancher's cluster management capabilities make it easy to monitor and manage these security policies across your entire fleet of Kubernetes clusters.
