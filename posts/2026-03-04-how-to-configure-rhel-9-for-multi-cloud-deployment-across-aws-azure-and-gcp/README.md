# How to Configure RHEL 9 for Multi-Cloud Deployment Across AWS, Azure, and GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Azure, AWS, GCP, Multi-Cloud

Description: Step-by-step guide on configure rhel 9 for multi-cloud deployment across aws, azure, and gcp with practical examples and commands.

---

Deploying RHEL 9 across multiple cloud providers requires careful planning. This guide covers configuring RHEL 9 for consistent multi-cloud deployment across AWS, Azure, and GCP.

## Prerequisites

- RHEL 9 images available on each cloud provider
- Ansible or Terraform installed for automation
- Network connectivity planning completed
- Red Hat subscription or Satellite server

## Standardize the Base Image

Use a consistent kickstart file across all cloud providers:

```bash
# rhel9-cloud.ks
lang en_US.UTF-8
keyboard us
timezone UTC --utc
rootpw --lock
user --name=cloudadmin --groups=wheel --lock
selinux --enforcing
firewall --enabled --ssh

%packages
@core
cloud-init
insights-client
rhc
subscription-manager
tmux
vim-enhanced
%end

%post
systemctl enable cloud-init
systemctl enable insights-client
%end
```

## Configure cloud-init for Multi-Cloud

Create a universal cloud-init configuration:

```yaml
# /etc/cloud/cloud.cfg.d/99-multicloud.cfg
system_info:
  default_user:
    name: cloudadmin
    lock_passwd: true
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash

package_update: true
package_upgrade: false

packages:
  - vim-enhanced
  - tmux
  - curl
  - wget

runcmd:
  - subscription-manager register --org=MyOrg --activationkey=multicloud-key
  - insights-client --register
  - dnf install -y rhc && rhc connect
```

## Use Terraform for Multi-Cloud Provisioning

Create a modular Terraform structure:

```
multicloud/
  modules/
    aws/
      main.tf
    azure/
      main.tf
    gcp/
      main.tf
  main.tf
  variables.tf
```

```hcl
# main.tf
module "aws_rhel9" {
  source         = "./modules/aws"
  instance_count = var.aws_instance_count
  instance_type  = "t3.medium"
}

module "azure_rhel9" {
  source   = "./modules/azure"
  vm_count = var.azure_vm_count
  vm_size  = "Standard_B2s"
}

module "gcp_rhel9" {
  source         = "./modules/gcp"
  instance_count = var.gcp_instance_count
  machine_type   = "e2-medium"
}
```

## Configure Consistent Networking

Use Ansible to apply uniform network settings:

```yaml
---
- name: Configure RHEL 9 networking across clouds
  hosts: all
  become: true
  tasks:
    - name: Set consistent DNS resolvers
      ansible.builtin.copy:
        dest: /etc/resolv.conf
        content: |
          nameserver 8.8.8.8
          nameserver 8.8.4.4
        mode: '0644'

    - name: Configure NTP with chrony
      ansible.builtin.template:
        src: chrony.conf.j2
        dest: /etc/chrony.conf
      notify: restart chronyd

    - name: Apply firewall rules
      ansible.posix.firewalld:
        service: "{{ item }}"
        permanent: true
        state: enabled
      loop:
        - ssh
        - https
```

## Centralized Monitoring

Configure all instances to report to a central monitoring system:

```bash
# Install and configure node_exporter on all instances
sudo dnf install -y golang
# Or download pre-built binary
curl -LO https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
sudo cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/

sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now node_exporter
```

## Conclusion

Multi-cloud RHEL 9 deployment benefits from standardized images, consistent configuration management with Ansible, infrastructure-as-code with Terraform, and centralized monitoring. This approach gives you flexibility while maintaining operational consistency.

