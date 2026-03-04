# How to Set Up Packer with Docker Builder on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Packer, Docker, Image Building, HashiCorp, Automation, Linux

Description: Learn how to set up HashiCorp Packer with the Docker builder on RHEL to create consistent, automated container images with provisioners, post-processors, and CI/CD integration.

---

HashiCorp Packer automates the creation of machine and container images. When used with the Docker builder, Packer starts a Docker container, runs provisioners to configure it, and commits the result as a new image. This gives you reproducible, version-controlled image builds that go beyond what a Dockerfile alone can offer. This guide covers setting up Packer with Docker on RHEL.

## Why Packer for Docker Images

While Dockerfiles handle most image-building needs, Packer adds value when you:

- Need to build images for multiple platforms from the same configuration (Docker, AWS AMI, Azure, etc.)
- Want to use provisioners like Ansible, Chef, or Shell scripts across all image types
- Need post-processors to push images to multiple registries
- Want to enforce a standardized build pipeline across teams

## Prerequisites

- RHEL with root or sudo access
- Docker or Podman installed
- Basic familiarity with JSON or HCL configuration

## Installing Packer

```bash
# Add the HashiCorp repository
sudo dnf install -y yum-utils
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
```

```bash
# Install Packer
sudo dnf install -y packer
```

Verify the installation:

```bash
# Check the version
packer version
```

## Installing Docker

```bash
# Install Docker
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

## Basic Packer Template

Create a simple Packer template that builds a Docker image:

```bash
# Create a project directory
mkdir -p /opt/packer-docker
cd /opt/packer-docker
```

```hcl
# docker-image.pkr.hcl
packer {
  required_plugins {
    docker = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/docker"
    }
  }
}

source "docker" "rhel" {
  image  = "redhat/ubi9:latest"
  commit = true
  changes = [
    "EXPOSE 8080",
    "CMD [\"/usr/sbin/httpd\", \"-D\", \"FOREGROUND\"]",
    "ENV APP_ENV=production"
  ]
}

build {
  name = "myapp"
  sources = ["source.docker.rhel"]

  provisioner "shell" {
    inline = [
      "dnf install -y httpd",
      "dnf clean all",
      "echo 'Hello from Packer' > /var/www/html/index.html"
    ]
  }

  post-processor "docker-tag" {
    repository = "myapp/web"
    tags       = ["latest", "1.0.0"]
  }
}
```

## Initializing and Building

```bash
# Initialize Packer plugins
packer init docker-image.pkr.hcl
```

```bash
# Validate the template
packer validate docker-image.pkr.hcl
```

```bash
# Build the image
packer build docker-image.pkr.hcl
```

Verify the image was created:

```bash
# List Docker images
docker images myapp/web
```

## Using Shell Provisioners

Run complex provisioning scripts:

```hcl
provisioner "shell" {
  scripts = [
    "scripts/install-packages.sh",
    "scripts/configure-app.sh",
    "scripts/cleanup.sh"
  ]
  environment_vars = [
    "APP_VERSION=2.0.0",
    "BUILD_DATE={{timestamp}}"
  ]
}
```

Create the scripts:

```bash
# scripts/install-packages.sh
#!/bin/bash
set -e
dnf install -y \
  httpd \
  mod_ssl \
  python3 \
  python3-pip
dnf clean all
```

```bash
# scripts/cleanup.sh
#!/bin/bash
set -e
rm -rf /tmp/*
rm -rf /var/cache/dnf/*
```

## Using File Provisioners

Copy files into the image:

```hcl
provisioner "file" {
  source      = "config/httpd.conf"
  destination = "/etc/httpd/conf/httpd.conf"
}

provisioner "file" {
  source      = "app/"
  destination = "/var/www/html/"
}
```

## Using Ansible Provisioner

Provision the image with Ansible:

```hcl
provisioner "ansible" {
  playbook_file = "ansible/configure.yml"
  extra_arguments = [
    "--extra-vars", "app_version=2.0.0"
  ]
}
```

## Pushing to a Registry

Add a post-processor to push to a container registry:

```hcl
post-processor "docker-tag" {
  repository = "registry.example.com/myapp/web"
  tags       = ["latest", "1.0.0"]
}

post-processor "docker-push" {
  login          = true
  login_server   = "registry.example.com"
  login_username = "deploy"
  login_password = "registry_password"
}
```

## Using Variables

Define variables for reusable templates:

```hcl
variable "base_image" {
  type    = string
  default = "redhat/ubi9:latest"
}

variable "app_version" {
  type    = string
  default = "1.0.0"
}

variable "registry" {
  type    = string
  default = "registry.example.com"
}

source "docker" "app" {
  image  = var.base_image
  commit = true
}

build {
  sources = ["source.docker.app"]

  provisioner "shell" {
    inline = [
      "echo 'Building version ${var.app_version}'"
    ]
  }

  post-processor "docker-tag" {
    repository = "${var.registry}/myapp/web"
    tags       = ["latest", var.app_version]
  }
}
```

Pass variables at build time:

```bash
# Build with custom variables
packer build -var app_version=2.0.0 -var registry=docker.io/myorg docker-image.pkr.hcl
```

## Multi-Stage Builds

Build for multiple platforms from the same template:

```hcl
source "docker" "ubuntu" {
  image  = "ubuntu:22.04"
  commit = true
}

source "docker" "rhel" {
  image  = "redhat/ubi9:latest"
  commit = true
}

build {
  sources = [
    "source.docker.ubuntu",
    "source.docker.rhel"
  ]

  provisioner "shell" {
    inline = [
      "echo 'Platform: '$(cat /etc/os-release | grep PRETTY_NAME)"
    ]
  }
}
```

## CI/CD Integration

Add Packer to your CI pipeline:

```yaml
# .gitlab-ci.yml example
build-image:
  stage: build
  script:
    - packer init docker-image.pkr.hcl
    - packer validate docker-image.pkr.hcl
    - packer build -var app_version=$CI_COMMIT_TAG docker-image.pkr.hcl
  only:
    - tags
```

## Conclusion

Packer with the Docker builder on RHEL gives you a powerful, automated way to create container images using the same tooling and provisioners you use for virtual machine images. By defining your builds in HCL templates, you get version-controlled, reproducible image builds that integrate cleanly into CI/CD pipelines and support multiple target platforms from a single configuration.
