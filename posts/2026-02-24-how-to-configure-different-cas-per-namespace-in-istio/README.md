# How to Configure Different CAs per Namespace in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificate, Namespace Isolation, Multi-Tenancy, Security

Description: How to configure different certificate authorities for different namespaces in Istio, enabling multi-tenant certificate isolation and per-namespace trust boundaries.

---

In a multi-tenant Kubernetes cluster, you might want different namespaces to use different certificate authorities. This creates trust boundaries between tenants. Services within a namespace can share the same certificate signer, while services in different namespaces can be configured to use different signers and trust anchors. If those signers do not share a trusted root, cross-namespace mTLS connections will fail.

## Why Different CAs per Namespace?

The default Istio setup uses a single CA for the entire mesh. Every workload gets a certificate from the same CA, which means every workload can establish mTLS with every other workload (subject to authorization policies). In some scenarios, you need stronger isolation:

- Multi-tenant clusters where tenants should not be able to communicate at the TLS level
- Regulatory requirements that mandate separate PKI for different environments
- Gradual migration where different teams bring their own CAs
- Different certificate requirements (key sizes, algorithms) per namespace

## Using cert-manager for Per-Namespace CAs

The documented approach to different CAs per namespace in Istio is Istio's Kubernetes CSR integration with cert-manager's Kubernetes CSR controller. Different workloads request certificates with different signer names, and cert-manager signs those CSRs with the corresponding Issuer or ClusterIssuer.

Install cert-manager with the Kubernetes CSR controller enabled:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --set featureGates="ExperimentalCertificateSigningRequestControllers=true"
```

## Setting Up Per-Namespace Signers

Create a different cert-manager ClusterIssuer for each namespace's Istio signer:

```yaml
# Root CA for team-alpha
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-team-alpha
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: team-alpha-ca
  namespace: cert-manager
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
    name: selfsigned-team-alpha
    kind: ClusterIssuer
    group: cert-manager.io
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: team-alpha
spec:
  ca:
    secretName: team-alpha-ca-key-pair
```

```yaml
# Root CA for team-beta
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-team-beta
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: team-beta-ca
  namespace: cert-manager
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
    name: selfsigned-team-beta
    kind: ClusterIssuer
    group: cert-manager.io
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: team-beta
spec:
  ca:
    secretName: team-beta-ca-key-pair
```

These examples use separate self-signed roots. If you instead sign both namespace CAs from the same offline root, they share a common trust root but have separate signing certificates.

## Configuring Istio to Use Per-Namespace Signing

Configure Istio to delegate certificate signing to cert-manager:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        EXTERNAL_CA: ISTIOD_RA_KUBERNETES_API
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_CERT_SIGNER: istio-system
    caCertificates:
    - pem: |
        <istio-system root CA PEM>
      certSigners:
      - clusterissuers.cert-manager.io/istio-system
    - pem: |
        <team-alpha root CA PEM>
      certSigners:
      - clusterissuers.cert-manager.io/team-alpha
    - pem: |
        <team-beta root CA PEM>
      certSigners:
      - clusterissuers.cert-manager.io/team-beta
  components:
    pilot:
      k8s:
        env:
        - name: CERT_SIGNER_DOMAIN
          value: clusterissuers.cert-manager.io
        - name: PILOT_CERT_PROVIDER
          value: k8s.io/clusterissuers.cert-manager.io/istio-system
        overlays:
        - kind: ClusterRole
          name: istiod-clusterrole-istio-system
          patches:
          - path: rules[-1]
            value: |
              apiGroups:
              - certificates.k8s.io
              resourceNames:
              - clusterissuers.cert-manager.io/istio-system
              - clusterissuers.cert-manager.io/team-alpha
              - clusterissuers.cert-manager.io/team-beta
              resources:
              - signers
              verbs:
              - approve
```

With `EXTERNAL_CA: ISTIOD_RA_KUBERNETES_API`, istiod acts as a registration authority and uses Kubernetes CertificateSigningRequest resources instead of its built-in CA.

The default `istio-system` signer in this example also needs a matching `ClusterIssuer`, or you can change `ISTIO_META_CERT_SIGNER` and `PILOT_CERT_PROVIDER` to a signer you already created. Then configure each namespace to request the right signer:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ProxyConfig
metadata:
  name: team-alpha-cert-signer
  namespace: team-alpha
spec:
  environmentVariables:
    ISTIO_META_CERT_SIGNER: team-alpha
---
apiVersion: networking.istio.io/v1beta1
kind: ProxyConfig
metadata:
  name: team-beta-cert-signer
  namespace: team-beta
spec:
  environmentVariables:
    ISTIO_META_CERT_SIGNER: team-beta
```

## Trust Boundaries and Cross-Namespace Communication

When namespaces have different CAs, the trust boundary depends on whether they share a common root.

### Shared Root CA (Cross-Namespace mTLS Works)

If both namespace CAs are signed by the same root CA, workloads can still verify each other's certificates by trusting the root. This gives you separate signing authorities while maintaining mesh-wide communication:

```text
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
  name: team-alpha
spec:
  ca:
    secretName: team-alpha-ca-key-pair
---
# ClusterIssuer for team-beta with its own root
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: team-beta
spec:
  ca:
    secretName: team-beta-ca-key-pair
```

With separate roots, mTLS connections between team-alpha and team-beta will fail because neither trusts the other's root CA. This is the strongest form of isolation.

## Using AuthorizationPolicy for Namespace Isolation

Even without per-namespace CAs, you can achieve some isolation using AuthorizationPolicy:

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

This only allows traffic from the same namespace and the Istio system namespace. It is not the same as CA-level isolation, but it is simpler to set up.

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

If you want most namespaces isolated but some able to communicate, you can configure additional trust anchors for selected cert signers:

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
      certSigners:
      - clusterissuers.cert-manager.io/team-alpha
    - pem: |
        -----BEGIN CERTIFICATE-----
        <team-beta root CA>
        -----END CERTIFICATE-----
      certSigners:
      - clusterissuers.cert-manager.io/team-beta
```

This adds both root CAs to the mesh trust configuration and scopes each trust anchor to the matching Kubernetes signer.

## Practical Example: Dev and Prod Isolation

A common use case is isolating development and production namespaces:

```yaml
# dev namespace uses a dev CA from the dev-ca-key-pair Secret
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: dev
spec:
  ca:
    secretName: dev-ca-key-pair

---
# prod namespace uses a prod CA from the prod-ca-key-pair Secret
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: prod
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
  kubectl get clusterissuer "$ns"
  kubectl get certificate -n cert-manager "$ns-ca"
  for pod in $(kubectl get pods -n "$ns" -o jsonpath='{.items[*].metadata.name}'); do
    expiry=$(istioctl proxy-config secret "$pod.$ns" -o json 2>/dev/null | \
      jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' 2>/dev/null | \
      base64 -d 2>/dev/null | openssl x509 -enddate -noout 2>/dev/null)
    echo "  $pod: $expiry"
  done
done
```

Per-namespace CAs add complexity but provide real security benefits for multi-tenant environments. If you just need logical isolation, authorization policies are simpler. But if you need cryptographic isolation where different tenants cannot authenticate to each other at the mTLS layer, per-namespace CAs are the way to go.
