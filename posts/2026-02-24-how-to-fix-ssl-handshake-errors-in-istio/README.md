# How to Fix SSL Handshake Errors in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SSL, TLS, Handshake Errors, Troubleshooting, mTLS

Description: Resolve SSL and TLS handshake failures in Istio caused by certificate mismatches, expired certs, mTLS configuration errors, and protocol mismatches.

---

SSL handshake errors in Istio are particularly tricky because the mesh handles TLS in ways that are different from traditional setups. Istio automatically manages certificates for mTLS between services, configures TLS termination at gateways, and wraps all inter-service communication in encryption. When any piece of this breaks, you get cryptic handshake errors that are tough to parse.

This guide covers the most common SSL/TLS handshake failures in Istio and how to fix each one.

## Identifying the Handshake Error

First, figure out where the handshake is failing. Check the sidecar logs:

```bash
# Check the client sidecar
kubectl logs <client-pod> -c istio-proxy -n production | grep -i "tls\|ssl\|handshake"

# Check the server sidecar
kubectl logs <server-pod> -c istio-proxy -n production | grep -i "tls\|ssl\|handshake"
```

Common error messages you might see:

- `TLS error: 268435581:SSL routines:OPENSSL_internal:CERTIFICATE_VERIFY_FAILED`
- `TLS handshake failed`
- `upstream connect error or disconnect/reset before headers. reset reason: connection failure, transport failure reason: TLS error`
- `CERTIFICATE_VERIFY_FAILED`
- `CERTIFICATE_EXPIRED`

## Gateway TLS Errors

If the handshake fails at the ingress gateway, the issue is usually with the TLS certificate configuration:

**Check 1: Verify the secret exists**

```bash
# Check if the TLS secret exists
kubectl get secret my-tls-cert -n istio-system

# Check the secret contents
kubectl get secret my-tls-cert -n istio-system -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -subject -dates
```

**Check 2: Verify the Gateway references the correct secret**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
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
        credentialName: my-tls-cert  # Must match the secret name
      hosts:
        - "*.example.com"
```

The `credentialName` must match a Kubernetes secret in the same namespace as the ingress gateway deployment (usually `istio-system`). The secret must be of type `kubernetes.io/tls`:

```bash
# Create a proper TLS secret
kubectl create secret tls my-tls-cert \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n istio-system
```

**Check 3: Certificate chain completeness**

If you get "unable to verify the first certificate," the intermediate certificates might be missing. The cert file should contain the full chain:

```bash
# Check the certificate chain
kubectl get secret my-tls-cert -n istio-system -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl crl2pkcs7 -nocrl -certfile /dev/stdin | \
  openssl pkcs7 -print_certs -noout
```

The chain should include: server certificate, intermediate certificate(s), and optionally the root CA.

**Check 4: Certificate matches the domain**

```bash
# Check what domain the certificate is for
kubectl get secret my-tls-cert -n istio-system -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -subject -ext subjectAltName
```

The subject alternative names (SANs) must include the domain you are trying to access.

## mTLS Handshake Failures Between Services

If mesh-internal mTLS is failing, the issue is usually with Istio's certificate management:

```bash
# Check certificate status on a specific proxy
istioctl proxy-config secret <pod-name> -n production
```

This shows the certificate chain, root cert, and whether they are valid. Look for:

- ACTIVE vs WARMING status
- Certificate expiration dates
- Root cert match between client and server

**Check the root CA:**

```bash
# Check the root CA certificate
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates -subject -issuer
```

If the root CA has expired, all mTLS communication in the mesh will fail. You need to rotate the CA certificate.

**Check certificate expiration on a workload:**

```bash
# Check when the proxy certificate expires
istioctl proxy-config secret <pod-name> -n production -o json | \
  jq '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  tr -d '"' | base64 -d | openssl x509 -noout -dates
```

Istio automatically rotates workload certificates, but if istiod is down, rotation stops and certificates can expire.

## Mixed mTLS and Plaintext

A very common handshake error scenario is when one side expects mTLS and the other sends plaintext:

```bash
# Check mTLS status
istioctl authn tls-check <pod-name>.production orders-service.production.svc.cluster.local
```

If the output shows a mismatch between client and server TLS modes, fix it:

```yaml
# If using STRICT mTLS but some clients do not have sidecars
# Switch to PERMISSIVE to accept both
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: PERMISSIVE
```

Or if you have a DestinationRule forcing mTLS to a service that does not support it:

```yaml
# Remove or change the TLS mode
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: legacy-service
spec:
  host: legacy-service
  trafficPolicy:
    tls:
      mode: DISABLE  # For services without sidecars
```

## SDS (Secret Discovery Service) Failures

Istio uses SDS to distribute certificates to Envoy proxies. If SDS is not working, new certificates cannot be delivered:

```bash
# Check SDS connection status
istioctl proxy-config secret <pod-name> -n production

# Check istiod logs for SDS errors
kubectl logs -n istio-system deployment/istiod | grep "SDS\|sds\|certificate"
```

If SDS is failing, the proxy might be using expired certificates. Restart the pod to force a new certificate request:

```bash
kubectl delete pod <pod-name> -n production
```

## External Service TLS Errors

When calling external services through the mesh, TLS errors can occur if Istio tries to do double encryption:

```yaml
# Wrong: Istio will try to add mTLS on top of the application's TLS
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.external.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS  # This tells Istio the traffic is already HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

If your application is already handling TLS to the external service, use `TLS` protocol to tell Istio to pass through without adding encryption:

```yaml
  ports:
    - number: 443
      name: tls
      protocol: TLS
```

With a DestinationRule to handle the TLS origination from the sidecar:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api
spec:
  host: api.external.com
  trafficPolicy:
    tls:
      mode: SIMPLE  # Originate TLS from the sidecar
```

## TLS Version and Cipher Mismatches

If the client and server cannot agree on a TLS version or cipher suite:

```bash
# Check the TLS configuration on the gateway
istioctl proxy-config listeners <gateway-pod> -n istio-system -o json | \
  jq '.[].filterChains[].transportSocket.typedConfig.commonTlsContext'
```

You can configure minimum TLS version and cipher suites in the Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
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
        credentialName: my-tls-cert
        minProtocolVersion: TLSV1_2
        cipherSuites:
          - ECDHE-RSA-AES256-GCM-SHA384
          - ECDHE-RSA-AES128-GCM-SHA256
      hosts:
        - "*.example.com"
```

## Debugging Checklist

When you hit an SSL handshake error, work through this:

```bash
# 1. Where is the error? Gateway or mesh-internal?
kubectl logs <pod> -c istio-proxy -n production | grep -i "tls\|ssl"

# 2. For gateway: Does the secret exist and is it valid?
kubectl get secret <cert-name> -n istio-system
kubectl get secret <cert-name> -n istio-system -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates

# 3. For mTLS: Are both sides configured consistently?
istioctl authn tls-check <pod>.production target.production.svc.cluster.local

# 4. Are certificates expired?
istioctl proxy-config secret <pod> -n production

# 5. Is istiod healthy (certificate authority)?
kubectl logs -n istio-system deployment/istiod | grep "error\|CA"
```

SSL handshake errors always come down to one of these: wrong certificates, expired certificates, mismatched TLS configuration, or protocol mismatches. Identify which layer the error is at and the fix usually becomes clear.
