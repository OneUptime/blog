# How to Plan Certificate Storage Requirements for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificate, Security, mTLS, Storage

Description: A practical guide to planning and managing certificate storage for Istio mTLS including CA certificates, workload identities, and rotation strategies.

---

Istio's security model depends on certificates. Every workload in the mesh gets a unique identity certificate (called a SPIFFE identity) that is used for mutual TLS authentication. The Istio certificate authority (built into istiod) issues these certificates, and they need to be stored, rotated, and managed properly. While the storage footprint of certificates is small compared to metrics or logs, the operational requirements around certificate management can trip you up if you have not planned for them.

## How Istio Certificate Management Works

When a workload pod starts up, here is what happens:

1. The Envoy sidecar starts and generates a private key
2. It sends a Certificate Signing Request (CSR) to istiod
3. istiod validates the request against the Kubernetes service account
4. istiod signs the certificate using its CA private key
5. The signed certificate is returned to the sidecar
6. The sidecar uses this certificate for all mTLS connections

By default, workload certificates have a 24-hour lifetime and are automatically rotated before expiry. The CA certificate (root or intermediate) has a much longer lifetime, typically 10 years for the root.

## Certificate Storage Locations

Certificates are stored in several places in an Istio deployment:

### 1. CA Root Certificate and Key

The root CA is stored as a Kubernetes secret in the istio-system namespace:

```bash
# Check the CA secret
kubectl get secret istio-ca-secret -n istio-system -o yaml

# Or if using a custom CA
kubectl get secret cacerts -n istio-system -o yaml
```

This secret typically contains:
- `ca-cert.pem`: The CA certificate (~1-2 KB)
- `ca-key.pem`: The CA private key (~1-3 KB)
- `cert-chain.pem`: The full certificate chain (~2-5 KB)
- `root-cert.pem`: The root certificate (~1-2 KB)

Total: about 5-12 KB per CA secret.

### 2. Workload Certificates

Workload certificates are not stored in Kubernetes secrets (unless you are using a very old version of Istio). They are held in memory by the Envoy sidecar and delivered via the Secret Discovery Service (SDS). This means:

- No persistent storage needed for workload certificates
- Each sidecar holds its certificate and key in memory (~5-10 KB per workload)
- Certificates are re-issued if the pod restarts

### 3. Gateway Certificates

For ingress gateways that terminate external TLS, you typically store certificates as Kubernetes secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-tls-secret
  namespace: istio-system
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
```

Each gateway TLS secret is about 5-10 KB depending on key size and certificate chain length.

## Estimating Storage Requirements

### etcd Storage for Certificate Secrets

Kubernetes secrets are stored in etcd. You need to account for this when planning etcd storage:

```
CA secrets: 1 x 12 KB = 12 KB
Gateway TLS secrets: N_gateways x N_domains x 10 KB
ConfigMap for CA root distribution: 1 x 2 KB = 2 KB
```

For a deployment with 1 CA, 3 ingress gateways serving 20 domains:

```
Certificate storage in etcd: 12 KB + (20 x 10 KB) + 2 KB = 214 KB
```

This is negligible in terms of etcd storage, but the number of secret watch events matters for etcd performance.

### In-Memory Certificate Storage

Each sidecar holds certificates in memory:

```
Per sidecar: ~10 KB for cert + key + CA bundle
500 sidecars: 500 x 10 KB = 5 MB total across the cluster
```

This is included in the sidecar memory calculation and is a small fraction of total sidecar memory usage.

### Certificate Rotation Traffic

Certificate rotation generates both network traffic and API server load:

```
Per rotation: ~5 KB CSR + ~5 KB signed cert = 10 KB
Rotations per day (24h cert lifetime): 1 per workload per day
500 workloads: 500 x 10 KB = 5 MB/day

But rotations are not evenly distributed. They happen when:
- Cert reaches 80% of its lifetime (default)
- Pods restart
- istiod restarts (triggers re-issuance)
```

## Planning for Custom CA Integration

If you are bringing your own CA (like Vault, cert-manager, or an enterprise PKI), storage requirements change:

### Using cert-manager with Istio

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: istio-ca
  namespace: istio-system
spec:
  isCA: true
  duration: 720h
  secretName: cacerts
  commonName: istio-ca
  issuerRef:
    name: root-issuer
    kind: ClusterIssuer
    group: cert-manager.io
  privateKey:
    algorithm: ECDSA
    size: 256
```

With cert-manager, additional secrets are created for the issuer chain. Plan for:

```
cert-manager secrets: 3-5 additional secrets x 10 KB = 30-50 KB
CRD storage: Certificate, CertificateRequest, and Order objects
```

### Using HashiCorp Vault

When using Vault as the CA backend, the certificates and keys are stored in Vault, not in Kubernetes. But you still need:

- A Kubernetes secret for the Vault authentication token
- The CA bundle distributed to all sidecars

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: vault-token
  namespace: istio-system
type: Opaque
data:
  token: <base64-vault-token>
```

## Certificate Lifecycle Management

Plan for these certificate lifecycle events:

### Root CA Rotation

Root CA rotation is the most operationally significant certificate event. You need to support a transition period where both old and new CAs are trusted:

```bash
# Verify current CA certificate expiry
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates
```

During root rotation, you temporarily need double the CA storage:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cacerts
  namespace: istio-system
type: Opaque
data:
  ca-cert.pem: <new-intermediate-cert>
  ca-key.pem: <new-intermediate-key>
  root-cert.pem: <combined-old-and-new-roots>
  cert-chain.pem: <new-chain>
```

### Monitoring Certificate Expiry

Set up monitoring to catch certificate issues before they cause outages:

```promql
# Workload certificate expiry (from Envoy stats)
envoy_server_days_until_first_cert_expiring

# Alert when certificates are close to expiring
min(envoy_server_days_until_first_cert_expiring) < 1
```

```bash
# Check certificate details for a specific workload
istioctl proxy-config secret <pod-name> -n <namespace>

# Verify the entire mesh certificate status
istioctl proxy-config secret --all
```

## Backup and Recovery Planning

Certificate backup is critical for disaster recovery:

```bash
# Backup the CA secret
kubectl get secret cacerts -n istio-system -o yaml > istio-ca-backup.yaml

# Backup all gateway TLS secrets
kubectl get secrets -n istio-system -l istio-type=tls -o yaml > gateway-certs-backup.yaml
```

Store backups encrypted and in a separate location from your cluster. If you lose the CA key without a backup, every workload certificate in the mesh becomes invalid and you will need to re-bootstrap the entire certificate chain.

## Storage Sizing Summary

| Component | Storage Location | Size | Notes |
|---|---|---|---|
| Root CA cert + key | etcd (K8s secret) | 12 KB | Critical to backup |
| Intermediate CA | etcd (K8s secret) | 12 KB | If using intermediate CA |
| Gateway TLS certs | etcd (K8s secret) | 10 KB per domain | Per ingress domain |
| Workload certs | Sidecar memory | 10 KB per pod | Not persistent |
| cert-manager objects | etcd (CRDs) | 50 KB | If using cert-manager |
| CA bundle ConfigMap | etcd (ConfigMap) | 2 KB | Distributed to all namespaces |

The total persistent storage for certificates is typically under 1 MB even for large deployments. The real planning concern is not storage space but operational processes: rotation schedules, backup procedures, monitoring, and disaster recovery for the CA infrastructure.
