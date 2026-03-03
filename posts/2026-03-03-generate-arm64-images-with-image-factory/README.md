# How to Generate ARM64 Images with Image Factory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Factory, ARM64, Raspberry Pi, Cloud Computing

Description: A hands-on guide to generating Talos Linux ARM64 images using Image Factory for ARM-based servers, Raspberry Pi, and cloud instances like AWS Graviton.

---

ARM64 processors have become a serious contender in the server and cloud computing space. AWS Graviton instances offer better price-performance than their x86 counterparts. Ampere Altra chips power edge and cloud workloads. And Raspberry Pi devices serve as affordable Kubernetes nodes for home labs and edge deployments. Talos Linux supports ARM64 natively, and Image Factory can generate custom ARM64 images with the same ease as AMD64 ones.

This guide covers everything you need to know about generating and using ARM64 Talos images across different hardware platforms.

## ARM64 in the Talos Ecosystem

Talos Linux provides first-class ARM64 support. The kernel, initramfs, and all system components are built for both AMD64 and ARM64 architectures. System extensions are also compiled for both architectures, though not every extension may be available on ARM64 for every release.

Image Factory supports ARM64 image generation for all platforms where ARM64 makes sense. The workflow is identical to AMD64 - you define a schematic, submit it, and request an ARM64 image variant.

## Generating ARM64 Images

The process starts with a schematic, just like AMD64. Extensions are the same, but Image Factory selects the correct ARM64-compiled version automatically:

```yaml
# arm64-schematic.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
      - siderolabs/util-linux-tools
```

Submit the schematic and request ARM64 images:

```bash
# Submit the schematic (same for both architectures)
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @arm64-schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

TALOS_VERSION="v1.7.0"

# Download ARM64 metal ISO
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-arm64.iso"

# Download ARM64 raw disk image
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-arm64.raw.xz"

# ARM64 installer image reference
echo "factory.talos.dev/installer/${SCHEMATIC_ID}:${TALOS_VERSION}"
```

Notice that the schematic ID is the same regardless of architecture. The architecture is selected when you request the image, not when you define the schematic.

## Raspberry Pi Images

Raspberry Pi is one of the most popular ARM64 platforms for running Talos Linux. You need a specific image variant and some additional considerations:

```yaml
# rpi-schematic.yaml
# Raspberry Pi specific schematic
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
```

Generate and write the image:

```bash
# Get the schematic ID
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @rpi-schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

# Download the metal ARM64 image for Raspberry Pi
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/metal-arm64.raw.xz"

# Decompress the image
xz -d metal-arm64.raw.xz

# Write to an SD card (replace /dev/sdX with your SD card device)
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync
```

### Raspberry Pi Boot Considerations

Raspberry Pi has a unique boot process that differs from standard UEFI systems. Some things to keep in mind:

- **Pi 4 and newer**: Supports UEFI boot through the EEPROM firmware. Update your Pi firmware to the latest version for the best experience.
- **Storage**: While SD cards work, USB SSDs provide significantly better performance and reliability. Talos writes frequently to its state partition, and SD cards can wear out.
- **Memory**: Raspberry Pi 4 with 4GB or 8GB RAM works well. The 2GB model is marginal for Kubernetes workloads.

```bash
# After booting the Pi, apply a machine configuration
talosctl apply-config --insecure \
  --nodes 192.168.1.100 \
  --file worker.yaml
```

## AWS Graviton Images

AWS Graviton instances (a1, t4g, m6g, c6g, r6g families) are ARM64-based and offer excellent price-performance for Kubernetes workloads:

```bash
# Download AWS ARM64 image for Graviton instances
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/aws-arm64.raw.xz"

# Decompress
xz -d aws-arm64.raw.xz

# Upload to S3
aws s3 cp aws-arm64.raw s3://my-talos-images/aws-arm64.raw

# Import as an AMI
aws ec2 import-image \
  --description "Talos Linux ARM64 ${TALOS_VERSION}" \
  --architecture arm64 \
  --disk-containers "Description=TalosARM64,Format=raw,UserBucket={S3Bucket=my-talos-images,S3Key=aws-arm64.raw}"

# Check import status
aws ec2 describe-import-image-tasks
```

Once the AMI is ready, launch Graviton instances:

```bash
# Launch a Graviton instance with the custom AMI
aws ec2 run-instances \
  --image-id ami-XXXXXXXXXX \
  --instance-type t4g.medium \
  --count 1 \
  --key-name my-key \
  --subnet-id subnet-XXXXXXXXXX \
  --security-group-ids sg-XXXXXXXXXX
```

## Mixed Architecture Clusters

Talos supports mixed-architecture clusters where AMD64 and ARM64 nodes coexist. The Kubernetes control plane handles the architecture differences transparently:

```bash
# Generate configs with AMD64 control plane
talosctl gen config mixed-cluster https://10.0.0.1:6443 \
  --install-image factory.talos.dev/installer/${SCHEMATIC_ID}:${TALOS_VERSION}

# The same schematic works for both architectures
# AMD64 control plane nodes
talosctl apply-config --insecure \
  --nodes 10.0.0.10 \
  --file controlplane.yaml

# ARM64 worker nodes (same config, different hardware)
talosctl apply-config --insecure \
  --nodes 10.0.0.20 \
  --file worker.yaml
```

When the ARM64 node pulls the installer image, it automatically gets the ARM64 variant. Container images in your workloads need to support multi-architecture (which most modern images do).

### Scheduling Workloads on Mixed Clusters

Use node labels and taints to control which architecture runs which workloads:

```yaml
# Deployment that targets ARM64 nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: arm64-workload
spec:
  replicas: 3
  selector:
    matchLabels:
      app: arm64-workload
  template:
    metadata:
      labels:
        app: arm64-workload
    spec:
      nodeSelector:
        kubernetes.io/arch: arm64
      containers:
        - name: app
          image: my-app:latest  # Must support ARM64
```

## Oracle Cloud ARM Instances

Oracle Cloud offers ARM-based Ampere A1 instances, which are particularly attractive because of their generous free tier:

```bash
# Download Oracle Cloud ARM64 image
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/oracle-arm64.raw.xz"
```

## Checking Extension Availability for ARM64

Not all extensions are available for ARM64. Check availability before creating your schematic:

```bash
# List extensions and check for ARM64 support
curl -s https://factory.talos.dev/version/${TALOS_VERSION}/extensions/official | \
  jq '.[] | select(.targets | contains(["arm64"]))'
```

If an extension is not available for ARM64, Image Factory will return an error when you try to generate an ARM64 image with that schematic.

## Performance Considerations

ARM64 nodes may behave differently from AMD64 nodes in certain workloads:

- **CPU-bound tasks**: Graviton and Ampere processors excel at throughput-oriented workloads. Single-thread performance may differ from x86.
- **Memory**: ARM64 servers typically have good memory bandwidth, which benefits Kubernetes workloads.
- **Disk I/O**: Performance depends on the storage backend, not the CPU architecture.
- **Network**: ARM64 instances on AWS and Oracle Cloud have the same network performance tiers as their x86 counterparts.

## Building ARM64 Images Locally

If you want to test ARM64 images on an AMD64 development machine, you can use QEMU:

```bash
# Install QEMU for ARM64 emulation
sudo apt-get install qemu-system-aarch64

# Boot the ARM64 image in QEMU
qemu-system-aarch64 \
  -machine virt \
  -cpu cortex-a72 \
  -m 4096 \
  -drive file=metal-arm64.raw,format=raw \
  -nographic
```

This is useful for testing machine configurations before deploying to actual ARM64 hardware.

## Wrapping Up

ARM64 is a first-class citizen in the Talos Linux ecosystem. Image Factory generates ARM64 images using the same schematic system and workflow as AMD64, making it straightforward to support multiple architectures. Whether you are running Raspberry Pi nodes in a home lab, Graviton instances in AWS, or Ampere chips in Oracle Cloud, the process is consistent: define a schematic, request the ARM64 variant, and deploy. Mixed-architecture clusters work seamlessly, giving you the flexibility to choose the best hardware for each workload.
