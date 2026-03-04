# How to Manage TLS/SSL Certificates with IdM Certificate Authority on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, TLS, SSL, Certificates, PKI, FreeIPA, Linux

Description: Learn how to request, manage, and renew TLS/SSL certificates using the IdM integrated Certificate Authority on RHEL for securing services.

---

IdM includes a Dogtag Certificate Authority that can issue TLS/SSL certificates for hosts and services. This provides a centralized PKI without needing a separate CA infrastructure. Certificates are automatically tracked for renewal by the certmonger service.

## Requesting a Certificate for a Service

```bash
# Authenticate as admin
kinit admin

# Ensure the service principal exists
ipa service-add HTTP/web1.example.com

# Generate a certificate signing request (CSR) using OpenSSL
openssl req -new -newkey rsa:2048 -nodes \
  -keyout /etc/pki/tls/private/web1.key \
  -out /tmp/web1.csr \
  -subj "/CN=web1.example.com/O=EXAMPLE.COM"

# Request the certificate from IdM CA
ipa cert-request /tmp/web1.csr \
  --principal=HTTP/web1.example.com \
  --certificate-out=/etc/pki/tls/certs/web1.crt
```

## Using certmonger for Automatic Management

certmonger automatically requests, tracks, and renews certificates:

```bash
# Request a certificate via certmonger (handles everything)
sudo ipa-getcert request \
  -K HTTP/web1.example.com \
  -k /etc/pki/tls/private/web1.key \
  -f /etc/pki/tls/certs/web1.crt \
  -D web1.example.com \
  -C "systemctl restart httpd"

# The -C flag specifies a command to run after renewal
```

## Checking Certificate Status

```bash
# List all certificates tracked by certmonger
sudo ipa-getcert list

# Check a specific certificate's status
sudo ipa-getcert status -f /etc/pki/tls/certs/web1.crt

# View certificate details
openssl x509 -in /etc/pki/tls/certs/web1.crt -noout -text

# Check expiration date
openssl x509 -in /etc/pki/tls/certs/web1.crt -noout -enddate
```

## Revoking a Certificate

```bash
# Find the certificate serial number
ipa cert-find --subject=web1.example.com

# Revoke the certificate (reason 0 = unspecified)
ipa cert-revoke --revocation-reason=0 <serial-number>
```

## Managing the CA Certificate

```bash
# View the IdM CA certificate
ipa-cacert-manage list

# Download the CA certificate for distribution
# Clients need this to trust IdM-issued certificates
cp /etc/ipa/ca.crt /tmp/idm-ca.crt

# On client systems, install the CA certificate
sudo cp /tmp/idm-ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

## Manually Renewing a Certificate

```bash
# Force renewal of a tracked certificate
sudo ipa-getcert resubmit -f /etc/pki/tls/certs/web1.crt

# Check the renewal status
sudo ipa-getcert list -f /etc/pki/tls/certs/web1.crt
```

By default, IdM-issued certificates are valid for two years. certmonger will automatically renew them before expiration, but make sure the post-renewal command (specified with -C) restarts the appropriate service to load the new certificate.
