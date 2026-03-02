# How to Install Istio with Custom Certificate Authority

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificate, TLS, Security, Service Mesh, PKI

Description: How to configure Istio with your own Certificate Authority for mTLS instead of using the default self-signed CA, including integration with external PKI systems.

---

By default, Istio generates a self-signed root certificate to issue workload certificates for mTLS. This works fine for testing, but production environments usually need to plug in their own Certificate Authority. Maybe you have a corporate PKI, maybe you use HashiCorp Vault, or maybe compliance requires certificates from a specific CA.

This guide covers how to set up Istio with your own CA certificates.

## Why Use a Custom CA?

There are several reasons to replace the default self-signed CA:

- **Compliance requirements** - Your organization mandates certificates from an approved CA
- **Multi-cluster trust** - Multiple clusters need to trust each other's certificates
- **Certificate rotation** - You want control over certificate lifetimes and rotation
- **Auditing** - Your security team needs to track all certificate issuance
- **Integration** - You want to use an existing PKI like Vault, AWS ACM PCA, or cert-manager

## Option 1: Plug-in CA Certificates

The simplest approach is to provide Istio with intermediate CA certificates. Istio uses these to sign workload certificates, while the root CA stays under your control.

### Generate the Certificate Chain

Create a root CA and intermediate CA:

```bash
# Create directory structure
mkdir -p certs
cd certs

# Generate root CA
openssl req -new -x509 -nodes -days 3650 \
  -keyout root-key.pem \
  -out root-cert.pem \
  -subj "/O=MyOrg/CN=Root CA" \
  -config <(cat <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_ca
[req_distinguished_name]
[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
EOF
)

# Generate intermediate CA key
openssl genrsa -out ca-key.pem 4096

# Generate intermediate CA CSR
openssl req -new \
  -key ca-key.pem \
  -out ca-csr.pem \
  -subj "/O=MyOrg/CN=Istio Intermediate CA" \
  -config <(cat <<EOF
[req]
distinguished_name = req_distinguished_name
[req_distinguished_name]
EOF
)

# Sign the intermediate CA with the root CA
openssl x509 -req -days 730 \
  -CA root-cert.pem \
  -CAkey root-key.pem \
  -CAcreateserial \
  -in ca-csr.pem \
  -out ca-cert.pem \
  -extfile <(cat <<EOF
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always
EOF
)

# Create cert chain (intermediate + root)
cat ca-cert.pem root-cert.pem > cert-chain.pem
```

### Create the Kubernetes Secret

Istio looks for a specific secret named `cacerts` in the `istio-system` namespace:

```bash
kubectl create namespace istio-system

kubectl create secret generic cacerts \
  -n istio-system \
  --from-file=ca-cert.pem \
  --from-file=ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem
```

The secret must contain exactly these four files:
- `ca-cert.pem` - The intermediate CA certificate
- `ca-key.pem` - The intermediate CA private key
- `root-cert.pem` - The root CA certificate
- `cert-chain.pem` - The full certificate chain

### Install Istio

Install Istio after creating the secret. It will automatically detect and use the custom CA:

```bash
istioctl install --set profile=default -y
```

Or with Helm:

```bash
helm install istio-base istio/base -n istio-system
helm install istiod istio/istiod -n istio-system
```

### Verify Custom CA is in Use

Check the CA certificate that istiod is using:

```bash
kubectl exec -n istio-system deploy/istiod -- \
  cat /etc/cacerts/ca-cert.pem | openssl x509 -text -noout | head -20
```

Check a workload certificate to verify it chains to your CA:

```bash
istioctl proxy-config secret deploy/my-app -n my-app -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | head -20
```

The issuer should match your intermediate CA.

## Option 2: Integration with cert-manager

cert-manager can act as the CA for Istio, giving you integration with various issuers (Let's Encrypt, Vault, AWS PCA, etc.).

### Install cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

### Install istio-csr

The istio-csr agent handles certificate signing requests from Istio using cert-manager:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install istio-csr jetstack/cert-manager-istio-csr \
  -n cert-manager \
  --set "app.tls.rootCAFile=/var/run/secrets/istio-csr/ca.pem" \
  --set "app.server.clusterID=Kubernetes" \
  --set "app.certmanager.issuer.name=istio-ca" \
  --set "app.certmanager.issuer.kind=ClusterIssuer"
```

### Create an Issuer

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: istio-ca
spec:
  ca:
    secretName: istio-root-ca
```

Create the root CA secret for cert-manager:

```bash
kubectl create secret tls istio-root-ca \
  -n cert-manager \
  --cert=root-cert.pem \
  --key=root-key.pem
```

### Install Istio with cert-manager Integration

Configure istiod to use the istio-csr agent instead of its built-in CA:

```yaml
# istio-certmanager.yaml
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

```bash
istioctl install -f istio-certmanager.yaml -y
```

## Option 3: Integration with HashiCorp Vault

You can use Vault as the CA backend through cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: istio-vault-issuer
spec:
  vault:
    path: pki_int/sign/istio-cert
    server: https://vault.internal.example.com
    auth:
      kubernetes:
        role: istio-cert
        mountPath: /v1/auth/kubernetes
        serviceAccountRef:
          name: cert-manager
```

## Certificate Rotation

### Workload Certificate Lifetime

By default, workload certificates are valid for 24 hours. Change this in the mesh config:

```yaml
meshConfig:
  defaultConfig:
    proxyMetadata:
      SECRET_TTL: "12h"
```

Or through the environment variable on istiod:

```yaml
components:
  pilot:
    k8s:
      env:
        - name: MAX_WORKLOAD_CERT_TTL
          value: "48h"
        - name: DEFAULT_WORKLOAD_CERT_TTL
          value: "24h"
```

### Rotating the CA Certificate

When your intermediate CA certificate is close to expiration:

1. Generate a new intermediate CA signed by the same root
2. Update the `cacerts` secret
3. Restart istiod to pick up the new certificate

```bash
# Update the secret
kubectl create secret generic cacerts \
  -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem=new-cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart istiod
kubectl rollout restart deployment/istiod -n istio-system

# Wait for rollout
kubectl rollout status deployment/istiod -n istio-system
```

Workload certificates will be automatically re-issued as they expire.

## Verifying the Certificate Chain

Check the complete chain from a workload:

```bash
# Get the workload certificate
istioctl proxy-config secret deploy/my-app -n my-app

# Detailed certificate info
kubectl exec deploy/my-app -n my-app -c istio-proxy -- \
  openssl s_client -showcerts -connect localhost:15012 2>/dev/null | \
  openssl x509 -text -noout
```

Verify trust chain:

```bash
openssl verify -CAfile root-cert.pem -untrusted ca-cert.pem workload-cert.pem
```

## Troubleshooting

**Workloads not getting certificates**: Check istiod logs:

```bash
kubectl logs -n istio-system deploy/istiod | grep -i "cert\|ca\|secret"
```

**Certificate chain validation errors**: Make sure `cert-chain.pem` contains the full chain from intermediate to root.

**Secret not detected**: The secret must be named `cacerts` and must be created before istiod starts. If you create it after, restart istiod.

## Wrapping Up

Using a custom CA with Istio is straightforward once you understand the certificate chain requirements. The plug-in CA approach (creating the `cacerts` secret) works for most cases. For more advanced scenarios like automatic rotation or integration with enterprise PKI, the cert-manager and istio-csr combination is the way to go. Whichever approach you choose, test certificate rotation in a non-production environment first - getting locked out of your mesh because of certificate issues is not a fun experience.
