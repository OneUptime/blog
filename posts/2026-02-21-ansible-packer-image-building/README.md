# How to Use Ansible with Packer for Image Building

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Packer, AMI, Image Building

Description: Build immutable machine images using Packer with Ansible as the provisioner for consistent, pre-configured server images across cloud providers.

---

Packer builds machine images (AMIs, Azure images, Docker images) from a template. Ansible is one of the best provisioners for Packer because you can reuse the same roles you use for configuration management. This combination lets you bake configuration into images, which speeds up server boot time and improves consistency.

This post covers using Ansible as a Packer provisioner to build production-ready machine images.

## Why Packer + Ansible

Instead of provisioning a bare OS and then running Ansible every time a new server launches, you bake the configuration into the image. The server boots with everything already installed and configured.

```mermaid
graph LR
    A[Packer Template] --> B[Launch Temp Instance]
    B --> C[Ansible Provisioner]
    C --> D[Configure Instance]
    D --> E[Create AMI/Image]
    E --> F[Terminate Temp Instance]
    F --> G[Use Image for New Servers]
```

## Basic Packer Template with Ansible

```hcl
# packer/base-image.pkr.hcl
# Build a base Ubuntu image with Ansible provisioning

packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.0"
      source  = "github.com/hashicorp/amazon"
    }
    ansible = {
      version = ">= 1.1.0"
      source  = "github.com/hashicorp/ansible"
    }
  }
}

variable "app_version" {
  type    = string
  default = "latest"
}

variable "base_ami" {
  type    = string
  default = "ami-0abcdef1234567890"
}

source "amazon-ebs" "base" {
  ami_name      = "myapp-base-{{timestamp}}"
  instance_type = "t3.medium"
  region        = "us-east-1"
  source_ami    = var.base_ami

  ssh_username = "ubuntu"

  ami_description = "Base image with common configuration"

  tags = {
    Name        = "myapp-base"
    BuildTime   = "{{timestamp}}"
    AppVersion  = var.app_version
    ManagedBy   = "packer"
  }
}

build {
  sources = ["source.amazon-ebs.base"]

  # Run Ansible provisioner
  provisioner "ansible" {
    playbook_file = "../ansible/playbooks/packer-base.yml"
    roles_path    = "../ansible/roles"
    extra_arguments = [
      "--extra-vars", "app_version=${var.app_version}",
      "--extra-vars", "packer_build=true"
    ]
    ansible_env_vars = [
      "ANSIBLE_HOST_KEY_CHECKING=False"
    ]
  }

  # Clean up for image creation
  provisioner "shell" {
    inline = [
      "sudo rm -rf /tmp/*",
      "sudo rm -rf /var/log/*.log",
      "sudo cloud-init clean"
    ]
  }
}
```

## Ansible Playbook for Packer

The playbook used by Packer should be self-contained:

```yaml
# ansible/playbooks/packer-base.yml
# Playbook used by Packer to build base images
---
- name: Configure base image
  hosts: all
  become: true
  vars:
    packer_build: true

  roles:
    - common
    - security_baseline
    - monitoring_agent
    - docker

  post_tasks:
    - name: Install application dependencies
      ansible.builtin.apt:
        name:
          - nginx
          - python3
          - python3-pip
        state: present

    - name: Pre-pull Docker images
      community.docker.docker_image:
        name: "{{ item }}"
        source: pull
      loop:
        - "myregistry.com/myapp:{{ app_version }}"
        - datadog/agent:latest

    - name: Disable services that should start on first boot
      ansible.builtin.service:
        name: "{{ item }}"
        enabled: false
      loop:
        - nginx
        - myapp
      when: packer_build | default(false)
```

## Building Role-Specific Images

Build different images for different roles:

```hcl
# packer/web-server.pkr.hcl
# Build web server image

source "amazon-ebs" "web" {
  ami_name      = "myapp-web-{{timestamp}}"
  instance_type = "t3.medium"
  region        = "us-east-1"
  source_ami    = var.base_ami
  ssh_username  = "ubuntu"
}

build {
  sources = ["source.amazon-ebs.web"]

  provisioner "ansible" {
    playbook_file = "../ansible/playbooks/packer-web.yml"
    extra_arguments = [
      "--extra-vars", "app_version=${var.app_version}",
      "--extra-vars", "server_role=webserver"
    ]
  }
}
```

```yaml
# ansible/playbooks/packer-web.yml
# Web server image configuration
---
- name: Configure web server image
  hosts: all
  become: true

  roles:
    - common
    - nginx
    - ssl_certs
    - app_deploy

  tasks:
    - name: Configure Nginx for production
      ansible.builtin.template:
        src: nginx-production.conf.j2
        dest: /etc/nginx/sites-available/default
        mode: '0644'

    - name: Pre-download SSL certificates
      ansible.builtin.copy:
        content: "placeholder - will be replaced on boot"
        dest: /etc/ssl/certs/app.pem
        mode: '0644'
```

## CI/CD Pipeline for Image Building

```yaml
# .github/workflows/build-images.yml
# Automated image building pipeline
name: Build Machine Images
on:
  push:
    branches: [main]
    paths: ['ansible/roles/**', 'packer/**']

jobs:
  build-base:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-packer@main
      - name: Install Ansible
        run: pip install ansible
      - name: Validate Packer template
        run: packer validate packer/base-image.pkr.hcl
      - name: Build base image
        run: packer build -var "app_version=${{ github.sha }}" packer/base-image.pkr.hcl
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## First Boot Configuration

Some configuration must happen at boot time (like hostname, IP-specific settings):

```yaml
# ansible/playbooks/first-boot.yml
# Configuration that runs on first boot of a baked image
---
- name: First boot configuration
  hosts: localhost
  connection: local
  become: true

  tasks:
    - name: Set hostname from metadata
      ansible.builtin.hostname:
        name: "{{ lookup('url', 'http://169.254.169.254/latest/meta-data/local-hostname') }}"

    - name: Enable and start services
      ansible.builtin.service:
        name: "{{ item }}"
        state: started
        enabled: true
      loop:
        - nginx
        - myapp

    - name: Register with service discovery
      ansible.builtin.uri:
        url: "http://consul.internal:8500/v1/agent/service/register"
        method: PUT
        body_format: json
        body:
          name: myapp
          port: 8080
```

## Key Takeaways

Packer with Ansible provisioning gives you immutable infrastructure. Bake your configuration into images so new servers start fast and consistently. Reuse your existing Ansible roles for the Packer build. Split configuration into build-time (baked into the image) and boot-time (applied when the server starts). Build images in CI/CD so they stay current. Use separate images for different server roles to keep image sizes reasonable.
