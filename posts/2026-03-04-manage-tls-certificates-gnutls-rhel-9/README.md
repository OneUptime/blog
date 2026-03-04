# How to Manage TLS Certificates Using GnuTLS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GnuTLS, TLS, Certificates, Linux

Description: A hands-on guide to using GnuTLS tools on RHEL for generating keys, creating certificates, and inspecting TLS connections.

---

Most RHEL admins reach for OpenSSL by default when working with certificates. That is totally fine, but GnuTLS is actually the preferred TLS library on many Red Hat systems, and its command-line tool `certtool` is worth knowing. Several RHEL components, including libvirt and GNOME, use GnuTLS under the hood.

This post covers practical GnuTLS usage on RHEL for day-to-day certificate management tasks.

## Installing GnuTLS Tools

The GnuTLS library is usually already present, but you need the utils package for the command-line tools:

```bash
# Install GnuTLS command-line utilities
sudo dnf install gnutls-utils
```

This gives you `certtool`, `gnutls-cli`, `gnutls-serv`, and a few other utilities.

## Generating a Private Key

```bash
# Generate a 4096-bit RSA private key
certtool --generate-privkey --rsa --bits 4096 --outfile server.key
```

For an ECDSA key:

```bash
# Generate an ECDSA key with the secp256r1 curve
certtool --generate-privkey --ecc --curve secp256r1 --outfile server-ec.key
```

Check the key details:

```bash
# Display key information
certtool --key-info --infile server.key
```

## Creating a Self-Signed Certificate

With GnuTLS, you use a template file to define certificate properties. Create a template:

```bash
# Create a certificate template file
cat > server.tmpl << 'EOF'
organization = "MyOrg"
country = US
state = "California"
cn = "myserver.internal"
dns_name = "myserver.internal"
dns_name = "myserver.local"
ip_address = "192.168.1.100"
tls_www_server
signing_key
encryption_key
expiration_days = 365
EOF
```

Now generate the self-signed certificate:

```bash
# Generate a self-signed certificate from the template
certtool --generate-self-signed --load-privkey server.key --template server.tmpl --outfile server.crt
```

## Creating a Certificate Authority

Template for the CA:

```bash
# Create a CA certificate template
cat > ca.tmpl << 'EOF'
organization = "MyOrg"
country = US
cn = "MyOrg Internal CA"
ca
cert_signing_key
expiration_days = 3650
EOF
```

Generate the CA key and certificate:

```bash
# Generate the CA private key
certtool --generate-privkey --rsa --bits 4096 --outfile ca.key

# Create the CA certificate
certtool --generate-self-signed --load-privkey ca.key --template ca.tmpl --outfile ca.crt
```

## Signing a Certificate with Your CA

First create a certificate request:

```bash
# Create a CSR template
cat > webapp.tmpl << 'EOF'
organization = "MyOrg"
cn = "webapp.internal"
dns_name = "webapp.internal"
dns_name = "webapp.local"
tls_www_server
signing_key
encryption_key
expiration_days = 365
EOF
```

```bash
# Generate a key for the web application
certtool --generate-privkey --rsa --bits 4096 --outfile webapp.key

# Generate a certificate request
certtool --generate-request --load-privkey webapp.key --template webapp.tmpl --outfile webapp.csr
```

Sign the request with the CA:

```bash
# Sign the certificate request with the CA
certtool --generate-certificate --load-request webapp.csr --load-ca-certificate ca.crt --load-ca-privkey ca.key --template webapp.tmpl --outfile webapp.crt
```

## The Certificate Workflow

```mermaid
graph LR
    A[Generate Private Key] --> B[Create Template]
    B --> C[Generate CSR]
    C --> D[Sign with CA]
    D --> E[Deploy Certificate]
```

## Inspecting Certificates

View full certificate details:

```bash
# Display all certificate information
certtool --certificate-info --infile server.crt
```

This outputs the certificate in a human-readable format, including the subject, issuer, validity dates, SANs, key usage, and signature algorithm.

Compare that to the OpenSSL equivalent:

```bash
# Same thing with OpenSSL for comparison
openssl x509 -in server.crt -noout -text
```

Both work, but `certtool` output tends to be a bit more readable.

## Verifying Certificate Chains

Verify that a server certificate chains properly to a CA:

```bash
# Verify the certificate chain
certtool --verify --load-ca-certificate ca.crt --infile webapp.crt
```

For a chain with intermediate certificates:

```bash
# Verify with a full chain file
certtool --verify-chain --infile fullchain.pem
```

## Testing TLS Connections with gnutls-cli

`gnutls-cli` is GnuTLS's equivalent to `openssl s_client`. It is great for debugging TLS connections:

```bash
# Connect to a remote server and display TLS session info
gnutls-cli --print-cert example.com -p 443
```

Test against your own server:

```bash
# Connect with a custom CA certificate for verification
gnutls-cli --x509cafile ca.crt myserver.internal -p 443
```

Check which TLS versions and ciphersuites a server supports:

```bash
# Display the negotiated protocol version and cipher
gnutls-cli --priority "NORMAL" example.com -p 443 < /dev/null
```

The `--priority` string controls which protocols and ciphers to offer. GnuTLS uses priority strings instead of OpenSSL-style cipher lists.

## Converting Between Formats

GnuTLS works natively with PEM format. If you need DER format:

```bash
# Convert PEM certificate to DER format
certtool --certificate-info --infile server.crt --outder --outfile server.der
```

Convert a DER certificate to PEM:

```bash
# Convert DER to PEM
certtool --certificate-info --inder --infile server.der --outfile server.pem
```

## PKCS#12 Bundles

Some applications need certificates in PKCS#12 (.p12 or .pfx) format, which bundles the key and certificate together:

```bash
# Create a PKCS#12 bundle
certtool --to-p12 --load-privkey server.key --load-certificate server.crt --p12-name "My Server" --outfile server.p12 --outder
```

You will be prompted for an export password.

Extract from a PKCS#12 bundle:

```bash
# Extract the certificate from a PKCS#12 file
certtool --p12-info --inder --infile server.p12
```

## GnuTLS Priority Strings

RHEL uses GnuTLS priority strings to control TLS behavior in applications that use the library. The system-wide default is set by the crypto policy, but you can also set them per-application.

Common priority strings:

```
NORMAL          - Sensible defaults
SECURE128       - 128-bit security level minimum
SECURE256       - 256-bit security level minimum
PERFORMANCE     - Prioritize speed over security level
```

Test what a priority string enables:

```bash
# Show the protocols and ciphers enabled by a priority string
gnutls-cli --priority "NORMAL" --list
```

## Generating Certificate Revocation Lists

If you run a local CA, you may need to revoke certificates:

```bash
# Create a CRL template
cat > crl.tmpl << 'EOF'
expiration_days = 30
EOF
```

```bash
# Generate an empty CRL
certtool --generate-crl --load-ca-certificate ca.crt --load-ca-privkey ca.key --template crl.tmpl --outfile ca.crl
```

To revoke a specific certificate and add it to the CRL:

```bash
# Generate a CRL that includes the revoked certificate
certtool --generate-crl --load-ca-certificate ca.crt --load-ca-privkey ca.key --load-certificate webapp.crt --template crl.tmpl --outfile ca.crl
```

## Wrapping Up

GnuTLS is a capable alternative to OpenSSL for certificate management on RHEL. The template-based approach of `certtool` is arguably cleaner for scripting than OpenSSL's config file syntax, and `gnutls-cli` is an excellent TLS debugging tool. Since GnuTLS underpins many RHEL components, knowing your way around it will come in handy sooner or later.
