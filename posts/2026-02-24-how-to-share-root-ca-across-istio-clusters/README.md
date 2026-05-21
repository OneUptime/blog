# How to Share Root CA Across Istio Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificate Authority, Multi-Cluster, Security, PKI

Description: How to create and distribute a shared root certificate authority across multiple Istio clusters for cross-cluster trust and mTLS communication.

---

Most multi-primary Istio deployments need a shared root certificate authority. Without a common trust bundle, workloads in different clusters cannot verify each other's certificates, and cross-cluster mTLS breaks. The root CA is the trust anchor that makes the multi-cluster mesh work. In a primary-remote deployment with a single Istiod CA issuing certificates for all clusters, you may not need to generate separate per-cluster CAs.

This guide covers multiple approaches to sharing a root CA: using Istio's built-in tools, integrating with an external CA like cert-manager, and using a cloud-managed CA service.

## Why a Shared Root CA Matters

Istio issues X.509 certificates to every sidecar proxy. These certificates are used for mTLS - mutual authentication between services. When service A in cluster1 calls service B in cluster2, both sidecars need to validate each other's certificate.

Certificate validation works by checking the chain of trust. A workload cert is signed by an intermediate CA, which is signed by the root CA. If both clusters share the same root CA, any workload can validate any other workload's certificate, regardless of which cluster issued it.

If you skip this step and let each primary cluster generate its own self-signed root CA (the default Istio behavior), cross-cluster mTLS will fail with certificate verification errors.

## Approach 1: Istio's Built-in Certificate Generation

Istio provides Makefiles for generating a self-signed root CA and per-cluster intermediate CAs. This is the quickest path for getting started.

### Generate the Root CA

Clone the Istio repository or download the cert generation tools:

```bash
mkdir -p certs
cd certs

# If you have the Istio repo cloned:

make -f /path/to/istio/tools/certs/Makefile.selfsigned.mk root-ca
```

This creates four files:
- `root-cert.pem` - Root certificate (distribute to all clusters)
- `root-key.pem` - Root private key (keep extremely secure)
- `root-ca.conf` - OpenSSL config used for generation
- `root-cert.csr` - Certificate signing request

### Generate Intermediate CAs

Each cluster gets its own intermediate CA:

```bash
make -f /path/to/istio/tools/certs/Makefile.selfsigned.mk cluster1-cacerts
make -f /path/to/istio/tools/certs/Makefile.selfsigned.mk cluster2-cacerts
make -f /path/to/istio/tools/certs/Makefile.selfsigned.mk cluster3-cacerts
```

Each command creates a directory with:
- `ca-cert.pem` - Intermediate CA certificate
- `ca-key.pem` - Intermediate CA private key
- `root-cert.pem` - Copy of the root certificate
- `cert-chain.pem` - Full chain (intermediate + root)

### Distribute to Clusters

Load the certificates as Kubernetes secrets:

```bash
for CLUSTER in cluster1 cluster2 cluster3; do
  kubectl create namespace istio-system --context="${CLUSTER}" 2>/dev/null || true
  kubectl create secret generic cacerts -n istio-system --context="${CLUSTER}" \
    --from-file="${CLUSTER}/ca-cert.pem" \
    --from-file="${CLUSTER}/ca-key.pem" \
    --from-file="${CLUSTER}/root-cert.pem" \
    --from-file="${CLUSTER}/cert-chain.pem"
done
```

The secret must be named exactly `cacerts` and must be in the `istio-system` namespace. Istiod looks for this specific secret name.

### Secure the Root Key

After generating intermediate CAs, the root private key should be stored offline or in a hardware security module. You do not need it during normal operations. You only need it when adding a new cluster to the mesh (to generate a new intermediate CA).

```bash
# Move root key to secure storage
gpg --symmetric --cipher-algo AES256 root-key.pem
# Then delete the plaintext key
rm root-key.pem
```

## Approach 2: Using cert-manager as the CA

If you already use cert-manager in your clusters, you can use it as the CA behind Istio by integrating through istio-csr, or by issuing an intermediate certificate and converting it into Istio's `cacerts` secret format. This gives you integration with external issuers and cert-manager-managed renewal for the certificates it owns.

First, create a root CA as a cert-manager Issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: istio-root-ca
spec:
  ca:
    secretName: istio-root-ca-secret
```

Create the root CA secret that cert-manager will use:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: istio-root-ca-secret
  namespace: cert-manager
type: kubernetes.io/tls
data:
  tls.crt: <base64-root-cert>
  tls.key: <base64-root-key>
  ca.crt: <base64-root-cert>
```

Then create a Certificate resource that generates an intermediate CA:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: istio-ca
  namespace: istio-system
spec:
  isCA: true
  commonName: istio-ca
  secretName: istio-ca-tls
  duration: 8760h    # 1 year
  renewBefore: 720h  # 30 days before expiry
  issuerRef:
    name: istio-root-ca
    kind: ClusterIssuer
  secretTemplate:
    labels:
      istio.io/key-and-cert: istio-ca
```

Note that cert-manager uses different key names in the secret (`tls.crt`, `tls.key`, `ca.crt`) than what Istio's plug-in CA mode expects (`ca-cert.pem`, `ca-key.pem`, `root-cert.pem`, `cert-chain.pem`). Istiod will not read a cert-manager TLS secret as `cacerts` just because it has the same secret name.

If you use istio-csr, install Istio so workloads request certificates from the istio-csr service and disable Istiod's built-in CA server:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      caAddress: cert-manager-istio-csr.cert-manager.svc:443
  components:
    pilot:
      k8s:
        env:
        - name: ENABLE_CA_SERVER
          value: "false"
```

Alternatively, build the `cacerts` secret yourself from the issued cert-manager secret by mapping the issued certificate, private key, root certificate, and certificate chain to the file names Istio expects.

## Approach 3: Cloud Provider CA

Major cloud providers offer managed CA services that can serve as your root CA:

### Google Cloud Certificate Authority Service

For a Kubernetes CSR-based integration, the exact signer name and trust bundle come from the CA controller you install. The Istio configuration needs to point workloads at that signer and include the corresponding root certificate in `meshConfig.caCertificates`:

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
        <root-ca-pem>
      certSigners:
      - <signer-domain>/istio-system
  components:
    pilot:
      k8s:
        env:
        - name: CERT_SIGNER_DOMAIN
          value: <signer-domain>
        - name: PILOT_CERT_PROVIDER
          value: k8s.io/<signer-domain>/istio-system
```

### AWS Private CA

You can use AWS Private Certificate Authority to create a root CA and issue intermediate certificates that get loaded into each EKS cluster the same way as self-signed certs.

## Rotating the Root CA

Root CA rotation is one of the trickier operations in a multi-cluster mesh. You cannot just swap the root CA because existing workload certificates would become untrusted.

The safe approach is:

1. Add the new root CA to the trust bundle (both old and new roots are trusted)
2. Generate new intermediate CAs signed by the new root
3. Roll out the new intermediate CAs to all clusters
4. Wait for all workload certificates to be reissued (up to 24 hours)
5. Remove the old root CA from the trust bundle

You can check certificate age on a proxy:

```bash
istioctl proxy-config secret deployment/sleep -n sample --context="${CTX_CLUSTER1}" -o json | \
  jq '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' -r | \
  base64 -d | openssl x509 -dates -noout
```

## Verifying Root CA Consistency

After deploying certificates to all clusters, verify they share the same root:

```bash
for CTX in cluster1 cluster2 cluster3; do
  echo "=== ${CTX} ==="
  kubectl get secret cacerts -n istio-system --context="${CTX}" \
    -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -fingerprint -noout
done
```

All fingerprints should be identical.

## Summary

Sharing a root CA across Istio clusters is the foundation of multi-cluster security. The simplest approach is Istio's built-in certificate generation tools. For production environments, consider cert-manager or a cloud-managed CA service for better lifecycle management. Whichever approach you choose, the critical point is that all clusters in the mesh must trust the same root CA, and the root private key must be treated as the crown jewel of your PKI infrastructure.
