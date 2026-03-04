# How to Configure SSH with System-Wide Crypto Policies on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSH, Crypto Policies, Security, Linux

Description: Learn how RHEL system-wide crypto policies control SSH ciphers, MACs, and key exchange algorithms, and how to customize them for your security requirements.

---

On RHEL, SSH does not independently choose its own ciphers and algorithms. Instead, it follows the system-wide cryptographic policy set by `update-crypto-policies`. This means changing one policy affects SSH, TLS, IPsec, and every other crypto-aware application at once.

## How Crypto Policies Affect SSH

When sshd starts, it reads the crypto policy and configures its allowed ciphers, MACs, key exchange algorithms, and host key types accordingly.

```mermaid
graph TD
    A[System Crypto Policy] --> B[/etc/crypto-policies/back-ends/opensshserver.config]
    A --> C[/etc/crypto-policies/back-ends/openssh.config]
    B --> D[sshd uses these ciphers/MACs/KEX]
    C --> E[ssh client uses these ciphers/MACs/KEX]
```

### Check the current policy

```bash
update-crypto-policies --show
```

Default output on RHEL: `DEFAULT`

### See what SSH settings the current policy produces

```bash
# Server-side crypto settings
cat /etc/crypto-policies/back-ends/opensshserver.config

# Client-side crypto settings
cat /etc/crypto-policies/back-ends/openssh.config
```

### See the effective SSH configuration

```bash
# Show all ciphers sshd will use
sudo sshd -T | grep ciphers

# Show all MACs
sudo sshd -T | grep macs

# Show key exchange algorithms
sudo sshd -T | grep kexalgorithms
```

## Available Crypto Policies

| Policy | Security Level | Use Case |
|---|---|---|
| DEFAULT | Balanced | General purpose, good default |
| FUTURE | High | Maximum security, may break old clients |
| FIPS | FIPS 140-2 compliant | Government/compliance environments |
| LEGACY | Low | Compatibility with old systems |

### Switch to the FUTURE policy for stronger SSH crypto

```bash
sudo update-crypto-policies --set FUTURE
```

This removes older ciphers and requires larger key sizes. Some older SSH clients may not be able to connect.

### Revert to DEFAULT

```bash
sudo update-crypto-policies --set DEFAULT
```

## Customizing Crypto Policies for SSH

If you need to tweak specific algorithms without changing the entire system policy, create a subpolicy module.

### Create a custom subpolicy

```bash
sudo vi /etc/crypto-policies/policies/modules/SSH-STRICT.pmod
```

```bash
# Disable CBC mode ciphers for SSH
cipher@SSH = -AES-128-CBC -AES-256-CBC -3DES-CBC

# Require stronger key exchange
key_exchange@SSH = -ECDH-SHA2-NISTP256

# Require stronger MACs
mac@SSH = -HMAC-SHA1 -HMAC-SHA1-ETM
```

### Apply the subpolicy

```bash
# Apply DEFAULT policy with the SSH-STRICT module
sudo update-crypto-policies --set DEFAULT:SSH-STRICT

# Verify
update-crypto-policies --show
```

### Restart SSH to pick up changes

```bash
sudo systemctl restart sshd
```

## Overriding Crypto Policies in sshd_config

If you absolutely need to set SSH-specific crypto settings that override the system policy, you can do it in the SSH configuration. However, this is not recommended because it creates a disconnect between system policy and actual SSH behavior.

```bash
sudo vi /etc/ssh/sshd_config.d/50-crypto.conf
```

```bash
# Override system crypto policy for SSH
# Only do this if you have a specific reason
Ciphers aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256,ecdh-sha2-nistp384,ecdh-sha2-nistp521
HostKeyAlgorithms ssh-ed25519,rsa-sha2-512,rsa-sha2-256
```

## Verifying SSH Crypto Configuration

### Check which ciphers are in use

```bash
# From a client, see what the server offers
ssh -vvv user@server 2>&1 | grep "kex:"
```

### Test a specific cipher

```bash
# Try connecting with a specific cipher
ssh -c aes256-gcm@openssh.com user@server

# Try with a cipher that should be disabled
ssh -c aes128-cbc user@server
```

### Scan the SSH server

```bash
# Use ssh-audit if available, or nmap
nmap --script ssh2-enum-algos -p 22 server.example.com
```

## Wrapping Up

System-wide crypto policies on RHEL are the intended way to manage SSH cryptography. They keep your SSH server aligned with the same security standards as every other crypto-aware service on the system. Use subpolicy modules for targeted tweaks rather than overriding settings in sshd_config, and always test client connectivity after changing policies, especially when moving to FUTURE or custom strict policies.
