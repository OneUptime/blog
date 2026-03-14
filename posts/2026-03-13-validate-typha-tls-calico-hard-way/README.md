# How to Validate Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Validation, Hard Way

Description: A guide to validating that Typha TLS certificates are correctly configured, unexpired, and enforcing mutual authentication in a manually installed Calico cluster.

---

## Introduction

Validating Typha TLS goes beyond confirming that Felix can connect — it involves confirming that the certificates are valid and unexpired, that the CA matches on both sides, that CN verification is enforced, and that unauthenticated connections are rejected. This level of validation is required during initial setup, after certificate rotation, and as part of periodic security audits.

## Step 1: Verify Certificate Validity and Expiry

```bash
# Typha server certificate
echo "=== Typha Server Certificate ==="
kubectl get secret calico-typha-tls -n calico-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | \
  openssl x509 -noout -subject -issuer -dates

# Felix client certificate
echo "=== Felix Client Certificate ==="
kubectl get secret calico-felix-typha-tls -n calico-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | \
  openssl x509 -noout -subject -issuer -dates
```

Certificates should show `notAfter` at least 30 days in the future.

## Step 2: Verify CA Certificates Match

Both Typha and Felix must use the same CA to authenticate each other.

```bash
TYPHA_CA_HASH=$(kubectl get secret calico-typha-tls -n calico-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | openssl x509 -noout -fingerprint | awk -F= '{print $2}')

FELIX_CA_HASH=$(kubectl get secret calico-felix-typha-tls -n calico-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | openssl x509 -noout -fingerprint | awk -F= '{print $2}')

echo "Typha CA fingerprint: $TYPHA_CA_HASH"
echo "Felix CA fingerprint: $FELIX_CA_HASH"
[ "$TYPHA_CA_HASH" = "$FELIX_CA_HASH" ] && echo "PASS: CA certs match" || echo "FAIL: CA cert mismatch"
```

## Step 3: Verify Certificate Chain Validity

Confirm the Typha server certificate is signed by the CA.

```bash
kubectl get secret calico-typha-tls -n calico-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d > /tmp/typha-ca.crt

kubectl get secret calico-typha-tls -n calico-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > /tmp/typha-server.crt

openssl verify -CAfile /tmp/typha-ca.crt /tmp/typha-server.crt
```

Expect: `/tmp/typha-server.crt: OK`

Repeat for the Felix client certificate.

```bash
kubectl get secret calico-felix-typha-tls -n calico-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > /tmp/felix-client.crt

openssl verify -CAfile /tmp/typha-ca.crt /tmp/felix-client.crt
```

## Step 4: Verify Unauthenticated Connections Are Rejected

Attempt a connection to Typha without a client certificate — this should fail.

```bash
kubectl run tls-test --image=alpine --restart=Never -- sh -c \
  "apk add --quiet openssl && \
   echo | openssl s_client -connect calico-typha.calico-system.svc.cluster.local:5473 \
   -CAfile /dev/stdin 2>&1 | grep -i 'alert\|error\|refused'"
kubectl delete pod tls-test
```

Expect a TLS alert indicating the server requires a client certificate.

## Step 5: Verify Felix Is Using TLS (Log Inspection)

```bash
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | \
  grep -i "typha\|tls\|certificate" | tail -20
```

Expect logs confirming successful TLS connection to Typha.

## Step 6: Verify Typha Logs Show Authenticated Connections

```bash
kubectl logs -n calico-system deployment/calico-typha | \
  grep -i "new connection\|client\|authenticated" | tail -20
```

Each line should show a client connection with the Felix CN visible.

## Step 7: Test Certificate Expiry Warning

```bash
# Calculate days until expiry
NOT_AFTER=$(kubectl get secret calico-typha-tls -n calico-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | \
  openssl x509 -noout -enddate | awk -F= '{print $2}')

EXPIRY_EPOCH=$(date -d "$NOT_AFTER" +%s 2>/dev/null || date -j -f "%b %e %T %Y %Z" "$NOT_AFTER" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "Days until Typha TLS certificate expiry: $DAYS_LEFT"
[ "$DAYS_LEFT" -lt 30 ] && echo "WARNING: Certificate expires soon — rotate now"
```

## Conclusion

Validating Typha TLS requires checking certificate validity and expiry dates, confirming the CA fingerprints match on both the Typha and Felix sides, verifying certificate chain validity with `openssl verify`, testing that unauthenticated connections are rejected, and inspecting logs on both Typha and Felix to confirm successful authenticated connections. Running this validation sequence after initial setup, after certificate rotation, and quarterly as a security audit step maintains a verified and secure Typha mTLS configuration.
