# How to Plug in External CA Certificates in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificate, External CA, Security, PKI, Kubernetes

Description: Step-by-step instructions for replacing Istio's self-signed CA with your own external CA certificates for production-grade mTLS.

---

Istio's built-in self-signed CA works fine for getting started, but for production you almost always want to use your own CA certificates. Maybe your organization has an existing PKI infrastructure, maybe you need certificates that are trusted outside the mesh, or maybe compliance requires certificates from a specific CA. Whatever the reason, Istio makes it straightforward to plug in your own CA.

## Why Use an External CA

The self-signed CA that Istio generates has several limitations:

- Every Istio installation gets a different root CA, so multi-cluster setups cannot trust each other
- Workload certificates are not trusted by anything outside the mesh
- You have no control over the root certificate's properties
- It does not integrate with your organization's certificate revocation infrastructure

With an external CA, you get:
- Consistent trust across clusters
- Integration with enterprise PKI
- Control over certificate properties and policies
- Compatibility with external systems that need to verify mesh certificates

## What You Need

To plug in an external CA, you need four files:

1. **Root certificate** (`root-cert.pem`) - The root CA certificate
2. **CA certificate** (`ca-cert.pem`) - The intermediate CA certificate that Istio will use to sign workload certificates
3. **CA key** (`ca-key.pem`) - The private key for the intermediate CA
4. **Certificate chain** (`cert-chain.pem`) - The full chain from the intermediate CA back to the root

## Generating Certificates (If You Do not Have Them)

If you need to create a CA hierarchy from scratch, here is how to do it with OpenSSL. In a real production setup, you would get these from your organization's PKI team.

Generate the root CA:

```bash
# Create root CA private key
openssl genrsa -out root-key.pem 4096

# Create root CA certificate (10-year validity)
openssl req -new -x509 -key root-key.pem -out root-cert.pem -days 3650 \
  -subj "/O=MyOrg/CN=MyOrg Root CA" \
  -addext "basicConstraints=critical,CA:true" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"
```

Generate the intermediate CA for Istio:

```bash
# Create intermediate CA private key
openssl genrsa -out ca-key.pem 4096

# Create CSR for intermediate CA
openssl req -new -key ca-key.pem -out ca-csr.pem \
  -subj "/O=MyOrg/CN=Istio Intermediate CA" \
  -addext "basicConstraints=critical,CA:true,pathlen:0" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

# Sign the intermediate CA certificate with the root CA (5-year validity)
openssl x509 -req -in ca-csr.pem -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -out ca-cert.pem -days 1825 \
  -extfile <(printf "basicConstraints=critical,CA:true,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign")

# Create the certificate chain
cat ca-cert.pem root-cert.pem > cert-chain.pem
```

Verify the chain:

```bash
openssl verify -CAfile root-cert.pem ca-cert.pem
```

This should output `ca-cert.pem: OK`.

## Installing the CA Certificates

Create a Kubernetes secret named `cacerts` in the `istio-system` namespace. This is the specific name that Istio looks for:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem \
  --from-file=ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem
```

The secret must contain exactly these four keys:
- `ca-cert.pem`
- `ca-key.pem`
- `root-cert.pem`
- `cert-chain.pem`

## Configuring Istio to Use the External CA

If you are installing Istio fresh, the presence of the `cacerts` secret is enough. Istiod will detect it and use the provided certificates instead of generating self-signed ones.

If Istio is already running with the self-signed CA, you need to restart istiod after creating the secret:

```bash
kubectl rollout restart deployment istiod -n istio-system
```

Then restart all workload pods to get new certificates signed by the new CA:

```bash
kubectl rollout restart deployment --all -n default
kubectl rollout restart deployment --all -n backend
# Repeat for all namespaces in the mesh
```

## Verifying the New CA

Check that istiod is using the new CA:

```bash
kubectl logs deployment/istiod -n istio-system | grep -i "ca certificate"
```

Verify a workload's certificate was signed by the new CA:

```bash
istioctl proxy-config secret <pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout | grep "Issuer"
```

The issuer should match your intermediate CA's subject, not the default `cluster.local` issuer.

Check the full chain:

```bash
istioctl proxy-config secret <pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl crl2pkcs7 -nocrl -certfile /dev/stdin | \
  openssl pkcs7 -print_certs -text -noout | grep -E "Subject:|Issuer:"
```

## Multi-Cluster Setup with Shared CA

One of the main reasons to use an external CA is multi-cluster trust. When two clusters share the same root CA, workloads in cluster A can verify certificates from workloads in cluster B.

Install the same `cacerts` secret in both clusters:

```bash
# Cluster A
kubectl --context cluster-a create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=cluster-a-ca-cert.pem \
  --from-file=ca-key.pem=cluster-a-ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem=cluster-a-cert-chain.pem

# Cluster B
kubectl --context cluster-b create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=cluster-b-ca-cert.pem \
  --from-file=ca-key.pem=cluster-b-ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem=cluster-b-cert-chain.pem
```

Each cluster can have its own intermediate CA, but they must share the same root CA. The `root-cert.pem` file should be identical in both clusters.

## Rotating the External CA

When your intermediate CA certificate approaches expiry, you need to rotate it:

1. Generate a new intermediate CA certificate (signed by the same root)
2. Update the `cacerts` secret with the new certificate and key
3. Restart istiod to pick up the new CA
4. Workloads will gradually get new certificates through automatic rotation

```bash
# Update the secret
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem=new-cert-chain.pem \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart istiod
kubectl rollout restart deployment istiod -n istio-system
```

As long as the root CA remains the same, the rotation is seamless. Old and new workload certificates will both be trusted because they chain back to the same root.

## Security Considerations

**Protect the CA private key.** The `ca-key.pem` file is the most sensitive artifact. Anyone with this key can sign certificates that the entire mesh will trust. Consider storing it in a secrets manager and only injecting it into the Kubernetes secret during deployment.

**Use a proper intermediate CA.** Do not put your root CA's private key in the `cacerts` secret. Use an intermediate CA so that the root key stays offline and safe.

**Set appropriate validity periods.** The intermediate CA should have a shorter validity than the root CA (e.g., 1-3 years for the intermediate, 10+ years for the root).

**Monitor certificate expiry.** Set up alerts for the intermediate CA's expiry date:

```bash
# Check when the CA cert expires
openssl x509 -in ca-cert.pem -noout -enddate
```

Plugging in an external CA takes a bit of upfront work, but it is essential for production Istio deployments. It gives you control over your certificate infrastructure, enables multi-cluster trust, and integrates with your organization's existing PKI.
