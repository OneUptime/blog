# How to Configure RHEL for Multi-Cloud Deployment Across AWS, Azure, and GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Multi-Cloud, AWS, Azure, GCP, Cloud

Description: Configure RHEL systems for consistent deployment across AWS, Azure, and GCP by standardizing images, cloud-init, and management tools.

---

Running RHEL across multiple cloud providers requires a consistent approach to image management, configuration, and updates. This guide covers practical techniques for multi-cloud RHEL deployments.

## Standardize with Cloud-Init

Cloud-init works on all three major cloud providers. Create a standard user-data script:

```yaml
# cloud-init.yaml - Standard RHEL bootstrap for any cloud
#cloud-config
package_update: true
packages:
  - vim
  - tmux
  - git
  - bind-utils
  - net-tools

# Create a standard admin user
users:
  - name: sysadmin
    groups: wheel
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-rsa AAAA...your-key-here

# Standard timezone and NTP
timezone: UTC
ntp:
  enabled: true
  servers:
    - time.google.com

# Run post-boot commands
runcmd:
  - systemctl enable --now firewalld
  - firewall-cmd --permanent --add-service=ssh
  - firewall-cmd --reload
```

## Cloud CLI Tools

Install all three cloud CLIs on a management host:

```bash
# AWS CLI
sudo dnf install -y python3-pip
pip3 install awscli

# Azure CLI
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
sudo dnf install -y azure-cli

# GCP CLI (gcloud)
sudo tee /etc/yum.repos.d/google-cloud-sdk.repo << 'REPO'
[google-cloud-cli]
name=Google Cloud CLI
baseurl=https://packages.cloud.google.com/yum/repos/cloud-sdk-el9-x86_64
enabled=1
gpgcheck=1
gpgkey=https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
REPO
sudo dnf install -y google-cloud-cli
```

## Centralized Configuration with Ansible

Use Ansible to manage RHEL across all clouds from one inventory:

```ini
# inventory.ini
[aws]
aws-rhel-01 ansible_host=3.14.15.92

[azure]
azure-rhel-01 ansible_host=20.30.40.50

[gcp]
gcp-rhel-01 ansible_host=34.56.78.90

[all:vars]
ansible_user=ec2-user
ansible_ssh_private_key_file=~/.ssh/multi-cloud.pem
```

```bash
# Apply a standard configuration across all clouds
ansible-playbook -i inventory.ini hardening.yml
```

For subscription management, register all instances with the same Red Hat Satellite server regardless of cloud provider. This provides a single pane of glass for patching and compliance.
