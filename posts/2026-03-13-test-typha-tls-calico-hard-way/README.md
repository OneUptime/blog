# How to Test Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Testing, Security, Hard Way

Description: A guide to testing Typha TLS authentication including mTLS enforcement, certificate rejection, and connection behavior after certificate rotation.

---

## Introduction

Testing Typha TLS validates that the mTLS configuration is actually enforcing authentication — not just accepting all connections. The tests confirm that Typha rejects connections without client certificates, rejects connections with untrusted certificates, and accepts only Felix agents presenting certificates signed by the cluster CA. Additionally, testing connection behavior after certificate rotation confirms that the rotation process does not cause a lasting connectivity outage.

## Test 1: Verify mTLS Is Enforced (No Client Certificate)

Connect to Typha without presenting a client certificate. The connection should be rejected.

```bash
kubectl run tls-test --image=alpine --restart=Never -- sh -c \
  "apk add --quiet openssl curl && \
   echo | openssl s_client \
   -connect calico-typha.calico-system.svc.cluster.local:5473 \
   2>&1 | tail -5"
kubectl logs tls-test
kubectl delete pod tls-test
```

Expect output containing `alert certificate required` or `SSL_connect: error`.

## Test 2: Verify Untrusted Certificate Is Rejected

Generate a certificate signed by a different CA (not the Typha CA) and attempt to connect.

```bash
# Generate an untrusted CA and certificate
openssl req -x509 -newkey rsa:2048 -keyout /tmp/untrusted-ca.key \
  -out /tmp/untrusted-ca.crt -days 1 -nodes -subj "/CN=untrusted-ca"
openssl req -newkey rsa:2048 -keyout /tmp/untrusted.key \
  -out /tmp/untrusted.csr -nodes -subj "/CN=calico-felix"
openssl x509 -req -in /tmp/untrusted.csr \
  -CA /tmp/untrusted-ca.crt -CAkey /tmp/untrusted-ca.key \
  -CAcreateserial -out /tmp/untrusted.crt -days 1

# Copy to a test pod and attempt connection
kubectl run tls-reject-test --image=alpine --restart=Never -- sleep 300
kubectl cp /tmp/untrusted.crt tls-reject-test:/tmp/
kubectl cp /tmp/untrusted.key tls-reject-test:/tmp/
kubectl cp /etc/calico/pki/typha-ca.crt tls-reject-test:/tmp/typha-ca.crt

kubectl exec tls-reject-test -- sh -c \
  "apk add --quiet openssl && \
   echo | openssl s_client \
   -connect calico-typha.calico-system.svc.cluster.local:5473 \
   -cert /tmp/untrusted.crt -key /tmp/untrusted.key \
   -CAfile /tmp/typha-ca.crt 2>&1 | tail -5"

kubectl delete pod tls-reject-test
```

Expect rejection with `alert certificate unknown`.

## Test 3: Verify Trusted Certificate Is Accepted

Connect with a valid Felix client certificate and verify acceptance.

```bash
kubectl run tls-accept-test --image=alpine --restart=Never -- sleep 300
kubectl cp /etc/calico/pki/felix-client.crt tls-accept-test:/tmp/
kubectl cp /etc/calico/pki/felix-client.key tls-accept-test:/tmp/
kubectl cp /etc/calico/pki/typha-ca.crt tls-accept-test:/tmp/

kubectl exec tls-accept-test -- sh -c \
  "apk add --quiet openssl && \
   echo | openssl s_client \
   -connect calico-typha.calico-system.svc.cluster.local:5473 \
   -cert /tmp/felix-client.crt -key /tmp/felix-client.key \
   -CAfile /tmp/typha-ca.crt 2>&1 | grep -i 'verify return\|cipher\|protocol'"

kubectl delete pod tls-accept-test
```

Expect `Verify return code: 0 (ok)` and a valid TLS protocol version.

## Test 4: Test Connection After Certificate Rotation

```bash
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)

# Perform certificate rotation
kubectl create secret generic calico-typha-tls \
  --from-file=ca.crt=/etc/calico/pki/typha-ca.crt \
  --from-file=tls.crt=/etc/calico/pki/typha-server.crt \
  --from-file=tls.key=/etc/calico/pki/typha-server.key \
  -n calico-system --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/calico-typha -n calico-system
kubectl rollout status deployment/calico-typha -n calico-system --timeout=120s

# Wait for Felix reconnection
sleep 60

CONNECTIONS=$(kubectl exec -n calico-system deployment/calico-typha -- \
  wget -qO- http://localhost:9093/metrics | grep typha_connections_active | awk '{print $2}')

echo "After rotation: $CONNECTIONS / $NODE_COUNT nodes connected"
[ "$CONNECTIONS" -ge "$NODE_COUNT" ] && echo "PASS: All nodes reconnected" || echo "FAIL: Missing connections"
```

## Test 5: CN Enforcement Test

```bash
# Generate a certificate with wrong CN
openssl req -newkey rsa:2048 -keyout /tmp/wrong-cn.key \
  -out /tmp/wrong-cn.csr -nodes -subj "/CN=unauthorized-agent"
openssl x509 -req -in /tmp/wrong-cn.csr \
  -CA /etc/calico/pki/typha-ca.crt -CAkey /etc/calico/pki/typha-ca.key \
  -CAcreateserial -out /tmp/wrong-cn.crt -days 1

# This should be rejected because CN doesn't match TYPHA_CLIENTCN=calico-felix
# (Connection is signed by trusted CA but CN is wrong)
kubectl logs -n calico-system deployment/calico-typha | grep -i "CN\|client" | tail -5
```

## Conclusion

Testing Typha TLS confirms three security properties: unauthenticated connections are rejected, connections with untrusted CA certificates are rejected, and only connections with valid trusted client certificates are accepted. The post-rotation connectivity test confirms that certificate updates do not create lasting outages. Running these tests after initial setup and after each certificate rotation provides continuous assurance that Typha's mTLS enforcement is functioning correctly.
