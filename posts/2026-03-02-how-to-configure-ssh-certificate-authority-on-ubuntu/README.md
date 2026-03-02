# How to Configure SSH Certificate Authority on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Security, PKI, Linux

Description: Set up an SSH Certificate Authority on Ubuntu to issue signed user and host certificates, replacing per-server authorized_keys management with scalable certificate-based authentication.

---

Managing SSH access at scale with `authorized_keys` files is a maintenance nightmare. Every time someone joins or leaves the team, you update dozens of files across all your servers. SSH certificates solve this by letting a central Certificate Authority sign keys, and servers trust any certificate signed by the CA.

## Why SSH Certificates

The traditional SSH key model requires adding each user's public key to `~/.ssh/authorized_keys` on every server they need to access. With 50 users and 100 servers, that's a lot of manual work and plenty of opportunities to leave stale access around.

With an SSH CA, you have:
- One CA key pair that servers trust
- Users present a signed certificate instead of a raw public key
- Certificates can have expiration times, eliminating stale access automatically
- Revocation is straightforward - just stop issuing new certificates
- Certificates can restrict which commands a user can run or which source addresses are allowed

## Creating the Certificate Authority Keys

Keep your CA private keys on a secure, offline or restricted machine. The CA signing key is the crown jewel - if it leaks, every certificate it ever issued must be considered compromised.

```bash
# Create a dedicated directory for CA operations
mkdir -p ~/ssh-ca
cd ~/ssh-ca

# Generate the host CA key pair (used to sign server host keys)
ssh-keygen -t ed25519 -f host_ca -C "SSH Host Certificate Authority"

# Generate the user CA key pair (used to sign user authentication keys)
ssh-keygen -t ed25519 -f user_ca -C "SSH User Certificate Authority"

# Set strict permissions on the private keys
chmod 600 host_ca user_ca

# The public keys (host_ca.pub and user_ca.pub) can be distributed freely
ls -la
```

You now have four files:
- `host_ca` - private key for signing host certificates (keep offline)
- `host_ca.pub` - public key distributed to SSH clients
- `user_ca` - private key for signing user certificates (keep restricted)
- `user_ca.pub` - public key distributed to SSH servers

## Configuring Servers to Trust the User CA

On every server you want to protect with SSH certificates, configure the SSH daemon to trust your user CA:

```bash
# Copy the user CA public key to the server
scp user_ca.pub admin@server:/etc/ssh/user_ca.pub

# On the server, add this line to /etc/ssh/sshd_config
sudo nano /etc/ssh/sshd_config
```

Add to `sshd_config`:

```bash
# Trust certificates signed by this CA for user authentication
TrustedUserCAKeys /etc/ssh/user_ca.pub

# Optionally restrict which usernames are allowed via certificates
# (useful if you want to limit certificate auth to specific accounts)
# AuthorizedPrincipalsFile /etc/ssh/auth_principals/%u

# Disable password authentication since certificates are more secure
PasswordAuthentication no

# Keep public key auth enabled (certificates use this mechanism)
PubkeyAuthentication yes
```

Apply the changes:

```bash
sudo sshd -t  # Test configuration before reloading
sudo systemctl reload sshd
```

## Issuing User Certificates

When a developer needs access, they generate a key pair and send you the public key. You sign it:

```bash
# Developer generates their key pair (they do this on their machine)
ssh-keygen -t ed25519 -f ~/.ssh/id_developer -C "developer@company.com"

# Developer sends you their public key: id_developer.pub
# You sign it with the user CA:

# Sign with a validity period of 30 days
# -I is the identity (appears in logs)
# -n is the list of principals (usernames they can log in as)
# -V sets the validity period
ssh-keygen -s user_ca \
  -I "developer@company.com" \
  -n ubuntu,deploy,www-data \
  -V +30d \
  ~/.ssh/id_developer.pub

# This creates id_developer-cert.pub
# Send this file back to the developer along with their original key
```

The developer places both files in their `~/.ssh/` directory. SSH automatically finds and presents the certificate when connecting:

```bash
# On the developer's machine, both files should be present
ls ~/.ssh/id_developer*
# id_developer
# id_developer-cert.pub

# SSH automatically presents the certificate
ssh ubuntu@server

# To explicitly specify the key+cert pair
ssh -i ~/.ssh/id_developer ubuntu@server

# Inspect the certificate details
ssh-keygen -L -f ~/.ssh/id_developer-cert.pub
```

## Setting Up Host Certificates

Host certificates solve the "are you sure you want to continue connecting?" prompt. Instead of clients learning host fingerprints individually, they trust any host certificate signed by the host CA.

On each server, sign its host key:

```bash
# Find the server's host public key (usually in /etc/ssh/)
# Copy it to the CA machine for signing
scp root@server:/etc/ssh/ssh_host_ed25519_key.pub .

# Sign the host key
# -h indicates this is a host certificate (not a user certificate)
# -I is the identity
# -n is the list of hostnames/IPs this certificate is valid for
# -V is the validity period (host certs can have longer lifetimes)
ssh-keygen -s host_ca \
  -I "server.example.com" \
  -h \
  -n server.example.com,server,10.0.1.10 \
  -V +52w \
  ssh_host_ed25519_key.pub

# This creates ssh_host_ed25519_key-cert.pub
# Copy it back to the server
scp ssh_host_ed25519_key-cert.pub root@server:/etc/ssh/

# On the server, tell sshd about the host certificate
echo "HostCertificate /etc/ssh/ssh_host_ed25519_key-cert.pub" | \
  sudo tee -a /etc/ssh/sshd_config

sudo systemctl reload sshd
```

On client machines, configure them to trust the host CA instead of individual host fingerprints:

```bash
# Add to ~/.ssh/known_hosts on client machines
# Format: @cert-authority <hostname-pattern> <CA-public-key>
cat >> ~/.ssh/known_hosts << EOF
@cert-authority *.example.com $(cat host_ca.pub)
@cert-authority 10.0.1.* $(cat host_ca.pub)
EOF

# Or distribute via /etc/ssh/ssh_known_hosts for system-wide trust
echo "@cert-authority *.example.com $(cat host_ca.pub)" | \
  sudo tee -a /etc/ssh/ssh_known_hosts
```

## Using Principals for Fine-Grained Access Control

Principals in the certificate control which usernames the certificate is valid for. Combined with the `AuthorizedPrincipalsFile` directive, you can implement role-based access:

```bash
# Create principal files for each unix user
sudo mkdir -p /etc/ssh/auth_principals

# The principals file for the ubuntu user lists which certificate
# principals are allowed to log in as ubuntu
echo -e "ubuntu\nsudo-users" | sudo tee /etc/ssh/auth_principals/ubuntu

# The principals file for the deploy user
echo "deployers" | sudo tee /etc/ssh/auth_principals/deploy

# In sshd_config, enable principal-based authorization
echo "AuthorizedPrincipalsFile /etc/ssh/auth_principals/%u" | \
  sudo tee -a /etc/ssh/sshd_config
sudo systemctl reload sshd

# Now sign certificates with appropriate principals
# A developer gets the "ubuntu" and "sudo-users" principals
ssh-keygen -s user_ca -I "alice@company.com" -n "ubuntu,sudo-users" -V +7d alice_key.pub

# A deployment service gets only the "deployers" principal
ssh-keygen -s user_ca -I "ci-deploy" -n "deployers" -V +1d deploy_key.pub
```

## Certificate Restrictions

You can restrict what a certificate allows:

```bash
# Restrict to read-only commands only
ssh-keygen -s user_ca \
  -I "readonly-user" \
  -n ubuntu \
  -V +1d \
  -O force-command="cat /var/log/app.log" \
  -O no-port-forwarding \
  -O no-agent-forwarding \
  -O no-x11-forwarding \
  readonly_key.pub

# Restrict by source IP address
ssh-keygen -s user_ca \
  -I "office-user" \
  -n ubuntu \
  -V +30d \
  -O source-address=203.0.113.0/24 \
  office_key.pub
```

## Auditing Certificate Usage

The SSH daemon logs certificate information when someone authenticates. You can see which certificate identity was used:

```bash
# Check auth logs for certificate authentication
sudo grep -E "Accepted publickey|certificate" /var/log/auth.log

# On Ubuntu with systemd, use journalctl
journalctl -u ssh --since "today" | grep -E "certificate|Accepted"

# The log line will include the certificate identity (-I value)
# making it easy to trace who connected
```

SSH certificate authorities replace a fragile file-management problem with a scalable trust model. Once set up, adding a new user means one signing operation rather than updating files on every server.
