# How to Understand Citadel (Certificate Authority) in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Citadel, Certificate Authority, mTLS, Security

Description: A practical guide to understanding Citadel, Istio's built-in certificate authority that handles identity management and mTLS certificate lifecycle.

---

Citadel is the certificate authority component inside Istio that makes mutual TLS (mTLS) work. It issues certificates to every workload in the mesh, manages their lifecycle, and enables encrypted, authenticated communication between services. Even though Citadel is now embedded in istiod rather than running as a standalone service, understanding how it works is essential for securing your mesh.

## Why Citadel Exists

In a microservices architecture, you need to answer two questions for every request:

1. Who is making this request? (Authentication)
2. Are they allowed to make it? (Authorization)

Without Citadel, you would need to manually provision TLS certificates for every service, rotate them before they expire, and set up a trust chain so services can verify each other. For a few services that might be manageable. For hundreds of services with pods constantly being created and destroyed, it is impossible to do manually.

Citadel automates all of this. Every workload gets a cryptographic identity, and every connection between services is encrypted and authenticated without any changes to your application code.

## How Certificate Issuance Works

Here is the lifecycle of a workload certificate:

### Step 1: Pod Starts

When a new pod is created in a namespace with sidecar injection enabled, it gets an istio-proxy container (Envoy) and a pilot-agent process. The pilot-agent is responsible for bootstrapping the sidecar and managing certificates.

### Step 2: CSR Generation

The pilot-agent generates a private key and creates a Certificate Signing Request (CSR). The CSR includes the workload identity, which is derived from the Kubernetes service account:

```
spiffe://cluster.local/ns/default/sa/my-app
```

The private key never leaves the pod. Only the CSR is sent to istiod.

### Step 3: CSR Submission

The pilot-agent sends the CSR to istiod over a gRPC connection on port 15012. The connection is authenticated using the Kubernetes service account token mounted in the pod.

### Step 4: Validation and Signing

Istiod (Citadel) validates the CSR:
- Verifies the Kubernetes service account token is valid
- Checks that the requested identity matches the pod's actual service account
- Signs the certificate using the CA key

### Step 5: Certificate Delivery

The signed certificate is sent back to the pilot-agent, which configures Envoy to use it for all mTLS connections.

### Step 6: Rotation

Before the certificate expires (default TTL is 24 hours), the pilot-agent automatically requests a new one. This happens seamlessly without disrupting traffic.

## Viewing Workload Certificates

You can inspect the certificates that Citadel has issued:

```bash
# List secrets managed by the sidecar
istioctl proxy-config secret deploy/my-app -n default
```

Output:

```
RESOURCE NAME   TYPE           STATUS   VALID CERT   SERIAL NUMBER   NOT AFTER               NOT BEFORE
default         Cert Chain     ACTIVE   true         abc123...       2024-01-16T10:30:45Z    2024-01-15T10:30:45Z
ROOTCA          CA             ACTIVE   true         def456...       2034-01-13T10:30:45Z    2024-01-15T10:30:45Z
```

To see the full certificate details:

```bash
istioctl proxy-config secret deploy/my-app -n default -o json | \
    jq -r '.dynamicActiveSecrets[] | select(.name=="default") | .secret.tlsCertificate.certificateChain.inlineBytes' | \
    base64 -d | openssl x509 -text -noout
```

The output includes:

```
Subject: O = cluster.local
Subject Alternative Name:
    URI:spiffe://cluster.local/ns/default/sa/my-app
Validity
    Not Before: Jan 15 10:30:45 2024 GMT
    Not After : Jan 16 10:30:45 2024 GMT
```

## The Trust Chain

Citadel uses a hierarchical trust chain:

1. **Root CA certificate** - The top of the trust chain. By default, istiod generates a self-signed root CA on first startup.
2. **Intermediate CA certificate** (optional) - For multi-level trust hierarchies.
3. **Workload certificates** - Issued to individual workloads, signed by the root or intermediate CA.

All workloads in the mesh share the same root CA, so they all trust each other's certificates.

Check the root CA:

```bash
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
    base64 -d | openssl x509 -text -noout
```

## Using Your Own CA

For production environments, you usually want to plug in your organization's existing CA instead of using the self-signed root. Create a secret with your CA certificates before installing Istio:

```bash
kubectl create namespace istio-system

kubectl create secret generic cacerts -n istio-system \
    --from-file=ca-cert.pem=ca-cert.pem \
    --from-file=ca-key.pem=ca-key.pem \
    --from-file=root-cert.pem=root-cert.pem \
    --from-file=cert-chain.pem=cert-chain.pem
```

Istiod will detect this secret and use it as its CA instead of generating a self-signed one.

You can also integrate with external CA systems like Vault or cert-manager:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        EXTERNAL_CA: ISTIOD_RA_KUBERNETES_API
```

## Certificate Configuration

Customize certificate properties through the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: "12h"
```

Or through environment variables on istiod:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        CITADEL_SELF_SIGNED_CA_CERT_TTL: "87600h"  # 10 years for root CA
        MAX_WORKLOAD_CERT_TTL: "48h"
        WORKLOAD_CERT_TTL: "24h"
```

## Monitoring Citadel

Track certificate operations through Prometheus metrics:

```bash
kubectl exec -n istio-system deploy/istiod -- \
    curl -s localhost:15014/metrics | grep citadel
```

Key metrics:

```
# Total CSRs received
citadel_server_csr_count

# CSR signing errors
citadel_server_csr_sign_error_count

# Certificate chain expiry
citadel_server_root_cert_expiry_timestamp

# Success rate
citadel_server_success_cert_issuance_count
```

Set up alerts for:
- `citadel_server_csr_sign_error_count` increasing rapidly
- `citadel_server_root_cert_expiry_timestamp` approaching current time
- Any workload certificates that are close to expiration

## Troubleshooting Certificate Issues

### Problem: mTLS Connection Failures

Check if both sides have valid certificates:

```bash
# On the client side
istioctl proxy-config secret deploy/client-app -n default

# On the server side
istioctl proxy-config secret deploy/server-app -n default
```

Both should show ACTIVE status with valid certificates.

### Problem: Certificate Not Issued

Check istiod logs for CSR errors:

```bash
kubectl logs -n istio-system deploy/istiod | grep -i "csr\|cert\|error"
```

Common causes:
- The service account token is invalid or expired
- Istiod cannot reach the Kubernetes API to validate the token
- The CA key secret is missing or corrupted

### Problem: Root CA Expiring

Check the root CA expiration:

```bash
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
    base64 -d | openssl x509 -enddate -noout
```

If it is close to expiring, you need to rotate it. This requires creating a new CA secret and restarting istiod. All workload certificates will be re-issued.

### Problem: Certificate Rotation Not Happening

Check the pilot-agent logs:

```bash
kubectl logs deploy/my-app -c istio-proxy | grep -i "cert\|rotation\|renew"
```

The pilot-agent should request new certificates automatically. If it is not, check that the gRPC connection to istiod is healthy.

## Security Considerations

The CA private key is the most sensitive piece of your mesh security. If it is compromised, an attacker can issue certificates for any identity. Protect it by:

- Using Kubernetes RBAC to restrict access to the `istio-ca-secret` secret
- Enabling audit logging for secret access in the `istio-system` namespace
- Considering an external CA (like Vault) that provides hardware-backed key storage
- Rotating the CA periodically

```bash
# Verify who can access the CA secret
kubectl auth can-i get secrets/istio-ca-secret -n istio-system --as system:serviceaccount:default:my-app
```

Citadel is the security foundation of your Istio mesh. It provides automatic identity assignment, certificate management, and the trust chain that makes mTLS possible. Getting it right means your services communicate securely by default. Getting it wrong means either broken connectivity or false security. Keep an eye on certificate metrics, rotate your CA before it expires, and test your mTLS configuration regularly.
