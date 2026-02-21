# How to Use Molecule with Custom Docker Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Docker, Testing, Container Images

Description: Build and use custom Docker images for Molecule testing that include systemd, specific packages, and proper init systems.

---

The default Docker images used by Molecule are minimal. They work for simple roles, but once you need systemd, specific base packages, or enterprise Linux configurations, you need custom images. This post walks through building purpose-built Docker images for Molecule testing, configuring them in your molecule.yml, and managing them as part of your testing infrastructure.

## Why Custom Images?

Standard Docker images like `ubuntu:22.04` or `centos:stream9` are stripped down. They lack:

- systemd (or any init system)
- Python (needed by Ansible)
- Common packages like sudo, which, iproute
- Proper /sbin/init entry point

If your role manages services, configures firewalld, or does anything that touches systemd, you need an image that supports it.

## Building a Systemd-Enabled Image

Here is a Dockerfile for an Ubuntu 22.04 image with systemd support, which is probably the most commonly needed custom image.

```dockerfile
# Dockerfile.ubuntu2204 - Ubuntu 22.04 with systemd for Molecule
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV container=docker

# Install systemd and required packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    systemd \
    systemd-sysv \
    python3 \
    python3-apt \
    sudo \
    iproute2 \
    curl \
    gnupg2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Remove unnecessary systemd units
RUN rm -f /lib/systemd/system/multi-user.target.wants/* \
    /etc/systemd/system/*.wants/* \
    /lib/systemd/system/local-fs.target.wants/* \
    /lib/systemd/system/sockets.target.wants/*udev* \
    /lib/systemd/system/sockets.target.wants/*initctl* \
    /lib/systemd/system/sysinit.target.wants/systemd-tmpfiles-setup* \
    /lib/systemd/system/systemd-update-utmp*

# Set systemd as the entry point
VOLUME ["/sys/fs/cgroup"]
CMD ["/lib/systemd/systemd"]
```

Build it and tag it for use in Molecule.

```bash
# Build the custom image
docker build -f Dockerfile.ubuntu2204 -t molecule-ubuntu2204:latest .

# Verify systemd works
docker run --privileged --cgroupns=host -d --name test molecule-ubuntu2204:latest
docker exec test systemctl status
docker rm -f test
```

## CentOS/RHEL Custom Image

For Red Hat family distributions, the systemd setup is slightly different.

```dockerfile
# Dockerfile.centos9 - CentOS Stream 9 with systemd for Molecule
FROM quay.io/centos/centos:stream9

ENV container=docker

# Install required packages
RUN dnf -y update && \
    dnf -y install \
    systemd \
    python3 \
    python3-pip \
    sudo \
    which \
    iproute \
    curl \
    && dnf clean all

# Fix systemd for running inside Docker
RUN (cd /lib/systemd/system/sysinit.target.wants/; for i in *; do \
    [ $i = systemd-tmpfiles-setup.service ] || rm -f $i; done); \
    rm -f /lib/systemd/system/multi-user.target.wants/*; \
    rm -f /etc/systemd/system/*.wants/*; \
    rm -f /lib/systemd/system/local-fs.target.wants/*; \
    rm -f /lib/systemd/system/sockets.target.wants/*udev*; \
    rm -f /lib/systemd/system/sockets.target.wants/*initctl*; \
    rm -f /lib/systemd/system/basic.target.wants/*

VOLUME ["/sys/fs/cgroup"]
CMD ["/usr/sbin/init"]
```

## Configuring Molecule to Use Custom Images

Once your images are built, reference them in your molecule.yml platform configuration.

```yaml
# molecule/default/molecule.yml
dependency:
  name: galaxy

driver:
  name: docker

platforms:
  - name: ubuntu2204
    image: molecule-ubuntu2204:latest
    # pre_build_image means Molecule will not try to build the image
    pre_build_image: true
    # Required for systemd
    privileged: true
    cgroupns_mode: host
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    command: ""
    # Override the default tmpdir
    tmpfs:
      - /run
      - /tmp

  - name: centos9
    image: molecule-centos9:latest
    pre_build_image: true
    privileged: true
    cgroupns_mode: host
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    command: ""
    tmpfs:
      - /run
      - /tmp

provisioner:
  name: ansible

verifier:
  name: ansible
```

The `pre_build_image: true` flag is important. Without it, Molecule will try to build the image from a Dockerfile in the scenario directory, which is not what we want when we have pre-built images.

## Building Images Automatically with Molecule

Alternatively, you can let Molecule build the image as part of the create step. Put a Dockerfile in your scenario directory.

```
molecule/
  default/
    Dockerfile.j2
    molecule.yml
    converge.yml
    verify.yml
```

```jinja2
{# molecule/default/Dockerfile.j2 - Jinja2 template for Molecule #}
FROM {{ item.image }}

ENV container=docker
ENV DEBIAN_FRONTEND=noninteractive

RUN if [ -f /etc/debian_version ]; then \
      apt-get update && \
      apt-get install -y python3 python3-apt systemd sudo && \
      rm -rf /var/lib/apt/lists/*; \
    elif [ -f /etc/redhat-release ]; then \
      dnf -y install python3 systemd sudo && \
      dnf clean all; \
    fi

{% if item.command is not none %}
CMD {{ item.command }}
{% else %}
CMD ["/lib/systemd/systemd"]
{% endif %}
```

Then configure molecule.yml to use this template.

```yaml
# molecule/default/molecule.yml - with Dockerfile template
platforms:
  - name: ubuntu2204
    image: ubuntu:22.04
    # Without pre_build_image, Molecule builds from Dockerfile.j2
    pre_build_image: false
    privileged: true
    cgroupns_mode: host
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    command: ""
```

This approach is convenient because the Dockerfile lives with the test scenario, but it is slower because the image gets built on every `molecule create`.

## Custom Images with Pre-Installed Software

Sometimes your role has prerequisites that take a long time to install. Baking them into the test image saves significant time.

```dockerfile
# Dockerfile.java-app - Image pre-loaded with Java for testing a Java app role
FROM molecule-ubuntu2204:latest

# Pre-install Java since our role assumes it is already present
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

# Pre-install a database client that the role connects to
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
```

This is especially useful for roles that have slow dependencies like Java, .NET, or large package groups.

## Image Management Workflow

For a team working on many Ansible roles, you need a system for managing test images.

```mermaid
graph LR
    A[Dockerfile Changes] --> B[CI Pipeline]
    B --> C[Build Images]
    C --> D[Push to Registry]
    D --> E[Molecule Tests Use Images]
    E --> F[Role CI Pipelines]
```

Store your Dockerfiles in a dedicated repository and build them in CI.

```yaml
# .gitlab-ci.yml for building Molecule test images
stages:
  - build

build-ubuntu2204:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build -f Dockerfile.ubuntu2204 -t $CI_REGISTRY_IMAGE/molecule-ubuntu2204:latest .
    - docker push $CI_REGISTRY_IMAGE/molecule-ubuntu2204:latest
  only:
    changes:
      - Dockerfile.ubuntu2204

build-centos9:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build -f Dockerfile.centos9 -t $CI_REGISTRY_IMAGE/molecule-centos9:latest .
    - docker push $CI_REGISTRY_IMAGE/molecule-centos9:latest
  only:
    changes:
      - Dockerfile.centos9
```

## Handling Architecture Differences

If your team has a mix of AMD64 and ARM64 machines (common with Apple Silicon Macs), build multi-arch images.

```bash
# Create a buildx builder
docker buildx create --name molecule-builder --use

# Build multi-architecture image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f Dockerfile.ubuntu2204 \
  -t your-registry.com/molecule-ubuntu2204:latest \
  --push .
```

## Testing the Custom Image

Before using a new image in your Molecule tests, verify it works correctly.

```bash
# Test that the image starts and systemd is functional
docker run --privileged --cgroupns=host -d --name molecule-test molecule-ubuntu2204:latest

# Check systemd
docker exec molecule-test systemctl is-system-running --wait

# Check Python (required by Ansible)
docker exec molecule-test python3 --version

# Check package manager
docker exec molecule-test apt-get --version

# Clean up
docker rm -f molecule-test
```

## Debugging Image Issues

When Molecule fails at the create stage with a custom image, check these things.

```bash
# Verify the image exists locally
docker images | grep molecule

# Try running the image manually
docker run --privileged --cgroupns=host -it molecule-ubuntu2204:latest /bin/bash

# Check if systemd starts
docker run --privileged --cgroupns=host -d molecule-ubuntu2204:latest
docker logs <container-id>

# Check cgroup version (v1 vs v2)
stat -fc %T /sys/fs/cgroup/
# "cgroup2fs" = cgroup v2
# "tmpfs" = cgroup v1
```

Cgroup v2 is the default on newer Linux distributions and Docker Desktop. Your images need to handle both versions. The `cgroupns_mode: host` setting in molecule.yml helps with this.

Custom Docker images for Molecule are a bit of upfront work, but they pay off quickly. Your tests run faster, they are more reliable, and they better represent the actual environments where your roles will be deployed. Start with the systemd-enabled base images shown here, and add your specific requirements on top.
