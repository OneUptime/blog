# How to Manage TLS/SSL Certificates with IdM Certificate Authority on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, Certificates, TLS, SSL, PKI, Identity Management, Linux

Description: Learn how to use the IdM integrated Certificate Authority on RHEL 9 to issue, manage, and renew TLS/SSL certificates for hosts and services.

---

The IdM integrated Certificate Authority (CA) on RHEL 9, based on the Dogtag Certificate System, provides a full PKI solution for issuing and managing TLS/SSL certificates. Hosts enrolled in IdM can automatically request and renew certificates, simplifying certificate lifecycle management across your infrastructure.

## Understanding the IdM CA

IdM CA capabilities:

- Issues certificates for hosts and services
- Supports certificate profiles for different use cases
- Integrates with certmonger for automatic renewal
- Provides CRL (Certificate Revocation List) distribution
- Supports sub-CA creation for certificate isolation

## Viewing the CA Certificate

```bash
ipa-cacert-manage list
```

Export the CA certificate:

```bash
ipa-cacert-manage install --ca-cert-file=/tmp/ipa-ca.crt
```

## Requesting Certificates

### For a Host

Generate a CSR:

```bash
openssl req -new -nodes \
    -newkey rsa:2048 \
    -keyout /etc/pki/tls/private/web1.key \
    -out /tmp/web1.csr \
    -subj "/CN=web1.example.com"
```

Submit to IdM:

```bash
ipa cert-request /tmp/web1.csr --principal=host/web1.example.com
```

### For a Service

First, create the service principal:

```bash
ipa service-add HTTP/web1.example.com
```

Generate a CSR and submit:

```bash
openssl req -new -nodes \
    -newkey rsa:2048 \
    -keyout /etc/pki/tls/private/httpd.key \
    -out /tmp/httpd.csr \
    -subj "/CN=web1.example.com"

ipa cert-request /tmp/httpd.csr --principal=HTTP/web1.example.com
```

### Using certmonger for Automatic Management

certmonger handles certificate requests and renewals automatically:

```bash
sudo ipa-getcert request \
    -K HTTP/web1.example.com \
    -k /etc/pki/tls/private/httpd.key \
    -f /etc/pki/tls/certs/httpd.crt \
    -D web1.example.com \
    -C "systemctl reload httpd"
```

Parameters:

- `-K` - Kerberos principal
- `-k` - Private key file
- `-f` - Certificate file
- `-D` - DNS Subject Alternative Name
- `-C` - Command to run after renewal

## Monitoring Certificates

### List certmonger-Tracked Certificates

```bash
sudo ipa-getcert list
```

### Check a Specific Certificate

```bash
sudo ipa-getcert status -f /etc/pki/tls/certs/httpd.crt
```

### Find Certificates in IdM

```bash
# Find all certificates
ipa cert-find

# Find certificates for a specific host
ipa cert-find --subject=web1.example.com

# Find expiring certificates
ipa cert-find --validnotafter-from=2026-03-04 --validnotafter-to=2026-04-04
```

## Viewing Certificate Details

```bash
ipa cert-show SERIAL_NUMBER
```

Or using openssl:

```bash
openssl x509 -in /etc/pki/tls/certs/httpd.crt -text -noout
```

## Revoking Certificates

```bash
ipa cert-revoke SERIAL_NUMBER --revocation-reason=4
```

Revocation reasons:

- 0 - Unspecified
- 1 - Key compromise
- 2 - CA compromise
- 3 - Affiliation changed
- 4 - Superseded
- 5 - Cessation of operation
- 6 - Certificate hold

## Certificate Profiles

### Listing Profiles

```bash
ipa certprofile-find
```

### Viewing a Profile

```bash
ipa certprofile-show caIPAserviceCert
```

### Creating a Custom Profile

Export an existing profile as a template:

```bash
ipa certprofile-show caIPAserviceCert --out=/tmp/custom_profile.cfg
```

Modify and import:

```bash
ipa certprofile-import custom_web \
    --file=/tmp/custom_profile.cfg \
    --desc="Custom web server certificate profile" \
    --store=true
```

## Sub-CAs

Create a lightweight sub-CA for specific purposes:

```bash
ipa ca-add web-ca --desc="Sub-CA for web servers" --subject="CN=Web CA,O=Example"
```

Request certificates from the sub-CA:

```bash
sudo ipa-getcert request \
    -K HTTP/web1.example.com \
    -k /etc/pki/tls/private/httpd.key \
    -f /etc/pki/tls/certs/httpd.crt \
    -X web-ca
```

## Automatic Renewal

certmonger automatically renews certificates before they expire. Check renewal configuration:

```bash
sudo ipa-getcert list | grep -A 5 "expires"
```

Force an immediate renewal:

```bash
sudo ipa-getcert resubmit -f /etc/pki/tls/certs/httpd.crt
```

## Distributing the CA Certificate

For clients that need to trust the IdM CA:

```bash
# Copy the CA certificate
sudo cp /etc/ipa/ca.crt /etc/pki/ca-trust/source/anchors/ipa-ca.crt
sudo update-ca-trust
```

## Summary

The IdM CA on RHEL 9 provides integrated certificate management for your infrastructure. Use certmonger for automatic certificate requests and renewals, create service principals before requesting service certificates, and monitor certificate status with `ipa-getcert list`. Sub-CAs provide isolation for different certificate uses, and certificate profiles customize the certificate content. The integration with IdM ensures that certificate management is centralized and automated.
