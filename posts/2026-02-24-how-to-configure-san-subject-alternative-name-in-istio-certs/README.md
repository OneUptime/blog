# How to Configure SAN (Subject Alternative Name) in Istio Certs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SAN, Certificates, mTLS, SPIFFE, Security

Description: Learn how Subject Alternative Names work in Istio certificates, how SPIFFE URIs map to workload identities, and how to configure custom SANs for your services.

---

The Subject Alternative Name (SAN) field in X.509 certificates is where Istio stores workload identity information. Every certificate that Istio issues includes a SAN, and understanding how SANs work is important for configuring authorization policies, debugging mTLS, and integrating with external systems.

## What is a Subject Alternative Name?

In the old days, certificate identity was stored in the Subject field (specifically the Common Name, or CN). Modern TLS uses the SAN extension instead, because it supports multiple identities and different identity types. A SAN can contain:

- DNS names (e.g., `my-api.default.svc.cluster.local`)
- IP addresses (e.g., `10.0.0.5`)
- URIs (e.g., `spiffe://cluster.local/ns/default/sa/my-api`)
- Email addresses

Istio primarily uses URI-type SANs to encode SPIFFE identities.

## How Istio Sets the SAN

When istiod signs a workload certificate, it sets the SAN based on the pod's Kubernetes service account. The SAN format follows the SPIFFE specification:

```text
spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>
```

You can see this by extracting the certificate from a running proxy:

```bash
istioctl proxy-config secret <pod-name>.default -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep -A 2 "Subject Alternative Name"
```

The output will look like:

```text
X509v3 Subject Alternative Name: critical
    URI:spiffe://cluster.local/ns/default/sa/my-api
```

## SAN and Authorization Policies

Istio authorization policies use SANs to identify workloads. When you write a policy that references a service account, Istio is actually checking the SAN in the peer certificate:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/frontend"]
```

The `principals` field matches against the SPIFFE ID in the SAN. The format is `<trust-domain>/ns/<namespace>/sa/<service-account>` (without the `spiffe://` prefix).

You can also use wildcards:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-namespace
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend"]
```

Under the hood, the `namespaces` field expands to match any SPIFFE ID containing that namespace.

## Custom Trust Domains

The trust domain defaults to `cluster.local`, but you can change it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: my-company.com
```

After changing the trust domain, your SANs will look like:

```text
spiffe://my-company.com/ns/default/sa/my-api
```

This matters when you are federating multiple meshes. Each mesh can have its own trust domain, and you can configure trust between them.

## Multi-Mesh Trust with Trust Domain Aliases

When services in different meshes need to talk to each other, you need to configure trust domain aliases:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: mesh1.example.com
    trustDomainAliases:
    - mesh2.example.com
    - old-mesh.example.com
```

With this configuration, your mesh will trust certificates with SANs from any of these trust domains. This is useful during migrations where you are moving from one mesh to another.

## DNS SANs for Gateway Certificates

While workload certificates use URI SANs, gateway certificates typically need DNS SANs for TLS termination. When you configure a Gateway resource with a TLS certificate, the certificate needs DNS SANs that match the hostname:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
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
    hosts:
    - "api.example.com"
```

The certificate stored in the `my-tls-cert` secret needs a SAN entry for `api.example.com`:

```bash
# Create a certificate with a DNS SAN
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 \
  -subj "/CN=api.example.com" \
  -addext "subjectAltName=DNS:api.example.com,DNS:*.example.com" \
  -nodes

# Create the Kubernetes secret
kubectl create secret tls my-tls-cert \
  --cert=cert.pem \
  --key=key.pem \
  -n istio-system
```

## Verifying SAN Matching

When debugging connection issues, you can verify that the SANs match what your policies expect:

```bash
# Check what SAN a workload has
istioctl proxy-config secret <pod-name> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep URI

# Check what principals an authorization policy expects
kubectl get authorizationpolicy <policy-name> -o yaml | grep principals
```

If the SAN in the certificate does not match what the authorization policy expects, the request will be denied.

## SAN Validation in DestinationRule

You can configure SAN validation when connecting to external services:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api
  namespace: default
spec:
  host: external-api.example.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      subjectAltNames:
      - external-api.example.com
```

The `subjectAltNames` field tells Envoy to verify that the server certificate contains one of the listed SANs. If it does not match, the connection fails. This protects against man-in-the-middle attacks.

For mTLS to an external service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api
  namespace: default
spec:
  host: external-api.example.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/certs/client.pem
      privateKey: /etc/certs/key.pem
      caCertificates: /etc/certs/ca.pem
      subjectAltNames:
      - external-api.example.com
```

## SAN and PeerAuthentication

PeerAuthentication controls how mTLS is enforced, but it does not directly configure SANs. The SANs are determined by the workload's service account and trust domain:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: default
spec:
  mtls:
    mode: STRICT
```

When mTLS mode is STRICT, every connection must present a certificate with a valid SAN from a trusted CA.

## Troubleshooting SAN Issues

Common SAN-related problems:

1. **Authorization policy denials** - The principal in the policy does not match the SAN in the certificate. Check the exact SPIFFE format.

2. **Gateway TLS errors** - The certificate does not have a DNS SAN matching the requested hostname. Browsers and clients check the SAN, not the CN.

3. **Trust domain mismatches** - Services in different clusters have different trust domains and no aliases configured.

```bash
# Verify the full certificate details
openssl s_client -connect <service-ip>:<port> -servername <hostname> 2>/dev/null | \
  openssl x509 -text -noout | grep -A 5 "Subject Alternative Name"
```

SANs are the foundation of identity in Istio. Getting them right is critical for mTLS, authorization policies, and cross-mesh communication. The good news is that for standard in-mesh communication, Istio handles SANs automatically. You only need to think about them when configuring gateways, external services, or cross-cluster federation.
