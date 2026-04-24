# How to Set Up LDAP with TLS Encryption in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LDAP, TLS, Security, Encryption

Description: Configure Portainer to connect to your LDAP server using LDAPS (LDAP over TLS) on port 636 for end-to-end encrypted authentication.

## Introduction

LDAPS (LDAP over SSL/TLS) uses port 636 and wraps the entire LDAP connection in TLS from the start - unlike StartTLS which upgrades a plain connection. LDAPS is one of the TLS options supported by Portainer and is often straightforward to configure when your directory service already exposes port 636. This guide covers enabling LDAPS in Portainer.

## Prerequisites

- LDAP server with LDAPS enabled on port 636
- CA certificate for the LDAP server
- Port 636 accessible from Portainer

## Step 1: Verify LDAPS Availability

```bash
# Test direct LDAPS connection

openssl s_client -connect ldap.example.com:636 < /dev/null 2>/dev/null \
  | openssl x509 -noout -text | grep -E "Subject:|Not After:"

# Test with ldapsearch
ldapsearch -x \
  -H ldaps://ldap.example.com:636 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "dc=example,dc=com" \
  -s base "(objectClass=*)"
```

## Step 2: Export the CA Certificate

```bash
# Save the certificate chain presented by the LDAP server
openssl s_client -showcerts -connect ldap.example.com:636 < /dev/null 2>/dev/null \
  | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > ldap-chain.pem

# From ldap-chain.pem, copy the issuing CA certificate that signed the LDAP
# server certificate into ldap-ca.pem. Portainer expects the CA certificate,
# not just the leaf server certificate.

# For Active Directory, get the CA cert from AD CS
# If AD CS Web Enrollment is installed, the CA cert is commonly available at:
# http://your-ca-server/certsrv/certcarc.asp

# View certificate details
openssl x509 -in ldap-ca.pem -noout -text | grep -E "Subject:|Issuer:|DNS:|IP Address:"
```

## Step 3: Configure Portainer for LDAPS

In Settings → Authentication → LDAP:

```text
Server:             ldap.example.com:636
Use TLS:            Enabled (LDAPS)
StartTLS:           Disabled
Skip TLS Verify:    Off (use cert verification in production)
TLS CA Certificate: [upload ldap-ca.pem]

Reader DN:          cn=portainer-bind,dc=example,dc=com
Reader Password:    bindpassword
```

## Step 4: API Configuration

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Upload the CA cert for LDAP TLS verification
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "folder=ldap" \
  -F "file=@ldap-ca.pem" \
  https://portainer.example.com/api/upload/tls/ca

# Configure LDAPS
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d "$(python3 -c "
import json
config = {
  'AuthenticationMethod': 2,
  'LDAPSettings': {
    'URL': 'ldap.example.com:636',
    'TLSConfig': {
      'TLS': True,
      'TLSSkipVerify': False
    },
    'StartTLS': False,
    'AnonymousMode': False,
    'ReaderDN': 'cn=portainer-bind,dc=example,dc=com',
    'Password': 'bindpassword',
    'SearchSettings': [
      {
        'BaseDN': 'ou=users,dc=example,dc=com',
        'UserNameAttribute': 'uid',
        'Filter': '(objectClass=inetOrgPerson)'
      }
    ],
    'GroupSearchSettings': [
      {
        'GroupBaseDN': 'ou=groups,dc=example,dc=com',
        'GroupAttribute': 'member',
        'GroupFilter': '(objectClass=groupOfNames)'
      }
    ],
    'AutoCreateUsers': True
  }
}
print(json.dumps(config))
")"
```

## Active Directory LDAPS Configuration

For Active Directory with LDAPS:

```text
Server:             dc01.corp.example.com:636
Use TLS:            Enabled
Skip TLS Verify:    Off (preferred; upload the issuing CA certificate)
TLS CA Certificate: [upload Root CA certificate from AD CS]

Reader DN:          CN=portainer-bind,OU=Service Accounts,DC=corp,DC=example,DC=com
Reader Password:    [service account password]

User Base DN:       DC=corp,DC=example,DC=com
Username Attribute: sAMAccountName
User Filter:        (&(objectClass=user)(objectCategory=person))
```

## Testing LDAPS After Configuration

Use Portainer's built-in test in the LDAP settings page. For manual testing:

```bash
# Test the TLS handshake from the Portainer host
openssl s_client -connect ldap.example.com:636 \
  -CAfile ldap-ca.pem < /dev/null
# Look for: "Verify return code: 0 (ok)"

# Test an authenticated LDAP query over LDAPS
ldapsearch -x \
  -H ldaps://ldap.example.com:636 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "dc=example,dc=com" \
  -s base "(objectClass=*)"
```

## Handling Self-Signed Certificates

In development or small environments with self-signed LDAP certs:

```text
Skip TLS Verify: On
```

This disables certificate verification. Only use in non-production environments where you control the LDAP server and network.

For production with self-signed certs, properly import the self-signed certificate as the CA cert instead of skipping verification.

## Firewall Configuration

Ensure port 636 is open from Portainer to the LDAP server:

```bash
# Test port connectivity
nc -zv ldap.example.com 636

# Or from Docker
docker run --rm alpine nc -zv ldap.example.com 636
```

## Conclusion

LDAPS provides a straightforward TLS configuration for LDAP authentication in Portainer. By using port 636, the entire connection is encrypted from the first byte, avoiding the StartTLS upgrade step. Always use certificate verification in production by providing the CA certificate, and test connectivity before configuring Portainer to save troubleshooting time.
