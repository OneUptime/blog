# How to Customize Ubuntu Cloud Images for Deployment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cloud Images, cloud-init, Infrastructure, Packer

Description: Learn how to customize Ubuntu cloud images for deployment using tools like virt-customize, cloud-localds, and Packer to create pre-baked images for faster instance startup.

---

Ubuntu publishes official cloud images that are minimal and cloud-init-enabled. While cloud-init handles first-boot configuration, there are good reasons to pre-bake customizations directly into an image: faster boot times, no dependency on package repository availability at launch time, and pre-installed monitoring agents. This guide covers several approaches to customizing Ubuntu cloud images.

## Downloading Official Cloud Images

Ubuntu cloud images are available in multiple formats from cloud-images.ubuntu.com:

```bash
# Create a working directory
mkdir ~/image-work && cd ~/image-work

# Download the Ubuntu 22.04 LTS cloud image (QCOW2 format)
wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

# Download the SHA256 checksum for verification
wget https://cloud-images.ubuntu.com/jammy/current/SHA256SUMS

# Verify the download
sha256sum --check --ignore-missing SHA256SUMS
```

Ubuntu cloud images come in several formats:
- `.img` - QCOW2 format, usable with KVM/QEMU
- `-disk.img` - raw disk format
- `-uefi1.img` - UEFI-bootable variant
- `.vmdk` - VMware format

## Installing Customization Tools

```bash
# Install tools for image manipulation
sudo apt update
sudo apt install -y \
    qemu-utils \          # qemu-img for image conversion
    libguestfs-tools \    # guestfish, virt-customize, virt-sysprep
    cloud-image-utils \   # cloud-localds for NoCloud datasource
    cloud-init            # for testing

# Verify libguestfs works
sudo virt-filesystems --version
```

## Using virt-customize

`virt-customize` modifies images without booting them. It mounts the image, makes changes, and unmounts it:

```bash
# Install packages into the image
sudo virt-customize \
    -a jammy-server-cloudimg-amd64.img \
    --install nginx,postgresql,python3-pip \
    --update

# Run shell commands inside the image
sudo virt-customize \
    -a jammy-server-cloudimg-amd64.img \
    --run-command 'pip3 install boto3 requests psycopg2-binary'

# Copy files into the image
sudo virt-customize \
    -a jammy-server-cloudimg-amd64.img \
    --copy-in /local/path/config.conf:/etc/myapp/

# Write content directly to a file inside the image
sudo virt-customize \
    -a jammy-server-cloudimg-amd64.img \
    --write '/etc/myapp/config.yaml:key: value\nother_key: other_value'

# Create a systemd service
sudo virt-customize \
    -a jammy-server-cloudimg-amd64.img \
    --copy-in myapp.service:/etc/systemd/system/ \
    --run-command 'systemctl enable myapp'

# Set timezone
sudo virt-customize \
    -a jammy-server-cloudimg-amd64.img \
    --timezone UTC

# Add a user
sudo virt-customize \
    -a jammy-server-cloudimg-amd64.img \
    --run-command 'useradd -m -s /bin/bash deploy'
```

Make a copy of the base image before customizing to preserve a clean base:

```bash
# Work from a copy
cp jammy-server-cloudimg-amd64.img myapp-image.img

# Customize the copy
sudo virt-customize -a myapp-image.img --install nginx --update
```

## Using guestfish for Fine-Grained Control

`guestfish` is an interactive shell for manipulating disk images:

```bash
# Open an image interactively
sudo guestfish --rw -a myapp-image.img

# Inside guestfish:
><fs> run
><fs> list-filesystems
><fs> mount /dev/sda1 /
><fs> ls /etc/
><fs> cat /etc/hostname
><fs> write /etc/myapp.conf "key=value\n"
><fs> mkdir /opt/myapp
><fs> copy-in /local/myapp /opt/myapp
><fs> exit
```

For scripted operations:

```bash
# Run guestfish non-interactively
sudo guestfish --rw -a myapp-image.img << 'EOF'
run
mount /dev/sda1 /
write /etc/myapp.conf "environment=production\nlog_level=warn\n"
mkdir-p /opt/myapp
exit
EOF
```

## Sysprep: Cleaning Up Before Distribution

Before distributing a customized image, remove instance-specific artifacts:

```bash
# Clean up the image for distribution
sudo virt-sysprep -a myapp-image.img

# virt-sysprep removes:
# - SSH host keys (they'll be regenerated on first boot)
# - Machine ID (/etc/machine-id)
# - cloud-init state
# - Temporary files
# - Log files
# - User shell history

# Customize what gets cleaned
sudo virt-sysprep \
    --operations defaults,-ssh-hostkeys \
    -a myapp-image.img
```

## Creating a Test Environment with cloud-localds

Test your customized image locally before deploying to a cloud provider:

```bash
# Create a cloud-config file for testing
cat > test-user-data.yaml << 'EOF'
#cloud-config
users:
  - name: testuser
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3Nz... your-key
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
EOF

# Create a seed ISO with NoCloud datasource
cloud-localds seed.iso test-user-data.yaml

# Resize the image if needed (cloud images are typically 2GB)
qemu-img resize myapp-image.img 20G

# Boot the image with QEMU
qemu-system-x86_64 \
    -m 2048 \
    -nographic \
    -drive file=myapp-image.img,format=qcow2 \
    -drive file=seed.iso,format=raw \
    -net nic -net user,hostfwd=tcp::2222-:22
```

Connect to the test instance:

```bash
ssh -p 2222 testuser@localhost
```

## Building Images with Packer

Packer automates the image building process and is the standard tool for building golden images:

```bash
# Install Packer
wget -O packer.zip https://releases.hashicorp.com/packer/1.10.0/packer_1.10.0_linux_amd64.zip
unzip packer.zip
sudo mv packer /usr/local/bin/

# Install the QEMU plugin
packer plugins install github.com/hashicorp/qemu
```

A Packer template for building an Ubuntu image:

```hcl
# ubuntu-22.04.pkr.hcl
packer {
  required_plugins {
    qemu = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/qemu"
    }
  }
}

variable "ubuntu_version" {
  default = "22.04"
}

source "qemu" "ubuntu" {
  iso_url      = "https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img"
  iso_checksum = "file:https://cloud-images.ubuntu.com/jammy/current/SHA256SUMS"
  disk_image   = true

  output_directory = "output-ubuntu"
  vm_name          = "ubuntu-22.04-custom.img"
  disk_size        = "20G"
  format           = "qcow2"

  cpus        = 2
  memory      = 2048
  accelerator = "kvm"

  ssh_username = "ubuntu"
  ssh_timeout  = "20m"

  # Use cloud-localds for the seed drive
  cd_content = {
    "user-data" = file("user-data.yaml")
    "meta-data" = ""
  }
  cd_label = "cidata"

  headless = true
}

build {
  sources = ["source.qemu.ubuntu"]

  # Install packages
  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx postgresql-client python3-pip",
      "sudo pip3 install boto3 requests",
    ]
  }

  # Upload configuration files
  provisioner "file" {
    source      = "configs/"
    destination = "/tmp/"
  }

  provisioner "shell" {
    inline = [
      "sudo mv /tmp/nginx.conf /etc/nginx/nginx.conf",
      "sudo systemctl enable nginx",
    ]
  }

  # Clean up before saving
  provisioner "shell" {
    inline = [
      "sudo cloud-init clean --logs",
      "sudo truncate -s 0 /etc/machine-id",
      "sudo truncate -s 0 /var/log/*.log",
    ]
  }
}
```

Build the image:

```bash
packer init .
packer validate ubuntu-22.04.pkr.hcl
packer build ubuntu-22.04.pkr.hcl
```

## Converting Images for Different Platforms

```bash
# Convert QCOW2 to raw (for some cloud providers)
qemu-img convert -f qcow2 -O raw myapp-image.img myapp-image.raw

# Convert to VMDK for VMware
qemu-img convert -f qcow2 -O vmdk myapp-image.img myapp-image.vmdk

# Convert to VHD for Azure
qemu-img convert -f qcow2 -O vpc myapp-image.img myapp-image.vhd

# Check image info
qemu-img info myapp-image.img
```

## Uploading to Cloud Providers

### AWS

```bash
# Upload to S3 and import as AMI
aws s3 cp myapp-image.img s3://my-images-bucket/ubuntu-custom.img

aws ec2 import-image \
    --description "Custom Ubuntu 22.04" \
    --disk-containers file://containers.json

# containers.json:
# [{"Description":"Custom Ubuntu","Format":"qcow2","UserBucket":{"S3Bucket":"my-images-bucket","S3Key":"ubuntu-custom.img"}}]
```

### Azure

```bash
# Convert to fixed VHD first (Azure requirement)
qemu-img convert -f qcow2 -O vpc -o subformat=fixed,force_size \
    myapp-image.img myapp-image-fixed.vhd

# Upload and create image
az storage blob upload \
    --account-name mystorageaccount \
    --container-name images \
    --name ubuntu-custom.vhd \
    --file myapp-image-fixed.vhd
```

Pre-baked images significantly reduce instance startup time and eliminate the risk of boot-time failures caused by package repository unavailability or network issues. The tradeoff is that images need to be rebuilt periodically to pick up security updates.
