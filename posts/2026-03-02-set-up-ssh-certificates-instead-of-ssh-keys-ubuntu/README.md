# How to Set Up SSH Certificates Instead of SSH Keys on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Security, PKI

Description: Learn how to set up SSH certificates on Ubuntu using a Certificate Authority, providing centralized SSH access management without distributing keys to every server.

---

SSH keys work well when you have a handful of servers and users, but the model breaks down at scale. With keys, every public key needs to be manually added to `~/.ssh/authorized_keys` on every server the user needs access to. SSH certificates solve this by introducing a Certificate Authority (CA). Users and hosts present certificates signed by the CA, and servers trust anyone with a valid certificate from a trusted CA - no individual key management required.

## Keys Versus Certificates: The Core Difference

With SSH keys:
- Each user's public key must be added to each server's `authorized_keys`
- Revoking access requires removing the key from every server
- New servers need all authorized keys copied to them

With SSH certificates:
- The CA's public key is placed on servers once
- Users get certificates signed by the CA
- Access is granted to any holder of a valid CA-signed certificate
- Revoking access means issuing a Certificate Revocation List (CRL) or using principals/expiry

## Setting Up a Certificate Authority

The CA is just an SSH key pair used to sign other keys. Keep the CA private key extremely secure - whoever holds it can grant access to all your servers.

```bash
# Create a directory for the CA (on a secure, offline machine ideally)
mkdir -p ~/ssh-ca
cd ~/ssh-ca

# Generate the CA key pair
# The CA uses the same key types as regular SSH keys
ssh-keygen -t ed25519 -f ./ssh_ca -C "SSH Certificate Authority"

# This creates:
# ssh_ca       - the CA private key (KEEP THIS SECURE)
# ssh_ca.pub   - the CA public key (distributed to servers)

# Set strict permissions
chmod 400 ssh_ca
chmod 444 ssh_ca.pub
```

## Configuring Servers to Trust the CA

On each server that should accept CA-signed certificates:

```bash
# Copy the CA public key to the server
scp ssh_ca.pub user@server:/tmp/

# On the server: place the CA public key in the SSH config directory
sudo cp /tmp/ssh_ca.pub /etc/ssh/ssh_ca.pub
sudo chmod 644 /etc/ssh/ssh_ca.pub

# Configure sshd to trust this CA
sudo nano /etc/ssh/sshd_config
```

Add this line to `sshd_config`:

```text
# Trust certificates signed by this CA
TrustedUserCAKeys /etc/ssh/ssh_ca.pub
```

```bash
# Validate the config and restart SSH
sudo sshd -t
sudo systemctl restart ssh
```

Now any user with a certificate signed by this CA can log in, subject to the certificate's constraints.

## Signing User Certificates

When a user needs access, they generate their own key pair and send you the public key. You sign it with the CA.

```bash
# User generates their key pair (normal process)
ssh-keygen -t ed25519 -C "alice@company.com" -f ~/.ssh/id_ed25519

# User sends their PUBLIC key to the CA operator
# alice sends id_ed25519.pub to the CA admin

# CA admin signs the user's public key
# -s  : specifies the CA signing key
# -I  : certificate identity (shown in logs)
# -n  : principals (what usernames this cert can log in as)
# -V  : validity period (+1w = 1 week, +30d = 30 days)
ssh-keygen -s ./ssh_ca \
    -I "alice@company.com" \
    -n ubuntu,deploy \
    -V +30d \
    alice_id_ed25519.pub

# This creates alice_id_ed25519-cert.pub
# Send this certificate back to alice
```

The `-n` flag specifies principals - the usernames the certificate holder can authenticate as. If you specify `ubuntu`, the certificate holder can log in as the `ubuntu` user on any server trusting this CA.

## Viewing Certificate Details

```bash
# Inspect a certificate to see its properties
ssh-keygen -L -f alice_id_ed25519-cert.pub

# Output shows:
#         Type: ssh-ed25519-cert-v01@openssh.com user certificate
#         Public key: ED25519-CERT SHA256:abc123...
#         Signing CA: ED25519 SHA256:xyz789...
#         Key ID: "alice@company.com"
#         Serial: 0
#         Valid: from 2026-03-02T10:00:00 to 2026-04-01T10:00:00
#         Principals:
#                 ubuntu
#                 deploy
#         Critical Options: (none)
#         Extensions:
#                 permit-pty
#                 permit-user-rc
#                 permit-X11-forwarding
#                 permit-agent-forwarding
#                 permit-port-forwarding
```

## Using a Certificate to Connect

The user places both their private key and certificate in `~/.ssh/`:

```bash
# The key and its certificate must be in the same directory
# The certificate filename must be the key filename + "-cert.pub"
ls ~/.ssh/
# id_ed25519       - private key
# id_ed25519.pub   - public key
# id_ed25519-cert.pub  - the certificate

# SSH automatically uses the certificate if it exists alongside the key
ssh ubuntu@server.example.com

# Explicitly specify the certificate if using custom filenames
ssh -i ~/.ssh/id_ed25519 -o CertificateFile=~/.ssh/id_ed25519-cert.pub ubuntu@server.example.com
```

## Restricting Certificate Permissions

Certificates can carry restrictions that limit what the holder can do:

```bash
# Certificate that cannot forward ports or agents
ssh-keygen -s ./ssh_ca \
    -I "restricted-user" \
    -n ubuntu \
    -O no-port-forwarding \
    -O no-agent-forwarding \
    -O no-x11-forwarding \
    -V +7d \
    user_key.pub

# Certificate that only allows running a specific command
ssh-keygen -s ./ssh_ca \
    -I "backup-agent" \
    -n ubuntu \
    -O force-command="/usr/bin/rsync --server --daemon ." \
    -O no-pty \
    -V +365d \
    backup_key.pub

# Certificate that can only be used from specific source IPs
ssh-keygen -s ./ssh_ca \
    -I "vpn-user" \
    -n ubuntu \
    -O source-address="10.0.0.0/8" \
    -V +30d \
    vpn_user_key.pub
```

## Host Certificates

Certificates work for host authentication too. This eliminates the "Are you sure you want to continue connecting?" prompt when connecting to new servers.

```bash
# Generate the host CA (can be separate from the user CA)
ssh-keygen -t ed25519 -f ./ssh_host_ca -C "SSH Host Certificate Authority"

# Sign the server's host key
# On the server, the host keys are in /etc/ssh/
ssh-keygen -s ./ssh_host_ca \
    -I "server.example.com" \
    -h \
    -n server.example.com,10.0.0.50 \
    -V +365d \
    /etc/ssh/ssh_host_ed25519_key.pub

# Place the certificate on the server
sudo cp ssh_host_ed25519_key-cert.pub /etc/ssh/
```

Add to `/etc/ssh/sshd_config`:

```text
# Tell sshd to present this certificate to clients
HostCertificate /etc/ssh/ssh_host_ed25519_key-cert.pub
```

On client machines, trust the host CA instead of individual host keys:

```bash
# Add to ~/.ssh/known_hosts
# Format: @cert-authority hostnames CA-public-key
echo "@cert-authority *.example.com $(cat ssh_host_ca.pub)" >> ~/.ssh/known_hosts
```

Now connecting to any server with a certificate signed by this host CA will not show the fingerprint warning.

## Revoking Certificates

To revoke access, create a Key Revocation List (KRL):

```bash
# Create or update a KRL to revoke a certificate
# Revoke by certificate file
ssh-keygen -k -f revoked-keys.krl alice_id_ed25519-cert.pub

# Revoke by certificate ID
ssh-keygen -k -u -f revoked-keys.krl -z 12345  # serial number

# Distribute the KRL to servers
sudo cp revoked-keys.krl /etc/ssh/revoked-keys.krl
sudo chmod 644 /etc/ssh/revoked-keys.krl
```

Configure `sshd_config` to use the KRL:

```text
RevokedKeys /etc/ssh/revoked-keys.krl
```

```bash
sudo systemctl reload ssh
```

## Summary

SSH certificates provide centralized, scalable access management. Set up a CA key pair, distribute the CA public key to servers via `TrustedUserCAKeys`, then sign user public keys with expiration dates and access restrictions. Users connect normally - SSH handles the certificate automatically. Revoking access is done via a KRL distributed to servers. For organizations managing many servers and users, certificates dramatically reduce the operational overhead of SSH key management and eliminate the risks of lingering access from forgotten keys.
