# How to Configure Custom Root CA for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Root CA, Certificate, PKI, Security

Description: Step-by-step instructions for configuring a custom root certificate authority for Istio, replacing the default self-signed CA with your organization's PKI infrastructure.

---

By default, Istio generates a self-signed root CA when you install it. That works fine for development, but production environments typically need certificates signed by your organization's CA. This might be because of compliance requirements, or because you need to federate multiple clusters under a common trust hierarchy.

## Why Use a Custom Root CA?

The self-signed CA that Istio generates has a few limitations:

- It is unique to each Istio installation, making multi-cluster setups harder
- It does not integrate with your existing PKI
- Compliance frameworks often require certificates from an approved CA
- If you reinstall Istio, you get a new CA and all trust relationships break

Using a custom root CA solves all of these problems by plugging Istio into your existing certificate infrastructure.

## Generating Your Own CA Certificates

You need four files to configure a custom CA in Istio:

- `root-cert.pem` - The root CA certificate
- `ca-cert.pem` - The intermediate CA certificate (used by istiod)
- `ca-key.pem` - The intermediate CA private key
- `cert-chain.pem` - The full certificate chain from intermediate to root

Here is how to generate them:

```bash
# Create a directory for the certificates
mkdir -p istio-certs && cd istio-certs

# Generate the root CA private key
openssl genrsa -out root-key.pem 4096

# Generate the root CA certificate (valid for 10 years)
openssl req -new -x509 -key root-key.pem -out root-cert.pem \
  -days 3650 \
  -subj "/O=MyCompany Inc./CN=MyCompany Root CA" \
  -config <(cat <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_ca
[req_distinguished_name]
[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always
EOF
)
```

Now generate the intermediate CA that istiod will use:

```bash
# Generate intermediate CA private key
openssl genrsa -out ca-key.pem 4096

# Generate CSR for intermediate CA
openssl req -new -key ca-key.pem -out ca-csr.pem \
  -subj "/O=MyCompany Inc./CN=Istio Intermediate CA"

# Sign the intermediate CA with the root CA
openssl x509 -req -in ca-csr.pem \
  -CA root-cert.pem -CAkey root-key.pem -CAcreateserial \
  -out ca-cert.pem -days 1825 \
  -extfile <(cat <<EOF
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid
EOF
)

# Create the certificate chain
cat ca-cert.pem root-cert.pem > cert-chain.pem
```

The `pathlen:0` constraint on the intermediate CA means it can only sign leaf certificates (workload certs), not other CA certificates. This is a security best practice.

## Installing the Custom CA in Istio

Create a Kubernetes secret in the `istio-system` namespace before installing Istio:

```bash
kubectl create namespace istio-system

kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem \
  --from-file=ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem
```

The secret must be named `cacerts`. Istio looks for this specific name.

Now install Istio (if not already installed):

```bash
istioctl install --set profile=default
```

If Istio is already running, restart istiod to pick up the new CA:

```bash
kubectl rollout restart deployment/istiod -n istio-system
```

## Verifying the Custom CA

After installation, verify that istiod is using your custom CA:

```bash
# Check istiod logs for CA initialization
kubectl logs -n istio-system deploy/istiod | grep -i "CA"
```

You should see something like:

```
info    Using istiod file format for signing ca files
```

Verify the root certificate distributed to namespaces:

```bash
# Compare the root cert in the ConfigMap with your root-cert.pem
kubectl get cm istio-ca-root-cert -n default -o jsonpath='{.data.root-cert\.pem}' | \
  openssl x509 -fingerprint -noout

openssl x509 -in root-cert.pem -fingerprint -noout
```

Both fingerprints should match.

Check a workload certificate:

```bash
# Deploy a test workload with sidecar injection
kubectl label namespace default istio-injection=enabled
kubectl run test-pod --image=nginx --restart=Never

# Wait for the pod to start, then check its certificate
istioctl proxy-config secret test-pod -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -issuer -noout
```

The issuer should show your intermediate CA's subject.

## Using an External CA with cert-manager

If your organization uses cert-manager, you can integrate it with Istio:

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
```

Then configure cert-manager as the issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: istio-ca
  namespace: istio-system
spec:
  ca:
    secretName: istio-ca-key-pair
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: istio-ca
  namespace: istio-system
spec:
  isCA: true
  commonName: istio-ca
  secretName: istio-ca-key-pair
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
```

## Using HashiCorp Vault as the CA

For organizations using Vault, you can configure Vault's PKI secrets engine as the CA backend:

```bash
# Enable PKI secrets engine in Vault
vault secrets enable pki
vault secrets tune -max-lease-ttl=87600h pki

# Generate root CA in Vault
vault write pki/root/generate/internal \
  common_name="MyCompany Root CA" \
  ttl=87600h

# Enable intermediate PKI
vault secrets enable -path=pki_int pki
vault secrets tune -max-lease-ttl=43800h pki_int

# Generate intermediate CA CSR
vault write -format=json pki_int/intermediate/generate/internal \
  common_name="Istio Intermediate CA" | jq -r '.data.csr' > vault-csr.pem

# Sign with root
vault write -format=json pki/root/sign-intermediate \
  csr=@vault-csr.pem \
  format=pem_bundle ttl=43800h | jq -r '.data.certificate' > vault-ca-cert.pem
```

Then export the certificates and create the `cacerts` secret as shown earlier.

## Migrating from Self-Signed to Custom CA

If you are migrating an existing Istio installation from the self-signed CA to a custom CA, follow these steps carefully to avoid downtime:

1. Create the `cacerts` secret with your custom CA certificates
2. Restart istiod to start using the new CA

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem \
  --from-file=ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem

kubectl rollout restart deployment/istiod -n istio-system
```

3. Restart all workloads to get new certificates signed by the new CA:

```bash
# Rolling restart all deployments in default namespace
for deploy in $(kubectl get deploy -o name -n default); do
  kubectl rollout restart $deploy -n default
done
```

4. Verify mTLS is working:

```bash
# Test connectivity between services
kubectl exec <client-pod> -- curl -v http://<server-service>:8080/health
```

During the migration, services with old certificates and services with new certificates will not be able to communicate if they do not share a common trust root. Plan for a brief rolling restart of all services.

## Securing the Root CA Key

Your root CA private key is the most sensitive piece of the entire PKI. Best practices:

- Generate the root CA key on an air-gapped machine
- Store the root CA key in a hardware security module (HSM) or secure vault
- Never store the root CA key in Kubernetes
- Only the intermediate CA key should be in the `cacerts` secret
- Rotate the intermediate CA periodically while keeping the same root

```bash
# Verify that your cacerts secret does NOT contain the root key
kubectl get secret cacerts -n istio-system -o json | jq -r '.data | keys'
```

You should see `ca-cert.pem`, `ca-key.pem`, `cert-chain.pem`, and `root-cert.pem`. There should be no `root-key.pem` in the secret.

Configuring a custom root CA is one of the first things you should do when setting up Istio for production. It plugs your service mesh into your organization's existing trust infrastructure and makes multi-cluster setups much simpler. Take the time to set it up properly, and keep that root key somewhere very safe.
