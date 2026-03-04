# How to Install and Use OpenTofu on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, OpenTofu, IaC, Infrastructure, Open Source, Linux

Description: Install OpenTofu, the open-source Terraform fork, on RHEL and learn how to use it for infrastructure as code.

---

OpenTofu is a community-driven, open-source fork of Terraform that maintains compatibility with existing Terraform configurations while remaining under a truly open license. If you want an alternative to Terraform that keeps the same workflow, OpenTofu is a solid choice.

## Install OpenTofu on RHEL

```bash
# Install the OpenTofu repository
sudo dnf install -y 'dnf-command(config-manager)'

# Add the OpenTofu stable repository
cat << 'EOF' | sudo tee /etc/yum.repos.d/opentofu.repo
[opentofu]
name=opentofu
baseurl=https://packages.opentofu.org/opentofu/tofu/rpm_any/rpm_any/$basearch
repo_gpgcheck=0
gpgcheck=1
enabled=1
gpgkey=https://get.opentofu.org/opentofu.gpg
       https://packages.opentofu.org/opentofu/tofu/gpgkey
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300
EOF

# Install OpenTofu
sudo dnf install -y tofu

# Verify the installation
tofu version
```

## Alternatively, Install from the Installer Script

```bash
# Download and run the official installer
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh

# Inspect the script before running it
less install-opentofu.sh

# Run the installer
chmod +x install-opentofu.sh
./install-opentofu.sh --install-method rpm

# Verify
tofu version
```

## OpenTofu vs Terraform Commands

The commands are nearly identical. Just replace `terraform` with `tofu`:

```bash
# Initialize a project
tofu init

# Plan changes
tofu plan

# Apply changes
tofu apply

# Show current state
tofu show

# Destroy resources
tofu destroy
```

## Create a Sample Configuration

```hcl
# main.tf - Sample OpenTofu configuration

terraform {
  # OpenTofu uses the same block name for compatibility
  required_version = ">= 1.6.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}

# Create a local file as a simple test
resource "local_file" "hello" {
  content  = "Hello from OpenTofu on RHEL!\n"
  filename = "${path.module}/hello.txt"
}

output "file_path" {
  value = local_file.hello.filename
}
```

## Initialize and Apply

```bash
# Initialize the project
tofu init

# Preview the changes
tofu plan

# Apply the configuration
tofu apply -auto-approve

# Check the output
cat hello.txt
```

## Migrate from Terraform to OpenTofu

If you have existing Terraform configurations, migrating is straightforward:

```bash
# Your existing Terraform files work as-is with OpenTofu
cd /path/to/existing/terraform/project

# Initialize with OpenTofu (it will download providers)
tofu init

# Verify the state is read correctly
tofu plan

# The state file format is compatible
# No changes should be detected if the infrastructure matches
```

## Use OpenTofu with the Libvirt Provider

```hcl
# libvirt-example.tf - Create a RHEL VM with OpenTofu

terraform {
  required_providers {
    libvirt = {
      source  = "dmacvicar/libvirt"
      version = "~> 0.7"
    }
  }
}

provider "libvirt" {
  uri = "qemu:///system"
}

resource "libvirt_volume" "rhel9" {
  name   = "rhel9-opentofu.qcow2"
  pool   = "default"
  source = "/var/lib/libvirt/images/rhel-9-base.qcow2"
  format = "qcow2"
}

resource "libvirt_domain" "rhel9_vm" {
  name   = "rhel9-opentofu"
  memory = "2048"
  vcpu   = 2

  disk {
    volume_id = libvirt_volume.rhel9.id
  }

  network_interface {
    network_name = "default"
  }
}
```

## Set Up Shell Aliases

If your muscle memory types `terraform`, create an alias:

```bash
# Add to ~/.bashrc
echo 'alias terraform="tofu"' >> ~/.bashrc
echo 'alias tf="tofu"' >> ~/.bashrc
source ~/.bashrc
```

OpenTofu provides the same infrastructure-as-code experience as Terraform with the confidence of an open-source license. Your existing HCL files, providers, and modules work without modification on RHEL.
