# How to Run Packer in Docker for Image Building

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Packer, HashiCorp, Image Building, Infrastructure, DevOps, Automation, CI/CD

Description: Learn how to run HashiCorp Packer inside Docker containers to build machine images without local installation.

---

HashiCorp Packer automates the creation of machine images for platforms like AWS AMIs, Google Cloud images, Azure VMs, and Docker images themselves. Running Packer inside a Docker container eliminates the need to install it on every developer machine or CI runner. You get a consistent, versioned build environment that works the same everywhere.

This guide covers running Packer in Docker for various image-building scenarios, from basic usage to CI/CD integration.

## Why Run Packer in Docker?

Installing Packer natively means managing versions across team members and CI systems. One developer runs Packer 1.10, another runs 1.11, and builds break in subtle ways. Docker solves this by pinning the exact Packer version in the container image. Everyone runs the same binary, with the same plugins, producing the same output.

There is also the security angle. Packer often needs cloud credentials to build images. Running it in a container limits the blast radius if something goes wrong. Credentials stay in environment variables scoped to the container rather than sitting in a shell profile.

## Basic Packer Commands in Docker

HashiCorp publishes official Packer images on Docker Hub. Start with a simple version check.

```bash
# Verify Packer runs correctly in Docker
docker run --rm hashicorp/packer:latest version
```

The `--rm` flag removes the container after it exits. For any Packer operation, you need to mount your template files into the container.

```bash
# Initialize Packer plugins for a template
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/packer:latest \
  init template.pkr.hcl

# Validate a Packer template
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/packer:latest \
  validate template.pkr.hcl

# Build an image from a template
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/packer:latest \
  build template.pkr.hcl
```

## Building AWS AMIs with Packer in Docker

A common use case is building AWS AMIs. Here is a complete Packer template that creates an Ubuntu-based AMI with Nginx pre-installed.

```hcl
# aws-nginx.pkr.hcl - Build an Nginx AMI for AWS
packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

# Define variables for AWS configuration
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

# Source block defines the base image and instance configuration
source "amazon-ebs" "nginx" {
  ami_name      = "nginx-ubuntu-{{timestamp}}"
  instance_type = var.instance_type
  region        = var.aws_region

  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    owners      = ["099720109477"]  # Canonical
    most_recent = true
  }

  ssh_username = "ubuntu"
}

# Build block defines provisioning steps
build {
  sources = ["source.amazon-ebs.nginx"]

  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
      "sudo systemctl enable nginx",
      "sudo apt-get clean"
    ]
  }
}
```

Run the build with AWS credentials passed as environment variables.

```bash
# Build the AWS AMI using Packer in Docker
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION=us-east-1 \
  hashicorp/packer:latest \
  build aws-nginx.pkr.hcl
```

Note that we pass the environment variable names without values. Docker picks up the values from the host environment, so your credentials never appear in the command line.

## Building Docker Images with Packer

Yes, you can use Packer running in Docker to build Docker images. This is useful when you want Packer's provisioning model (shell scripts, Ansible, Chef) to build container images.

```hcl
# docker-app.pkr.hcl - Build a Docker image with Packer
packer {
  required_plugins {
    docker = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/docker"
    }
  }
}

source "docker" "ubuntu" {
  image  = "ubuntu:22.04"
  commit = true
  changes = [
    "EXPOSE 8080",
    "CMD [\"/usr/local/bin/myapp\"]"
  ]
}

build {
  sources = ["source.docker.ubuntu"]

  # Install dependencies
  provisioner "shell" {
    inline = [
      "apt-get update",
      "apt-get install -y curl python3 python3-pip",
      "pip3 install flask gunicorn",
      "apt-get clean"
    ]
  }

  # Copy application code
  provisioner "file" {
    source      = "app/"
    destination = "/usr/local/bin/"
  }

  # Tag the resulting image
  post-processor "docker-tag" {
    repository = "myregistry/myapp"
    tags       = ["latest", "1.0.0"]
  }
}
```

Building Docker images with Packer inside Docker requires mounting the Docker socket.

```bash
# Build a Docker image using Packer running in Docker
docker run --rm \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -w /workspace \
  hashicorp/packer:latest \
  build docker-app.pkr.hcl
```

## Creating a Wrapper Script

Typing the full `docker run` command every time gets tedious. Create a wrapper script that mimics the native Packer CLI.

```bash
#!/bin/bash
# packer.sh - Wrapper script to run Packer in Docker
# Usage: ./packer.sh build template.pkr.hcl

PACKER_VERSION="${PACKER_VERSION:-latest}"

docker run --rm \
  -v "$(pwd):/workspace" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -w /workspace \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION \
  -e GOOGLE_APPLICATION_CREDENTIALS \
  -e ARM_CLIENT_ID \
  -e ARM_CLIENT_SECRET \
  -e ARM_SUBSCRIPTION_ID \
  -e ARM_TENANT_ID \
  "hashicorp/packer:${PACKER_VERSION}" \
  "$@"
```

```bash
# Make the script executable
chmod +x packer.sh

# Use it like native Packer
./packer.sh version
./packer.sh init template.pkr.hcl
./packer.sh build template.pkr.hcl
```

## CI/CD Integration with GitHub Actions

Packer in Docker fits naturally into CI/CD pipelines. Here is a GitHub Actions workflow that builds an AMI on every push to the main branch.

```yaml
# .github/workflows/build-ami.yml - Build AMI with Packer in CI
name: Build AMI

on:
  push:
    branches: [main]
    paths:
      - "packer/**"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Initialize Packer plugins
        run: |
          docker run --rm \
            -v ${{ github.workspace }}/packer:/workspace \
            -w /workspace \
            hashicorp/packer:1.10.0 \
            init template.pkr.hcl

      - name: Validate Packer template
        run: |
          docker run --rm \
            -v ${{ github.workspace }}/packer:/workspace \
            -w /workspace \
            hashicorp/packer:1.10.0 \
            validate template.pkr.hcl

      - name: Build AMI
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          docker run --rm \
            -v ${{ github.workspace }}/packer:/workspace \
            -w /workspace \
            -e AWS_ACCESS_KEY_ID \
            -e AWS_SECRET_ACCESS_KEY \
            -e AWS_DEFAULT_REGION=us-east-1 \
            hashicorp/packer:1.10.0 \
            build -color=false template.pkr.hcl
```

## Caching Packer Plugins

Packer downloads plugins during `init`, which takes time on every run. Cache the plugins by mounting a persistent volume.

```bash
# Use a named volume to cache Packer plugins between runs
docker run --rm \
  -v $(pwd):/workspace \
  -v packer-plugins:/root/.config/packer/plugins \
  -w /workspace \
  hashicorp/packer:latest \
  init template.pkr.hcl
```

In CI, use GitHub Actions cache to persist the plugin directory.

```yaml
      - name: Cache Packer plugins
        uses: actions/cache@v4
        with:
          path: ~/.packer.d/plugins
          key: packer-plugins-${{ hashFiles('packer/**/*.pkr.hcl') }}
```

## Debugging Packer Builds

When builds fail, you need visibility into what went wrong. Enable debug mode and verbose logging.

```bash
# Run Packer with debug logging
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  -e PACKER_LOG=1 \
  -e PACKER_LOG_PATH=/workspace/packer.log \
  hashicorp/packer:latest \
  build template.pkr.hcl
```

For interactive debugging, drop into the container's shell.

```bash
# Start an interactive shell in the Packer container
docker run --rm -it \
  -v $(pwd):/workspace \
  -w /workspace \
  --entrypoint /bin/sh \
  hashicorp/packer:latest
```

## Wrapping Up

Running Packer in Docker standardizes your image-building process across development machines and CI environments. Pin a specific Packer version, mount your templates and credentials, and build away. The wrapper script makes daily usage seamless, and CI integration means your machine images stay current with every code change. Whether you are building cloud AMIs, VM templates, or Docker images, Packer in Docker keeps everything consistent and reproducible.
