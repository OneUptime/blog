# How to Build Custom Decision Environments for Event-Driven Ansible on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Event-Driven Ansible, Decision Environments, Containers

Description: Learn how to build custom decision environments for Event-Driven Ansible on RHEL, packaging your rulebooks with the required dependencies and collections.

---

Decision environments (DEs) are container images that include everything needed to run Event-Driven Ansible rulebooks: the ansible-rulebook binary, required collections, Python packages, and Java runtime. Building custom DEs ensures your EDA deployment has all required dependencies.

## Prerequisites

```bash
# Install ansible-builder for creating custom images
pip install ansible-builder

# Ensure podman is available for building container images
sudo dnf install podman -y
```

## Creating the Decision Environment Definition

Create a directory structure for your custom DE.

```bash
mkdir -p my-decision-env
cd my-decision-env
```

Create the main definition file:

```yaml
# decision-environment.yml
---
version: 3

images:
  base_image:
    name: registry.redhat.io/ansible-automation-platform/de-minimal-rhel9:latest

dependencies:
  galaxy:
    collections:
      - name: ansible.eda
        version: ">=1.4.0"
      - name: community.general
      - name: redhat.insights
  python:
    - requests>=2.28.0
    - jmespath
  system:
    - java-17-openjdk-headless [platform:rpm]

additional_build_steps:
  prepend_base:
    - RUN pip3 install --upgrade pip
  append_final:
    - RUN ansible-galaxy collection list
```

## Building the Decision Environment

```bash
# Build the container image
ansible-builder build \
  --file decision-environment.yml \
  --tag my-custom-de:latest \
  --container-runtime podman \
  --verbosity 3

# Verify the image was created
podman images | grep my-custom-de
```

## Testing the Decision Environment

```bash
# Run a rulebook inside the custom DE
ansible-rulebook \
  --rulebook test-rulebook.yml \
  --inventory inventory.yml \
  --decision-env my-custom-de:latest
```

## Pushing to a Registry

```bash
# Tag for your private registry
podman tag my-custom-de:latest \
  registry.example.com/eda/my-custom-de:latest

# Push to the registry
podman push registry.example.com/eda/my-custom-de:latest

# Use with Ansible Automation Platform
# Configure the DE in the EDA Controller UI
```

## Adding Custom Event Source Plugins

If you need custom event sources, include them as a local collection.

```bash
# Create a requirements file with local sources
mkdir -p collections
# Place your custom collection in collections/

# Reference local collections in the definition
```

```yaml
# In decision-environment.yml
dependencies:
  galaxy:
    collections:
      - name: myorg.custom_sources
        source: ./collections/myorg-custom_sources-1.0.0.tar.gz
```

Custom decision environments give you full control over the runtime that executes your EDA rulebooks, ensuring consistent behavior across development and production.
