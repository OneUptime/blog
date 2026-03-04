# How to Build FIPS-Enabled RHEL bootc Images with Image Builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, FIPS, bootc, Image Builder, Security, Compliance, Linux

Description: Build FIPS 140-compliant RHEL bootc container images using Image Builder for environments that require federal cryptographic standards compliance.

---

FIPS (Federal Information Processing Standards) mode ensures that RHEL uses only FIPS-validated cryptographic algorithms. Building FIPS-enabled bootc images is required for government and regulated environments.

## Understanding FIPS and bootc

bootc (boot containers) is a technology for managing RHEL as a container-native OS. When combined with FIPS mode, the resulting image enforces FIPS-validated cryptography from boot.

## Creating a FIPS-Enabled Blueprint

```toml
# fips-bootc.toml
name = "fips-bootc"
description = "FIPS-enabled RHEL bootc image"
version = "1.0.0"

[[packages]]
name = "dracut-fips"
version = "*"

[[packages]]
name = "crypto-policies"
version = "*"

[[packages]]
name = "openssl"
version = "*"

# Enable FIPS mode
[customizations]
hostname = ""

[customizations.fips]
enabled = true

[customizations.kernel]
append = "fips=1"

[customizations.services]
enabled = ["sshd", "firewalld"]
```

## Building the Image

```bash
# Push the blueprint
composer-cli blueprints push fips-bootc.toml

# Build an edge-commit (bootc) image with FIPS
composer-cli compose start fips-bootc edge-commit

# Monitor the build
watch composer-cli compose status

# Download the image
composer-cli compose image <compose-uuid>
```

## Building via Containerfile (Alternative)

You can also build a FIPS bootc image using a Containerfile:

```dockerfile
# Containerfile.fips
FROM registry.redhat.io/rhel9/rhel-bootc:9.4

# Install FIPS packages
RUN dnf install -y dracut-fips && \
    dnf clean all

# Enable FIPS mode via kernel argument
RUN grubby --update-kernel=ALL --args="fips=1"

# Regenerate initramfs with FIPS support
RUN dracut --regenerate-all --force
```

Build and push the image:

```bash
# Build the FIPS bootc image
podman build -t registry.example.com/rhel-fips-bootc:1.0 -f Containerfile.fips

# Push to your registry
podman push registry.example.com/rhel-fips-bootc:1.0
```

## Verifying FIPS Mode

After deploying the image, verify FIPS is active:

```bash
# Check if FIPS mode is enabled
cat /proc/sys/crypto/fips_enabled
# Output: 1

# Verify the crypto policy
update-crypto-policies --show
# Output: FIPS

# Check that FIPS-validated modules are loaded
openssl list -providers
```

## Testing FIPS Compliance

```bash
# Verify that non-FIPS algorithms are rejected
# MD5 should be rejected in FIPS mode
openssl dgst -md5 /etc/hostname
# Expected: Error - disabled for FIPS

# SHA-256 should work fine
openssl dgst -sha256 /etc/hostname
```

FIPS-enabled bootc images provide a consistent, auditable, and compliant base for deployments in regulated environments.
