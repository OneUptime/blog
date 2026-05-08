# How to Validate Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Validation, Hard Way

Description: A guide to validating that Typha TLS certificates are correctly configured, unexpired, and enforcing mutual authentication in a manually installed Calico cluster.

---

## Introduction

Validating Typha TLS goes beyond confirming that Felix can connect - it involves confirming that the certificates are valid and unexpired, that the CA matches on both sides, that CN verification is enforced, and that unauthenticated connections are rejected. This level of validation is required during initial setup, after certificate rotation, and as part of periodic security audits.

## Step 1: Verify Certificate Validity and Expiry

```bash
# Typha server certificate

echo "=== Typha Server Certificate ==="
kubectl get secret calico-typha-certs -n kube-system \
  -o jsonpath='{.data.typha\.crt}' | base64 -d | \
  openssl x509 -noout -subject -issuer -dates

# calico/node client certificate used by Felix
echo "=== calico/node Client Certificate ==="
kubectl get secret calico-node-certs -n kube-system \
  -o jsonpath='{.data.calico-node\.crt}' | base64 -d | \
  openssl x509 -noout -subject -issuer -dates
```

Certificates should show `notAfter` at least 30 days in the future.

## Step 2: Verify CA Configuration

Both Typha and Felix must use the same CA to authenticate each other.

```bash
TYPHA_CA_HASH=$(kubectl get configmap calico-typha-ca -n kube-system \
  -o jsonpath='{.data.typhaca\.crt}' | openssl x509 -noout -fingerprint | awk -F= '{print $2}')

TYPHA_CA_CONFIGMAP=$(kubectl get deployment calico-typha -n kube-system \
  -o jsonpath='{.spec.template.spec.volumes[?(@.name=="calico-typha-ca")].configMap.name}')

FELIX_CA_FILE=$(kubectl get daemonset calico-node -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="calico-node")].env[?(@.name=="FELIX_TYPHACAFILE")].value}')

echo "Typha CA fingerprint: $TYPHA_CA_HASH"
echo "Typha CA ConfigMap: $TYPHA_CA_CONFIGMAP"
echo "Felix CA file: $FELIX_CA_FILE"
[ "$TYPHA_CA_CONFIGMAP" = "calico-typha-ca" ] && [ "$FELIX_CA_FILE" = "/calico-typha-ca/typhaca.crt" ] && echo "PASS: Typha and Felix are configured to use the Typha CA" || echo "FAIL: Typha/Felix Typha CA configuration mismatch"
```

## Step 3: Verify Certificate Chain Validity

Confirm the Typha server certificate is signed by the CA.

```bash
kubectl get configmap calico-typha-ca -n kube-system \
  -o jsonpath='{.data.typhaca\.crt}' > /tmp/typha-ca.crt

kubectl get secret calico-typha-certs -n kube-system \
  -o jsonpath='{.data.typha\.crt}' | base64 -d > /tmp/typha-server.crt

openssl verify -CAfile /tmp/typha-ca.crt /tmp/typha-server.crt
```

Expect: `/tmp/typha-server.crt: OK`

Repeat for the Felix client certificate.

```bash
kubectl get secret calico-node-certs -n kube-system \
  -o jsonpath='{.data.calico-node\.crt}' | base64 -d > /tmp/calico-node-client.crt

openssl verify -CAfile /tmp/typha-ca.crt /tmp/calico-node-client.crt
```

Verify that the configured Common Names match the certificates.

```bash
TYPHA_CLIENT_CN=$(kubectl get deployment calico-typha -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="calico-typha")].env[?(@.name=="TYPHA_CLIENTCN")].value}')
NODE_CERT_CN=$(openssl x509 -in /tmp/calico-node-client.crt -noout -subject -nameopt RFC2253 | sed 's/^subject=CN=//;s/,.*//')

FELIX_TYPHA_CN=$(kubectl get daemonset calico-node -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="calico-node")].env[?(@.name=="FELIX_TYPHACN")].value}')
TYPHA_CERT_CN=$(openssl x509 -in /tmp/typha-server.crt -noout -subject -nameopt RFC2253 | sed 's/^subject=CN=//;s/,.*//')

[ "$TYPHA_CLIENT_CN" = "$NODE_CERT_CN" ] && echo "PASS: Typha accepts calico/node CN $NODE_CERT_CN" || echo "FAIL: Typha client CN mismatch"
[ "$FELIX_TYPHA_CN" = "$TYPHA_CERT_CN" ] && echo "PASS: Felix expects Typha CN $TYPHA_CERT_CN" || echo "FAIL: Felix Typha CN mismatch"
```

## Step 4: Verify Unauthenticated Connections Are Rejected

Attempt a connection to Typha without a client certificate - this should fail.

```bash
TYPHA_CLUSTERIP=$(kubectl get svc -n kube-system calico-typha -o jsonpath='{.spec.clusterIP}')

curl https://calico-typha:5473 -v --cacert /tmp/typha-ca.crt \
  --resolve "calico-typha:5473:$TYPHA_CLUSTERIP" 2>&1 | \
  grep -i 'alert\|bad certificate\|certificate required'
```

Expect a TLS alert indicating the server requires a trusted client certificate.

## Step 5: Verify Felix Is Using TLS (Log Inspection)

```bash
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node | \
  grep -i "typha\|tls\|certificate" | tail -20
```

Expect logs confirming successful TLS connection to Typha.

## Step 6: Verify Typha Logs Show Authenticated Connections

```bash
kubectl logs -n kube-system deployment/calico-typha | \
  grep -i "new connection\|client\|authenticated" | tail -20
```

Logs should show accepted client connections; exact wording varies by Calico version and log level.

## Step 7: Test Certificate Expiry Warning

```bash
# Calculate days until expiry
NOT_AFTER=$(kubectl get secret calico-typha-certs -n kube-system \
  -o jsonpath='{.data.typha\.crt}' | base64 -d | \
  openssl x509 -noout -enddate | awk -F= '{print $2}')

EXPIRY_EPOCH=$(date -d "$NOT_AFTER" +%s 2>/dev/null || date -j -f "%b %e %T %Y %Z" "$NOT_AFTER" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "Days until Typha TLS certificate expiry: $DAYS_LEFT"
[ "$DAYS_LEFT" -lt 30 ] && echo "WARNING: Certificate expires soon - rotate now"
```

## Conclusion

Validating Typha TLS requires checking certificate validity and expiry dates, confirming the Typha and Felix CA configuration, verifying certificate chain validity with `openssl verify`, testing that unauthenticated connections are rejected, and inspecting logs on both Typha and Felix to confirm successful authenticated connections. Running this validation sequence after initial setup, after certificate rotation, and quarterly as a security audit step maintains a verified and secure Typha mTLS configuration.
