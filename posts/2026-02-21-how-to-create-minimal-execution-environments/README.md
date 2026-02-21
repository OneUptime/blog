# How to Create Minimal Execution Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Execution Environments, Optimization, Containers

Description: Build lean Ansible Execution Environments by minimizing collections, Python packages, and system dependencies for faster pulls and smaller images.

---

Default Execution Environment images can easily grow to over 1 GB. That is fine for a developer workstation, but it slows down CI/CD pipelines, wastes registry storage, and increases the time AWX nodes spend pulling images. This post covers practical techniques for building minimal EEs that contain only what your playbooks actually need.

## Why Minimize?

Every extra megabyte in your EE image has costs:

- Slower image pulls in CI/CD pipelines (especially on first run or with `pull: always`)
- More storage used on container registries and AWX/Tower nodes
- Larger attack surface for security scanning (more packages means more potential CVEs)
- Longer build times when rebuilding

A well-optimized EE can be 200-400 MB instead of 1+ GB.

## Starting with the Right Base Image

The base image is the biggest factor in your final image size. The official `ansible-runner` image is based on UBI (Universal Base Image) and comes in around 350-500 MB.

Compare base image sizes:

```bash
# Check sizes of available base images
podman pull quay.io/ansible/ansible-runner:latest
podman pull quay.io/ansible/ansible-runner:latest --arch amd64

podman images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep ansible
```

For the smallest possible EE, use the minimal runner image:

```yaml
# execution-environment.yml - Minimal base
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

dependencies:
  ansible_core:
    package_pip: ansible-core>=2.15.0,<2.17.0
  ansible_runner:
    package_pip: ansible-runner>=2.3.0
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

## Only Include Collections You Actually Use

The biggest mistake I see is including collections "just in case." Every collection adds Python dependencies, sometimes system dependencies, and always adds size.

Audit which collections your playbooks actually use:

```bash
# Find all collection references in your playbooks
grep -rh "^\s*-\s*name:\|^\s*\w\+\.\w\+\.\w\+:" playbooks/ roles/ \
  | grep -oE '[a-z_]+\.[a-z_]+\.[a-z_]+' \
  | sort -u
```

Only include those collections in your requirements.yml:

```yaml
# requirements.yml - Only what you need
---
collections:
  # Only include collections your playbooks actually reference
  - name: ansible.posix
    version: "1.5.4"
  - name: community.general
    version: "8.2.0"
```

Compare the image size with all collections versus only needed collections:

```yaml
# requirements-full.yml - Everything (DON'T do this)
---
collections:
  - name: community.general
  - name: community.docker
  - name: community.postgresql
  - name: community.mysql
  - name: amazon.aws
  - name: azure.azcollection
  - name: google.cloud
  # This adds hundreds of MB of Python dependencies
```

## Minimize Python Dependencies

Collections pull in transitive Python dependencies. Some of these are large. The Azure SDK alone adds hundreds of megabytes.

Check what Python packages a collection brings:

```bash
# Build with only one collection and check pip list
# This helps you understand per-collection Python costs

# First, build a minimal EE with just ansible.posix
ansible-builder build --tag test-posix:latest --verbosity 2
podman run --rm test-posix:latest pip list | wc -l

# Then build with community.general added
ansible-builder build --tag test-general:latest --verbosity 2
podman run --rm test-general:latest pip list | wc -l
```

In your requirements.txt, only include packages you actually need:

```text
# requirements.txt - Minimal Python packages
# Only list what your playbooks use that collections don't already provide
jmespath>=1.0.0
```

## Use Binary Wheels Instead of Compiling

Compiled Python packages need build tools (gcc, python3-devel, etc.) during installation. While the `[compile]` tag in bindep keeps these out of the final image, the compiled libraries themselves add size.

Use pre-built binary packages when available:

```text
# requirements.txt - Prefer binary packages
# Use binary variant to avoid needing postgresql-devel
psycopg2-binary>=2.9.0

# Use pre-built cryptography wheels
cryptography>=41.0.0
```

And minimize bindep.txt accordingly:

```text
# bindep.txt - Minimal system packages
# With binary Python packages, you need fewer system deps
openssh-clients [platform:rhel-8 platform:rhel-9]
sshpass [platform:rhel-8 platform:rhel-9]
```

## Clean Up in Build Steps

Add cleanup steps at the end of your build to remove caches and temporary files:

```yaml
# execution-environment.yml - With cleanup steps
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

additional_build_steps:
  append_final:
    # Remove pip cache
    - RUN pip cache purge 2>/dev/null || true
    # Remove dnf cache
    - RUN dnf clean all && rm -rf /var/cache/dnf
    # Remove temporary files
    - RUN rm -rf /tmp/* /var/tmp/*
    # Remove Python bytecode (regenerated on first run)
    - RUN find /usr -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
    # Remove documentation to save space
    - RUN rm -rf /usr/share/doc /usr/share/man

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

## Split EEs by Use Case

Instead of one large EE that contains everything, create purpose-specific EEs:

```yaml
# ee-aws.yml - AWS-only EE
---
version: 3
images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest
dependencies:
  galaxy:
    collections:
      - name: amazon.aws
        version: ">=7.0.0"
  python:
    - boto3>=1.28.0
    - botocore>=1.31.0
  system: []
```

```yaml
# ee-network.yml - Network automation EE
---
version: 3
images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest
dependencies:
  galaxy:
    collections:
      - name: cisco.ios
        version: ">=6.0.0"
      - name: ansible.netcommon
        version: ">=6.0.0"
  python:
    - paramiko>=3.0.0
    - netaddr>=0.8.0
  system: []
```

```yaml
# ee-base.yml - Basic infrastructure EE
---
version: 3
images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest
dependencies:
  galaxy:
    collections:
      - name: ansible.posix
        version: ">=1.5.0"
      - name: community.general
        version: ">=8.0.0"
  python:
    - jmespath>=1.0.0
  system: []
```

Build and compare sizes:

```bash
# Build each EE
ansible-builder build --tag ee-aws:1.0 --file ee-aws.yml
ansible-builder build --tag ee-network:1.0 --file ee-network.yml
ansible-builder build --tag ee-base:1.0 --file ee-base.yml

# Compare sizes
podman images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep ee-
```

## Measuring Image Size

Use these commands to understand what is consuming space:

```bash
# Overall image size
podman images my-ee:1.0

# Layer-by-layer size breakdown
podman history my-ee:1.0 --format "table {{.CreatedBy}}\t{{.Size}}" --no-trunc

# Detailed filesystem analysis using dive (if installed)
dive my-ee:1.0

# Compare two versions
podman images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | sort
```

Check what is taking up space inside the image:

```bash
# Find the largest directories
podman run --rm my-ee:1.0 du -sh /usr/lib/python3.* /usr/share /usr/lib64 2>/dev/null | sort -rh

# Find the largest Python packages
podman run --rm my-ee:1.0 pip list --format=columns

# Check collection sizes
podman run --rm my-ee:1.0 du -sh /usr/share/ansible/collections/ansible_collections/*/
```

## Practical Size Comparison

Here is a real comparison I ran showing the impact of each optimization:

```bash
# Full EE with everything: 1.4 GB
# - 15 collections including AWS, Azure, GCP
# - All Python dependencies
# - Build tools left in

# Optimized EE: 380 MB
# - 3 collections (posix, general, docker)
# - Minimal Python packages
# - Cleanup steps applied
# - Binary wheels used

# Per-purpose AWS EE: 520 MB
# - Just amazon.aws and community.general
# - boto3 and dependencies
# - Cleanup applied
```

The difference is significant, especially when pulling images across a network.

## Dockerfile/Containerfile Optimization Tips

These general container optimization techniques also apply to EE builds:

```yaml
# execution-environment.yml - Optimized build
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

build_arg_defaults:
  # Don't preserve package manager cache between layers
  PKGMGR_PRESERVE_CACHE: ""

additional_build_steps:
  prepend_builder:
    # Use no-cache-dir for pip to avoid storing wheels
    - ENV PIP_NO_CACHE_DIR=1
  append_final:
    - RUN dnf clean all && rm -rf /var/cache/dnf /tmp/* /var/tmp/*
    - RUN find /usr -name '*.pyc' -delete 2>/dev/null || true

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

## Wrapping Up

Building minimal Execution Environments is not about being stingy with dependencies. It is about being intentional. Include what your playbooks need and nothing more. Split large EEs into purpose-specific images, use binary Python packages to avoid build tools, clean up caches, and measure your image size regularly. A 400 MB EE that pulls in 5 seconds will make your CI/CD pipeline and your team much happier than a 1.5 GB image that takes a minute to download every time.
