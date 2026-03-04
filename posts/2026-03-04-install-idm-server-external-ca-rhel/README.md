# How to Install an IdM Server with an External CA on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, FreeIPA, Certificate Authority, PKI, Identity Management, Linux

Description: Learn how to install a Red Hat Identity Management (IdM) server with an external Certificate Authority on RHEL, integrating IdM into your existing PKI infrastructure.

---

When your organization has an existing Certificate Authority (CA), you can install IdM as a subordinate CA. This means IdM's CA certificate is signed by your external CA, integrating IdM into your existing PKI trust chain.

## Prerequisites

```bash
# Set hostname
sudo hostnamectl set-hostname idm1.example.com

# Install required packages
sudo dnf module enable idm:DL1 -y
sudo dnf install -y ipa-server ipa-server-dns
```

## Step 1: Start the Installation (Generates CSR)

The installation is a two-step process. The first step generates a Certificate Signing Request (CSR):

```bash
# Start the installation with external CA option
sudo ipa-server-install \
  --domain=example.com \
  --realm=EXAMPLE.COM \
  --ds-password='DirectoryManagerPassword123' \
  --admin-password='AdminPassword123' \
  --setup-dns \
  --forwarder=8.8.8.8 \
  --external-ca \
  --unattended

# The installer pauses and generates a CSR file at:
# /root/ipa.csr
```

## Step 2: Get the CSR Signed by Your External CA

Take the CSR to your external CA and get it signed:

```bash
# View the CSR content to submit to your CA
cat /root/ipa.csr

# Your external CA will return:
# 1. The signed IdM CA certificate
# 2. The external CA certificate chain

# Save them as files:
# /root/idm-ca.crt    - the signed IdM CA certificate
# /root/external-ca.crt - the external CA certificate chain
```

## Step 3: Complete the Installation

```bash
# Resume the installation with the signed certificate
sudo ipa-server-install \
  --external-cert-file=/root/idm-ca.crt \
  --external-cert-file=/root/external-ca.crt

# The installer continues and completes the setup
# This may take 10-15 minutes
```

## Verifying the Installation

```bash
# Open firewall ports
sudo firewall-cmd --permanent --add-service={freeipa-ldap,freeipa-ldaps,dns,kerberos,kpasswd,http,https}
sudo firewall-cmd --reload

# Authenticate as admin
kinit admin

# Verify the CA certificate chain
ipa-cacert-manage list

# Check that all services are running
ipactl status

# Verify the CA certificate was issued by your external CA
openssl x509 -in /etc/ipa/ca.crt -noout -issuer -subject
```

## Renewing the IdM CA Certificate

When the IdM CA certificate approaches expiration, you need to renew it through your external CA:

```bash
# Generate a renewal CSR
sudo ipa-cacert-manage renew --external-ca

# Submit the CSR at /var/lib/ipa/ca.csr to your external CA
# Then install the renewed certificate
sudo ipa-cacert-manage renew \
  --external-cert-file=/root/renewed-ca.crt \
  --external-cert-file=/root/external-ca.crt

# Update CA certificates on all clients
sudo ipa-certupdate
```

Using an external CA integrates IdM into your existing trust hierarchy. Clients that already trust your external CA will automatically trust IdM-issued certificates through the chain of trust.
