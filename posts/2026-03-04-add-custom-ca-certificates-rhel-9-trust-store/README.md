# How to Add Custom CA Certificates to the RHEL Trust Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CA Certificates, Trust Store, Security, Linux

Description: A practical guide to adding custom and internal CA certificates to the RHEL system trust store so all applications trust your internal PKI.

---

If your organization runs an internal certificate authority, you need every RHEL server to trust it. Otherwise, internal services using certificates signed by your CA will trigger verification failures. Tools like curl, wget, Python, Java, and anything that makes TLS connections will refuse to connect.

This guide shows you exactly how to add custom CA certificates to the RHEL trust store and verify that everything works.

## Why You Need This

Common scenarios where you need to add a custom CA:

- Your company has an internal PKI for service-to-service encryption
- You use a private CA for development and staging environments
- You have an internal proxy that performs TLS inspection (MITM) using its own CA
- A partner organization provides services signed by a CA that is not in the default bundle

Without adding these CAs to the trust store, you will see errors like:

```bash
curl: (60) SSL certificate problem: unable to get local issuer certificate
```

```bash
ssl.SSLCertificateError: [SSL: CERTIFICATE_VERIFY_FAILED]
```

## Step 1: Obtain the CA Certificate

First, get the CA certificate in PEM format. It should look like this:

```bash
-----BEGIN CERTIFICATE-----
MIIDxTCCAq2gAwIBAgIQAqxcJm...
...
-----END CERTIFICATE-----
```

If you received it in DER (binary) format, convert it:

```bash
# Convert a DER-format certificate to PEM
openssl x509 -inform der -in ca-cert.der -out ca-cert.pem
```

If you need to extract it from a running server:

```bash
# Download the CA certificate from a server
openssl s_client -connect internal-server.corp:443 -showcerts </dev/null 2>/dev/null | \
  sed -n '/BEGIN CERTIFICATE/,/END CERTIFICATE/p' > ca-cert.pem
```

When a server sends multiple certificates in the chain, the last one is typically the CA certificate (or the highest intermediate).

## Step 2: Verify the Certificate

Before adding anything to your trust store, inspect it:

```bash
# View the certificate details
openssl x509 -in ca-cert.pem -noout -text | head -20
```

Check that:

- The Subject looks correct (it should be your internal CA, not a random server certificate)
- The `CA:TRUE` basic constraint is present
- The validity dates are reasonable

```bash
# Check if this is actually a CA certificate
openssl x509 -in ca-cert.pem -noout -text | grep "CA:TRUE"
```

Only add CA certificates to the trust store, never add individual server certificates.

## Step 3: Copy to the Anchors Directory

RHEL uses a specific directory for custom trusted CA certificates:

```bash
# Copy the CA certificate to the trust anchors directory
sudo cp ca-cert.pem /etc/pki/ca-trust/source/anchors/mycompany-root-ca.pem
```

Use a descriptive filename. You will thank yourself later when you have multiple CAs and need to tell them apart.

```mermaid
graph LR
    A[CA Certificate PEM file] --> B[/etc/pki/ca-trust/source/anchors/]
    B --> C[update-ca-trust]
    C --> D[System CA Bundle Updated]
    D --> E[All Applications Trust the CA]
```

## Step 4: Update the Trust Store

```bash
# Rebuild all trust store bundles
sudo update-ca-trust
```

This command regenerates the consolidated CA bundles from all sources, including your newly added certificate.

## Step 5: Verify It Worked

### Check the Bundle

```bash
# Verify the CA appears in the system bundle
trust list | grep -i "mycompany"
```

Or search the PEM bundle directly:

```bash
# Search the PEM bundle for your CA's subject
openssl crl2pkcs7 -nocrl -certfile /etc/pki/tls/certs/ca-bundle.crt | \
  openssl pkcs7 -print_certs -noout | grep -i "mycompany"
```

### Test with curl

```bash
# Test a connection to an internal service using the new CA
curl https://internal-service.corp.example.com/health
```

If the CA was added correctly, this should succeed without `-k` or `--insecure`.

### Test with OpenSSL

```bash
# Verify a server certificate against the system trust store
openssl s_client -connect internal-service.corp.example.com:443 </dev/null 2>&1 | grep "Verify return code"
```

You should see `Verify return code: 0 (ok)`.

### Test with Python

```bash
# Quick Python test
python3 -c "import urllib.request; urllib.request.urlopen('https://internal-service.corp.example.com/')"
```

### Test with Java

```bash
# Verify the CA is in the Java keystore
keytool -list -cacerts -storepass changeit | grep -i "mycompany"
```

## Adding Multiple CA Certificates

If you have a chain with both a root CA and intermediate CAs, add each one separately:

```bash
# Add root CA
sudo cp root-ca.pem /etc/pki/ca-trust/source/anchors/mycompany-root-ca.pem

# Add intermediate CA
sudo cp intermediate-ca.pem /etc/pki/ca-trust/source/anchors/mycompany-intermediate-ca.pem

# Rebuild once after adding all certificates
sudo update-ca-trust
```

You can also put multiple certificates in a single PEM file:

```bash
# Combine multiple CA certs into one file
cat root-ca.pem intermediate-ca.pem > /etc/pki/ca-trust/source/anchors/mycompany-full-chain.pem
sudo update-ca-trust
```

## Automating with Ansible

For fleets of servers, automate this with Ansible:

```yaml
# Ansible task to deploy custom CA certificates
- name: Copy internal CA certificate
  ansible.builtin.copy:
    src: files/mycompany-root-ca.pem
    dest: /etc/pki/ca-trust/source/anchors/mycompany-root-ca.pem
    owner: root
    group: root
    mode: '0644'
  notify: Update CA trust

- name: Update CA trust store
  ansible.builtin.command:
    cmd: update-ca-trust
  listen: Update CA trust
```

## Handling Certificate Rotation

When your internal CA certificate is about to expire and gets replaced:

1. Add the new CA certificate to anchors
2. Run `update-ca-trust`
3. Verify services work with the new CA
4. After all old certificates signed by the previous CA have been replaced, remove the old CA
5. Run `update-ca-trust` again

```bash
# Add new CA alongside the old one during transition
sudo cp new-ca.pem /etc/pki/ca-trust/source/anchors/mycompany-root-ca-2026.pem
sudo update-ca-trust

# Later, remove the old CA
sudo rm /etc/pki/ca-trust/source/anchors/mycompany-root-ca.pem
sudo update-ca-trust
```

## Troubleshooting

**"Certificate not found in bundle after update-ca-trust"**: Make sure the file has a `.pem` extension and is valid PEM format. Check with `openssl x509 -in file.pem -noout -text`.

**"Still getting certificate errors after adding CA"**: Some applications cache the trust store. Restart the application. For Java apps, make sure they use the system keystore path.

**"Application uses its own trust store"**: Some applications (like Firefox, Node.js, or Go programs) bundle their own CA list. You may need to configure them separately.

```bash
# For Node.js, set the environment variable
export NODE_EXTRA_CA_CERTS=/etc/pki/ca-trust/source/anchors/mycompany-root-ca.pem
```

**Permissions**: The certificate file in the anchors directory should be world-readable:

```bash
# Fix permissions if needed
sudo chmod 644 /etc/pki/ca-trust/source/anchors/mycompany-root-ca.pem
```

## Removing a Custom CA

If you no longer need a custom CA in the trust store:

```bash
# Remove the CA certificate
sudo rm /etc/pki/ca-trust/source/anchors/mycompany-root-ca.pem

# Rebuild the trust store
sudo update-ca-trust
```

## Wrapping Up

Adding custom CA certificates to RHEL is straightforward: drop the PEM file in `/etc/pki/ca-trust/source/anchors/`, run `update-ca-trust`, and verify. The centralized trust store model means one change propagates to OpenSSL, GnuTLS, Java, and all the tools that depend on them. Just remember to automate this across your fleet and plan for CA certificate rotation ahead of time.
