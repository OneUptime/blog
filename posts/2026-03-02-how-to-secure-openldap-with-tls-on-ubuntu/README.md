# How to Secure OpenLDAP with TLS on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, OpenLDAP, TLS, Security, Certificate

Description: Secure your OpenLDAP server on Ubuntu with TLS encryption using Let's Encrypt or self-signed certificates to protect directory traffic.

---

By default, OpenLDAP transmits data in plaintext over port 389. On any network that carries passwords or sensitive directory data, this is unacceptable. TLS encryption prevents eavesdropping and man-in-the-middle attacks. This guide covers two methods: using a self-signed CA for internal networks, and using Let's Encrypt certificates for publicly accessible LDAP servers.

## TLS Options Overview

OpenLDAP supports two TLS modes:

- **StartTLS** - starts on port 389, upgrades to encrypted using the `STARTTLS` command
- **LDAPS** - separate encrypted connection on port 636

Both are secure when configured correctly. StartTLS is more flexible (same port, optional upgrade). LDAPS is simpler and avoids ambiguity about whether the connection is actually encrypted.

## Prerequisites

- OpenLDAP (slapd) installed and running on Ubuntu
- Either a domain name for Let's Encrypt, or willingness to use a self-signed certificate
- `openssl` installed

## Method 1: Self-Signed Certificate

Use this for internal infrastructure where you control all clients.

### Generate the CA and Server Certificate

```bash
# Create a directory for certificates
sudo mkdir -p /etc/ldap/ssl
cd /etc/ldap/ssl

# Generate the CA private key
sudo openssl genrsa -out ca.key 4096

# Create the CA certificate (valid 10 years)
sudo openssl req -x509 -new -nodes -key ca.key \
  -sha256 -days 3650 \
  -out ca.crt \
  -subj "/C=US/ST=State/L=City/O=Example Org/CN=Example CA"

# Generate the server private key
sudo openssl genrsa -out ldap.key 4096

# Create a certificate signing request for the server
sudo openssl req -new -key ldap.key \
  -out ldap.csr \
  -subj "/C=US/ST=State/L=City/O=Example Org/CN=ldap.example.com"

# Create a config file for SAN (Subject Alternative Names)
cat > san.conf << 'EOF'
[req]
req_extensions = v3_req

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = ldap.example.com
DNS.2 = ldap1.example.com
IP.1 = 192.168.1.10
EOF

# Sign the server certificate with the CA
sudo openssl x509 -req -in ldap.csr \
  -CA ca.crt -CAkey ca.key \
  -CAcreateserial \
  -out ldap.crt \
  -days 825 \
  -sha256 \
  -extfile san.conf \
  -extensions v3_req
```

### Set Correct Permissions

```bash
sudo chown openldap:openldap /etc/ldap/ssl/ldap.key /etc/ldap/ssl/ldap.crt /etc/ldap/ssl/ca.crt
sudo chmod 640 /etc/ldap/ssl/ldap.key
sudo chmod 644 /etc/ldap/ssl/ldap.crt /etc/ldap/ssl/ca.crt
```

## Method 2: Let's Encrypt Certificate

For servers with a public DNS name. This requires port 80 or 443 to be accessible for the ACME challenge.

```bash
sudo apt install -y certbot

# Obtain certificate (adjust --standalone if no web server is running)
sudo certbot certonly --standalone -d ldap.example.com

# Certificates are placed in /etc/letsencrypt/live/ldap.example.com/
```

Create a deploy hook to fix permissions after renewal:

```bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/ldap-cert.sh
```

```bash
#!/bin/bash
# Copy Let's Encrypt certs to LDAP directory with correct permissions
DOMAIN="ldap.example.com"
DEST="/etc/ldap/ssl"

mkdir -p "$DEST"
cp /etc/letsencrypt/live/$DOMAIN/cert.pem $DEST/ldap.crt
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $DEST/ldap.key
cp /etc/letsencrypt/live/$DOMAIN/chain.pem $DEST/ca.crt

chown openldap:openldap $DEST/ldap.key $DEST/ldap.crt $DEST/ca.crt
chmod 640 $DEST/ldap.key
chmod 644 $DEST/ldap.crt $DEST/ca.crt

systemctl restart slapd
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/ldap-cert.sh
# Run manually the first time
sudo bash /etc/letsencrypt/renewal-hooks/deploy/ldap-cert.sh
```

## Configuring slapd to Use TLS

OpenLDAP's TLS settings live in `cn=config`. Apply them with an LDIF:

```bash
sudo nano /tmp/tls-config.ldif
```

```ldif
dn: cn=config
changetype: modify
replace: olcTLSCACertificateFile
olcTLSCACertificateFile: /etc/ldap/ssl/ca.crt
-
replace: olcTLSCertificateFile
olcTLSCertificateFile: /etc/ldap/ssl/ldap.crt
-
replace: olcTLSCertificateKeyFile
olcTLSCertificateKeyFile: /etc/ldap/ssl/ldap.key
-
replace: olcTLSCipherSuite
olcTLSCipherSuite: HIGH:MEDIUM:+SSLv3
-
replace: olcTLSProtocolMin
olcTLSProtocolMin: 3.3
```

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f /tmp/tls-config.ldif
```

### Enable LDAPS (Port 636)

Edit the slapd defaults:

```bash
sudo nano /etc/default/slapd
```

```text
SLAPD_SERVICES="ldap:/// ldapi:/// ldaps:///"
```

Restart slapd:

```bash
sudo systemctl restart slapd
```

Verify it is listening on 636:

```bash
sudo ss -tlnp | grep slapd
# Should show :389 and :636
```

## Configuring AppArmor

On Ubuntu, AppArmor may block slapd from reading certificates. Check and update the profile:

```bash
# Check for AppArmor denials
sudo dmesg | grep apparmor | grep slapd

# Update AppArmor profile
sudo nano /etc/apparmor.d/usr.sbin.slapd
# Add these lines in the {} block:
#   /etc/ldap/ssl/ r,
#   /etc/ldap/ssl/* r,

sudo apparmor_parser -r /etc/apparmor.d/usr.sbin.slapd
```

## Testing TLS Connections

### Test StartTLS (Port 389)

```bash
ldapsearch -x -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  -Z \
  -D "cn=admin,dc=example,dc=com" \
  -W "(objectClass=*)"

# The -Z flag requests StartTLS upgrade
```

### Test LDAPS (Port 636)

```bash
ldapsearch -x -H ldaps://ldap.example.com \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(objectClass=*)"
```

### Test with OpenSSL Directly

```bash
# Check certificate details
openssl s_client -connect ldap.example.com:636 -showcerts

# Test StartTLS on port 389
openssl s_client -connect ldap.example.com:389 -starttls ldap -showcerts
```

## Distributing the CA Certificate to Clients

For self-signed CAs, clients must trust your CA certificate:

```bash
# On each client machine
sudo cp ca.crt /usr/local/share/ca-certificates/ldap-ca.crt
sudo update-ca-certificates
```

For the LDAP client tools specifically, configure `/etc/ldap/ldap.conf`:

```bash
sudo nano /etc/ldap/ldap.conf
```

```text
BASE    dc=example,dc=com
URI     ldaps://ldap.example.com
TLS_CACERT /etc/ssl/certs/ca-certificates.crt

# Require certificate validation
TLS_REQCERT demand
```

## Enforcing TLS (Disable Plaintext Binds)

Once TLS is confirmed working, optionally require it for all binds (except local socket):

```ldif
# Save as require-tls.ldif
dn: olcDatabase={1}mdb,cn=config
changetype: modify
replace: olcSecurity
olcSecurity: tls=1
```

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f require-tls.ldif
```

After this, any plaintext (non-TLS) bind attempt on port 389 will be rejected with "Confidentiality required."

## Troubleshooting

**"TLS: can't connect: No such file or directory"** - check that the certificate file paths are correct and the `openldap` user can read them.

**"certificate verify failed"** - the client does not trust the CA. Distribute and install the CA certificate on the client, or temporarily set `TLS_REQCERT allow` while debugging.

**"unknown CA"** - the certificate chain is incomplete. Ensure `olcTLSCACertificateFile` points to the full chain, not just the intermediate.

With TLS configured, all LDAP traffic between your clients and server is encrypted, protecting credentials and directory data from interception.
