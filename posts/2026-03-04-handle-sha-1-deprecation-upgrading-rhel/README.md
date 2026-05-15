# How to Handle SHA-1 Deprecation When Upgrading to RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SHA-1, Deprecation, Crypto Policies, Security, Upgrade, Linux

Description: Address SHA-1 deprecation issues when upgrading to RHEL 9, where SHA-1 signatures are disabled by default in the DEFAULT crypto policy.

---

RHEL 9 disables SHA-1 for signatures in the DEFAULT system-wide crypto policy. Applications and services that rely on SHA-1 signed certificates, package signatures, or protocol negotiations will break after upgrading. Here is how to identify and resolve these issues.

## Understanding the Change

In RHEL 8, SHA-1 signatures were allowed. In RHEL 9, the DEFAULT crypto policy rejects them. This affects:
- TLS certificates signed with SHA-1
- SSH connections that negotiate `ssh-rsa` (RSA/SHA-1) signatures
- RPM packages signed with SHA-1
- IPsec/VPN connections using SHA-1

## Identifying SHA-1 Dependencies Before Upgrade

Scan your system for SHA-1 certificates and SSH servers that require `ssh-rsa` signatures:

```bash
# Find certificates using SHA-1 signatures

find /etc/pki -name "*.pem" -o -name "*.crt" | while read cert; do
  sig_algo=$(openssl x509 -in "$cert" -noout -text 2>/dev/null | grep "Signature Algorithm" | head -1)
  if echo "$sig_algo" | grep -qi "sha1"; then
    echo "SHA-1 found: $cert"
    echo "  $sig_algo"
  fi
done

# Test SSH servers without allowing the SHA-1 ssh-rsa signature algorithm
ssh -oHostKeyAlgorithms=-ssh-rsa user@server.example.com
```

## Temporary Workaround: Allow SHA-1

If you need time to replace SHA-1 certificates after upgrading, temporarily allow SHA-1:

```bash
# Switch to the SHA1 subpolicy that allows SHA-1 signatures
sudo update-crypto-policies --set DEFAULT:SHA1

# Restart the system so the policy is applied by all services
sudo reboot

# Verify the policy change
update-crypto-policies --show
# Output: DEFAULT:SHA1
```

This is a temporary measure. Plan to replace all SHA-1 dependencies.

## Replacing SHA-1 Certificates

Generate new certificates with SHA-256 or stronger:

```bash
# Generate a new self-signed certificate with SHA-256
openssl req -x509 -newkey rsa:4096 \
  -sha256 \
  -days 365 \
  -nodes \
  -keyout /etc/pki/tls/private/server.key \
  -out /etc/pki/tls/certs/server.crt \
  -subj "/CN=server.example.com"

# Verify the new certificate uses SHA-256
openssl x509 -in /etc/pki/tls/certs/server.crt -noout -text | grep "Signature Algorithm"
# Should show: sha256WithRSAEncryption
```

## Updating SSH Configuration

Regenerate SSH host keys if they use weak algorithms:

```bash
# Remove old DSA keys (deprecated)
sudo rm -f /etc/ssh/ssh_host_dsa_key*

# Generate any missing default host keys, including RSA and Ed25519
sudo ssh-keygen -A

# Restart SSHD
sudo systemctl restart sshd
```

## Restoring the Strict DEFAULT Policy

Once all SHA-1 dependencies are resolved:

```bash
# Restore the strict DEFAULT policy
sudo update-crypto-policies --set DEFAULT

# Restart the system so the policy is applied by all services
sudo reboot

# Verify
update-crypto-policies --show
# Output: DEFAULT
```

Test all applications and services after restoring the strict policy to confirm nothing relies on SHA-1 any longer.
