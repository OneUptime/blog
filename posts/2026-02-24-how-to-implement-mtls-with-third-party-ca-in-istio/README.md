# How to Implement mTLS with Third-Party CA in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Certificate Authority, Security, Kubernetes

Description: Replace Istio's built-in CA with your own third-party certificate authority for mTLS using tools like cert-manager, Vault, or custom root certificates.

---

By default, Istio runs its own certificate authority (CA) inside istiod. It generates a self-signed root certificate and uses it to issue workload certificates for mTLS. This works fine for many use cases, but some organizations need to use their own CA. Maybe you have an existing PKI infrastructure, or your security team requires certificates to chain to a specific root, or compliance mandates using a particular CA.

Istio supports plugging in a third-party CA in several ways. This guide covers the most common approaches: providing your own root certificate, integrating with cert-manager, and using HashiCorp Vault.

## Option 1: Plug in Your Own Root Certificate

The simplest approach is to provide Istio with your own CA certificate and key. Istio will use this as its signing CA instead of generating a self-signed one.

First, generate or obtain your CA certificate chain. You need:
- A root CA certificate
- An intermediate CA certificate (signed by the root)
- The intermediate CA private key
- The certificate chain (intermediate + root)

If you are generating these for testing, here is how to create them with OpenSSL:

```bash
# Generate root CA
openssl req -x509 -sha256 -nodes -days 3650 -newkey rsa:4096 \
  -subj "/O=MyOrg/CN=Root CA" \
  -keyout root-key.pem -out root-cert.pem

# Generate intermediate CA CSR
openssl req -sha256 -nodes -newkey rsa:4096 \
  -subj "/O=MyOrg/CN=Istio Intermediate CA" \
  -keyout ca-key.pem -out ca-csr.pem

# Sign intermediate CA with root CA
openssl x509 -req -sha256 -days 1825 -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -in ca-csr.pem -out ca-cert.pem \
  -extfile <(printf "basicConstraints=critical,CA:TRUE\nkeyUsage=critical,digitalSignature,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash")

# Create the certificate chain
cat ca-cert.pem root-cert.pem > cert-chain.pem
```

Now create a Kubernetes secret in the `istio-system` namespace with the CA certificates. The secret must be named `cacerts`:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem \
  --from-file=ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem
```

If Istio is already running, restart istiod to pick up the new CA:

```bash
kubectl rollout restart deploy/istiod -n istio-system
```

After istiod restarts, it will use your CA to sign workload certificates. New workload certificates will chain to your root CA. Existing workloads will get new certificates at their next rotation cycle, or you can force a restart:

```bash
kubectl rollout restart deploy -n default
```

## Verifying the CA Chain

Check that workload certificates are signed by your CA:

```bash
istioctl proxy-config secret deploy/my-app -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout
```

Look at the `Issuer` field. It should show your intermediate CA's subject, not Istio's default self-signed CA.

## Option 2: Integration with cert-manager

cert-manager is a popular Kubernetes addon for managing certificates. Istio can use cert-manager as its certificate provider through the istio-csr project.

First, install cert-manager if you do not have it:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
```

Then install istio-csr, which acts as a bridge between Istio and cert-manager:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install istio-csr jetstack/cert-manager-istio-csr \
  --namespace cert-manager \
  --set "app.tls.rootCAFile=/var/run/secrets/istio-csr/ca.pem" \
  --set "app.server.clusterID=cluster1" \
  --set "app.certmanager.issuerRef.name=istio-ca" \
  --set "app.certmanager.issuerRef.kind=ClusterIssuer"
```

Create a ClusterIssuer for cert-manager to use. This example uses a self-signed CA, but you can point it at your organization's CA:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: istio-ca
spec:
  ca:
    secretName: istio-ca-secret
```

Now configure Istio to use the cert-manager CSR signer instead of its built-in CA:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      caAddress: cert-manager-istio-csr.cert-manager.svc:443
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_CERT_SIGNER: istio-csr
```

With this setup, when a workload needs a certificate, the sidecar sends a CSR to istiod, which forwards it to cert-manager via istio-csr. cert-manager signs the certificate using your configured CA and returns it.

## Option 3: HashiCorp Vault as CA

If your organization uses HashiCorp Vault for secrets management, you can use Vault's PKI secrets engine as Istio's CA.

This works through cert-manager as well. Install the Vault issuer for cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-issuer
spec:
  vault:
    server: https://vault.vault-system:8200
    path: pki/sign/istio-workload
    auth:
      kubernetes:
        role: cert-manager
        mountPath: /v1/auth/kubernetes
        serviceAccountRef:
          name: cert-manager
```

Then configure istio-csr to use the Vault issuer:

```bash
helm upgrade istio-csr jetstack/cert-manager-istio-csr \
  --namespace cert-manager \
  --set "app.certmanager.issuerRef.name=vault-issuer" \
  --set "app.certmanager.issuerRef.kind=ClusterIssuer"
```

On the Vault side, you need to configure the PKI secrets engine:

```bash
vault secrets enable pki
vault secrets tune -max-lease-ttl=87600h pki

vault write pki/root/generate/internal \
  common_name="Istio Root CA" \
  ttl=87600h

vault write pki/roles/istio-workload \
  allowed_domains="*.svc.cluster.local,*.istio-system" \
  allow_any_name=true \
  max_ttl=72h
```

## Certificate Rotation

Regardless of which CA approach you use, certificate rotation is handled automatically. Istio's sidecar proxy requests a new certificate before the current one expires. The default certificate lifetime is 24 hours.

You can adjust the certificate lifetime in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: 12h0m0s
```

Shorter lifetimes are more secure (less time for a stolen certificate to be useful) but increase the load on the CA.

## Troubleshooting

**Workloads cannot communicate after CA change**: After changing the CA, existing workload certificates are still signed by the old CA. New certificates are signed by the new CA. Until all workloads rotate their certificates, there will be a mix. If the old and new CAs do not share a common trust root, mTLS handshakes will fail. Always ensure the transition is smooth by including both CAs in the trust bundle.

**istiod fails to start after creating cacerts**: Check that the secret has exactly the right key names: `ca-cert.pem`, `ca-key.pem`, `root-cert.pem`, `cert-chain.pem`. Any typo will cause istiod to fall back to the self-signed CA.

**Certificate chain validation errors**: Make sure `cert-chain.pem` contains the full chain from the intermediate CA to the root CA. Verify with:

```bash
openssl verify -CAfile root-cert.pem ca-cert.pem
```

Using a third-party CA with Istio requires some setup, but it integrates your mesh security into your existing PKI infrastructure, which is essential for enterprise environments and compliance requirements.
