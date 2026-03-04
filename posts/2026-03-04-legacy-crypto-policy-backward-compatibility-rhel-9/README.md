# How to Use the LEGACY Crypto Policy on RHEL 9 for Backward Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Crypto Policies, LEGACY Policy, Backward Compatibility, TLS, Linux

Description: Switch RHEL 9 to the LEGACY crypto policy when you need to communicate with older systems that require deprecated cryptographic algorithms.

---

Sometimes you need your RHEL 9 system to communicate with older systems that do not support modern cryptographic standards. The LEGACY crypto policy enables older algorithms like SHA-1, smaller RSA keys, and older TLS versions that the DEFAULT policy blocks. This guide explains when and how to use it, along with important security considerations.

## When You Need the LEGACY Policy

Common scenarios that require the LEGACY policy:

- Connecting to older servers that only support TLS 1.0 or 1.1
- Interacting with legacy hardware devices with outdated firmware
- Using SSH to connect to systems running older OpenSSH versions
- Working with older LDAP servers or directory services
- Accessing legacy web applications that require SHA-1 certificates

```mermaid
flowchart TD
    A[Connection to legacy system fails] --> B{Error type?}
    B -->|TLS handshake failure| C[Old TLS version needed]
    B -->|SSH algorithm mismatch| D[Legacy SSH cipher needed]
    B -->|Certificate rejected| E[SHA-1 or small key in cert]
    C --> F[Consider LEGACY policy]
    D --> F
    E --> F
    F --> G{Scope of need?}
    G -->|One connection| H[Per-connection override preferred]
    G -->|Many connections| I[LEGACY policy may be appropriate]
```

## What the LEGACY Policy Allows

| Setting | DEFAULT | LEGACY |
|---------|---------|--------|
| TLS 1.0 | Disabled | Enabled |
| TLS 1.1 | Disabled | Enabled |
| SHA-1 | Disabled for most uses | Allowed |
| Minimum RSA key | 2048 bits | 1024 bits |
| Minimum DH parameter | 2048 bits | 1024 bits |
| 3DES | Disabled | Enabled |
| CBC mode | Allowed | Allowed |
| DSA keys | Disabled | Enabled |
| RC4 | Disabled | Limited use |

## Switching to the LEGACY Policy

```bash
# Apply the LEGACY policy
sudo update-crypto-policies --set LEGACY

# Verify the change
update-crypto-policies --show
# Output: LEGACY

# Restart affected services
sudo systemctl restart sshd
```

## Using LEGACY with Targeted Sub-policies

Instead of enabling everything in the LEGACY policy, you can use DEFAULT with specific exceptions:

### Allow SHA-1 Only

```bash
# Create a module that allows SHA-1
sudo mkdir -p /etc/crypto-policies/policies/modules/

sudo tee /etc/crypto-policies/policies/modules/ALLOW-SHA1.pmod << 'EOF'
hash = SHA1+
sign = RSA-SHA1+ ECDSA-SHA1+
mac = HMAC-SHA1+
EOF

# Apply DEFAULT with SHA-1 allowed
sudo update-crypto-policies --set DEFAULT:ALLOW-SHA1
```

### Allow TLS 1.0/1.1 Only

```bash
sudo tee /etc/crypto-policies/policies/modules/ALLOW-OLD-TLS.pmod << 'EOF'
protocol = TLS1.0+ TLS1.1+
min_tls_version = TLS1.0
min_dtls_version = DTLS1.0
EOF

sudo update-crypto-policies --set DEFAULT:ALLOW-OLD-TLS
```

### Allow Smaller RSA Keys Only

```bash
sudo tee /etc/crypto-policies/policies/modules/ALLOW-RSA1024.pmod << 'EOF'
min_rsa_size = 1024
EOF

sudo update-crypto-policies --set DEFAULT:ALLOW-RSA1024
```

## Per-Connection Overrides Instead of System-Wide Change

A safer approach is to override the policy only for specific connections:

### SSH Overrides

```bash
# Connect to an old server with legacy algorithms
ssh -o KexAlgorithms=+diffie-hellman-group14-sha1 \
    -o HostKeyAlgorithms=+ssh-rsa \
    -o PubkeyAcceptedAlgorithms=+ssh-rsa \
    user@legacy-server

# Or add to ~/.ssh/config for a specific host
cat >> ~/.ssh/config << 'EOF'
Host legacy-server
    KexAlgorithms +diffie-hellman-group14-sha1
    HostKeyAlgorithms +ssh-rsa
    PubkeyAcceptedAlgorithms +ssh-rsa
EOF
```

### OpenSSL/curl Overrides

```bash
# Allow TLS 1.0 for a specific curl request
curl --tls-max 1.0 --ciphers DEFAULT:@SECLEVEL=0 https://legacy-server/

# Or for a specific openssl connection
openssl s_client -connect legacy-server:443 -tls1
```

## Security Risks of the LEGACY Policy

Enabling the LEGACY policy exposes your system to several known risks:

1. **TLS 1.0/1.1 vulnerabilities**: These protocol versions have known weaknesses like POODLE, BEAST, and Lucky13.

2. **SHA-1 collision attacks**: SHA-1 is broken for collision resistance, making it possible to forge digital signatures.

3. **Small RSA keys**: 1024-bit RSA keys can potentially be factored with sufficient resources.

4. **3DES attacks**: Sweet32 attack can recover plaintext from 3DES-encrypted connections.

## Minimizing Exposure

If you must use the LEGACY policy:

```bash
# Set a reminder to switch back
echo "REMINDER: System $(hostname) is on LEGACY crypto policy. Switch back to DEFAULT." | \
    at now + 7 days 2>/dev/null

# Document why the LEGACY policy is needed
sudo tee /etc/crypto-policies/LEGACY_JUSTIFICATION.txt << 'EOF'
LEGACY crypto policy enabled on: $(date)
Reason: Need to communicate with legacy-server.example.com
which only supports TLS 1.0 and RSA 1024-bit certificates.
Expected remediation date: [date when legacy system will be upgraded]
Approved by: [approver name]
EOF
```

## Creating a Minimal LEGACY Profile

Instead of the full LEGACY policy, create a targeted policy that only loosens what you need:

```bash
sudo tee /etc/crypto-policies/policies/modules/MINIMAL-LEGACY.pmod << 'EOF'
# Only allow what is strictly needed for legacy compatibility
# Allow SHA-1 for certificate verification only
sign = RSA-SHA1+

# Allow 2048-bit minimum (not 1024)
min_rsa_size = 2048

# Allow TLS 1.0 but not SSL 3.0
protocol = TLS1.0+
EOF

sudo update-crypto-policies --set DEFAULT:MINIMAL-LEGACY
```

## Monitoring While on LEGACY Policy

Track security-related events while using weakened crypto:

```bash
# Monitor for use of weak ciphers in SSH
sudo journalctl -u sshd | grep -i "cipher\|negotiate" | tail -20

# Check what TLS versions are being negotiated
sudo ss -tlnp | grep ":443"
```

## Reverting to DEFAULT

When the legacy requirement is resolved:

```bash
# Switch back to DEFAULT
sudo update-crypto-policies --set DEFAULT

# Restart services
sudo systemctl restart sshd
sudo systemctl restart httpd 2>/dev/null

# Verify
update-crypto-policies --show
```

## Summary

The LEGACY crypto policy on RHEL 9 should be used only when you genuinely need to communicate with older systems that require deprecated algorithms. Prefer targeted approaches like per-connection SSH overrides or custom sub-policy modules that only loosen specific restrictions. Always document why the LEGACY policy is needed, set a timeline for returning to DEFAULT, and monitor the system while weaker crypto is enabled. The goal is to minimize both the scope and duration of exposure to legacy algorithms.
