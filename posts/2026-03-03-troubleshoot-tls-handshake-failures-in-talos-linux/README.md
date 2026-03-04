# How to Troubleshoot TLS Handshake Failures in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, TLS, Security, Certificates, Debugging, Troubleshooting, Kubernetes

Description: A detailed guide to diagnosing and fixing TLS handshake failures when connecting to Talos Linux nodes with talosctl.

---

TLS handshake failures are a different beast from connection refused errors. When you hit a TLS handshake failure, it means your workstation successfully connected to the Talos API port, but the two sides could not agree on how to encrypt the connection. The result is an error message that often looks something like "transport: authentication handshake failed" or "tls: bad certificate."

These errors indicate a problem with certificates, certificate authorities, or TLS configuration. Let us walk through the most common causes and how to fix them.

## How TLS Works in Talos Linux

Talos Linux uses mutual TLS (mTLS) for all API communication. This means both the client (your workstation running talosctl) and the server (the Talos node running apid) must present valid certificates, and each side must trust the other's certificate authority (CA).

The pieces involved are:

- **Talos CA**: The certificate authority that signs node certificates
- **Client certificate**: Your talosctl client certificate, stored in your talosconfig
- **Server certificate**: The Talos node's certificate, generated during initial configuration
- **talosconfig**: Your local configuration file that contains client credentials

If any of these pieces are mismatched, expired, or corrupt, the TLS handshake will fail.

## Diagnosing the Problem

### Step 1: Check the Error Message

The error message itself often tells you what went wrong. Common messages include:

```text
rpc error: code = Unavailable desc = connection error:
  desc = "transport: authentication handshake failed:
  tls: failed to verify certificate: x509: certificate signed by unknown authority"
```

This specific error means the server's certificate was signed by a CA that your client does not trust.

```text
rpc error: code = Unavailable desc = connection error:
  desc = "transport: authentication handshake failed:
  tls: bad certificate"
```

This error means the server rejected your client certificate.

### Step 2: Verify Your talosconfig

Check that your talosconfig contains valid credentials:

```bash
# View your current talosctl configuration
talosctl config info

# Check the path to your talosconfig
echo $TALOSCONFIG

# If TALOSCONFIG is not set, the default location is used
ls -la ~/.talos/config
```

If you have multiple talosconfigs for different clusters, make sure you are using the right one:

```bash
# Explicitly specify the talosconfig
talosctl --talosconfig /path/to/correct/talosconfig services --nodes 192.168.1.10

# Or set the environment variable
export TALOSCONFIG=/path/to/correct/talosconfig
```

### Step 3: Check Certificate Dates

Certificates have validity periods. If they have expired, the handshake will fail:

```bash
# Extract and check the client certificate from your talosconfig
# The talosconfig is a YAML file with base64-encoded certificates
talosctl config info
```

You can also check the certificate details using openssl:

```bash
# Extract the CA certificate from talosconfig and check its validity
talosctl config info | grep -i "issued\|expires\|valid"
```

If certificates are expired, you need to regenerate them.

## Common Causes and Fixes

### Cause 1: Wrong talosconfig for the Cluster

This is the most common cause. If you manage multiple Talos clusters, each cluster has its own CA and certificates. Using the talosconfig from cluster A to connect to cluster B will always fail because the CAs are different.

**Fix:**

```bash
# List your talosctl contexts
talosctl config contexts

# Switch to the correct context
talosctl config context my-cluster

# Verify you are using the right context
talosctl config info
```

If you do not have the correct talosconfig, you need to get it from whoever created the cluster or regenerate it from the cluster secrets.

### Cause 2: Certificates Were Regenerated

If someone regenerated the cluster certificates (for example, during a recovery operation), your old talosconfig will no longer work because it contains certificates signed by the old CA.

**Fix:**

Obtain the new talosconfig that matches the regenerated certificates:

```bash
# Generate a new talosconfig from the cluster secrets
talosctl gen config my-cluster https://192.168.1.10:6443

# The generated talosconfig will be in the current directory
# Merge it with your existing config or replace it
talosctl config merge ./talosconfig
```

### Cause 3: Clock Skew

TLS certificates are time-sensitive. If the clock on your workstation or the Talos node is significantly wrong, certificates that are actually valid will appear expired or not yet valid.

**Diagnosis:**

```bash
# Check the time on a Talos node (if you can connect to any node)
talosctl time --nodes 192.168.1.10

# Check your local time
date -u
```

**Fix:**

If the Talos node's clock is wrong, configure NTP in the machine configuration:

```yaml
# In your machine config
machine:
  time:
    servers:
      - time.cloudflare.com
      - pool.ntp.org
```

Apply the corrected configuration:

```bash
talosctl apply-config --nodes 192.168.1.10 --file config.yaml --insecure
```

The `--insecure` flag is needed here because you cannot establish a TLS connection with the current credentials.

### Cause 4: Certificate SANs Mismatch

The server certificate includes Subject Alternative Names (SANs) that specify which hostnames and IP addresses the certificate is valid for. If you connect using an address not listed in the SANs, the handshake fails.

**Diagnosis:**

This typically happens when:
- You connect to a node by IP but the certificate only has hostnames
- You connect through a load balancer whose address is not in the SANs
- The node's IP changed after the certificate was generated

**Fix:**

Regenerate the machine configuration with the correct SANs:

```yaml
# Include additional SANs in the machine configuration
cluster:
  apiServer:
    certSANs:
      - 192.168.1.10
      - k8s.example.com
      - loadbalancer.example.com
```

### Cause 5: Corrupted talosconfig

If the talosconfig file is corrupted (partial download, disk error, accidental edit), the certificates will be invalid.

**Diagnosis:**

```bash
# Check if the talosconfig is valid YAML
python3 -c "import yaml; yaml.safe_load(open('$HOME/.talos/config'))"

# Or use yq
yq eval '.' ~/.talos/config > /dev/null
```

**Fix:**

Replace the corrupted talosconfig with a fresh copy from your backup or regenerate it.

### Cause 6: Intermediate Proxy or Load Balancer

If there is a proxy or load balancer between your workstation and the Talos node that terminates or intercepts TLS, the mTLS handshake will break.

**Diagnosis:**

```bash
# Check if the certificate you receive matches what Talos should present
openssl s_client -connect 192.168.1.10:50000 -servername 192.168.1.10 2>/dev/null | \
  openssl x509 -noout -issuer -subject
```

If the issuer is not the Talos CA, something is intercepting the connection.

**Fix:**

Configure the proxy or load balancer to pass through TLS traffic without termination. For TCP load balancers, use TCP mode (layer 4) rather than TLS mode (layer 7).

## Recovery with --insecure Flag

When TLS is completely broken and you need to fix the configuration, the `--insecure` flag bypasses certificate verification:

```bash
# Apply a new configuration without TLS verification
talosctl apply-config --nodes 192.168.1.10 --file new-config.yaml --insecure

# Check disks without TLS verification
talosctl disks --nodes 192.168.1.10 --insecure --endpoints 192.168.1.10
```

Use `--insecure` only as a recovery mechanism, not as a regular practice. It disables the security that protects your cluster from unauthorized access.

## Prevention

To avoid TLS handshake failures:

1. Store talosconfigs securely and keep backups
2. Label talosconfigs clearly when managing multiple clusters
3. Set up NTP on all nodes to prevent clock skew
4. Include all relevant SANs when generating certificates
5. Use certificate monitoring to get alerts before certificates expire
6. Document your cluster's CA and certificate rotation procedures

## Conclusion

TLS handshake failures in Talos Linux come down to a mismatch between what the client expects and what the server presents, or vice versa. The most common fix is simply using the correct talosconfig for the cluster you are trying to manage. For more complex issues involving expired certificates, clock skew, or network intermediaries, the fixes are well-defined once you identify the root cause. Always keep your talosconfigs organized and backed up, and you will avoid most of these problems entirely.
