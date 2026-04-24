# How to Configure ProFTPD TLS Encryption on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ProFTPD, TLS, FTP, IPv4, FTPS, Security, Configuration

Description: Learn how to configure ProFTPD with TLS (FTPS) on an IPv4 server to encrypt FTP control and data connections.

---

Plain FTP transmits credentials and data in cleartext. FTPS (FTP over TLS) encrypts the connection using the same TLS protocol used by HTTPS. ProFTPD's `mod_tls` module enables FTPS with minimal configuration.

## Prerequisites

```bash
# Install the TLS/SSL module package on Debian/Ubuntu

apt install proftpd-mod-crypto -y  # Debian/Ubuntu
```

## Generating a Certificate

```bash
# Create the certificate directory
install -d -m 700 /etc/proftpd/ssl

# Generate a self-signed certificate (or use Let's Encrypt in production)
openssl req -x509 -noenc -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/proftpd/ssl/proftpd.key \
  -out    /etc/proftpd/ssl/proftpd.crt \
  -subj   "/CN=ftp.example.com/O=My Org/C=US"

# Set secure permissions
chmod 600 /etc/proftpd/ssl/proftpd.key
chown root:root /etc/proftpd/ssl/proftpd.key
```

## ProFTPD TLS Configuration

```apache
# /etc/proftpd/proftpd.conf

# Load the TLS module
LoadModule mod_tls.c

# --- Bind to IPv4 ---
UseIPv6  off
Port       21
ServerName "Secure FTP Server"

# --- TLS configuration ---
<IfModule mod_tls.c>
    # Enable TLS support
    TLSEngine on

    # Log TLS activity and diagnostics to a file
    TLSLog /var/log/proftpd/tls.log

    # Require TLS for all connections (use 'off' to make it optional)
    TLSRequired on

    # Certificate and key paths
    TLSRSACertificateFile    /etc/proftpd/ssl/proftpd.crt
    TLSRSACertificateKeyFile /etc/proftpd/ssl/proftpd.key

    # Disable weak protocols
    TLSProtocol TLSv1.2 TLSv1.3

    # Strong cipher suites
    TLSCipherSuite HIGH:!aNULL:!MD5:!3DES

    # Require clients to present a certificate (for mutual TLS; optional)
    # TLSVerifyClient on

    # Do not request client certs, enable extra TLS diagnostics, and relax
    # data-channel session reuse for compatibility with some clients
    TLSOptions NoCertRequest EnableDiags NoSessionReuseRequired

    # Explicitly disable TLS renegotiation requests
    TLSRenegotiate none
</IfModule>

# --- Passive mode settings ---
PassivePorts 40000 50000
MasqueradeAddress ftp.example.com
```

## Making TLS Optional (Allow Both Plain and TLS)

```apache
<IfModule mod_tls.c>
    TLSEngine on
    TLSRequired off   # Don't require TLS; allow plain FTP too (not recommended)
    TLSRSACertificateFile    /etc/proftpd/ssl/proftpd.crt
    TLSRSACertificateKeyFile /etc/proftpd/ssl/proftpd.key
    TLSProtocol TLSv1.2 TLSv1.3
</IfModule>
```

## Applying the Configuration

```bash
# Test config
proftpd --configtest

# Restart ProFTPD
systemctl restart proftpd

# Verify ProFTPD is listening on IPv4 port 21
ss -4 -tlnp | grep ':21 '
```

## Testing FTPS

```bash
# If you used the self-signed certificate above, trust that certificate in
# your client before testing.

# Test with curl (explicit FTPS via AUTH TLS on port 21)
curl --ssl-reqd ftp://ftp.example.com/ --user user:password

# Test with lftp (interactive FTPS client)
lftp -e "set ftp:ssl-force true; ls; quit" -u user,password ftp.example.com
```

## Key Takeaways

- `TLSRequired on` forces all clients to negotiate TLS; `TLSRequired off` makes it optional.
- `TLSProtocol TLSv1.2 TLSv1.3` disables weak SSL/TLS versions.
- `NoSessionReuseRequired` is often needed for compatibility with some FTP clients, including `curl`.
- Use `TLSLog` to debug TLS handshake issues when clients can't connect.
