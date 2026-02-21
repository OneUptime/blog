# How to Manage Multiple Execution Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Execution Environments, DevOps, Container Management

Description: Strategies for organizing, building, versioning, and maintaining multiple Ansible Execution Environments across teams and projects.

---

Once you move past a single Execution Environment, managing multiple EEs becomes a real operational concern. Different teams need different collections, different projects have different Python dependencies, and production needs strict version pinning while development needs the latest packages. This post covers how to organize, build, and maintain multiple EEs without losing your mind.

## Why Multiple EEs?

A single EE that contains everything becomes bloated and hard to maintain. It also means every team is affected when any dependency changes. Splitting into multiple EEs gives you:

- Smaller, faster images per use case
- Independent update cycles for different teams
- Reduced blast radius when a dependency breaks
- Better security posture (fewer packages means fewer CVEs)

## Organizing Your EE Repository

I recommend a monorepo structure where all EE definitions live in one repository. This makes it easy to share common configurations and build all images from one pipeline.

```
ansible-execution-environments/
  common/
    ansible.cfg
    pip.conf
  ee-base/
    execution-environment.yml
    requirements.yml
    requirements.txt
    bindep.txt
  ee-aws/
    execution-environment.yml
    requirements.yml
    requirements.txt
    bindep.txt
  ee-azure/
    execution-environment.yml
    requirements.yml
    requirements.txt
    bindep.txt
  ee-network/
    execution-environment.yml
    requirements.yml
    requirements.txt
    bindep.txt
  ee-security/
    execution-environment.yml
    requirements.yml
    requirements.txt
    bindep.txt
  Makefile
  .github/
    workflows/
      build-all.yml
```

## Creating a Layered EE Strategy

Build EEs in layers where specialized images extend a base image:

The base EE contains what every team needs:

```yaml
# ee-base/execution-environment.yml
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

dependencies:
  ansible_core:
    package_pip: ansible-core>=2.15.0,<2.17.0
  galaxy:
    collections:
      - name: ansible.posix
        version: ">=1.5.0"
      - name: community.general
        version: ">=8.0.0"
      - name: ansible.utils
        version: ">=3.0.0"
  python:
    - jmespath>=1.0.0
    - PyYAML>=6.0
  system:
    - openssh-clients [platform:rhel-8 platform:rhel-9]
    - sshpass [platform:rhel-8 platform:rhel-9]
    - rsync [platform:rhel-8 platform:rhel-9]

additional_build_steps:
  append_final:
    - RUN dnf clean all && rm -rf /var/cache/dnf /tmp/*
    - LABEL org.opencontainers.image.title="Base Ansible EE"
```

The AWS EE extends the base:

```yaml
# ee-aws/execution-environment.yml
---
version: 3

images:
  base_image:
    name: quay.io/myorg/ee-base:latest

dependencies:
  galaxy:
    collections:
      - name: amazon.aws
        version: ">=7.0.0"
      - name: community.aws
        version: ">=7.0.0"
  python:
    - boto3>=1.28.0
    - botocore>=1.31.0
  system: []

additional_build_steps:
  append_final:
    - LABEL org.opencontainers.image.title="AWS Ansible EE"
```

Build in order (base first, then specialized):

```bash
# Build the base EE first
cd ee-base && ansible-builder build --tag quay.io/myorg/ee-base:2.0.0

# Push the base so specialized EEs can use it
podman push quay.io/myorg/ee-base:2.0.0

# Then build specialized EEs
cd ../ee-aws && ansible-builder build --tag quay.io/myorg/ee-aws:2.0.0
cd ../ee-azure && ansible-builder build --tag quay.io/myorg/ee-azure:2.0.0
```

## Automating Builds with a Makefile

A Makefile makes building multiple EEs practical:

```makefile
# Makefile - Build and manage multiple EEs
REGISTRY ?= quay.io/myorg
VERSION ?= 2.0.0
RUNTIME ?= podman

# List all EE directories
EE_DIRS := ee-base ee-aws ee-azure ee-network ee-security

.PHONY: all build-all push-all clean

# Build all EEs in order (base first)
all: build-all

build-all: build-base build-aws build-azure build-network build-security

build-base:
	cd ee-base && ansible-builder build \
		--tag $(REGISTRY)/ee-base:$(VERSION) \
		--container-runtime $(RUNTIME) \
		--verbosity 2

build-aws: build-base
	cd ee-aws && ansible-builder build \
		--tag $(REGISTRY)/ee-aws:$(VERSION) \
		--container-runtime $(RUNTIME) \
		--verbosity 2

build-azure: build-base
	cd ee-azure && ansible-builder build \
		--tag $(REGISTRY)/ee-azure:$(VERSION) \
		--container-runtime $(RUNTIME) \
		--verbosity 2

build-network: build-base
	cd ee-network && ansible-builder build \
		--tag $(REGISTRY)/ee-network:$(VERSION) \
		--container-runtime $(RUNTIME) \
		--verbosity 2

build-security: build-base
	cd ee-security && ansible-builder build \
		--tag $(REGISTRY)/ee-security:$(VERSION) \
		--container-runtime $(RUNTIME) \
		--verbosity 2

push-all:
	@for ee in $(EE_DIRS); do \
		echo "Pushing $(REGISTRY)/$${ee}:$(VERSION)"; \
		$(RUNTIME) push $(REGISTRY)/$${ee}:$(VERSION); \
		$(RUNTIME) tag $(REGISTRY)/$${ee}:$(VERSION) $(REGISTRY)/$${ee}:latest; \
		$(RUNTIME) push $(REGISTRY)/$${ee}:latest; \
	done

clean:
	@for ee in $(EE_DIRS); do \
		rm -rf $${ee}/context/; \
	done

verify:
	@for ee in $(EE_DIRS); do \
		echo "=== $${ee} ===" ; \
		$(RUNTIME) run --rm $(REGISTRY)/$${ee}:$(VERSION) ansible-galaxy collection list; \
		echo ""; \
	done

sizes:
	@$(RUNTIME) images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep $(REGISTRY)
```

Usage:

```bash
# Build everything
make all VERSION=2.1.0

# Build just the AWS EE (and its base dependency)
make build-aws VERSION=2.1.0

# Push all images
make push-all VERSION=2.1.0

# Check image sizes
make sizes

# Verify collections in all images
make verify VERSION=2.1.0
```

## CI/CD Pipeline for Multiple EEs

Here is a GitHub Actions workflow that builds all EEs when their definitions change:

```yaml
# .github/workflows/build-ees.yml
name: Build Execution Environments

on:
  push:
    branches: [main]
    paths:
      - 'ee-*/**'
  pull_request:
    paths:
      - 'ee-*/**'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      base: ${{ steps.changes.outputs.base }}
      aws: ${{ steps.changes.outputs.aws }}
      azure: ${{ steps.changes.outputs.azure }}
      network: ${{ steps.changes.outputs.network }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            base:
              - 'ee-base/**'
            aws:
              - 'ee-aws/**'
              - 'ee-base/**'
            azure:
              - 'ee-azure/**'
              - 'ee-base/**'
            network:
              - 'ee-network/**'
              - 'ee-base/**'

  build-base:
    needs: detect-changes
    if: needs.detect-changes.outputs.base == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install ansible-builder
      - run: |
          cd ee-base && ansible-builder build \
            --tag quay.io/myorg/ee-base:${{ github.sha }} \
            --verbosity 2
      - run: |
          echo "${{ secrets.QUAY_TOKEN }}" | \
            docker login quay.io -u "${{ secrets.QUAY_USER }}" --password-stdin
          docker push quay.io/myorg/ee-base:${{ github.sha }}
        if: github.ref == 'refs/heads/main'

  build-aws:
    needs: [detect-changes, build-base]
    if: always() && needs.detect-changes.outputs.aws == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install ansible-builder
      - run: |
          cd ee-aws && ansible-builder build \
            --tag quay.io/myorg/ee-aws:${{ github.sha }} \
            --verbosity 2
      - run: |
          echo "${{ secrets.QUAY_TOKEN }}" | \
            docker login quay.io -u "${{ secrets.QUAY_USER }}" --password-stdin
          docker push quay.io/myorg/ee-aws:${{ github.sha }}
        if: github.ref == 'refs/heads/main'
```

## Version Management Across EEs

Keep versions synchronized across your EE fleet. Use a central version file:

```bash
# version.env - Central version configuration
EE_VERSION=2.1.0
ANSIBLE_CORE_VERSION=">=2.15.0,<2.17.0"
COMMUNITY_GENERAL_VERSION=">=8.0.0,<9.0.0"
```

Reference it in your build scripts:

```bash
#!/bin/bash
# build-all.sh - Build all EEs with synchronized versions
source version.env

for ee_dir in ee-base ee-aws ee-azure ee-network ee-security; do
  echo "Building ${ee_dir} version ${EE_VERSION}"
  cd "${ee_dir}"
  ansible-builder build --tag "quay.io/myorg/${ee_dir}:${EE_VERSION}" --verbosity 2
  cd ..
done
```

## Inventory of EEs

Maintain a catalog of your EEs so teams know which one to use:

```yaml
# ee-catalog.yml - Which EE to use for what
---
execution_environments:
  - name: ee-base
    image: quay.io/myorg/ee-base
    description: "Base EE with community.general and ansible.posix"
    use_for:
      - General Linux server management
      - Basic file and package operations
      - User and group management
    teams: [all]

  - name: ee-aws
    image: quay.io/myorg/ee-aws
    description: "AWS EE with amazon.aws and boto3"
    use_for:
      - EC2 instance management
      - S3 bucket operations
      - IAM policy management
      - VPC and networking
    teams: [cloud-team, devops]

  - name: ee-network
    image: quay.io/myorg/ee-network
    description: "Network EE with Cisco, Arista, and Juniper collections"
    use_for:
      - Router and switch configuration
      - Network device backups
      - VLAN management
    teams: [network-team]
```

## Monitoring and Lifecycle

Set up a process to keep your EEs current:

```bash
#!/bin/bash
# check-updates.sh - Check for collection and package updates

echo "=== Checking for collection updates ==="
for ee_dir in ee-*/; do
  if [ -f "${ee_dir}/requirements.yml" ]; then
    echo "--- ${ee_dir} ---"
    # Parse requirements.yml and check each collection
    python3 -c "
import yaml, urllib.request, json
with open('${ee_dir}/requirements.yml') as f:
    data = yaml.safe_load(f)
for col in data.get('collections', []):
    name = col['name'] if isinstance(col, dict) else col
    ns, cname = name.split('.')[:2]
    try:
        url = f'https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index/{ns}/{cname}/'
        resp = urllib.request.urlopen(url)
        info = json.loads(resp.read())
        print(f'  {name}: current={col.get(\"version\", \"any\")} latest={info[\"highest_version\"][\"version\"]}')
    except:
        print(f'  {name}: could not check')
"
  fi
done
```

## Wrapping Up

Managing multiple Execution Environments is an operations problem, not an Ansible problem. Treat your EE definitions like infrastructure code: store them in version control, build them with CI/CD, version them systematically, and document which teams should use which image. The layered approach (base EE with specialized extensions) reduces duplication and makes updates predictable. And always maintain a catalog so nobody has to guess which image contains the collections they need.
