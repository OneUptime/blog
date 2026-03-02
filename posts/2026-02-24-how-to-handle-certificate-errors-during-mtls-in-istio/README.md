# How to Handle Certificate Errors During mTLS in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Certificate, Troubleshooting, Security

Description: A troubleshooting guide for common certificate errors during mTLS communication in Istio, with practical debugging steps and solutions for each error type.

---

mTLS certificate errors in Istio are some of the most frustrating issues to debug. The error messages from Envoy are often cryptic, and the problem could be in any part of the certificate chain. This guide walks through the most common certificate errors you will encounter and how to fix them.

## The Most Common Error: Connection Reset

The number one symptom of certificate problems in Istio is connection resets. Your application sees something like:

```
upstream connect error or disconnect/reset before headers. reset reason: connection termination
```

This is Envoy's way of saying the TLS handshake failed. The underlying cause could be many things, so you need to dig deeper.

## Step 1: Check the TLS Handshake

Start by looking at the Envoy proxy logs with debug logging enabled:

```bash
# Enable debug logging for the proxy
istioctl proxy-config log <pod-name> --level tls:debug

# Watch the logs
kubectl logs <pod-name> -c istio-proxy -f
```

With debug logging, you will see detailed TLS handshake information including the specific error.

## Common Certificate Errors

### Error: Certificate Verify Failed

```
TLS error: 268435581:SSL routines:OPENSSL_internal:CERTIFICATE_VERIFY_FAILED
```

This means the certificate presented by the peer could not be validated against the trusted CA certificates.

**Causes and fixes:**

1. The root CA certificate in the trust store does not match the CA that signed the peer's certificate:

```bash
# Compare the root cert fingerprints
# On the client side
istioctl proxy-config secret <client-pod> -o json | \
  jq -r '.dynamicActiveSecrets[] | select(.name=="ROOTCA") | .secret.validationContext.trustedCa.inlineBytes' | \
  base64 -d | openssl x509 -fingerprint -noout

# On the server side
istioctl proxy-config secret <server-pod> -o json | \
  jq -r '.dynamicActiveSecrets[] | select(.name=="ROOTCA") | .secret.validationContext.trustedCa.inlineBytes' | \
  base64 -d | openssl x509 -fingerprint -noout
```

Both should show the same fingerprint. If they do not, the root CA certificates are out of sync.

2. The intermediate CA certificate is missing from the chain:

```bash
# Check how many certs are in the chain
istioctl proxy-config secret <pod-name> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | grep -c "BEGIN CERTIFICATE"
```

You should see at least 2 (the workload cert and the intermediate CA cert). If you only see 1, the chain is incomplete.

### Error: Certificate Has Expired

```
TLS error: 268435640:SSL routines:OPENSSL_internal:CERTIFICATE_HAS_EXPIRED
```

This one is straightforward. Check the certificate dates:

```bash
istioctl proxy-config secret <pod-name> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -dates -noout
```

If the certificate has expired, the rotation mechanism failed. Check if istiod is healthy:

```bash
kubectl get pods -n istio-system -l app=istiod
kubectl logs -n istio-system deploy/istiod | grep -i error
```

Quick fix: restart the affected pod to force a new certificate:

```bash
kubectl delete pod <pod-name>
```

### Error: SAN Mismatch

When Envoy expects a specific SAN but the certificate presents a different one:

```
TLS error: SAN verification failed
```

This often happens when you have a DestinationRule with `subjectAltNames` that do not match the peer:

```yaml
# Check your DestinationRule
kubectl get destinationrule <name> -o yaml | grep -A 5 subjectAltNames
```

Make sure the SANs listed match the SPIFFE identity of the target service.

### Error: Handshake Timeout

```
TLS handshake timeout
```

This is not a certificate error per se, but it happens when one side of the connection expects mTLS and the other side does not.

Check the PeerAuthentication policy:

```bash
kubectl get peerauthentication --all-namespaces
```

If one namespace has STRICT mTLS and a client in another namespace does not have a sidecar, the handshake will fail. Either add a sidecar to the client or configure a PERMISSIVE policy for the server:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: permissive-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  mtls:
    mode: PERMISSIVE
```

### Error: No Certificate

```
SSL connection error: no certificate
```

The peer did not present a certificate at all. This usually means:

1. The sidecar is not injected on one side
2. The traffic is bypassing the sidecar (direct pod IP access)
3. The sidecar has not received its certificate yet (during startup)

```bash
# Check if the pod has a sidecar
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[*].name}'

# Should include "istio-proxy"
```

## Debugging with openssl

For deeper debugging, you can use openssl s_client directly from within a pod:

```bash
# Connect to a service and show certificate details
kubectl exec <pod-name> -c istio-proxy -- \
  openssl s_client -connect <target-service>:<port> \
  -cert /var/run/secrets/istio/cert-chain.pem \
  -key /var/run/secrets/istio/key.pem \
  -CAfile /var/run/secrets/istio/root-cert.pem \
  -verify_return_error
```

Actually, in newer versions of Istio, certificates are delivered via SDS rather than files. You can check the SDS state:

```bash
# Check SDS connection status
istioctl proxy-config secret <pod-name>
```

This shows you the certificate state including expiration times and whether the certificates are active.

## PERMISSIVE vs STRICT Mode Errors

A common source of errors is transitioning from PERMISSIVE to STRICT mTLS. With PERMISSIVE mode, plain text and mTLS connections are both accepted. With STRICT mode, only mTLS connections work.

Before switching to STRICT, verify that all clients have sidecars:

```bash
# Find pods without sidecars
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.containers | length == 1) | .metadata.namespace + "/" + .metadata.name'
```

Pods with only one container (no sidecar) will fail to connect to STRICT mTLS services.

## Systematic Debugging Checklist

When you hit a certificate error, work through this checklist:

```bash
# 1. Check if both pods have sidecars
kubectl get pod <source-pod> -o jsonpath='{.spec.containers[*].name}'
kubectl get pod <dest-pod> -o jsonpath='{.spec.containers[*].name}'

# 2. Check PeerAuthentication policies
kubectl get peerauthentication --all-namespaces

# 3. Check DestinationRule TLS settings
kubectl get destinationrule --all-namespaces -o yaml | grep -A 5 tls

# 4. Check certificate validity
istioctl proxy-config secret <source-pod>
istioctl proxy-config secret <dest-pod>

# 5. Check root CA consistency
istioctl proxy-config secret <source-pod> -o json | \
  jq -r '.dynamicActiveSecrets[] | select(.name=="ROOTCA") | .secret.validationContext.trustedCa.inlineBytes' | \
  base64 -d | openssl x509 -fingerprint -noout

# 6. Check istiod health
kubectl get pods -n istio-system -l app=istiod
kubectl logs -n istio-system deploy/istiod --tail=50

# 7. Check proxy logs with debug
istioctl proxy-config log <pod-name> --level tls:debug
kubectl logs <pod-name> -c istio-proxy --tail=100
```

## Preventing Certificate Errors

Prevention is better than debugging:

1. Monitor certificate expiration with Prometheus alerts
2. Keep istiod highly available with multiple replicas
3. Test mTLS configuration changes in a staging environment first
4. Use PERMISSIVE mode during rollouts and switch to STRICT only after verification
5. Keep your root CA lifetime reasonable (5-10 years) but track its expiration

Certificate errors during mTLS are always solvable. The key is having a systematic approach to debugging them. Start with the proxy logs, check the certificate chain, verify the trust configuration, and work from there.
