# How to Set Up Ansible Execution Environments for RHEL Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Execution Environments, Containers, Automation, Linux

Description: Build custom Ansible Execution Environments on RHEL using ansible-builder to create portable, containerized automation runtimes with all dependencies included.

---

Ansible Execution Environments (EEs) are container images that package Ansible, Python dependencies, and collections together. This eliminates dependency conflicts and ensures consistent automation across different control nodes.

## Installing ansible-builder

Install the tools needed to build EEs:

```bash
# Install ansible-builder and podman
sudo dnf install -y ansible-builder podman

# Verify installation
ansible-builder --version
```

## Creating an Execution Environment Definition

Create the definition files for your custom EE:

```bash
# Create a project directory
mkdir -p ~/custom-ee && cd ~/custom-ee
```

Create the execution environment definition file:

```yaml
# execution-environment.yml
---
version: 3

images:
  base_image:
    name: registry.redhat.io/ansible-automation-platform-24/ee-minimal-rhel9:latest

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt

additional_build_steps:
  append_final:
    - RUN microdnf install -y openssh-clients
```

Define the Ansible collection dependencies:

```yaml
# requirements.yml
---
collections:
  - name: ansible.posix
  - name: community.general
  - name: redhat.rhel_system_roles
```

Define Python package dependencies:

```text
# requirements.txt
jmespath>=1.0
netaddr>=0.8
```

Define system package dependencies:

```text
# bindep.txt
gcc [compile]
python3-devel [compile]
```

## Building the Execution Environment

Build the container image:

```bash
# Build the EE image using podman
ansible-builder build \
  --tag my-rhel-ee:1.0 \
  --container-runtime podman \
  --verbosity 3

# Verify the image was created
podman images | grep my-rhel-ee
```

## Using the Execution Environment

Run a playbook using the custom EE with ansible-navigator:

```bash
# Install ansible-navigator
sudo dnf install -y ansible-navigator

# Run a playbook inside the EE
ansible-navigator run site.yml \
  --eei my-rhel-ee:1.0 \
  --mode stdout \
  -i inventory.ini
```

You can push your EE to a registry for use across your team:

```bash
# Tag and push to a private registry
podman tag my-rhel-ee:1.0 registry.example.com/ee/my-rhel-ee:1.0
podman push registry.example.com/ee/my-rhel-ee:1.0
```
