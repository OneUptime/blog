# How to Build FIPS-Enabled RHEL bootc Images with Image Builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, FIPS, Bootc, Image Builder, Security, Compliance, Linux

Description: Build FIPS 140-compliant RHEL bootc container images using Image Builder for environments that require federal cryptographic standards compliance.

---

FIPS (Federal Information Processing Standards) mode configures RHEL to use FIPS-approved cryptographic modules. Building FIPS-enabled bootc images is common for government and regulated environments.

## Understanding FIPS and bootc

bootc (boot containers) is a technology for managing RHEL as a container-native OS. When combined with FIPS mode, the resulting system starts with the FIPS kernel option and the FIPS system-wide cryptographic policy.

## Creating a FIPS-Enabled Build Configuration

```toml
# 01-fips.toml

# Enable the FIPS kernel argument for bootc installs.
kargs = ["fips=1"]
```

## Building the Image

Create a Containerfile that copies the bootc kernel argument configuration into the image and enables the FIPS crypto policy:

```dockerfile
# Containerfile.fips
FROM registry.redhat.io/rhel9/rhel-bootc:latest

COPY 01-fips.toml /usr/lib/bootc/kargs.d/

RUN dnf install -y crypto-policies-scripts && \
    update-crypto-policies --no-reload --set FIPS && \
    dnf clean all
```

```bash
# Build the FIPS-enabled bootc container image
podman build -t registry.example.com/rhel-fips-bootc:1.0 -f Containerfile.fips .

# Push to your registry
podman push registry.example.com/rhel-fips-bootc:1.0
```

Then create a bootable disk image with bootc-image-builder:

```bash
# Create an output directory for the disk image
mkdir -p output

# Build an ISO from the bootc image
sudo podman run \
  --rm \
  -it \
  --privileged \
  --pull=newer \
  --security-opt label=type:unconfined_t \
  -v ./output:/output \
  -v /var/lib/containers/storage:/var/lib/containers/storage \
  registry.redhat.io/rhel9/bootc-image-builder:latest \
  --local \
  --type iso \
  registry.example.com/rhel-fips-bootc:1.0
```

## Building via Containerfile (Alternative)

If you are installing with Anaconda instead of deploying a bootc-image-builder disk image directly, keep the same Containerfile settings and add `fips=1` when booting the installer.

```dockerfile
# Containerfile.fips
FROM registry.redhat.io/rhel9/rhel-bootc:latest

COPY 01-fips.toml /usr/lib/bootc/kargs.d/

RUN dnf install -y crypto-policies-scripts && \
    update-crypto-policies --no-reload --set FIPS && \
    dnf clean all
```

Build and push the image:

```bash
# Build the FIPS bootc image
podman build -t registry.example.com/rhel-fips-bootc:1.0 -f Containerfile.fips .

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

# Check FIPS mode status
fips-mode-setup --check
# Output: FIPS mode is enabled.
```

## Testing FIPS Compliance

```bash
# Verify that non-FIPS algorithms are rejected
# ChaCha20 should not be available through the FIPS crypto policy for TLS
openssl ciphers -v | grep -i chacha
# Expected: no output

# SHA-256 should work fine
openssl dgst -sha256 /etc/hostname
```

FIPS-enabled bootc images provide a consistent, auditable, and compliant base for deployments in regulated environments.
