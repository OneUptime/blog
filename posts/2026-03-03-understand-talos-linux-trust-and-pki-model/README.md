# How to Understand Talos Linux Trust and PKI Model

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, PKI, Security, Certificate, TLS, Kubernetes

Description: A deep dive into the Public Key Infrastructure that secures all communication in a Talos Linux cluster.

---

Security in Talos Linux is built on a foundation of Public Key Infrastructure (PKI). Steady-state Talos API access and node-to-node communication go through a system of certificates and keys that establish trust. There is no username/password authentication and no SSH keys. A machine token is used when a node joins the Talos PKI, but ongoing OS access is certificate-based.

Understanding the PKI model is essential because it affects how you create clusters, add nodes, manage access, and troubleshoot connectivity issues.

## The Trust Chain

When you create a Talos cluster, several Certificate Authorities (CAs) are generated. The Talos CA is the root of trust for the Talos API, while Kubernetes and etcd use separate CAs for their own certificate chains.

The trust chain looks like this:

```text
Talos CA
    |
    +-- Talos API server certificates
    +-- talosctl client certificates
    +-- Additional operator certificates

Kubernetes CA
    |
    +-- Kubernetes API server certificates
    +-- Kubernetes client certificates
    +-- kubelet client certificates

etcd CA
    |
    +-- etcd peer certificates
    +-- etcd client certificates
```

```bash
# Generate a cluster configuration (which creates the CA)

talosctl gen config my-cluster https://10.0.0.10:6443

# This creates secrets that include:
# - Talos CA certificate and key
# - Kubernetes CA certificate and key
# - etcd CA certificate and key
# - Service account signing key
```

## The Talos CA

The Talos CA secures all Talos API communication. It is separate from the Kubernetes CA, which secures Kubernetes API communication.

When a node boots, it uses the CA certificate from its machine configuration to verify other nodes and to present its own identity. The CA key is included in control plane machine configurations so control plane nodes can issue node certificates. Worker nodes receive only the CA certificate, not the key. The talosconfig contains the CA certificate plus a client certificate and key; it does not contain the Talos CA private key.

```yaml
# Machine configuration: CA section
machine:
  ca:
    crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...
    key: LS0tLS1CRUdJTiBFRDI1NTE5IFBSSVZBVEUgS0VZLS0tLS0...
```

The CA uses Ed25519 keys by default, which provides strong security with small key sizes and fast operations.

## Mutual TLS (mTLS)

All API communication in Talos uses mutual TLS. This means both sides of every connection must present valid certificates.

When talosctl connects to a Talos node:
1. talosctl presents its client certificate (from the talosconfig)
2. The node presents its server certificate
3. Both sides verify the other's certificate against the CA
4. Only if both verifications pass does the connection proceed

This prevents man-in-the-middle attacks and ensures that both the client and server are who they claim to be.

```bash
# View your talosctl client certificate information
talosctl config info

# Output shows:
# - Context name
# - Endpoints
# - CA certificate fingerprint
# - Client certificate details
```

## Kubernetes PKI

Talos manages a separate PKI for Kubernetes. The Kubernetes CA signs certificates for the API server, kubelet, controller manager, scheduler, and other components.

```yaml
# Cluster configuration: Kubernetes CA
cluster:
  ca:
    crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...
    key: LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t...
```

The Kubernetes PKI includes several certificate pairs:

- **API server certificate** - Used by the Kubernetes API server
- **API server kubelet client certificate** - For API server to kubelet communication
- **Front proxy certificate** - For API aggregation
- **Service account signing key** - For signing ServiceAccount tokens
- **kubelet certificates** - For each node's kubelet

```bash
# View Kubernetes dynamic certificates through the Talos API
talosctl -n 10.0.0.11 get KubernetesDynamicCerts -o yaml
```

## etcd PKI

etcd has its own CA and certificate chain, separate from both the Talos CA and the Kubernetes CA. This separation provides defense in depth. Even if one CA is compromised, the others remain secure.

etcd certificates include:
- **etcd CA** - Signs all etcd certificates
- **etcd peer certificates** - For etcd member-to-member communication
- **etcd client certificates** - For the Kubernetes API server to communicate with etcd

```bash
# Check etcd member status (which uses peer certificates)
talosctl -n 10.0.0.11 etcd members

# View etcd health
talosctl -n 10.0.0.11 etcd status
```

## trustd: The Certificate Authority Daemon

On control plane nodes, the trustd service acts as a certificate signing authority. When a worker node joins the cluster, it submits a certificate signing request (CSR) to trustd, which validates the request and issues a certificate.

The validation process checks:
1. The CSR is properly formatted
2. The requesting node has the correct machine token
3. The node's identity matches the request

```bash
# Check trustd status on a control plane node
talosctl -n 10.0.0.11 service trustd

# View trustd logs for certificate operations
talosctl -n 10.0.0.11 logs trustd
```

trustd is critical during cluster bootstrapping. If trustd is not running or not reachable, new nodes cannot join the cluster because they cannot get their certificates signed.

## Certificate Rotation

Certificates have expiration dates, and they need to be rotated before they expire. Talos handles this differently for different certificate types.

### Talos API Certificates

The Talos CA certificate is generated during cluster creation and has a long lifetime, typically 10 years. Talos automatically manages and rotates server-side certificates for the Talos API, Kubernetes, and etcd. Client certificates in `talosconfig` and `kubeconfig` are the user's responsibility.

### Kubernetes Certificates

Kubernetes component certificates are managed by Talos and are rotated automatically. The kubelet must be restarted at least once a year for its certificates to be rotated; a node reboot or Talos upgrade is sufficient.

```yaml
# Kubelet server certificate rotation can be requested with this kubelet argument
machine:
  kubelet:
    extraArgs:
      rotate-server-certificates: "true"
```

### Manual Certificate Rotation

If you need to rotate the Talos CA (for example, if the CA key is compromised), you can do so, but it requires careful planning.

```bash
# Preview Talos API CA rotation
talosctl -n 10.0.0.11 rotate-ca --dry-run=true --talos=true --kubernetes=false

# Rotate the Talos API CA
talosctl -n 10.0.0.11 rotate-ca --dry-run=false --talos=true --kubernetes=false

# Save the new CA output and update stored secrets/configs as needed
```

## Securing the Secrets

The cluster secrets (CA certificates and keys) are the crown jewels of your Talos cluster. Anyone who has these secrets can create certificates that will be trusted by every node.

Best practices for protecting secrets:

- Store the secrets bundle (from `talosctl gen secrets`) in a secure secrets manager
- Never commit secrets to version control
- Limit who has access to the talosconfig file
- Use separate talosconfig files with restricted permissions for different teams
- Rotate secrets if any CA key is suspected of being compromised

```bash
# Save secrets separately from configurations
talosctl gen secrets -o secrets.yaml
# Store secrets.yaml in a vault, not in git

# Generate configs from secrets when needed
talosctl gen config my-cluster https://10.0.0.10:6443 \
  --with-secrets secrets.yaml
```

## Creating Restricted Client Certificates

Not every operator needs full admin access. Talos supports creating client certificates with different roles.

The `os:admin` role has full access to all API operations. The `os:reader` role can query safe system state but cannot make changes. The `os:operator` role includes reader access plus operational methods such as rebooting, shutting down, and etcd maintenance.

```bash
# The talosconfig generated by gen config has admin access
# Generate a restricted reader talosconfig from a control plane node
talosctl -n 10.0.0.11 config new talosconfig-reader --roles os:reader --crt-ttl 24h
```

## Troubleshooting PKI Issues

Certificate problems are one of the most common issues in Talos clusters. Here are the most frequent problems and how to diagnose them.

### Connection Refused

```bash
# Check if apid is running
talosctl -n 10.0.0.11 service

# If you cannot connect at all, verify network connectivity
ping 10.0.0.11
nc -zv 10.0.0.11 50000
```

### Certificate Verification Failed

```bash
# This usually means the CA certificates do not match
# Check the CA in your talosconfig
talosctl config info

# Compare with the CA on the node
talosctl -n 10.0.0.11 get machineconfig v1alpha1 -o yaml | grep -A5 "ca:"
```

### Certificate Expired

```bash
# Check certificate expiration
talosctl -n 10.0.0.11 get KubernetesDynamicCerts -o yaml

# If Kubernetes certificates are stale, restarting or upgrading the node allows Talos to rotate them
talosctl -n 10.0.0.11 reboot
```

### Worker Node Cannot Join

```bash
# Check trustd on control plane nodes
talosctl -n 10.0.0.11 service trustd
talosctl -n 10.0.0.11 logs trustd

# Verify the worker has the correct machine token
# The token must match between the worker and control plane configs
```

## Conclusion

The PKI model in Talos Linux provides strong security guarantees through certificate-based authentication at every level. The separation of Talos, Kubernetes, and etcd CAs provides defense in depth. Mutual TLS ensures that every connection is authenticated in both directions. The trustd service automates certificate distribution for new nodes. Understanding this model helps you create clusters securely, manage access appropriately, troubleshoot connectivity issues, and maintain the security posture of your infrastructure over time. Protect your secrets, monitor certificate expiration, and use the principle of least privilege when issuing client certificates.
