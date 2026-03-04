# How to Configure TLS/SSL Encryption for 389 Directory Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, 389 Directory Server, TLS, SSL, LDAP, Security, Linux

Description: Learn how to enable TLS/SSL encryption on 389 Directory Server running on RHEL to secure LDAP communications in transit.

---

Securing LDAP traffic with TLS is critical for any production 389 Directory Server deployment. Without encryption, credentials and directory data travel over the network in plaintext. This guide walks through enabling TLS on 389 DS on RHEL.

## Prerequisites

Make sure 389 Directory Server is already installed and running. You also need a TLS certificate, either from a CA or self-signed for testing.

## Generate a Self-Signed Certificate (Testing Only)

```bash
# Create a directory for certificates
mkdir -p /etc/dirsrv/slapd-localhost/certs

# Generate a self-signed certificate using openssl
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/dirsrv/slapd-localhost/server.key \
  -out /etc/dirsrv/slapd-localhost/server.crt \
  -subj "/CN=ldap.example.com"
```

## Import Certificates into 389 DS NSS Database

389 DS uses an NSS certificate database. Use `dsctl` and `dsconf` to manage TLS.

```bash
# Stop the directory server instance
dsctl localhost stop

# Create a PKCS12 bundle from your cert and key
openssl pkcs12 -export \
  -in /etc/dirsrv/slapd-localhost/server.crt \
  -inkey /etc/dirsrv/slapd-localhost/server.key \
  -out /tmp/server.p12 \
  -name "Server-Cert" \
  -passout pass:changeit

# Import the PKCS12 into the NSS database
pk12util -i /tmp/server.p12 \
  -d /etc/dirsrv/slapd-localhost \
  -W changeit

# Start the directory server
dsctl localhost start
```

## Enable TLS in the Directory Server Configuration

```bash
# Enable TLS security using dsconf
dsconf localhost config replace nsslapd-security=on

# Set the RSA cipher configuration
dsconf localhost security rsa set \
  --tls-name "Server-Cert" \
  --tls-minimum-version "TLS1.2"

# Restart the instance to apply changes
dsctl localhost restart
```

## Verify TLS is Working

```bash
# Test the LDAPS connection on port 636
openssl s_client -connect ldap.example.com:636 -showcerts

# Or use ldapsearch with STARTTLS on port 389
ldapsearch -H ldap://ldap.example.com -ZZ \
  -D "cn=Directory Manager" -W \
  -b "dc=example,dc=com" "(uid=*)"
```

## Open Firewall Ports

```bash
# Allow LDAPS traffic through the firewall
sudo firewall-cmd --permanent --add-service=ldaps
sudo firewall-cmd --reload
```

## Disable Unencrypted LDAP (Optional)

```bash
# Require secure connections only
dsconf localhost config replace nsslapd-require-secure-binds=on
dsconf localhost restart
```

After this change, all clients must connect using LDAPS (port 636) or STARTTLS. Plaintext binds will be rejected.
