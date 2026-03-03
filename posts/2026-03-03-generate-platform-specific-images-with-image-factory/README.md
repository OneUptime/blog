# How to Generate Platform-Specific Images with Image Factory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Factory, Cloud Platform, AWS, Azure, VMware

Description: Learn how to generate Talos Linux images optimized for specific platforms like AWS, Azure, VMware, and other cloud and virtualization environments using Image Factory.

---

Talos Linux runs on a wide variety of platforms, from bare metal servers to major cloud providers and hypervisors. Each platform has its own requirements for disk formats, guest agents, boot processes, and network configurations. Image Factory handles these platform-specific details for you, generating images that are ready to use on your target platform without any manual tweaking.

This guide covers generating optimized images for all major platforms, including the extensions and configurations each one needs.

## Supported Platforms

Image Factory supports a long list of platforms out of the box. The image type in the download URL determines the platform format:

- **metal** - Bare metal servers (ISO and raw disk images)
- **aws** - Amazon Web Services (AMI format)
- **azure** - Microsoft Azure (VHD format)
- **gcp** - Google Cloud Platform (raw disk image)
- **vmware** - VMware vSphere (OVA format)
- **digital-ocean** - DigitalOcean (raw disk image)
- **hcloud** - Hetzner Cloud
- **oracle** - Oracle Cloud Infrastructure
- **vultr** - Vultr
- **upcloud** - UpCloud
- **nocloud** - Generic cloud-init (NoCloud datasource)
- **openstack** - OpenStack

## Generating AWS Images

For AWS deployments, you need an image that supports the EC2 instance metadata service and the appropriate disk format. Image Factory can generate these directly:

```yaml
# aws-schematic.yaml
# Extensions commonly needed for AWS
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
```

Generate the AWS image:

```bash
# Submit the schematic
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @aws-schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

TALOS_VERSION="v1.7.0"

# Download the AWS AMD64 image
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/aws-amd64.raw.xz"

# Download the AWS ARM64 image (for Graviton instances)
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/aws-arm64.raw.xz"
```

To use this image in AWS, you need to import it as an AMI:

```bash
# Upload to S3
aws s3 cp aws-amd64.raw.xz s3://my-talos-images/

# Import as an AMI (after decompressing)
xz -d aws-amd64.raw.xz

aws ec2 import-image \
  --description "Talos Linux Custom v1.7.0" \
  --disk-containers "Description=Talos,Format=raw,UserBucket={S3Bucket=my-talos-images,S3Key=aws-amd64.raw}"
```

## Generating Azure Images

Azure requires VHD format images. Image Factory generates these with the correct disk geometry and Azure guest agent support:

```yaml
# azure-schematic.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
```

```bash
# Download Azure VHD image
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/azure-amd64.vhd.xz"

# Decompress and upload to Azure
xz -d azure-amd64.vhd.xz

# Upload to Azure Blob Storage
az storage blob upload \
  --account-name myaccount \
  --container-name images \
  --name talos-v1.7.0.vhd \
  --file azure-amd64.vhd

# Create an Azure image from the VHD
az image create \
  --resource-group my-rg \
  --name talos-v1.7.0 \
  --source "https://myaccount.blob.core.windows.net/images/talos-v1.7.0.vhd" \
  --os-type Linux
```

## Generating VMware Images

VMware environments use OVA files that can be imported directly into vSphere:

```yaml
# vmware-schematic.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/vmtoolsd
      - siderolabs/iscsi-tools
```

The `vmtoolsd` extension is critical for VMware deployments. It provides the open-vm-tools guest agent that enables vSphere features like guest OS information, graceful shutdown, and network configuration reporting.

```bash
# Submit the VMware-specific schematic
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @vmware-schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

# Download the OVA
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/vmware-amd64.ova"
```

Import the OVA into vSphere using the vSphere client or govc:

```bash
# Using govc to import the OVA
export GOVC_URL="https://vcenter.example.com/sdk"
export GOVC_USERNAME="admin@vsphere.local"
export GOVC_PASSWORD="password"
export GOVC_INSECURE=true

govc import.ova -name talos-template vmware-amd64.ova
```

## Generating GCP Images

For Google Cloud, Image Factory produces raw disk images that can be imported into GCP:

```bash
# Download the GCP image
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/gcp-amd64.raw.tar.gz"

# Upload to GCS
gsutil cp gcp-amd64.raw.tar.gz gs://my-talos-images/

# Create a GCE image
gcloud compute images create talos-v1-7-0 \
  --source-uri gs://my-talos-images/gcp-amd64.raw.tar.gz \
  --guest-os-features VIRTIO_SCSI_MULTIQUEUE
```

## Generating Bare Metal Images

Bare metal images come in ISO and raw disk formats:

```bash
# ISO for interactive installs (USB boot)
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-amd64.iso"

# Raw disk image for direct disk writes
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-amd64.raw.xz"

# Write raw image to disk
xz -d metal-amd64.raw.xz
sudo dd if=metal-amd64.raw of=/dev/sda bs=4M status=progress conv=fsync
```

## Generating Images for QEMU/KVM

For local development or KVM-based virtualization:

```yaml
# qemu-schematic.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/qemu-guest-agent
```

```bash
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @qemu-schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

# Download the QEMU-optimized image
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/nocloud-amd64.raw.xz"
```

## Platform-Specific Kernel Arguments

Some platforms benefit from specific kernel arguments. You can include these in your schematic:

```yaml
# Schematic with platform-specific kernel arguments
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
  extraKernelArgs:
    # Serial console for cloud instances
    - console=ttyS0,115200n8
    # Disable IPv6 if not needed
    - ipv6.disable=1
    # Enable IOMMU for PCI passthrough
    - intel_iommu=on
```

## Automating Multi-Platform Image Generation

If you deploy across multiple platforms, automate the image generation process:

```bash
#!/bin/bash
# generate-all-platforms.sh

SCHEMATIC_FILE=$1
TALOS_VERSION=$2
OUTPUT_DIR="./images"

mkdir -p "${OUTPUT_DIR}"

# Get schematic ID
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @"${SCHEMATIC_FILE}" \
  https://factory.talos.dev/schematics | jq -r '.id')

# Define platforms to generate
PLATFORMS=(
  "metal-amd64.iso"
  "aws-amd64.raw.xz"
  "azure-amd64.vhd.xz"
  "vmware-amd64.ova"
  "gcp-amd64.raw.tar.gz"
)

# Download all platform images
for platform in "${PLATFORMS[@]}"; do
  echo "Downloading ${platform}..."
  wget -q -O "${OUTPUT_DIR}/${platform}" \
    "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/${platform}"
done

echo "All platform images saved to ${OUTPUT_DIR}/"
```

## Choosing the Right Extensions Per Platform

Different platforms need different extensions. Here is a quick reference:

| Platform | Recommended Extensions |
|----------|----------------------|
| AWS | iscsi-tools |
| Azure | iscsi-tools |
| GCP | iscsi-tools |
| VMware | vmtoolsd, iscsi-tools |
| QEMU/KVM | qemu-guest-agent |
| Bare Metal | intel-ucode or amd-ucode, hardware-specific firmware |
| Hetzner | iscsi-tools |

The `iscsi-tools` extension appears in almost every platform because many CSI drivers (like Longhorn) require iSCSI support for persistent volumes.

## Wrapping Up

Platform-specific images are essential for smooth Talos Linux deployments across different environments. Image Factory removes the complexity of building these images by hand, giving you a single workflow that works for every platform. Define your schematic once, and Image Factory generates correctly formatted images for AWS, Azure, VMware, bare metal, or any other supported target. Combined with the schematic system, this means your multi-platform deployments are fully reproducible and version-controlled.
