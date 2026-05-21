# How to Handle Certificate Management in Federated Meshes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Federation, Certificate, PKI, Security, Kubernetes

Description: How to manage certificate lifecycles across federated Istio meshes, including issuance, rotation, monitoring, and external CA integration.

---

Certificate management is the backbone of security in federated Istio meshes. Every mTLS connection, every identity verification, every cross-mesh trust relationship depends on certificates being valid, properly chained, and rotated before they expire. Mess up the certificates and your entire federation stops working.

This post covers the practical side of certificate management in a federated setup: how certificates flow through the system, how to integrate with external CAs, how to rotate certificates safely, and how to monitor certificate health.

## How Istio Certificate Issuance Works

Istio's certificate architecture has three layers:

1. **Root CA certificate**: The top of the trust chain. All workload certificates ultimately chain back to this.
2. **Intermediate CA certificate**: Used by istiod to sign workload certificates. Each mesh in a federation typically has its own intermediate CA.
3. **Workload certificates**: Short-lived certificates issued to each sidecar proxy. These are automatically rotated by istiod.

When a sidecar proxy starts up, it generates a private key and sends a Certificate Signing Request (CSR) to istiod. Istiod signs the CSR with the intermediate CA and returns the certificate. The proxy uses this certificate for mTLS connections.

You can see the current workload certificate:

```bash
istioctl proxy-config secret \
  $(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}') \
  -n sample -o json | jq '.dynamicActiveSecrets[0].secret.tlsCertificate'
```

## Setting Up the CA Hierarchy for Federation

For federation, you need a shared root CA with separate intermediate CAs per mesh. Here's how to set it up properly.

Generate the root CA with a long validity period (10 years is typical):

```bash
openssl req -new -newkey rsa:4096 -x509 -sha256 \
  -days 3650 -nodes \
  -keyout root-key.pem \
  -out root-cert.pem \
  -subj "/O=MyOrg Inc./CN=Federation Root CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"
```

Generate intermediate CAs for each mesh (5-year validity):

```bash
# Generate key and CSR for mesh-west

openssl req -new -newkey rsa:4096 -nodes \
  -keyout west-key.pem \
  -out west-csr.pem \
  -subj "/O=MyOrg Inc./CN=Mesh West Intermediate CA"

# Sign with root CA
openssl x509 -req -in west-csr.pem \
  -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -out west-cert.pem \
  -days 1825 -sha256 \
  -extfile <(printf "basicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign")

# Build the chain
cat west-cert.pem root-cert.pem > west-chain.pem
```

Repeat for mesh-east with corresponding file names.

Install the certificates into each mesh:

```bash
kubectl create secret generic cacerts -n istio-system \
  --context=cluster-west \
  --from-file=ca-cert.pem=west-cert.pem \
  --from-file=ca-key.pem=west-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=west-chain.pem
```

## Integrating with External CAs

For production environments, you probably want to use an external CA instead of managing certificates yourself. Istio supports several integrations.

### HashiCorp Vault Integration

Use Vault's PKI secrets engine to issue the intermediate CA, then install the resulting CA files into Istio's `cacerts` secret. Istio does not read Vault PKI directly by setting Vault connection details on `istiod`; it reads the signing certificate, signing key, root certificate, and chain from the mounted `cacerts` secret.

```bash
# Example: generate an intermediate CSR in Vault and sign it with the root PKI mount
vault write -format=json pki_int/intermediate/generate/exported \
  common_name="Mesh West Intermediate CA" \
  ttl="43800h" > west-intermediate.json

jq -r '.data.csr' west-intermediate.json > west-csr.pem
jq -r '.data.private_key' west-intermediate.json > west-key.pem

vault write -format=json pki/root/sign-intermediate \
  csr=@west-csr.pem \
  format=pem \
  ttl="43800h" > west-signed.json

jq -r '.data.certificate' west-signed.json > west-cert.pem
jq -r '.data.issuing_ca' west-signed.json > root-cert.pem
cat west-cert.pem root-cert.pem > west-chain.pem

kubectl create secret generic cacerts -n istio-system \
  --context=cluster-west \
  --from-file=ca-cert.pem=west-cert.pem \
  --from-file=ca-key.pem=west-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=west-chain.pem
```

### cert-manager Integration

cert-manager is a popular choice because it runs natively in Kubernetes. For Istio workload certificates, integrate it through Istio's Kubernetes CSR external CA flow or cert-manager's `istio-csr` agent, rather than pointing an Istio `cacerts` secret at a cert-manager `Certificate` secret.

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
          <cert-manager issuer CA certificate>
        certSigners:
          - clusterissuers.cert-manager.io/istio-system
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
                  resources:
                    - signers
                  verbs:
                    - approve
```

With this model, cert-manager handles signing and renewal through its issuer configuration, while Istio requests workload certificates through the Kubernetes CSR API.

## Certificate Rotation Strategy

Certificate rotation in a federated setup has three levels, and each needs a different approach.

### Workload Certificate Rotation

Istio handles this automatically. By default, workload certificates are valid for 24 hours and the proxy agent rotates them before expiry. You can adjust this:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: "12h"                  # Certificate lifetime
        SECRET_GRACE_PERIOD_RATIO: "0.5"   # Start rotation halfway through the lifetime
```

### Intermediate CA Rotation

This requires a rolling update approach:

1. Generate a new intermediate CA signed by the same root
2. Update the `cacerts` secret with the new intermediate CA
3. Restart istiod to pick up the new CA
4. Wait for all workload certificates to be re-issued (happens automatically over the next rotation cycle)

```bash
# Update the secret
kubectl create secret generic cacerts -n istio-system \
  --context=cluster-west \
  --from-file=ca-cert.pem=west-cert-new.pem \
  --from-file=ca-key.pem=west-key-new.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=west-chain-new.pem \
  --dry-run=client -o yaml | kubectl apply --context=cluster-west -f -

# Restart istiod
kubectl rollout restart deployment/istiod -n istio-system --context=cluster-west

# Monitor the rollout
kubectl rollout status deployment/istiod -n istio-system --context=cluster-west
```

### Root CA Rotation

Root CA rotation is the most delicate operation. You need a transition period where both the old and new roots are trusted.

Step 1: Generate a new root CA.

Step 2: Create new intermediate CAs signed by the new root.

Step 3: Update the trust bundle in `root-cert.pem` to include both roots during the transition, and use a `cert-chain.pem` that contains the new intermediate certificate and its issuing chain:

```bash
# root-cert.pem should contain:
# 1. New root cert
# 2. Old root cert (for backward compatibility during transition)
cat new-root-cert.pem old-root-cert.pem > transition-root.pem

# cert-chain.pem should contain the chain used by istiod:
# 1. New intermediate cert
# 2. New root cert
cat new-west-cert.pem new-root-cert.pem > transition-chain.pem
```

Step 4: Apply the transition configuration and wait for all workloads to pick up the new certificates.

Step 5: Once all workloads have new certificates and trust the new root, remove the old root from the trust bundle.

## Monitoring Certificate Health

Set up monitoring to catch certificate issues before they cause outages.

Check certificate expiry across the mesh:

```bash
# Check the CA certificate expiry
kubectl get secret cacerts -n istio-system --context=cluster-west \
  -o jsonpath='{.data.ca-cert\.pem}' | base64 -d | \
  openssl x509 -noout -enddate
```

Create a Prometheus alert for expiring certificates:

```yaml
groups:
  - name: certificate-alerts
    rules:
      - alert: IstioCACertExpiringSoon
        expr: |
          (citadel_server_root_cert_expiry_timestamp - time()) / 86400 < 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Istio CA certificate expires in less than 30 days"

      - alert: WorkloadCertRenewalFailure
        expr: |
          sum(rate(citadel_server_csr_sign_err_count[5m])) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Workload certificate renewal is failing"
```

You can also use `istioctl` to check the overall certificate health:

```bash
istioctl proxy-config secret \
  $(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}') \
  -n sample --context=cluster-west
```

The output shows the certificate serial number, validity period, and whether it's been rotated recently.

## Secure Key Storage

Root CA private keys should never live on a Kubernetes cluster. Keep them in a hardware security module (HSM) or a secure key management service. Only the intermediate CA keys need to be accessible by istiod.

For the intermediate CA keys, consider using Kubernetes Secrets encryption at rest:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-key>
```

Certificate management in federated meshes is an ongoing operational responsibility, not a one-time setup. Build automation for rotation, monitoring for expiry, and runbooks for emergency scenarios. The time you invest in getting this right pays off every time your certificates rotate smoothly while you sleep.
