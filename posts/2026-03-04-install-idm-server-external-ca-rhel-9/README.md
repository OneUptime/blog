# How to Install an IdM Server with an External CA on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, Identity Management, Certificate Authority, FreeIPA, Linux

Description: Learn how to install a Red Hat Identity Management server on RHEL 9 using an external Certificate Authority for certificate signing.

---

Some organizations require that all certificates come from an existing corporate Certificate Authority rather than the IdM integrated CA. RHEL 9 IdM supports this by generating a Certificate Signing Request (CSR) during installation, which you submit to your external CA. The signed certificate is then imported to complete the installation.

## When to Use an External CA

Use an external CA when:

- Corporate policy requires a specific root CA
- You need certificates that chain to a publicly trusted CA
- Compliance standards mandate a centralized PKI
- You are integrating with an existing certificate infrastructure

## Prerequisites

Same as standard IdM installation, plus:

- Access to your organization's CA to sign the CSR
- The CA certificate chain (root CA and any intermediate CAs)

## Step 1: Start the Installation

```bash
sudo dnf module enable idm:DL1
sudo dnf distro-sync
sudo dnf install ipa-server ipa-server-dns
```

Begin the installation with the external CA flag:

```bash
sudo ipa-server-install --external-ca --setup-dns
```

Or non-interactively:

```bash
sudo ipa-server-install \
    --external-ca \
    --setup-dns \
    --hostname=idm1.example.com \
    --domain=example.com \
    --realm=EXAMPLE.COM \
    --ds-password='DirectoryManagerPassword' \
    --admin-password='AdminPassword' \
    --forwarder=8.8.8.8 \
    --unattended
```

## Step 2: Retrieve the CSR

The installation pauses and creates a CSR file:

```text
The next step is to get /root/ipa.csr signed by your CA and re-run
ipa-server-install as:
ipa-server-install --external-cert-file=/path/to/signed_certificate
    --external-cert-file=/path/to/external_ca_certificate
```

View the CSR:

```bash
cat /root/ipa.csr
```

## Step 3: Submit CSR to External CA

Copy the CSR to your CA administrator:

```bash
scp /root/ipa.csr caadmin@ca-server:/tmp/
```

The exact process depends on your CA:

### Microsoft AD CS

```powershell
certreq -submit -attrib "CertificateTemplate:SubCA" C:\tmp\ipa.csr C:\tmp\idm-cert.crt
```

### OpenSSL CA

```bash
openssl ca -in /tmp/ipa.csr -out /tmp/idm-cert.crt -extensions v3_ca
```

You need both:
- The signed IdM CA certificate
- The external CA certificate chain

## Step 4: Complete the Installation

Copy the signed certificate and CA chain back to the IdM server:

```bash
scp caadmin@ca-server:/tmp/idm-cert.crt /root/
scp caadmin@ca-server:/tmp/ca-chain.crt /root/
```

Resume the installation:

```bash
sudo ipa-server-install \
    --external-cert-file=/root/idm-cert.crt \
    --external-cert-file=/root/ca-chain.crt
```

If your CA chain has multiple files (root CA and intermediate):

```bash
sudo ipa-server-install \
    --external-cert-file=/root/idm-cert.crt \
    --external-cert-file=/root/intermediate-ca.crt \
    --external-cert-file=/root/root-ca.crt
```

## Step 5: Verify the Installation

```bash
kinit admin
ipactl status
```

Check the certificate chain:

```bash
ipa-cacert-manage list
```

Verify the web UI certificate:

```bash
echo | openssl s_client -connect idm1.example.com:443 2>/dev/null | openssl x509 -noout -issuer -subject
```

## Certificate Renewal

With an external CA, certificate renewal is not automatic. You must:

1. Monitor certificate expiration dates
2. Generate a new CSR when renewal is needed
3. Submit to the external CA
4. Import the renewed certificate

Check certificate expiration:

```bash
ipa-cacert-manage list
```

Renew the CA certificate:

```bash
sudo ipa-cacert-manage renew --external-ca
# Submit the new CSR to your CA, then:
sudo ipa-cacert-manage renew \
    --external-cert-file=/root/new-idm-cert.crt \
    --external-cert-file=/root/ca-chain.crt
```

## Troubleshooting

### Certificate Chain Issues

If the installation fails with certificate chain errors:

```bash
# Verify the certificate chain
openssl verify -CAfile /root/ca-chain.crt /root/idm-cert.crt
```

### Certificate Format Issues

IdM expects PEM format. Convert from DER if needed:

```bash
openssl x509 -inform DER -in idm-cert.der -out idm-cert.crt
```

Convert from PKCS#7:

```bash
openssl pkcs7 -print_certs -in idm-cert.p7b -out idm-cert.crt
```

## Summary

Installing IdM with an external CA on RHEL 9 is a two-phase process: generate a CSR, get it signed by your external CA, and then complete the installation with the signed certificate. This approach integrates IdM into your existing PKI infrastructure while still providing centralized Kerberos authentication and LDAP directory services. Remember that certificate renewal requires manual intervention when using an external CA.
