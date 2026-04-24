# How to Set Up LDAP with StartTLS Encryption in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LDAP, StartTLS, Security, Encryption, TLS

Description: Configure Portainer to use StartTLS encryption when connecting to your LDAP server on port 389 for secure credential transmission.

## Introduction

StartTLS upgrades a plain LDAP connection (port 389) to an encrypted TLS connection before authentication and directory operations. It's an alternative to LDAPS (port 636) - you use the standard LDAP port but still get encryption. This guide configures Portainer to use StartTLS with your LDAP server.

## StartTLS vs LDAPS

| Feature | LDAP (plain) | StartTLS | LDAPS |
|---------|-------------|----------|-------|
| Port | 389 | 389 | 636 |
| Encryption | None | TLS after StartTLS | TLS from connection start |
| Certificate | Not required | Required | Required |
| Compatibility | Any LDAP listener | Servers with StartTLS support | Servers with an LDAPS listener |

StartTLS is useful when your environment uses port 389 exclusively (firewall rules) but you need encryption.

## Prerequisites

- LDAP server configured to support StartTLS
- CA certificate, or the self-signed server certificate if the LDAP server uses a self-signed cert
- Portainer running

## Step 1: Verify Your LDAP Server Supports StartTLS

```bash
# Test StartTLS connectivity

ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -Z \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "dc=example,dc=com" \
  "(objectClass=*)" dn

# The -Z flag requests StartTLS
# -ZZ requires StartTLS and fails if it is not available
ldapsearch -x -H ldap://ldap.example.com:389 -ZZ \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "" \
  -s base "(objectClass=*)" supportedExtension
```

## Step 2: Obtain the CA Certificate (or Self-Signed Server Certificate)

```bash
# Method 1: Inspect the certificate presented by the LDAP server
openssl s_client -connect ldap.example.com:389 -starttls ldap -showcerts < /dev/null 2>/dev/null

# If the LDAP server uses a self-signed certificate, save the presented certificate
openssl s_client -connect ldap.example.com:389 -starttls ldap < /dev/null 2>/dev/null \
  | openssl x509 -outform PEM > ldap-ca.pem

# Method 2: Get from your certificate authority
# If the LDAP server uses a CA-issued certificate, export the issuing CA certificate
# from your internal PKI instead of saving the server's leaf certificate

# Verify the certificate
openssl x509 -in ldap-ca.pem -text -noout | grep -E "Subject:|Issuer:|Not After:"
```

## Step 3: Configure Portainer for StartTLS

In Settings → Authentication → LDAP:

```text
Server:                               ldap.example.com:389
Use StartTLS:                         Enabled (toggle ON)
Skip verification of server certificate: Off (for production - verify the certificate)
TLS CA certificate:                   [upload ldap-ca.pem]
```

**PEM File Example:**
```text
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiIMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
... (certificate content) ...
-----END CERTIFICATE-----
```

## Step 4: Configure via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Upload the CA certificate file first
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@ldap-ca.pem" \
  "https://portainer.example.com/api/upload/tls/ca?folder=ldap"

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d '{
    "AuthenticationMethod": 2,
    "LDAPSettings": {
      "URL": "ldap.example.com:389",
      "TLSConfig": {
        "TLS": false,
        "TLSSkipVerify": false
      },
      "StartTLS": true,
      "AnonymousMode": false,
      "ReaderDN": "cn=portainer-bind,dc=example,dc=com",
      "Password": "bindpassword",
      "SearchSettings": [
        {
          "BaseDN": "ou=users,dc=example,dc=com",
          "UserNameAttribute": "uid",
          "Filter": "(objectClass=inetOrgPerson)"
        }
      ],
      "GroupSearchSettings": [],
      "AutoCreateUsers": true
    }
  }'
```

## Step 5: Testing the StartTLS Connection

After configuring, use the built-in test in Portainer's LDAP settings:

```bash
# Test from the command line
ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -ZZ \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "ou=users,dc=example,dc=com" \
  "(uid=testuser)" uid cn

# Expected: returns user entry if successful
# Errors mentioning ldap_start_tls indicate the StartTLS negotiation failed
# Check server support and certificate trust
```

## Troubleshooting

**"TLS handshake failure"**: The CA certificate is wrong or incomplete. Ensure you have the full certificate chain.

**"Certificate verify failed"**: The LDAP server's hostname doesn't match the certificate's CN/SAN. Check the certificate's Subject Alternative Names.

**"StartTLS not supported"**: The LDAP server doesn't have TLS configured. Check your LDAP server's TLS configuration.

To temporarily diagnose, enable **Skip TLS Verification** to confirm it's a certificate issue, then fix the certificate and disable skip.

## Conclusion

StartTLS provides encryption for LDAP traffic without requiring port 636 or a separate LDAPS listener. Once configured with the correct CA certificate, Portainer seamlessly upgrades all LDAP connections to TLS. For new installations, LDAPS (port 636) is generally simpler, but StartTLS is the right choice when your network infrastructure mandates port 389.
