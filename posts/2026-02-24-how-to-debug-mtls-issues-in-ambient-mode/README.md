# How to Debug mTLS Issues in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, mTLS, Security, Certificate Debugging

Description: Practical guide to diagnosing and fixing mutual TLS issues in Istio ambient mode including certificate problems and handshake failures.

---

mTLS in Istio ambient mode works differently from sidecar mode. Instead of each pod having its own sidecar that handles TLS, the ztunnel on each node handles mTLS for all pods on that node. When mTLS breaks in ambient mode, the impact is wider because a single ztunnel handles certificates for many workloads. This guide covers how to find and fix mTLS issues specific to ambient mode.

## How mTLS Works in Ambient Mode

In ambient mode, the mTLS flow looks like this:

1. ztunnel obtains SPIFFE certificates from istiod for each workload on its node
2. When pod A on node 1 talks to pod B on node 2, the ztunnel on node 1 initiates an HBONE connection (HTTP/2 CONNECT over TLS) to the ztunnel on node 2
3. The TLS handshake uses the source workload's certificate (pod A's identity) and verifies the destination workload's certificate (pod B's identity)
4. If the handshake succeeds, traffic flows encrypted between the two ztunnels

## Checking mTLS Status

Verify that mTLS is being used for connections:

```bash
# Check from ztunnel metrics

ZTUNNEL=$(kubectl get pods -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}')

kubectl debug -it $ZTUNNEL -n istio-system --image=curlimages/curl -- \
  curl -s localhost:15020/metrics | grep "istio_tcp_connections"
```

You can also verify from ztunnel logs. Because ztunnel is an L4 proxy, it does not add HTTP headers such as `X-Forwarded-Client-Cert` to application requests:

```bash
kubectl logs -n istio-system -l app=ztunnel | \
  grep 'connection complete' | grep 'src.identity' | grep 'dst.identity'
```

If the log entry includes the expected `src.identity` and `dst.identity` values, the connection was carried over the ambient secure overlay.

## Certificate Provisioning Failures

The most common mTLS issue is ztunnel failing to get certificates from istiod. Check ztunnel logs:

```bash
kubectl logs -n istio-system $ZTUNNEL | grep -i "cert\|tls\|secret\|ca"
```

Common error messages and their meanings:

### "failed to fetch certificate from CA"

This means ztunnel cannot reach istiod's CA endpoint:

```bash
# Check istiod is running
kubectl get pods -n istio-system -l app=istiod

# Test connectivity from ztunnel to istiod
kubectl debug -it $ZTUNNEL -n istio-system --image=nicolaka/netshoot -- \
  nc -vz istiod.istio-system 15012
```

If istiod is not reachable, check the service:

```bash
kubectl get svc istiod -n istio-system
kubectl get endpoints istiod -n istio-system
```

### "certificate has expired"

If certificates expire before they are rotated:

```bash
# Check certificate details
istioctl ztunnel-config certificates "$ZTUNNEL".istio-system
```

If certificates are expired or about to expire, check the certificate TTL configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        DEFAULT_WORKLOAD_CERT_TTL: "24h"
```

Also check the node's system clock. Clock skew can make valid certificates appear expired:

```bash
kubectl debug node/my-node -it --image=nicolaka/netshoot -- date
```

### "certificate verify failed"

This means the TLS handshake failed because the certificates could not be validated:

```bash
kubectl logs -n istio-system $ZTUNNEL | grep "verify failed"
```

Common causes:

1. **Mismatched root certificates**: In multi-cluster setups, clusters must share compatible trust anchors or root CA configuration

```bash
# Compare root certs across clusters
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -noout -fingerprint
```

2. **Root CA rotation in progress**: If you are rotating the root CA, there is a window where old and new certificates coexist

3. **Corrupted certificate store**: Restart ztunnel to force certificate re-provisioning:

```bash
kubectl delete pod -n istio-system $ZTUNNEL
```

## TLS Handshake Failures

When the TLS handshake itself fails, increase ztunnel logging temporarily:

```bash
kubectl -n istio-system set env daemonset/ztunnel RUST_LOG=info,access=debug,ztunnel::proxy=debug
kubectl -n istio-system rollout restart daemonset/ztunnel
```

Then make a test connection and look for connection details:

```bash
kubectl logs -n istio-system $ZTUNNEL | grep -i "connection complete\|tls\|certificate\|error"
```

A successful connection in the logs looks like:

```text
info access connection complete src.addr=10.244.1.12:58508 src.identity="spiffe://cluster.local/ns/my-app/sa/client" dst.addr=10.244.2.1:15008 dst.hbone_addr="10.244.2.1:8080" dst.identity="spiffe://cluster.local/ns/my-app/sa/backend" direction="outbound"
```

A failed handshake may show errors like:

```text
ERROR TLS handshake failed with peer 10.244.2.1:15008: certificate verify failed
```

## HBONE Connection Issues

Ambient mode uses HBONE (HTTP/2 CONNECT) tunnels between ztunnels. If the HBONE connection fails:

```bash
# Check HBONE port connectivity between nodes
kubectl debug -it $ZTUNNEL -n istio-system --image=nicolaka/netshoot -- \
  nc -vz 10.244.2.1 15008
```

Port 15008 must be reachable between all nodes. Check network policies or firewall rules:

```bash
# Verify the port is open
kubectl debug node/node-2 -it --image=nicolaka/netshoot -- \
  ss -tlnp | grep 15008
```

## PeerAuthentication Policy Issues

PeerAuthentication policies control mTLS enforcement. Check for policies that might be interfering:

```bash
# List all PeerAuthentication policies
kubectl get peerauthentication -A

# Check details
kubectl get peerauthentication -A -o yaml
```

In ambient mode, PeerAuthentication works at the ztunnel level for L4 enforcement:

```yaml
# Strict mode - require mTLS for all traffic
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict
  namespace: my-app
spec:
  mtls:
    mode: STRICT
```

```yaml
# Permissive mode - accept both mTLS and plaintext
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: permissive
  namespace: my-app
spec:
  mtls:
    mode: PERMISSIVE
```

If you have services that cannot do mTLS (like health check probes from kubelet), use PERMISSIVE mode or exclude specific ports:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: with-port-exclusion
  namespace: my-app
spec:
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: PERMISSIVE
```

## Cross-Namespace mTLS

mTLS between namespaces should work automatically if both namespaces are in ambient mode with the same trust domain. If it is not working:

```bash
# Verify both namespaces are ambient-enabled
kubectl get ns my-app other-app --show-labels | grep ambient

# Check trust domain
istioctl ztunnel-config certificates "$ZTUNNEL".istio-system
```

All certificates should be under the same trust domain (e.g., `cluster.local`).

## Debugging Checklist

When mTLS is not working in ambient mode, run through these checks:

```bash
# 1. Is the namespace in ambient mode?
kubectl get ns my-app --show-labels

# 2. Is ztunnel running on the node?
kubectl get pods -n istio-system -l app=ztunnel -o wide

# 3. Can ztunnel reach istiod?
kubectl debug -it $ZTUNNEL -n istio-system --image=nicolaka/netshoot -- nc -vz istiod.istio-system 15012

# 4. Are certificates provisioned?
istioctl ztunnel-config certificates "$ZTUNNEL".istio-system

# 5. Is HBONE port reachable between nodes?
# (test from one ztunnel to another)

# 6. What PeerAuthentication policies exist?
kubectl get peerauthentication -A

# 7. Are there any error messages?
kubectl logs -n istio-system $ZTUNNEL | grep -i "error\|fail\|denied" | tail -20
```

mTLS in ambient mode is simpler in some ways (no per-pod sidecar configuration) but can be harder to debug because everything happens at the node level. When troubleshooting, always start by verifying certificate provisioning, then check network connectivity between ztunnels, and finally look at policy configuration.
