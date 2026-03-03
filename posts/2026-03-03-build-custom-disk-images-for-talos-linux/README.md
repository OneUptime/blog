# How to Build Custom Disk Images for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disk Images, Bare Metal, VM Deployment, Cloud Images

Description: Complete guide to building custom disk images for Talos Linux, covering raw images, cloud-specific formats, and VM-ready disk images with extensions.

---

Disk images are a common deployment method for Talos Linux, especially in virtualized and cloud environments. While ISOs are great for interactive installations, pre-built disk images let you provision nodes without any manual intervention. You create the image once with all your customizations, then stamp out as many nodes as you need from that template.

This guide covers how to build custom disk images for Talos Linux in various formats, including raw disk images, QCOW2 for QEMU/KVM, VMDK for VMware, and VHD for Hyper-V.

## Disk Image Formats

Talos supports generating disk images in multiple formats to match different deployment targets:

- **Raw** - A plain disk image, commonly used for bare metal and direct writes
- **QCOW2** - QEMU Copy-on-Write format for KVM/QEMU virtualization
- **VMDK** - VMware disk format
- **VHD** - Microsoft Hyper-V disk format
- **OVA** - Open Virtualization Archive for VMware
- **AWS AMI** - Amazon Machine Images
- **GCP** - Google Cloud Platform images
- **Azure VHD** - Azure-compatible VHD images

Each format targets a specific platform, and the Talos tooling handles the conversion for you.

## Using Imager to Generate Disk Images

The `imager` tool from Sidero Labs is the standard way to generate disk images.

```bash
# Pull the imager container
docker pull ghcr.io/siderolabs/imager:v1.7.0

# Generate a raw disk image
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  metal \
  --output-kind image

# The output will be a compressed raw image
ls -lh /tmp/out/
# metal-amd64.raw.xz
```

### Generating QCOW2 Images

```bash
# Generate a QCOW2 image for QEMU/KVM
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  metal \
  --output-kind image \
  --image-disk-format qcow2

# Decompress if needed
xz -d /tmp/out/metal-amd64.raw.xz

# Convert to QCOW2 if the imager does not support direct output
qemu-img convert -f raw -O qcow2 \
  /tmp/out/metal-amd64.raw \
  /tmp/out/talos-amd64.qcow2
```

### Generating VMDK Images

```bash
# Generate for VMware
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  metal \
  --output-kind image

# Convert raw to VMDK
qemu-img convert -f raw -O vmdk \
  /tmp/out/metal-amd64.raw \
  /tmp/out/talos-amd64.vmdk
```

## Adding Extensions to Disk Images

Custom disk images become truly powerful when you include system extensions.

```bash
# Generate a disk image with extensions
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  metal \
  --output-kind image \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4 \
  --system-extension-image ghcr.io/siderolabs/qemu-guest-agent:v8.2.0 \
  --system-extension-image ghcr.io/siderolabs/tailscale:v1.62.0
```

You can include both official and custom extensions. The extensions are baked into the disk image, so the node does not need to pull them during boot.

## Using Image Factory for Disk Images

Image Factory generates disk images just like it generates ISOs. Submit a schematic and download the image in your desired format.

```bash
# Create a schematic
cat > schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/qemu-guest-agent
  extraKernelArgs:
    - net.ifnames=0
EOF

# Submit schematic
SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

# Download raw disk image
curl -o talos-metal-amd64.raw.xz \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-amd64.raw.xz"

# Download for specific cloud platforms
curl -o talos-aws-amd64.raw.xz \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/aws-amd64.raw.xz"
```

## Building Cloud-Specific Images

Each cloud provider has its own image format requirements. Talos handles these through platform-specific build targets.

### AWS AMI

```bash
# Generate AWS image
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  aws \
  --output-kind image \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4

# Upload to AWS as an AMI
aws ec2 import-image \
  --description "Custom Talos v1.7.0" \
  --disk-containers "Description=Talos,Format=raw,UserBucket={S3Bucket=my-bucket,S3Key=talos-aws-amd64.raw}"
```

### Google Cloud Platform

```bash
# Generate GCP image
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  gcp \
  --output-kind image

# Upload to GCS
gsutil cp /tmp/out/gcp-amd64.raw.tar.gz gs://my-bucket/

# Create the image
gcloud compute images create talos-custom-v170 \
  --source-uri=gs://my-bucket/gcp-amd64.raw.tar.gz \
  --guest-os-features=VIRTIO_SCSI_MULTIQUEUE
```

### Azure

```bash
# Generate Azure VHD
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  azure \
  --output-kind image

# Upload to Azure Blob Storage
az storage blob upload \
  --account-name mystorageaccount \
  --container-name images \
  --name talos-custom.vhd \
  --file /tmp/out/azure-amd64.vhd
```

## Customizing Disk Size

By default, Talos images are created with a minimal disk size. You can expand them after creation.

```bash
# Decompress the image
xz -d metal-amd64.raw.xz

# Resize the raw image to 50GB
qemu-img resize metal-amd64.raw 50G

# For QCOW2 format
qemu-img resize talos-amd64.qcow2 50G
```

Talos automatically grows its partitions to fill the available disk space during boot, so you just need to make sure the disk image or virtual disk is the size you want.

## Adding Kernel Parameters to Disk Images

Custom kernel parameters are embedded in the disk image's boot configuration.

```bash
# Generate disk image with custom kernel args
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  metal \
  --output-kind image \
  --extra-kernel-arg net.ifnames=0 \
  --extra-kernel-arg console=ttyS0,115200 \
  --extra-kernel-arg intel_iommu=on \
  --extra-kernel-arg hugepagesz=1G \
  --extra-kernel-arg hugepages=4
```

## Testing Custom Disk Images

Always test your custom disk images before deploying them.

```bash
# Test with QEMU
qemu-system-x86_64 \
  -m 4096 \
  -cpu host \
  -enable-kvm \
  -drive file=talos-amd64.qcow2,format=qcow2,if=virtio \
  -net nic -net user,hostfwd=tcp::50000-:50000

# Apply configuration to the test node
talosctl gen config test-cluster https://10.5.0.2:6443

talosctl apply-config --insecure \
  --nodes 127.0.0.1:50000 \
  --file controlplane.yaml
```

### Testing with libvirt

```bash
# Create a VM using virt-install
virt-install \
  --name talos-test \
  --ram 4096 \
  --vcpus 2 \
  --disk path=talos-amd64.qcow2,format=qcow2 \
  --os-variant generic \
  --network network=default \
  --graphics none \
  --console pty,target_type=serial \
  --import
```

## Building from Source

For maximum control, build disk images from the Talos source code.

```bash
# Clone and checkout
git clone https://github.com/siderolabs/talos.git
cd talos
git checkout v1.7.0

# Build the disk image
make image-metal

# Output is in _out/
ls -lh _out/
```

## Automating Image Builds

Automate image generation as part of your CI/CD pipeline to keep images current.

```yaml
# .github/workflows/build-disk-image.yml
name: Build Talos Disk Image
on:
  workflow_dispatch:
    inputs:
      talos_version:
        description: 'Talos version'
        required: true
        default: 'v1.7.0'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate disk image
        run: |
          docker run --rm -v ${{ github.workspace }}/out:/out \
            ghcr.io/siderolabs/imager:${{ inputs.talos_version }} \
            metal --output-kind image \
            --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4
      - name: Upload to S3
        run: |
          aws s3 cp out/metal-amd64.raw.xz \
            s3://my-images/talos-${{ inputs.talos_version }}.raw.xz
```

## Conclusion

Building custom disk images for Talos Linux simplifies node provisioning across virtual machines, cloud environments, and bare metal servers. By baking your extensions, kernel parameters, and configurations directly into the disk image, you create a consistent starting point for every node in your cluster. Whether you are deploying to AWS, running KVM locally, or managing a VMware environment, the Talos tooling provides a straightforward path from customization to deployment. Choose the method that fits your workflow - Image Factory for quick iterations, imager for controlled builds, or source builds for total customization.
