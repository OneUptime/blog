# How to Configure mTLS with External Certificate Authority

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Certificate Authority, PKI, Security

Description: How to integrate Istio with an external certificate authority like Vault, cert-manager, or your own PKI for mTLS certificate issuance.

---

By default, Istio uses its own self-signed certificate authority (CA) built into istiod. This works great for getting started, but production environments often need to integrate with an existing PKI infrastructure. Maybe your organization has a corporate CA that all certificates must chain to. Maybe you use HashiCorp Vault for secrets management and want it to issue Istio certificates. Maybe compliance requires certificates from a specific CA.

Istio supports plugging in external CAs through several mechanisms. This guide covers the most common approaches.

## Option 1: Plug-In CA Certificates

The simplest way to use an external CA is to provide your own root certificate plus an intermediate signing certificate and key to Istio. Istiod will use these to sign workload certificates instead of generating its own.

### Generate or Obtain Your CA Certificate

If you already have a CA, you need four files:
- `ca-cert.pem` - The intermediate CA certificate
- `ca-key.pem` - The intermediate CA private key
- `root-cert.pem` - The root CA certificate
- `cert-chain.pem` - The full certificate chain

If you are creating a new intermediate CA under an existing root:

```bash
# Generate intermediate CA key

openssl genrsa -out ca-key.pem 4096

# Generate intermediate CA CSR
openssl req -new -key ca-key.pem -out ca-csr.pem -subj "/O=MyOrg/CN=Istio Intermediate CA"

# Sign with your root CA (adjust the command based on your CA setup)
openssl x509 -req -in ca-csr.pem -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -out ca-cert.pem -days 3650 \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=keyCertSign,cRLSign")

# Create the certificate chain
cat ca-cert.pem root-cert.pem > cert-chain.pem
```

### Create the Kubernetes Secret

Istio looks for a secret called `cacerts` in the `istio-system` namespace:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem \
  --from-file=ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem
```

### Install or Restart Istio

If Istio is not installed yet, install it normally. It will detect the `cacerts` secret and use it:

```bash
istioctl install --set profile=default
```

If Istio is already running, restart istiod to pick up the new certificates:

```bash
kubectl rollout restart deployment istiod -n istio-system
```

Then restart all workload pods to get new certificates signed by the new CA:

```bash
kubectl rollout restart deployment --all -n <namespace>
```

### Verify the Certificate Chain

Check that workload certificates are signed by your CA:

```bash
istioctl proxy-config secret <pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout
```

Look at the "Issuer" field. It should match your intermediate CA's subject, not Istio's default self-signed CA.

## Option 2: Integrating with cert-manager

cert-manager is a popular Kubernetes tool for managing certificates. Istio can use cert-manager as its CA through the istio-csr project.

### Install cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.20.2/cert-manager.yaml
```

### Set Up an Issuer

Create a cert-manager Issuer that will sign Istio certificates. This example uses a self-signed root, but you can use any cert-manager issuer type that can issue certificates with Istio's SPIFFE URI SANs (Vault, CA, or an external issuer; ACME issuers will not work for this):

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: selfsigned
  namespace: istio-system
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: istio-ca
  namespace: istio-system
spec:
  isCA: true
  duration: 87600h
  secretName: istio-ca-secret
  commonName: istio-ca
  issuerRef:
    name: selfsigned
    kind: Issuer
    group: cert-manager.io
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: istio-issuer
  namespace: istio-system
spec:
  ca:
    secretName: istio-ca-secret
```

### Install istio-csr

istio-csr sits between Istio and cert-manager, handling certificate signing requests:

```bash
helm upgrade cert-manager-istio-csr oci://quay.io/jetstack/charts/cert-manager-istio-csr \
  --install \
  --namespace cert-manager \
  --wait \
  --set "app.certmanager.issuer.name=istio-issuer" \
  --set "app.certmanager.issuer.kind=Issuer" \
  --set "app.certmanager.issuer.group=cert-manager.io"
```

### Install Istio with cert-manager Integration

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

```bash
istioctl install -f istio-certmanager.yaml
```

This disables istiod's built-in CA and points it to istio-csr instead.

## Option 3: Integrating with HashiCorp Vault

Vault can act as a CA for Istio certificates. The setup uses cert-manager as a bridge between Vault and Istio.

### Configure Vault PKI

```bash
# Enable the PKI secrets engine
vault secrets enable pki

# Configure the root CA
vault write pki/root/generate/internal \
  common_name="Mesh Root CA" \
  ttl=87600h

# Enable an intermediate PKI
vault secrets enable -path=pki_int pki

# Generate intermediate CSR
vault write -format=json pki_int/intermediate/generate/internal \
  common_name="Istio Intermediate CA" | jq -r '.data.csr' > pki_int.csr

# Sign the intermediate with the root
vault write -format=json pki/root/sign-intermediate \
  csr=@pki_int.csr \
  format=pem_bundle \
  ttl=43800h | jq -r '.data.certificate' > signed_certificate.pem

# Set the signed certificate
vault write pki_int/intermediate/set-signed certificate=@signed_certificate.pem

# Create a role for Istio
vault write pki_int/roles/istio \
  allowed_uri_sans="spiffe://cluster.local/*" \
  allow_ip_sans=false \
  max_ttl=72h
```

### Configure cert-manager with Vault

This assumes you have a `vault-issuer` service account in the `istio-system` namespace and have configured Vault Kubernetes auth to trust it.

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: vault-issuer
  namespace: istio-system
spec:
  vault:
    path: pki_int/sign/istio
    server: https://vault.vault-system.svc.cluster.local:8200
    auth:
      kubernetes:
        role: vault-issuer-role
        mountPath: /v1/auth/kubernetes
        serviceAccountRef:
          name: vault-issuer
```

Then install istio-csr pointing to the Vault issuer:

```bash
helm upgrade cert-manager-istio-csr oci://quay.io/jetstack/charts/cert-manager-istio-csr \
  --install \
  --namespace cert-manager \
  --wait \
  --set "app.certmanager.issuer.name=vault-issuer" \
  --set "app.certmanager.issuer.kind=Issuer" \
  --set "app.certmanager.issuer.group=cert-manager.io"
```

## Verifying External CA Integration

Regardless of which method you use, verify the integration:

```bash
# Check that certificates are issued by your CA
istioctl proxy-config secret <pod-name> -n <namespace>

# Verify the certificate chain
istioctl proxy-config secret <pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl crl2pkcs7 -nocrl -certfile /dev/stdin | \
  openssl pkcs7 -print_certs -noout
```

You should see your external CA in the certificate chain.

## Certificate Rotation

With an external CA, certificate rotation depends on the integration method:

- **Plug-in CA**: Rotation happens when you update the `cacerts` secret and restart istiod
- **cert-manager/istio-csr**: Rotation is automatic based on the certificate duration settings
- **Vault**: Rotation is handled by cert-manager based on the Vault role's TTL

Monitor certificate expiration across the mesh:

```bash
istioctl proxy-config secret <pod-name> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -noout -enddate
```

External CA integration adds operational complexity but gives you centralized control over your mesh's identity infrastructure. Choose the approach that fits your existing PKI setup and operational maturity.
