# How to Fix mTLS Handshake Failures Between Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Security, Kubernetes, Troubleshooting

Description: Complete troubleshooting guide for mutual TLS handshake failures between services in an Istio service mesh.

---

Mutual TLS (mTLS) in Istio encrypts traffic between services and provides identity verification. When mTLS handshakes fail, you typically see connection reset errors, 503 responses, or upstream connect failures. These failures can be tricky because the error messages are often vague.

## Understanding mTLS Modes in Istio

Istio has three mTLS modes, and mixing them up is the number one cause of handshake failures:

- **PERMISSIVE**: Accepts both plaintext and mTLS traffic. This is the default.
- **STRICT**: Only accepts mTLS traffic. Plaintext connections are rejected.
- **DISABLE**: No mTLS. All traffic is plaintext.

The mode is set through PeerAuthentication resources:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: my-namespace
spec:
  mtls:
    mode: STRICT
```

## The Classic Problem: Strict Mode with No Sidecar

The most common failure scenario: the destination has STRICT mTLS enabled but the source doesn't have a sidecar proxy. Without a sidecar, the source sends plaintext, and the destination rejects it.

Check if both pods have sidecars:

```bash
kubectl get pods -n source-namespace -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[*].name}{"\n"}{end}'
```

```bash
kubectl get pods -n dest-namespace -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[*].name}{"\n"}{end}'
```

Both should include `istio-proxy`. If the source is missing it, either inject the sidecar or change the destination's PeerAuthentication to PERMISSIVE:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: allow-plaintext
  namespace: dest-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: PERMISSIVE
```

## DestinationRule TLS Mode Conflicts

A DestinationRule can override the TLS mode for outbound connections. If the DestinationRule says to use mTLS but the destination expects plaintext (or vice versa), the handshake fails.

Check for DestinationRules that set TLS mode:

```bash
kubectl get destinationrule -A -o yaml | grep -B 10 "mode:"
```

The DestinationRule TLS modes that matter:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: my-namespace
spec:
  host: my-service
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL  # Use Istio's built-in mTLS
```

Available modes:
- `ISTIO_MUTUAL`: Use Istio-managed certificates
- `MUTUAL`: Use custom certificates (you provide them)
- `SIMPLE`: One-way TLS (client verifies server)
- `DISABLE`: No TLS

If your PeerAuthentication is STRICT and your DestinationRule has `mode: DISABLE`, outbound traffic goes plaintext but the receiver expects mTLS. That's a handshake failure.

For most cases within the mesh, don't set a TLS mode in the DestinationRule at all. Let Istio's automatic mTLS handle it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: my-namespace
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    # No tls section - let Istio auto-detect
```

## Certificate Issues

Istio automatically provisions and rotates certificates for mTLS. But sometimes this process breaks.

Check if the certificate is valid in a sidecar:

```bash
istioctl proxy-config secret <pod-name> -n my-namespace
```

This shows the certificates loaded by the proxy. Look for:
- `default` - the workload certificate
- `ROOTCA` - the root CA certificate

If they're missing or expired, there's a problem with certificate provisioning. Check istiod logs:

```bash
kubectl logs -l app=istiod -n istio-system | grep -i "certificate\|cert\|error"
```

You can also check certificate expiration directly:

```bash
istioctl proxy-config secret <pod-name> -n my-namespace -o json | jq '.[0].secret.tlsCertificate.certificateChain.inlineBytes' -r | base64 -d | openssl x509 -noout -dates
```

## Root CA Mismatch

If you're running multiple Istio control planes or have migrated from one CA to another, different services might have certificates signed by different CAs. They can't verify each other's certificates.

Check the CA on both sides:

```bash
istioctl proxy-config secret <source-pod> -n source-ns -o json | jq '.[1].secret.validationContext.trustedCa.inlineBytes' -r | base64 -d | openssl x509 -noout -subject -issuer
```

```bash
istioctl proxy-config secret <dest-pod> -n dest-ns -o json | jq '.[1].secret.validationContext.trustedCa.inlineBytes' -r | base64 -d | openssl x509 -noout -subject -issuer
```

They should have the same root CA. If they don't, you have a trust domain problem.

## Port-Level mTLS Exclusions

Sometimes you need mTLS for most ports but not for a specific one (like a health check port). PeerAuthentication supports port-level settings:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: my-service-auth
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
    15021:
      mode: DISABLE
```

Port 15021 is Istio's health check port. If something is probing that port and failing because of mTLS, disable it at the port level.

## Debugging with Envoy Logs

Enable TLS debug logging:

```bash
istioctl proxy-config log <pod-name> -n my-namespace --level connection:debug,tls:debug
```

Send a request and check the logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep -i "tls\|ssl\|handshake"
```

Look for messages like:
- `TLS error: 268435581:SSL routines:OPENSSL_internal:CERTIFICATE_VERIFY_FAILED` - CA mismatch
- `TLS error: 268435703:SSL routines:OPENSSL_internal:WRONG_VERSION_NUMBER` - plaintext hitting TLS port
- `upstream connect error or disconnect/reset before headers` - generic handshake failure

## Auto mTLS and What Can Go Wrong

Istio has auto mTLS enabled by default since version 1.5. With auto mTLS, the sidecar automatically uses mTLS when talking to a service that has a sidecar, and plaintext when talking to one without.

But auto mTLS only works if there's no DestinationRule overriding the TLS settings. If you have a DestinationRule with `tls.mode: DISABLE`, auto mTLS is bypassed and traffic goes plaintext.

Check if auto mTLS is enabled:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep enableAutoMtls
```

The default is `true`. Don't change it unless you have a very specific reason.

## Summary

mTLS handshake failures usually boil down to a mismatch between what the source sends and what the destination expects. Check PeerAuthentication settings, make sure both sides have sidecars, verify there are no conflicting DestinationRule TLS settings, and inspect certificates if the basics look right. Auto mTLS handles most cases automatically, but explicit configuration can override it and cause problems.
