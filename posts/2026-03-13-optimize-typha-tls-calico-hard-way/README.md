# How to Optimize Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Performance, Optimization, Hard Way

Description: A guide to optimizing Typha TLS performance including session resumption, cipher suite selection, and certificate key size choices for a manually installed Calico cluster.

---

## Introduction

TLS adds CPU overhead for the cryptographic handshake and ongoing encryption. For Typha, which handles long-lived persistent connections from all Felix agents, this overhead is bounded - the handshake happens once per connection, and the persistent connection amortizes the cost across millions of policy updates. However, certificate key size and cipher suite selection still affect handshake time and ongoing encryption throughput, particularly in large clusters where Typha may handle thousands of simultaneous reconnections during a rolling restart.

## Step 1: Choose the Right Key Algorithm

RSA 4096 provides strong security but slower handshakes than ECDSA P-256, which provides equivalent security with significantly faster operations.

Generate ECDSA certificates for a performance-optimized setup.

```bash
# Generate ECDSA CA
openssl ecparam -genkey -name prime256v1 -out /etc/calico/pki/typha-ca-ec.key
openssl req -x509 -new -key /etc/calico/pki/typha-ca-ec.key \
  -out /etc/calico/pki/typha-ca-ec.crt \
  -days 3650 -subj "/CN=calico-typha-ca"

# Generate ECDSA server certificate
openssl ecparam -genkey -name prime256v1 -out /etc/calico/pki/typha-server-ec.key
openssl req -new -key /etc/calico/pki/typha-server-ec.key \
  -out /etc/calico/pki/typha-server-ec.csr \
  -subj "/CN=calico-typha"
openssl x509 -req -in /etc/calico/pki/typha-server-ec.csr \
  -CA /etc/calico/pki/typha-ca-ec.crt \
  -CAkey /etc/calico/pki/typha-ca-ec.key \
  -CAcreateserial -out /etc/calico/pki/typha-server-ec.crt -days 365
```

ECDSA P-256 handshakes are approximately 10x faster than RSA 4096 handshakes.

## Step 2: TLS 1.3 for Reduced Handshake Round Trips

TLS 1.3 reduces the handshake from 2 round trips (TLS 1.2) to 1 round trip, halving handshake latency.

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_MINTLSVERSION=VersionTLS13
```

## Step 3: Measure Handshake Latency Before and After

Baseline handshake latency with RSA 4096.

```bash
time echo | openssl s_client \
  -connect calico-typha.calico-system.svc.cluster.local:5473 \
  -cert /etc/calico/pki/felix-client.crt \
  -key /etc/calico/pki/felix-client.key \
  -CAfile /etc/calico/pki/typha-ca.crt \
  2>&1 | grep "Verify return code"
```

Run the same command after switching to ECDSA certificates.

## Step 4: Stagger Felix Reconnections

During a cluster-wide Felix restart (e.g., after a Calico upgrade), all Felix agents reconnect simultaneously, creating a TLS handshake spike on Typha. Stagger the restart to spread the load.

```bash
# Rolling restart with controlled pace
kubectl rollout restart daemonset/calico-node -n calico-system
# kubectl rollout has a default maxUnavailable - this naturally staggers restarts
kubectl rollout status daemonset/calico-node -n calico-system --timeout=600s
```

For even more control, use kubectl's rolling update strategy.

```bash
kubectl patch daemonset calico-node -n calico-system --patch '{
  "spec": {
    "updateStrategy": {
      "rollingUpdate": {"maxUnavailable": 5}
    }
  }
}'
```

## Step 5: Typha CPU Allocation for TLS

For large clusters with frequent certificate rotations or rolling restarts, ensure Typha has sufficient CPU for TLS handshakes.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {"template": {"spec": {"containers": [{
    "name": "calico-typha",
    "resources": {
      "requests": {"cpu": "500m"},
      "limits": {"cpu": "2000m"}
    }
  }]}}}
}'
```

## Step 6: Monitor TLS Handshake Impact

Measure Typha CPU usage during a rolling restart.

```bash
# Watch CPU during restart
kubectl top pod -n calico-system -l k8s-app=calico-typha --containers -w
```

CPU spikes above the limit indicate that Typha is CPU-throttled during handshakes, which will slow Felix reconnections.

## Conclusion

Optimizing Typha TLS in a hard way installation involves choosing ECDSA certificates over RSA for faster handshakes, enforcing TLS 1.3 to reduce round trips, staggering Felix reconnections to spread TLS handshake load, and ensuring Typha has sufficient CPU headroom during mass reconnection events. These optimizations are most impactful in large clusters (>500 nodes) where TLS handshake cost is non-trivial, but the certificate algorithm choice is worth making from the start since rotating from RSA to ECDSA requires regenerating all Typha and Felix certificates.
