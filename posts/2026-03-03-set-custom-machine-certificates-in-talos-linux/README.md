# How to Set Custom Machine Certificates in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Certificates, TLS, Security, Machine Configuration, Kubernetes

Description: A comprehensive guide to configuring custom machine certificates in Talos Linux for secure API access, custom CAs, and mutual TLS authentication.

---

Certificates are fundamental to security in Talos Linux. They secure communication between nodes, authenticate API access, and establish trust between the Talos control plane and its clients. While Talos generates certificates automatically during cluster creation, there are scenarios where you need custom certificates - integrating with an existing PKI infrastructure, meeting specific compliance requirements, or replacing certificates that are about to expire.

This guide covers how to work with custom machine certificates in Talos Linux, from understanding the certificate structure to replacing individual certificates.

## Understanding Talos Certificate Architecture

Talos uses several certificate authorities and individual certificates:

- **Talos CA**: Signs certificates for the Talos API (communication between talosctl and nodes)
- **Kubernetes CA**: Signs certificates for Kubernetes components (API server, kubelet, controller manager)
- **etcd CA**: Signs certificates for etcd cluster members
- **Aggregation CA**: Signs certificates for the Kubernetes aggregation layer

Each of these has a CA certificate (public) and a CA key (private). The machine configuration stores both.

```yaml
# Certificate structure in machine config (simplified)
machine:
  ca:
    crt: <base64-encoded-talos-ca-cert>
    key: <base64-encoded-talos-ca-key>
  token: <machine-token>
  certSANs:
    - 10.0.0.1
    - cluster.example.com

cluster:
  ca:
    crt: <base64-encoded-kubernetes-ca-cert>
    key: <base64-encoded-kubernetes-ca-key>
  etcd:
    ca:
      crt: <base64-encoded-etcd-ca-cert>
      key: <base64-encoded-etcd-ca-key>
  aggregatorCA:
    crt: <base64-encoded-aggregation-ca-cert>
    key: <base64-encoded-aggregation-ca-key>
```

## Setting Certificate SANs

One of the most common certificate customizations is adding Subject Alternative Names (SANs) to the machine certificate. SANs determine which hostnames and IP addresses the certificate is valid for:

```yaml
# Add custom SANs to the machine certificate
machine:
  certSANs:
    - 10.0.0.1                     # VIP address
    - 192.168.1.100                # Node IP
    - cluster.example.com          # DNS name
    - api.internal.company.com     # Internal DNS name
    - "*.cluster.example.com"      # Wildcard (use with caution)
```

These SANs are added to the Talos API server certificate on the node. You need them when accessing the Talos API through a load balancer, VPN, or any address that is not the node's primary IP.

## Bringing Your Own CA

If your organization has an existing PKI and you want Talos to use certificates signed by your own CA, you can provide custom CA certificates during cluster generation:

```bash
# Generate a custom CA for Talos
openssl genrsa -out talos-ca.key 4096
openssl req -x509 -new -nodes -key talos-ca.key \
  -sha256 -days 3650 \
  -subj "/CN=Talos CA/O=My Organization" \
  -out talos-ca.crt

# Generate a custom CA for Kubernetes
openssl genrsa -out k8s-ca.key 4096
openssl req -x509 -new -nodes -key k8s-ca.key \
  -sha256 -days 3650 \
  -subj "/CN=Kubernetes CA/O=My Organization" \
  -out k8s-ca.crt
```

Then reference these in your Talos configuration:

```yaml
# Use custom CA certificates
machine:
  ca:
    crt: <base64-encoded-custom-talos-ca-crt>
    key: <base64-encoded-custom-talos-ca-key>

cluster:
  ca:
    crt: <base64-encoded-custom-k8s-ca-crt>
    key: <base64-encoded-custom-k8s-ca-key>
```

You can base64-encode certificate files using:

```bash
# Encode certificates for inclusion in YAML config
cat talos-ca.crt | base64 -w0
cat talos-ca.key | base64 -w0
```

## Worker Node Certificate Configuration

Worker nodes do not need the CA private keys. They only need the public CA certificates for verification and their own machine token for authentication:

```yaml
# Worker node certificate config (no CA keys)
machine:
  ca:
    crt: <base64-encoded-talos-ca-crt>
    # No key field for worker nodes
  token: <machine-token>

cluster:
  ca:
    crt: <base64-encoded-k8s-ca-crt>
    # No key field for worker nodes
```

This is a security best practice. Worker nodes should never have access to the CA private keys because a compromised worker could then sign arbitrary certificates.

## Rotating Certificates

Certificate rotation is something you need to plan for before your certificates expire. Talos handles some rotation automatically, but CA certificates require manual intervention.

To check the current certificate expiration:

```bash
# Check certificate status on a node
talosctl get certificates --nodes 192.168.1.100

# View detailed certificate information
talosctl get certificate --nodes 192.168.1.100 -o yaml
```

For rotating the Talos CA, you need to generate a new CA and distribute it to all nodes. This is a multi-step process:

```bash
# Step 1: Generate new CA certificates
talosctl gen secrets -o new-secrets.yaml

# Step 2: Generate new configs using the new secrets
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --with-secrets new-secrets.yaml
```

Then you apply the new configuration to each node, starting with control plane nodes and then workers.

## Adding Trusted CA Certificates

If you need Talos to trust additional CA certificates (for connecting to internal registries, LDAP servers, or other TLS-secured services), you can add them through the machine files:

```yaml
# Add a trusted CA certificate to the system trust store
machine:
  files:
    - content: |
        -----BEGIN CERTIFICATE-----
        MIICkjCCAhigAwIBAgIUQ5EL... (your internal CA cert)
        -----END CERTIFICATE-----
      permissions: 0o644
      path: /etc/ssl/certs/internal-ca.pem
      op: create
```

For container registry trust, use the registry TLS configuration instead:

```yaml
# Trust a custom CA for a specific registry
machine:
  registries:
    config:
      registry.internal.com:
        tls:
          ca: |
            -----BEGIN CERTIFICATE-----
            MIICkjCCAhigAwIBAgIUQ5EL... (registry CA cert)
            -----END CERTIFICATE-----
```

## Generating Client Certificates

To access the Talos API, clients need certificates signed by the Talos CA. The `talosctl` tool generates these during cluster creation, but you can create additional client certificates for other operators or automation tools:

```bash
# Generate a new talosconfig with admin access
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --with-secrets secrets.yaml

# The generated talosconfig contains the client certificate
# You can extract and distribute it to team members
```

For more granular access control (when RBAC is enabled), you can generate certificates with specific roles:

```bash
# Generate a read-only client certificate
talosctl gen key --name reader
talosctl gen csr --key reader.key --ip 10.0.0.1 --roles os:reader
# Sign with the Talos CA
talosctl gen crt --ca talos-ca --csr reader.csr --name reader
```

## Certificate Security Best Practices

When working with certificates in Talos Linux, follow these practices:

1. Never store CA private keys in version control. Use a secrets manager or encrypted vault.
2. Use separate CAs for Talos, Kubernetes, and etcd rather than sharing a single CA.
3. Set appropriate certificate lifetimes. Short-lived certificates are more secure but require more frequent rotation.
4. Distribute only public CA certificates to worker nodes. Private keys belong on control plane nodes only.
5. Monitor certificate expiration dates and set up alerts well before they expire.

```bash
# Automate certificate expiry checking
talosctl get certificates --nodes 192.168.1.100 -o yaml | grep notAfter
```

## Troubleshooting Certificate Issues

Certificate problems typically manifest as TLS handshake failures or authentication errors. Common issues include:

- Expired certificates (check dates with `talosctl get certificates`)
- Missing SANs (the client connects through an address not listed in the certificate)
- CA mismatch (the client's CA does not match the server's certificate issuer)
- Clock skew (certificates appear invalid because the node's time is wrong)

```bash
# Debug TLS issues by checking node time
talosctl time --nodes 192.168.1.100

# Check for certificate-related errors in logs
talosctl dmesg --nodes 192.168.1.100 | grep -i "certificate\|tls\|x509"
```

Getting certificates right is essential for a secure and functional Talos Linux cluster. Take the time to understand the certificate architecture, plan for rotation, and follow security best practices from day one.
