# How to Use Custom Root Certificates with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificates, Root CA, Security, PKI, Kubernetes

Description: How to replace Istio's default self-signed root certificate with your own custom root CA for production deployments and multi-cluster trust.

---

Istio generates a self-signed root certificate when you first install it. For development, that is fine. For production, you want your own root certificate. This gives you control over the trust hierarchy, enables multi-cluster communication, and integrates with your organization's existing PKI. Here is how to set it up properly.

## Why Custom Root Certificates Matter

The root certificate is the top of the trust chain. Every workload certificate in the mesh chains back to this root. Whoever controls the root controls the trust.

With the default self-signed root:
- Each Istio installation generates a different root
- Two clusters cannot trust each other
- External systems cannot verify mesh certificates
- You have no way to integrate with corporate certificate policies

With a custom root:
- Multiple clusters can share the same trust anchor
- External services can verify mesh certificates if they trust the same root
- You control the root key (ideally kept offline)
- You can revoke and rotate on your terms

## Generating a Custom Root Certificate

If your organization does not already have a root CA, you can create one with OpenSSL:

```bash
# Generate root CA private key (use 4096 bits for production)
openssl genrsa -out root-key.pem 4096

# Create a configuration file for the root certificate
cat > root-ca.conf <<EOF
[req]
distinguished_name = req_dn
x509_extensions = v3_ca
prompt = no

[req_dn]
O = MyOrganization
CN = MyOrg Root CA

[v3_ca]
basicConstraints = critical, CA:true
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always, issuer
EOF

# Generate root CA certificate (valid for 20 years)
openssl req -new -x509 -key root-key.pem -out root-cert.pem \
  -days 7300 -config root-ca.conf
```

Verify the root certificate:

```bash
openssl x509 -in root-cert.pem -text -noout | head -20
```

You should see:
- `CA:TRUE` in the basic constraints
- `Certificate Sign, CRL Sign` in the key usage
- Your organization name in the subject

## Creating an Intermediate CA

Never put your root CA's private key in Kubernetes. Instead, create an intermediate CA that Istio will use for signing:

```bash
# Generate intermediate CA key
openssl genrsa -out ca-key.pem 4096

# Create intermediate CA CSR config
cat > intermediate-ca.conf <<EOF
[req]
distinguished_name = req_dn
req_extensions = v3_intermediate_ca
prompt = no

[req_dn]
O = MyOrganization
CN = Istio Intermediate CA

[v3_intermediate_ca]
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
EOF

# Generate CSR
openssl req -new -key ca-key.pem -out ca-csr.pem -config intermediate-ca.conf

# Sign with root CA
openssl x509 -req -in ca-csr.pem \
  -CA root-cert.pem -CAkey root-key.pem -CAcreateserial \
  -out ca-cert.pem -days 1095 \
  -extfile intermediate-ca.conf -extensions v3_intermediate_ca

# Build the certificate chain
cat ca-cert.pem root-cert.pem > cert-chain.pem
```

Verify the chain:

```bash
openssl verify -CAfile root-cert.pem ca-cert.pem
```

Should output `ca-cert.pem: OK`.

## Installing the Custom Root Certificate

Create the `cacerts` secret in the `istio-system` namespace:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem \
  --from-file=ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem
```

If you have not installed Istio yet, just install it normally. Istiod will detect the `cacerts` secret and use it instead of generating a self-signed root.

If Istio is already running:

```bash
# Restart istiod to use the new certificates
kubectl rollout restart deployment istiod -n istio-system

# Wait for istiod to be ready
kubectl rollout status deployment istiod -n istio-system

# Restart all workloads to get new certificates
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl rollout restart deployment --all -n $ns
done
```

## Verifying the Custom Root Is in Use

Check a workload's certificate chain:

```bash
istioctl proxy-config secret <pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[] | select(.name=="default") | .secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl crl2pkcs7 -nocrl -certfile /dev/stdin | \
  openssl pkcs7 -print_certs -noout -text | grep "Subject:"
```

You should see your intermediate CA's subject in the chain, not the default `cluster.local` issuer.

Check that istiod is using the right root:

```bash
kubectl logs deployment/istiod -n istio-system | grep -i "root cert\|CA cert\|using custom"
```

Verify that mTLS still works between services:

```bash
istioctl x describe pod <pod-name> -n <namespace>
```

## Multi-Cluster Trust with a Shared Root

The primary motivation for custom root certificates is multi-cluster trust. When two Istio clusters share the same root CA, workloads in one cluster can verify certificates from the other.

For each cluster, create a unique intermediate CA signed by the same root:

```bash
# Cluster A intermediate CA
openssl genrsa -out cluster-a-ca-key.pem 4096
openssl req -new -key cluster-a-ca-key.pem -out cluster-a-ca-csr.pem \
  -subj "/O=MyOrg/CN=Cluster A Intermediate CA"
openssl x509 -req -in cluster-a-ca-csr.pem \
  -CA root-cert.pem -CAkey root-key.pem -CAcreateserial \
  -out cluster-a-ca-cert.pem -days 1095 \
  -extfile <(printf "basicConstraints=critical,CA:true,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign")
cat cluster-a-ca-cert.pem root-cert.pem > cluster-a-cert-chain.pem

# Cluster B intermediate CA
openssl genrsa -out cluster-b-ca-key.pem 4096
openssl req -new -key cluster-b-ca-key.pem -out cluster-b-ca-csr.pem \
  -subj "/O=MyOrg/CN=Cluster B Intermediate CA"
openssl x509 -req -in cluster-b-ca-csr.pem \
  -CA root-cert.pem -CAkey root-key.pem -CAcreateserial \
  -out cluster-b-ca-cert.pem -days 1095 \
  -extfile <(printf "basicConstraints=critical,CA:true,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign")
cat cluster-b-ca-cert.pem root-cert.pem > cluster-b-cert-chain.pem
```

Install in each cluster:

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

Both clusters share `root-cert.pem`, so they trust each other.

## Storing the Root Key Safely

The root private key (`root-key.pem`) should not live on any server that is connected to the network. Best practices:

- Generate the root key on an air-gapped machine
- Store it on an encrypted USB drive or HSM
- Only bring it out when you need to sign a new intermediate CA
- Keep multiple backups in separate secure locations

If the root key is compromised, an attacker can create certificates that your entire mesh will trust. Treat it accordingly.

## Root Certificate Expiry Planning

Your root certificate has a fixed lifetime. Plan for its eventual expiry:

```bash
# Check when the root expires
openssl x509 -in root-cert.pem -noout -enddate
```

Create a calendar reminder well before the expiry date (at least 6 months). Rotating the root CA is a bigger operation than rotating an intermediate CA because it changes the trust anchor for the entire mesh.

## Troubleshooting

**Issue: Pods cannot communicate after switching to custom root.**

Check that the certificate chain is correct:

```bash
openssl verify -CAfile root-cert.pem -untrusted ca-cert.pem ca-cert.pem
```

**Issue: Old pods still show the self-signed CA.**

Old pods need to be restarted to pick up the new root certificate:

```bash
kubectl rollout restart deployment --all -n <namespace>
```

**Issue: istiod is not using the cacerts secret.**

Verify the secret exists and has the right keys:

```bash
kubectl get secret cacerts -n istio-system -o jsonpath='{.data}' | jq 'keys'
```

It must contain exactly: `ca-cert.pem`, `ca-key.pem`, `cert-chain.pem`, `root-cert.pem`.

Using a custom root certificate is a one-time setup that pays off continuously. It puts you in control of your mesh's trust foundation and unlocks multi-cluster and cross-system trust that the self-signed root simply cannot provide.
