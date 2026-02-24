# How to Configure Different CAs per Namespace in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificates, Namespace Isolation, Multi-Tenancy, Security

Description: How to configure different certificate authorities for different namespaces in Istio, enabling multi-tenant certificate isolation and per-namespace trust boundaries.

---

In a multi-tenant Kubernetes cluster, you might want different namespaces to use different certificate authorities. This creates trust boundaries between tenants. Services within a namespace trust each other through their shared CA, but services in different namespaces cannot establish mTLS connections because their certificates come from different CAs.

## Why Different CAs per Namespace?

The default Istio setup uses a single CA for the entire mesh. Every workload gets a certificate from the same CA, which means every workload can establish mTLS with every other workload (subject to authorization policies). In some scenarios, you need stronger isolation:

- Multi-tenant clusters where tenants should not be able to communicate at the TLS level
- Regulatory requirements that mandate separate PKI for different environments
- Gradual migration where different teams bring their own CAs
- Different certificate requirements (key sizes, algorithms) per namespace

## Using cert-manager for Per-Namespace CAs

The most practical approach to per-namespace CAs in Istio is using cert-manager with the istio-csr component. This replaces istiod's built-in CA with cert-manager for certificate signing.

Install istio-csr:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install istio-csr jetstack/cert-manager-istio-csr \
  --namespace cert-manager \
  --set "app.tls.rootCAFile=/var/run/secrets/istio-csr/ca.pem" \
  --set "app.certmanager.issuer.group=cert-manager.io" \
  --set "app.certmanager.issuer.kind=Issuer" \
  --set "app.certmanager.issuer.name=istio-ca"
```

## Setting Up Per-Namespace Issuers

Create a different cert-manager Issuer in each namespace:

```yaml
# Namespace: team-alpha
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: istio-ca
  namespace: team-alpha
spec:
  ca:
    secretName: team-alpha-ca-key-pair
---
# The CA certificate for team-alpha
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: team-alpha-ca
  namespace: team-alpha
spec:
  isCA: true
  commonName: team-alpha-ca
  secretName: team-alpha-ca-key-pair
  duration: 8760h
  renewBefore: 720h
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: root-ca
    kind: ClusterIssuer
```

```yaml
# Namespace: team-beta
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: istio-ca
  namespace: team-beta
spec:
  ca:
    secretName: team-beta-ca-key-pair
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: team-beta-ca
  namespace: team-beta
spec:
  isCA: true
  commonName: team-beta-ca
  secretName: team-beta-ca-key-pair
  duration: 8760h
  renewBefore: 720h
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: root-ca
    kind: ClusterIssuer
```

Both intermediate CAs are signed by the same `root-ca` ClusterIssuer. This means they share a common trust root but have separate signing certificates.

## Configuring Istio to Use Per-Namespace Signing

Configure Istio to delegate certificate signing to cert-manager:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        ENABLE_CA_SERVER: "false"
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_CERT_SIGNER: istio-system
```

With `ENABLE_CA_SERVER: "false"`, istiod does not run its own CA. All certificate signing goes through cert-manager via istio-csr.

## Trust Boundaries and Cross-Namespace Communication

When namespaces have different CAs, the trust boundary depends on whether they share a common root.

### Shared Root CA (Cross-Namespace mTLS Works)

If both namespace CAs are signed by the same root CA, workloads can still verify each other's certificates by trusting the root. This gives you separate signing authorities while maintaining mesh-wide communication:

```
Root CA (shared)
  ├── team-alpha Intermediate CA
  │     └── team-alpha workload certs
  └── team-beta Intermediate CA
        └── team-beta workload certs
```

### Separate Root CAs (Full Isolation)

For full isolation, use completely separate root CAs:

```yaml
# ClusterIssuer for team-alpha with its own root
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: root-ca-alpha
spec:
  selfSigned: {}
---
# ClusterIssuer for team-beta with its own root
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: root-ca-beta
spec:
  selfSigned: {}
```

With separate roots, mTLS connections between team-alpha and team-beta will fail because neither trusts the other's root CA. This is the strongest form of isolation.

## Using PeerAuthentication for Namespace Isolation

Even without per-namespace CAs, you can achieve some isolation using PeerAuthentication and AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: namespace-isolation
  namespace: team-alpha
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["team-alpha"]
  - from:
    - source:
        namespaces: ["istio-system"]
```

This only allows traffic from the same namespace and the Istio system namespace. It is not as strong as CA-level isolation (someone could disable the policy), but it is simpler to set up.

## Verifying Per-Namespace Certificates

Check that workloads in different namespaces have certificates from different CAs:

```bash
# Check team-alpha workload certificate issuer
istioctl proxy-config secret <team-alpha-pod>.team-alpha -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -issuer -noout

# Check team-beta workload certificate issuer
istioctl proxy-config secret <team-beta-pod>.team-beta -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -issuer -noout
```

The issuers should be different (team-alpha-ca vs team-beta-ca).

## Selective Cross-Namespace Trust

If you want most namespaces isolated but some able to communicate, you can configure selective trust:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    caCertificates:
    - pem: |
        -----BEGIN CERTIFICATE-----
        <team-alpha root CA>
        -----END CERTIFICATE-----
    - pem: |
        -----BEGIN CERTIFICATE-----
        <team-beta root CA>
        -----END CERTIFICATE-----
```

This adds both root CAs to the trust bundle for specific workloads that need cross-namespace access.

## Practical Example: Dev and Prod Isolation

A common use case is isolating development and production namespaces:

```yaml
# dev namespace uses a dev CA
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: istio-ca
  namespace: dev
spec:
  ca:
    secretName: dev-ca-key-pair

---
# prod namespace uses a prod CA
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: istio-ca
  namespace: prod
spec:
  ca:
    secretName: prod-ca-key-pair
```

This ensures that even if someone accidentally misconfigures a VirtualService or DestinationRule, dev services cannot talk to prod services at the TLS level.

## Monitoring Per-Namespace CA Health

Monitor each namespace's CA independently:

```bash
# Check certificate status per namespace
for ns in team-alpha team-beta; do
  echo "=== $ns ==="
  kubectl get certificate -n "$ns"
  for pod in $(kubectl get pods -n "$ns" -o jsonpath='{.items[*].metadata.name}'); do
    expiry=$(istioctl proxy-config secret "$pod.$ns" -o json 2>/dev/null | \
      jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' 2>/dev/null | \
      base64 -d 2>/dev/null | openssl x509 -enddate -noout 2>/dev/null)
    echo "  $pod: $expiry"
  done
done
```

Per-namespace CAs add complexity but provide real security benefits for multi-tenant environments. If you just need logical isolation, authorization policies are simpler. But if you need cryptographic isolation where different tenants literally cannot decrypt each other's traffic, per-namespace CAs are the way to go.
