# How to Debug TLS Connection Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, Debugging, Troubleshooting, Service Mesh

Description: Practical debugging techniques for diagnosing and fixing TLS connection failures in Istio including certificate issues, mTLS conflicts, and handshake errors.

---

TLS issues in Istio can be some of the most frustrating problems to debug. The symptoms are often vague - connection resets, 503 errors, or timeouts - and the root cause could be anything from an expired certificate to a misconfigured PeerAuthentication policy. This guide walks through systematic debugging approaches that will help you find the problem faster.

## Common Symptoms

Before jumping into debugging tools, recognize what TLS issues look like:

- **Connection reset by peer**: Often means one side expects mTLS and the other is sending plaintext
- **503 Service Unavailable**: Can indicate TLS handshake failure between sidecars
- **SSL: CERTIFICATE_VERIFY_FAILED**: Certificate chain validation failed
- **Connection timeout**: Could be TLS version mismatch or cipher suite incompatibility
- **404 Not Found from the gateway**: SNI routing failure due to certificate or host mismatch

## Step 1: Check the Basics

Start with the obvious stuff. Is the sidecar running? Are certificates valid?

```bash
# Is the sidecar injected and running?
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[*].name}'

# Check sidecar certificate status
istioctl proxy-config secret <pod-name> -n <namespace>
```

The secret output should show:

```text
RESOURCE NAME     TYPE           STATUS   VALID CERT   SERIAL NUMBER   NOT AFTER                NOT BEFORE
default           Cert Chain     ACTIVE   true         ...             2026-02-25T12:00:00Z     2026-02-24T12:00:00Z
ROOTCA            CA             ACTIVE   true         ...             2036-02-22T12:00:00Z     2026-02-24T12:00:00Z
```

If VALID CERT shows `false` or the dates are wrong, you have a certificate problem.

## Step 2: Examine Certificate Details

When certificates look suspicious, dig deeper:

```bash
# Extract and decode the workload certificate
istioctl proxy-config secret <pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout
```

Key things to look for:

- **Issuer**: Should match your mesh CA (istiod or your custom CA)
- **Subject Alternative Name**: Should be `spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>`
- **Not Before / Not After**: Certificate should be currently valid
- **Key Usage**: Should include Digital Signature

Also check the root CA:

```bash
istioctl proxy-config secret <pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[1].secret.validationContext.trustedCa.inlineBytes' | \
  base64 -d | openssl x509 -text -noout
```

## Step 3: Check PeerAuthentication Conflicts

Conflicting PeerAuthentication policies are a common source of issues. Check what policies apply:

```bash
# List all PeerAuthentication policies
kubectl get peerauthentication --all-namespaces

# Check the effective policy for a specific workload
istioctl x describe pod <pod-name> -n <namespace>
```

The `describe` command shows which PeerAuthentication policy is effective for the pod. Watch for:

- A workload-specific policy overriding a namespace policy
- Port-level settings that conflict with the general mode
- A STRICT policy in the namespace but clients without sidecars trying to connect

```bash
# Get detailed policy information
kubectl get peerauthentication -n <namespace> -o yaml
```

## Step 4: Check DestinationRule TLS Settings

DestinationRules control outbound TLS behavior. A mismatch between DestinationRule TLS mode and PeerAuthentication mode causes failures:

```bash
# List all destination rules
kubectl get destinationrules --all-namespaces

# Check specific destination rule
kubectl get destinationrule <name> -n <namespace> -o yaml
```

Common mismatches:
- PeerAuthentication is STRICT but DestinationRule has `mode: DISABLE`
- PeerAuthentication is DISABLE but DestinationRule has `mode: ISTIO_MUTUAL`
- DestinationRule has `mode: MUTUAL` with wrong certificate paths

## Step 5: Read the Envoy Logs

Envoy logs contain detailed TLS error information. Enable debug logging for TLS:

```bash
# Set TLS debug logging on a specific pod
istioctl proxy-config log <pod-name> -n <namespace> --level connection:debug,tls:debug
```

Then reproduce the issue and check logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n <namespace> --tail=100 | grep -i "tls\|ssl\|cert\|handshake"
```

Common log messages and what they mean:

- `TLS error: 268435581:SSL routines:OPENSSL_internal:CERTIFICATE_VERIFY_FAILED` - The server certificate could not be verified against the trusted CA
- `TLS error: 268435703:SSL routines:OPENSSL_internal:WRONG_VERSION_NUMBER` - Plaintext was sent to a TLS listener or vice versa
- `upstream connect error or disconnect/reset before headers` - Often a TLS handshake failure

## Step 6: Test Connections Manually

Use `openssl` from within the mesh to test TLS connections:

```bash
# Test TLS to a service from a pod with a sidecar
kubectl exec <pod-name> -c istio-proxy -- \
  openssl s_client -connect <service>:443 -showcerts 2>&1 | head -50
```

For testing mTLS specifically, you need to provide the client certificate:

```bash
# Get the certificate and key from the sidecar
kubectl exec <pod-name> -c istio-proxy -- \
  cat /var/run/secrets/istio/cert-chain.pem > /tmp/cert.pem

kubectl exec <pod-name> -c istio-proxy -- \
  cat /var/run/secrets/istio/key.pem > /tmp/key.pem

# Test mTLS connection
kubectl exec <pod-name> -c istio-proxy -- \
  openssl s_client -connect <service>:15006 \
    -cert /var/run/secrets/istio/cert-chain.pem \
    -key /var/run/secrets/istio/key.pem
```

## Step 7: Analyze with istioctl

Istio provides built-in analysis that catches many TLS issues:

```bash
# Run mesh-wide analysis
istioctl analyze --all-namespaces

# Analyze a specific namespace
istioctl analyze -n production
```

The analyzer checks for:
- Conflicting PeerAuthentication and DestinationRule settings
- Missing DestinationRules for services with strict mTLS
- Gateway TLS configuration issues
- Certificate reference problems

## Step 8: Check Gateway TLS Issues

For ingress gateway TLS problems:

```bash
# Check gateway listener configuration
istioctl proxy-config listener istio-ingressgateway-xxxx -n istio-system

# Check if the certificate is loaded
istioctl proxy-config secret istio-ingressgateway-xxxx -n istio-system
```

If the secret is not showing up, verify it exists and has the right format:

```bash
# Check the secret
kubectl get secret <credential-name> -n istio-system -o yaml

# Verify the certificate is valid
kubectl get secret <credential-name> -n istio-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

Test the gateway externally:

```bash
# Verbose TLS handshake
curl -vvv https://app.example.com --resolve "app.example.com:443:<gateway-ip>"

# Test specific TLS version
openssl s_client -connect <gateway-ip>:443 -servername app.example.com -tls1_2
```

## Step 9: Check for Clock Skew

Certificate validation depends on accurate time. If a node's clock is off, certificates may appear invalid:

```bash
# Check node time
kubectl get nodes -o wide
kubectl debug node/<node-name> -it --image=busybox -- date
```

Compare with the certificate's Not Before and Not After dates. Even a few minutes of skew can cause problems if a certificate was just issued.

## Quick Reference Debugging Checklist

```text
1. Is the sidecar running?                    kubectl get pod -o jsonpath='{.spec.containers[*].name}'
2. Are certificates valid?                    istioctl proxy-config secret <pod>
3. What PeerAuthentication applies?           istioctl x describe pod <pod>
4. Any conflicting DestinationRules?          kubectl get dr --all-namespaces
5. What do Envoy logs say?                    kubectl logs <pod> -c istio-proxy
6. Does istioctl analyze find issues?         istioctl analyze --all-namespaces
7. Can openssl connect?                       kubectl exec <pod> -c istio-proxy -- openssl s_client ...
8. Is the clock accurate?                     Check node time vs certificate dates
```

TLS debugging in Istio is methodical work. Start with the symptoms, narrow down the layer (gateway, sidecar, certificate, policy), and use the right tool for that layer. Most TLS issues come down to one of three things: wrong or expired certificates, mismatched mTLS policies, or sidecars not being where they need to be. Once you identify which category your issue falls into, the fix is usually straightforward.
