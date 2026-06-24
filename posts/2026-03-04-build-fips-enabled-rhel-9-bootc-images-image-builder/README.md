# How to Build FIPS-Enabled RHEL 9 bootc Images with Image Builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Image Builder, FIPS, Bootc, Security

Description: Build FIPS-enabled RHEL 9 bootc images with Image Builder.

---

## Overview

Build FIPS-enabled RHEL 9 bootc images with bootc-image-builder. bootc-image-builder converts bootc container images into deployable disk images for physical, virtual, and cloud environments.

## Prerequisites

- A RHEL 9 system with a valid subscription
- Root or sudo access
- Podman and the container-tools package
- Access to `registry.redhat.io`

## Step 1 - Install bootc-image-builder

```bash
sudo dnf install -y container-tools
sudo podman login registry.redhat.io
sudo podman pull registry.redhat.io/rhel9/bootc-image-builder:latest
```

## Step 2 - Create the bootc Image

Create a TOML file `01-fips.toml` to enable the FIPS kernel argument:

```toml
# Enable FIPS
kargs = ["fips=1"]
```

Create a `Containerfile`:

```Dockerfile
FROM registry.redhat.io/rhel9/rhel-bootc:latest

COPY 01-fips.toml /usr/lib/bootc/kargs.d/
RUN dnf install -y crypto-policies-scripts vim-enhanced tmux && \
    update-crypto-policies --no-reload --set FIPS && \
    rm -rf /var/cache/dnf
```

Build and tag the bootc container image:

```bash
sudo podman build -t localhost/my-fips-bootc:latest .
```

## Step 3 - Start a Compose

Create a TOML file `config.toml` to configure user access:

```toml
[[customizations.user]]
name = "admin"
password = "admin"
groups = ["wheel"]
```

Start a build for the target image type. For example, use `qcow2` for KVM:

```bash
mkdir -p ./output

sudo podman run \
  --rm \
  --privileged \
  --pull=newer \
  --security-opt label=type:unconfined_t \
  -v /var/lib/containers/storage:/var/lib/containers/storage \
  -v ./config.toml:/config.toml:ro \
  -v ./output:/output \
  registry.redhat.io/rhel9/bootc-image-builder:latest \
  --local \
  --type qcow2 \
  --config /config.toml \
  localhost/my-fips-bootc:latest
```

## Step 4 - Monitor and Download

The build runs in the foreground. When it finishes, find the image in the `output` directory:

```bash
ls -lh output
```

## Step 5 - Deploy the Image

Deploy the image to your target platform following the platform-specific deployment process. bootc-image-builder supports image types such as `qcow2`, `raw`, `ami`, `vmdk`, and `iso`.

## Verify FIPS Mode

After logging in to the deployed system, check that FIPS mode is enabled:

```bash
cat /proc/sys/crypto/fips_enabled
update-crypto-policies --show
```

The expected output is `1` for `/proc/sys/crypto/fips_enabled` and `FIPS` for the crypto policy.

## Summary

You have learned how to build FIPS-enabled RHEL 9 bootc images with bootc-image-builder. bootc-image-builder provides a consistent workflow for creating RHEL bootc disk images across deployment targets.
