# How to Debug SSL/TLS Handshake Failures in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, SSL, mTLS, Debugging, Security

Description: Step-by-step guide to diagnosing SSL/TLS handshake failures in Istio, including mTLS mismatches, certificate errors, expired certs, and protocol version conflicts.

---

TLS handshake failures in Istio show up as connection errors, "connection reset by peer" messages, or 503 responses with no useful body. They are especially common during Istio migrations when some services have sidecars and others do not, or when mTLS settings are inconsistent across namespaces.

Here is how to find the root cause and fix it.

## Common TLS Handshake Failure Scenarios

Most TLS handshake failures in Istio fall into one of these categories:

1. **mTLS mode mismatch**: One side expects mTLS, the other does not
2. **Certificate expired or invalid**: The sidecar certificate has expired or was not issued correctly
3. **Wrong TLS mode on Gateway**: The Gateway TLS configuration does not match client expectations
4. **Protocol version mismatch**: Client and server do not agree on a TLS version
5. **Missing or wrong CA certificate**: The trust chain is broken

## Step 1: Check Envoy TLS Stats

The fastest way to see if TLS handshakes are failing is to check Envoy's SSL stats:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- curl -s localhost:15000/stats | grep ssl
```

Key metrics to look at:

```
listener.0.0.0.0_15006.ssl.connection_error: 15
listener.0.0.0.0_15006.ssl.handshake: 1024
listener.0.0.0.0_15006.ssl.no_certificate: 3
listener.0.0.0.0_15006.ssl.fail_verify_no_cert: 2
listener.0.0.0.0_15006.ssl.fail_verify_error: 5
```

- `connection_error` increasing means TLS connections are failing
- `fail_verify_no_cert` means the peer did not present a client certificate (mTLS issue)
- `fail_verify_error` means the peer certificate failed validation

## Step 2: Check mTLS Configuration

The most common TLS issue in Istio is mTLS mode mismatch. Check the PeerAuthentication settings:

```bash
# Mesh-wide
kubectl get peerauthentication -n istio-system

# Namespace-level
kubectl get peerauthentication -n default

# Workload-level
kubectl get peerauthentication -n default -o yaml
```

Use `istioctl` to see what mode is effective for a specific pod:

```bash
istioctl x describe pod my-service-xxxxx -n default
```

Output shows the effective mTLS mode:

```
Pod is STRICT and target is PERMISSIVE
   Peer Authentication: default/strict-mtls
```

If one side is STRICT and the other does not have a sidecar, the handshake fails because the non-sidecar side can not present a client certificate.

### Fix mTLS Mismatches

Option 1: Set PERMISSIVE mode to allow both mTLS and plaintext:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: permissive
  namespace: default
spec:
  mtls:
    mode: PERMISSIVE
```

Option 2: Ensure both sides have sidecars injected and use STRICT mode:

```bash
kubectl label namespace default istio-injection=enabled
kubectl rollout restart deployment my-service
```

## Step 3: Check Certificate Health

Istio sidecars get their certificates from istiod (using the Citadel component). Certificates can expire or fail to rotate.

Check the certificate on a specific proxy:

```bash
istioctl proxy-config secret my-app-xxxxx.default
```

Output shows the certificate details:

```
RESOURCE NAME     TYPE           STATUS     VALID CERT     SERIAL NUMBER     NOT AFTER               NOT BEFORE
default           Cert Chain     ACTIVE     true           abc123            2026-02-25T10:00:00Z    2026-02-24T10:00:00Z
ROOTCA            CA             ACTIVE     true           def456            2036-02-22T10:00:00Z    2026-02-24T10:00:00Z
```

If VALID CERT shows `false` or NOT AFTER is in the past, the certificate has expired.

Check if istiod is healthy and can issue certificates:

```bash
kubectl logs -n istio-system -l app=istiod | grep -i "cert\|error\|fail"
```

### Force Certificate Rotation

If certificates are stale, restart the proxy:

```bash
kubectl rollout restart deployment my-app
```

Or restart just the sidecar:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- kill 1
```

The sidecar will restart and get a fresh certificate.

## Step 4: Debug Gateway TLS Issues

For ingress TLS issues, check the Gateway resource:

```bash
kubectl get gateway my-gateway -o yaml
```

Verify:
- The `credentialName` references an existing secret
- The secret is in the same namespace as the ingress gateway (typically istio-system)
- The certificate matches the hostname

Check the secret:

```bash
kubectl get secret my-tls-secret -n istio-system
```

Verify the certificate contents:

```bash
kubectl get secret my-tls-secret -n istio-system -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text
```

Look at:
- Subject Alternative Names (SAN) matching your hostname
- Not After date (expiration)
- Issuer (trusted CA)

Test the TLS handshake from outside:

```bash
INGRESS_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
openssl s_client -connect $INGRESS_IP:443 -servername my-app.example.com
```

Common issues:
- `verify error:num=20:unable to get local issuer certificate` - CA chain is incomplete
- `no peer certificate available` - No certificate configured for this host
- `sslv3 alert handshake failure` - SNI mismatch or no matching certificate

## Step 5: Check TLS Version Compatibility

Envoy supports TLS 1.2 and 1.3 by default. If a client only supports TLS 1.0 or 1.1, the handshake will fail.

Check what TLS versions the proxy is configured to accept:

```bash
istioctl proxy-config listeners my-app-xxxxx.default -o json | grep -A 10 "tls_params"
```

To set minimum TLS version on a Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
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
        credentialName: my-tls-secret
        minProtocolVersion: TLSV1_2
        maxProtocolVersion: TLSV1_3
      hosts:
        - "my-app.example.com"
```

## Step 6: Debug DestinationRule TLS Settings

DestinationRules control how the source proxy initiates TLS to the destination. A wrong TLS mode here causes handshake failures:

```bash
kubectl get destinationrule -n default -o yaml
```

TLS modes:
- `DISABLE` - No TLS (plaintext)
- `SIMPLE` - Client-side TLS (one-way)
- `MUTUAL` - mTLS with explicit certificates
- `ISTIO_MUTUAL` - Istio's built-in mTLS

If you accidentally set `SIMPLE` when the destination expects `ISTIO_MUTUAL`, the handshake will fail because the client will not present an Istio-issued certificate.

## Step 7: Check Envoy Logs for Detailed Errors

Set the Envoy log level to debug for more detailed TLS error messages:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- curl -X POST "localhost:15000/logging?connection=debug"
```

Then reproduce the failure and check the logs:

```bash
kubectl logs my-app-xxxxx -c istio-proxy --tail=200 | grep -i "tls\|ssl\|handshake"
```

Remember to reset the log level after debugging:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- curl -X POST "localhost:15000/logging?connection=warning"
```

## Debugging Checklist

1. Check Envoy SSL stats for failure counts
2. Verify mTLS PeerAuthentication settings match on both sides
3. Check certificate validity with `istioctl proxy-config secret`
4. For ingress: verify Gateway TLS config and secret
5. Check TLS version compatibility
6. Verify DestinationRule TLS mode
7. Enable debug logging for detailed error messages
8. Check istiod logs for certificate issuance errors

TLS handshake failures almost always come down to mTLS mode mismatches between services or expired/missing certificates. Use `istioctl x describe pod` as your first check since it gives you a quick summary of the TLS posture for any pod in the mesh.
