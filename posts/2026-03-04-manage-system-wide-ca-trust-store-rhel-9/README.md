# How to Manage the System-Wide CA Trust Store on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CA Trust Store, Certificates, Security, Linux

Description: Learn how the system-wide CA trust store works on RHEL and how to manage trusted and distrusted certificate authorities.

---

Every time your RHEL system makes a TLS connection, it needs to decide whether to trust the remote certificate. That decision comes down to the system-wide CA trust store, a collection of root CA certificates that the system considers trustworthy. Understanding how this store works and how to manage it is essential for any sysadmin.

## How the Trust Store Works on RHEL

RHEL uses a consolidated trust store managed by the `ca-certificates` package and the `update-ca-trust` tool. Rather than individual applications maintaining their own certificate stores (like older systems did), RHEL funnels everything through a single source of truth.

```mermaid
graph TD
    A[/etc/pki/ca-trust/source/] --> B[update-ca-trust]
    B --> C[/etc/pki/tls/certs/ca-bundle.crt]
    B --> D[/etc/pki/tls/certs/ca-bundle.trust.crt]
    B --> E[/etc/pki/java/cacerts]
    C --> F[OpenSSL applications]
    C --> G[curl, wget, etc.]
    D --> H[GnuTLS applications]
    E --> I[Java applications]
```

The source certificates live in `/etc/pki/ca-trust/source/`. The `update-ca-trust` command reads them and generates consolidated bundles that different cryptographic libraries use.

## The Trust Store Directory Structure

Here are the key paths:

```bash
# View the source directory structure
ls -la /etc/pki/ca-trust/source/
```

- `/etc/pki/ca-trust/source/anchors/` - Put new CA certificates you want to trust here
- `/etc/pki/ca-trust/source/blocklist/` - Put CA certificates you want to distrust here
- `/etc/pki/ca-trust/extracted/` - Generated output bundles (do not edit these manually)

The generated bundles:

```bash
# List the output bundles
ls /etc/pki/ca-trust/extracted/
```

- `pem/tls-ca-bundle.pem` - PEM bundle for general TLS use
- `openssl/ca-bundle.trust.crt` - Extended trust format for OpenSSL
- `java/cacerts` - Java keystore format
- `edk2/cacerts.bin` - UEFI secure boot format

## Viewing Installed CA Certificates

List all currently trusted CAs:

```bash
# Count the number of trusted CA certificates
trust list | grep -c "type: certificate"
```

View details about a specific CA:

```bash
# Search for a specific CA by name
trust list | grep -A3 "Let's Encrypt"
```

For a more detailed view:

```bash
# List all CAs with their trust settings
trust list --filter=ca-anchors
```

## Checking Which Bundle Your Application Uses

Most applications on RHEL use the system bundle, but it is good to verify:

```bash
# Check what CA file curl uses
curl -v https://example.com 2>&1 | grep CAfile

# Check what Python uses
python3 -c "import ssl; print(ssl.get_default_verify_paths())"
```

## How update-ca-trust Works

When you run `update-ca-trust`, it:

1. Reads all certificates from `/etc/pki/ca-trust/source/anchors/`
2. Reads all certificates from the default system store
3. Applies any blocklist entries
4. Generates consolidated bundles in multiple formats
5. Places the bundles where applications expect them

The symbolic links tie everything together:

```bash
# The traditional path is a symlink to the generated bundle
ls -la /etc/pki/tls/certs/ca-bundle.crt
```

This file is a symlink pointing into `/etc/pki/ca-trust/extracted/`.

## The ca-certificates Package

The base set of trusted CAs comes from the `ca-certificates` package:

```bash
# Check which version of ca-certificates is installed
rpm -q ca-certificates

# See when it was last updated
rpm -qi ca-certificates | grep "Install Date"
```

Keep this package updated. When certificate authorities are compromised or their certificates expire, Red Hat pushes updates through this package:

```bash
# Update the CA certificates package
sudo dnf update ca-certificates
```

## Distrusting a CA

If you need to remove trust from a specific CA (maybe your organization does not want to trust a particular authority):

```bash
# Copy the CA certificate to the blocklist directory
sudo cp distrusted-ca.pem /etc/pki/ca-trust/source/blocklist/

# Rebuild the trust store
sudo update-ca-trust
```

Verify the distrust:

```bash
# Try to verify a certificate signed by the distrusted CA
openssl verify -CAfile /etc/pki/tls/certs/ca-bundle.crt cert-from-distrusted-ca.pem
```

It should now fail verification.

## Extracting a Specific CA Certificate

Sometimes you need to pull a single CA certificate out of the bundle:

```bash
# Extract certificates and find a specific one
trust list --filter=ca-anchors | grep -A5 "DigiCert"
```

Or extract from the PEM bundle by searching for the issuer:

```bash
# Use awk to extract a specific certificate from the bundle
awk '/DigiCert Global Root G2/,/END CERTIFICATE/' /etc/pki/tls/certs/ca-bundle.crt > digicert-g2.pem
```

## Trust Store and Containers

If you run containers on RHEL, they get their own copy of the CA bundle at build time. Changes to the host trust store do not automatically propagate to running containers. You need to either:

- Rebuild containers after trust store changes
- Mount the host's CA bundle into the container

```bash
# Mount the host CA bundle into a container
podman run -v /etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem:/etc/pki/tls/certs/ca-bundle.crt:ro myimage
```

## Trust Store and Java

Java applications use a keystore format. RHEL's `update-ca-trust` generates this automatically:

```bash
# Verify the Java trust store exists
ls -la /etc/pki/java/cacerts
```

Java applications that use the default trust store path will automatically benefit from trust store changes after running `update-ca-trust`.

```bash
# List certificates in the Java keystore
keytool -list -cacerts -storepass changeit | head -20
```

## Backing Up the Trust Store

Before making changes, back up the current state:

```bash
# Back up the trust store source directory
sudo tar czf /root/ca-trust-backup-$(date +%Y%m%d).tar.gz /etc/pki/ca-trust/source/
```

## Resetting to Defaults

If you have made changes and want to start fresh:

```bash
# Remove all custom additions
sudo rm -f /etc/pki/ca-trust/source/anchors/*
sudo rm -f /etc/pki/ca-trust/source/blocklist/*

# Rebuild from the default package contents
sudo update-ca-trust
```

## Monitoring Trust Store Changes

In production, you should track changes to the trust store. A simple approach:

```bash
# Create a checksum of the current trust bundle for monitoring
sha256sum /etc/pki/tls/certs/ca-bundle.crt
```

Compare this periodically. If it changes unexpectedly, investigate.

## Wrapping Up

The system-wide CA trust store on RHEL is well-designed. The single-source-of-truth model through `update-ca-trust` means you make changes in one place and every application picks them up. Keep the `ca-certificates` package updated, use the anchors and blocklist directories for customization, and always run `update-ca-trust` after making changes.
