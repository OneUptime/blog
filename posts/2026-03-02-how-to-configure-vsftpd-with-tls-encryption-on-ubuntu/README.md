# How to Configure vsftpd with TLS Encryption on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, FTP, Vsftpd, TLS, Security

Description: Secure vsftpd on Ubuntu with TLS encryption to protect FTP credentials and file transfers in transit, using self-signed or Let's Encrypt certificates.

---

Standard FTP transmits usernames, passwords, and file data in plaintext. Anyone with access to the network path between client and server can intercept credentials. Adding TLS to vsftpd (creating FTPS - FTP over TLS) encrypts both the control channel (commands and authentication) and data channel (file transfers). This guide covers both self-signed certificates for internal use and Let's Encrypt certificates for internet-facing servers.

## FTPS vs SFTP

These are different protocols:

- **FTPS (FTP over TLS):** Standard FTP wrapped in TLS. vsftpd supports this natively. Requires ports 21 (control) plus passive data ports.
- **SFTP (SSH File Transfer Protocol):** A completely different protocol that runs over SSH. Uses port 22 only.

This guide covers FTPS with vsftpd. For SFTP, you configure OpenSSH instead.

## Prerequisites

vsftpd must be installed and working:

```bash
# Verify vsftpd is installed
sudo systemctl status vsftpd

# Install if needed
sudo apt install vsftpd openssl -y
```

## Option 1: Generate a Self-Signed Certificate

Self-signed certificates are appropriate for internal use, testing, or when you control all FTP clients and can configure them to accept your CA.

```bash
# Create directory for the certificate
sudo mkdir -p /etc/ssl/vsftpd

# Generate a self-signed certificate and private key
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/vsftpd/vsftpd.key \
    -out /etc/ssl/vsftpd/vsftpd.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=ftp.example.com"

# Set appropriate permissions
sudo chmod 600 /etc/ssl/vsftpd/vsftpd.key
sudo chmod 644 /etc/ssl/vsftpd/vsftpd.crt
sudo chown root:root /etc/ssl/vsftpd/vsftpd.key /etc/ssl/vsftpd/vsftpd.crt
```

## Option 2: Use a Let's Encrypt Certificate

For public-facing FTP servers, use a certificate from Let's Encrypt for clients to trust without additional configuration.

```bash
# Install certbot
sudo apt install certbot -y

# Obtain a certificate (server must be publicly accessible on port 80)
# Stop any web server temporarily if running on port 80
sudo certbot certonly --standalone -d ftp.example.com

# Certificates are stored at:
# /etc/letsencrypt/live/ftp.example.com/fullchain.pem
# /etc/letsencrypt/live/ftp.example.com/privkey.pem

# Verify vsftpd can read the certificate
sudo ls -la /etc/letsencrypt/live/ftp.example.com/
```

## Configuring vsftpd for TLS

Edit the vsftpd configuration:

```bash
sudo nano /etc/vsftpd.conf
```

Add TLS configuration:

```ini
# ---- TLS Configuration ----

# Enable SSL/TLS support
ssl_enable=YES

# Paths to the certificate and key
# For self-signed certificate:
rsa_cert_file=/etc/ssl/vsftpd/vsftpd.crt
rsa_private_key_file=/etc/ssl/vsftpd/vsftpd.key

# For Let's Encrypt certificate:
# rsa_cert_file=/etc/letsencrypt/live/ftp.example.com/fullchain.pem
# rsa_private_key_file=/etc/letsencrypt/live/ftp.example.com/privkey.pem

# Require TLS for local user logins (reject plaintext connections)
allow_anon_ssl=NO
force_local_data_ssl=YES
force_local_logins_ssl=YES

# Use TLS 1.2 and above only
ssl_tlsv1_2=YES
ssl_sslv2=NO
ssl_sslv3=NO

# TLS 1.3 support (vsftpd 3.0.5+)
# ssl_tlsv1_3=YES

# Prefer server cipher order
ssl_ciphers=HIGH:!aNULL:!MD5:!RC4

# Require clients to reuse the SSL session for data connections
# (some clients do not support this - set to NO if clients cannot connect)
require_ssl_reuse=NO

# ---- Existing settings ----
listen=YES
listen_ipv6=NO
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
chroot_local_user=YES
allow_writeable_chroot=YES
use_localtime=YES
xferlog_enable=YES
xferlog_file=/var/log/vsftpd.log
```

## Passive Mode TLS Configuration

Passive mode configuration remains important with TLS:

```ini
# Passive mode settings (add to vsftpd.conf)
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=50000

# If the server is behind NAT, set the public IP
# pasv_address=203.0.113.10
```

## Firewall Configuration for FTPS

```bash
# Allow FTP control port
sudo ufw allow 21/tcp

# Allow passive data ports
sudo ufw allow 40000:50000/tcp

# Check rules
sudo ufw status numbered
```

## Restarting vsftpd

```bash
# Test the configuration for syntax errors (vsftpd does not have a test flag)
# Just restart and check the status
sudo systemctl restart vsftpd

# Check for errors
sudo systemctl status vsftpd
sudo journalctl -u vsftpd -n 20
```

## Testing FTPS Connections

Standard `ftp` clients do not support TLS. Use `lftp` or `curl` for testing:

```bash
# Install lftp
sudo apt install lftp -y

# Connect with explicit TLS (FTPES)
lftp ftps://ftp.example.com

# Or specify explicitly
lftp -e "set ftp:ssl-force yes" -u ftpuser1 ftp.example.com

# Test file upload
lftp -u ftpuser1,password ftp.example.com << 'EOF'
set ftp:ssl-force yes
set ssl:verify-certificate no    # use this only with self-signed certs
ls
put /etc/hostname test-upload.txt
ls
quit
EOF

# Test with curl
curl --user ftpuser1:password --ssl-reqd ftp://ftp.example.com/

# For self-signed certificates with curl, skip verification
curl --user ftpuser1:password --ssl-reqd --insecure ftp://ftp.example.com/
```

## Verifying TLS is Active

```bash
# Check the TLS handshake details using openssl
openssl s_client -connect ftp.example.com:21 -starttls ftp

# Look for:
# Protocol: TLSv1.2 or TLSv1.3
# Cipher: a strong cipher (AES, not RC4 or DES)
# Verify return code: 0 (ok) for valid certificates, non-zero for self-signed
```

The `AUTH TLS` command in the output confirms TLS is being negotiated correctly.

## Setting Up Certificate Renewal for Let's Encrypt

Let's Encrypt certificates expire after 90 days. Set up automatic renewal and vsftpd reload:

```bash
# Create a post-renewal hook to reload vsftpd
sudo nano /etc/letsencrypt/renewal-hooks/post/vsftpd.sh
```

```bash
#!/bin/bash
# Reload vsftpd after certificate renewal
systemctl reload vsftpd || systemctl restart vsftpd
echo "$(date): vsftpd reloaded after cert renewal" >> /var/log/letsencrypt-hooks.log
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/vsftpd.sh

# Test certificate renewal (dry run)
sudo certbot renew --dry-run

# Verify the hook runs
sudo certbot renew --dry-run --post-hook "echo hook executed"
```

## Common TLS Issues

### "425 Cannot build data connection: TLS session did not resume"

This error occurs when `require_ssl_reuse=YES` and the client does not reuse the TLS session for data connections. Set to `NO`:

```ini
require_ssl_reuse=NO
```

### Client Cannot Connect After Enabling TLS

Many legacy FTP clients do not support FTPS. Use FileZilla, lftp, or curl instead. In FileZilla, configure the site with "Explicit FTP over TLS."

### Certificate Verification Failures with Self-Signed Cert

In FileZilla, you can accept the self-signed certificate when prompted. In lftp, use `set ssl:verify-certificate no`. For production, use a CA-signed certificate.

### "Cannot Load Certificate File"

```bash
# Verify the certificate file is readable by vsftpd (runs as root)
sudo ls -la /etc/ssl/vsftpd/
sudo openssl x509 -in /etc/ssl/vsftpd/vsftpd.crt -text -noout | head -20
```

## Explicit vs Implicit FTPS

- **Explicit FTPS (FTPES):** The client connects on port 21 and upgrades to TLS via the AUTH TLS command. This is what vsftpd supports.
- **Implicit FTPS:** TLS is negotiated immediately on connection, typically on port 990. vsftpd does not support implicit FTPS by default.

For explicit FTPS, clients should connect to port 21 and use "Explicit FTP over TLS" or "AUTH TLS" in their settings.

## Checking Cipher Strength

```bash
# Check what ciphers the server offers
nmap --script ssl-enum-ciphers -p 21 ftp.example.com

# Or with testssl.sh
# Download testssl.sh and run:
./testssl.sh --starttls ftp ftp.example.com:21
```

Ensure no weak ciphers (RC4, DES, 3DES, NULL, EXPORT) are listed. The `ssl_ciphers=HIGH:!aNULL:!MD5:!RC4` setting in vsftpd.conf excludes the worst offenders.

FTPS with vsftpd provides a reasonable level of security for FTP services. Combined with chroot jails and user restriction, it gives you an FTP server that protects credentials and data in transit while remaining compatible with standard FTP client tools.
