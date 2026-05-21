# How to Understand Istio's PKI (Public Key Infrastructure)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, PKI, Certificate, mTLS, Security

Description: A detailed look at Istio's PKI system including the certificate authority, certificate lifecycle, key management, and trust domains.

---

Istio's PKI is the backbone of its security model. It manages the certificates that enable mTLS, identity verification, and authorization policies. Every service in the mesh gets a cryptographic identity through this PKI, and the entire trust chain is managed automatically. Understanding how it works helps you operate it securely, rotate certificates correctly, and integrate with your organization's existing PKI infrastructure.

## PKI Components

Istio's PKI has several key components:

1. **Istiod CA** - The certificate authority that signs workload certificates
2. **SDS (Secret Discovery Service)** - The protocol Envoy uses to request certificates
3. **Node Agent (pilot-agent)** - Runs alongside Envoy and handles certificate rotation
4. **Root Certificate** - The trust anchor for the entire mesh

The flow is straightforward: Envoy asks for a certificate through SDS, pilot-agent generates a key pair and CSR, sends the CSR to Istiod, Istiod signs it, and the signed certificate comes back to Envoy.

## The Root Certificate

The root certificate is the top of the trust chain. All workload certificates chain up to this root. By default, Istiod generates a self-signed root certificate using RSA 2048:

```bash
# View the root certificate

kubectl get configmap istio-ca-root-cert -n istio-system -o jsonpath='{.data.root-cert\.pem}' | openssl x509 -text -noout
```

If you plugged in your own CA, you can also inspect the root certificate from the `cacerts` secret:

```bash
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -text -noout
```

By default, this root certificate is distributed to every namespace as a ConfigMap called `istio-ca-root-cert`:

```bash
kubectl get configmap istio-ca-root-cert -n default -o yaml
```

## Bringing Your Own CA

For production, you typically want to use your organization's existing CA rather than Istiod's self-signed root. This ensures your mesh certificates are trusted by your existing infrastructure.

### Using a Custom Root Certificate

Create a secret with your CA certificate and key:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=ca-cert.pem \
  --from-file=ca-key.pem=ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cert-chain.pem
```

Then install or restart Istio:

```bash
istioctl install --set values.global.pilotCertProvider=istiod
```

Istiod detects the `cacerts` secret and uses it as the signing CA instead of generating a self-signed one.

### Using cert-manager

You can also integrate with cert-manager through Istio's Kubernetes CSR integration. Do not point a cert-manager `Certificate` directly at the `cacerts` secret, because cert-manager writes keys such as `tls.crt`, `tls.key`, and `ca.crt`, while Istio's plug-in CA expects `ca-cert.pem`, `ca-key.pem`, `root-cert.pem`, and `cert-chain.pem`.

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
  components:
    pilot:
      k8s:
        env:
        - name: CERT_SIGNER_DOMAIN
          value: clusterissuers.cert-manager.io
        - name: PILOT_CERT_PROVIDER
          value: k8s.io/clusterissuers.cert-manager.io/istio-system
```

## Certificate Lifecycle

Every workload certificate goes through a lifecycle:

### Generation

When a pod starts, pilot-agent in the sidecar:

1. Generates an RSA private key by default, or an ECDSA key if `ECC_SIGNATURE_ALGORITHM` is set to `ECDSA`
2. Creates a CSR with the SPIFFE identity as the SAN (Subject Alternative Name)
3. Sends the CSR to Istiod over a secure gRPC channel

```bash
# Check the current certificate of a workload
istioctl proxy-config secret my-pod
```

Output shows the certificate's serial number, not-before, not-after dates.

### Validation

Istiod validates the CSR by:

1. Checking that the caller has the correct Kubernetes service account token
2. Verifying that the requested SPIFFE identity matches the caller's service account and namespace
3. Ensuring the CSR is properly formatted

### Signing

If validation passes, Istiod signs the certificate using its CA private key. The default certificate duration is 24 hours.

### Rotation

Before the certificate expires, pilot-agent automatically requests a new one. The rotation happens seamlessly with no downtime:

1. pilot-agent generates a new key pair and CSR
2. Sends the CSR to Istiod
3. Receives the new certificate
4. Updates Envoy through SDS

The rotation happens at approximately 50% of the certificate's lifetime (so for a 24-hour cert, rotation happens around 12 hours).

## Configuring Certificate Properties

You can customize certificate settings:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: "24h"
  values:
    pilot:
      env:
        CITADEL_SELF_SIGNED_CA_CERT_TTL: "87600h"  # 10 years for the root CA
        MAX_WORKLOAD_CERT_TTL: "48h"
        DEFAULT_WORKLOAD_CERT_TTL: "24h"
```

Environment variables for Istiod:

- `CITADEL_SELF_SIGNED_CA_CERT_TTL` - Lifetime of the self-signed root CA (default: 10 years)
- `DEFAULT_WORKLOAD_CERT_TTL` - Default lifetime for workload certificates when the client requests a non-positive TTL (default: 24 hours)
- `MAX_WORKLOAD_CERT_TTL` - Maximum allowed workload certificate lifetime

`SECRET_TTL` is configured in proxy metadata and controls the certificate lifetime requested by istio-agent for workloads.

## Trust Domains

The trust domain is the root of the SPIFFE identity hierarchy. By default, it's `cluster.local`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: my-org.example.com
```

With this config, identities look like:

```text
spiffe://my-org.example.com/ns/default/sa/reviews
```

Trust domains are important for multi-cluster setups. Two clusters can trust each other if they share the same root certificate, even if they have different trust domains:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: cluster-a.example.com
    trustDomainAliases:
      - cluster-b.example.com
```

The `trustDomainAliases` setting tells Istio to accept certificates from the aliased trust domains.

## Verifying PKI Health

Regularly check the health of your PKI:

```bash
# Check if workload certificates are valid
istioctl proxy-config secret my-pod -o json

# Verify the root certificate is distributed
kubectl get configmap istio-ca-root-cert -n default

# Check certificate expiration on a specific pod
istioctl proxy-config secret my-pod

# Check Istiod CA logs
kubectl logs -n istio-system -l app=istiod | grep -i "cert\|sign\|ca" | tail -20
```

## Common PKI Issues

**Expired certificates:** If the root CA expires, the entire mesh breaks. Monitor the root CA expiration and rotate it well before it expires.

**Clock skew:** Certificates have not-before and not-after times. If nodes have clock skew, certificates may appear invalid. Use NTP synchronization across your cluster.

**SDS connection failures:** If pilot-agent can't reach Istiod, certificate rotation fails. Check network connectivity and Istiod health.

```bash
# Check if SDS is working
kubectl exec my-pod -c istio-proxy -- pilot-agent request GET certs

# Check for certificate errors in proxy logs
kubectl logs my-pod -c istio-proxy | grep -i "cert\|tls\|secret" | tail -20
```

Istio's PKI handles the hard parts of certificate management automatically. But understanding how it works under the hood is essential for production operations, especially when you need to integrate with existing security infrastructure or troubleshoot authentication failures.
