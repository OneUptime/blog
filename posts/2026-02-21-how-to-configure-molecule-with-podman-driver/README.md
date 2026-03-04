# How to Configure Molecule with Podman Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Podman, Testing, Containers

Description: Configure Molecule to use Podman for rootless, daemonless Ansible role testing with container-based test instances and systemd support.

---

Podman is gaining traction as a Docker alternative, particularly in enterprise environments where running a privileged daemon is a security concern. The Molecule Podman driver lets you test Ansible roles using Podman containers instead of Docker. Since Podman can run rootless (without root privileges), you can run Molecule tests in environments where Docker is not available or not permitted.

## Why Podman for Molecule

There are a few specific reasons to choose Podman over Docker for Molecule testing:

- **No daemon required.** Podman runs containers directly, without a background service. This simplifies setup and reduces the attack surface.
- **Rootless by default.** You do not need to add your user to a docker group or run with sudo.
- **SELinux-friendly.** Podman handles SELinux contexts natively, which matters on RHEL, CentOS, and Fedora.
- **Kubernetes compatibility.** Podman supports pod concepts natively, making it a natural fit for testing Kubernetes-related roles.
- **Available in RHEL by default.** On Red Hat systems, Podman is pre-installed while Docker requires extra repositories.

## Prerequisites

Install Podman and the Molecule Podman driver.

```bash
# Install Podman (Fedora/RHEL/Rocky)
sudo dnf install -y podman

# Install Podman (Ubuntu/Debian)
sudo apt-get install -y podman

# Install Molecule with Podman driver
pip install molecule molecule-plugins[podman]

# Verify installations
podman --version
molecule drivers
```

Make sure Podman works in rootless mode.

```bash
# Test rootless container execution
podman run --rm docker.io/library/alpine:latest cat /etc/os-release
```

## Basic Podman Configuration

A minimal Molecule setup with Podman.

```yaml
# molecule/default/molecule.yml - basic Podman configuration
driver:
  name: podman

platforms:
  - name: instance
    image: "docker.io/geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:ro
    tmpfs:
      - /run
      - /tmp
    command: "/lib/systemd/systemd"

provisioner:
  name: ansible

verifier:
  name: ansible
```

Note the differences from Docker configuration: the image path uses the full registry URL (`docker.io/...`), and on some systems the cgroup mount needs to be read-only.

## Systemd Support in Podman Containers

Getting systemd to work in Podman containers requires specific configuration, and it varies slightly depending on whether you use cgroup v1 or v2.

### For cgroup v2 Systems (most modern Linux distros)

```yaml
# molecule/default/molecule.yml - systemd with cgroup v2
driver:
  name: podman

platforms:
  - name: instance
    image: "docker.io/geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: false  # Podman can do systemd without full privilege
    command: "/lib/systemd/systemd"
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    tmpfs:
      - /run
      - /tmp
    environment:
      container: podman
```

### For cgroup v1 Systems

```yaml
# molecule/default/molecule.yml - systemd with cgroup v1
platforms:
  - name: instance
    image: "docker.io/geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    command: "/lib/systemd/systemd"
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:ro
    tmpfs:
      - /run
      - /run/lock
      - /tmp
```

Check which cgroup version your system uses.

```bash
# Check cgroup version
stat -fc %T /sys/fs/cgroup/
# "cgroup2fs" means v2, "tmpfs" means v1
```

## Multi-Platform Testing

Test across multiple distributions.

```yaml
# molecule/default/molecule.yml - multi-platform Podman setup
driver:
  name: podman

platforms:
  - name: ubuntu2204
    image: "docker.io/geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    command: "/lib/systemd/systemd"
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    tmpfs:
      - /run
      - /tmp

  - name: rocky9
    image: "docker.io/geerlingguy/docker-rockylinux9-ansible:latest"
    pre_build_image: true
    privileged: true
    command: "/usr/sbin/init"
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    tmpfs:
      - /run
      - /tmp

  - name: fedora39
    image: "docker.io/geerlingguy/docker-fedora39-ansible:latest"
    pre_build_image: true
    privileged: true
    command: "/usr/sbin/init"
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    tmpfs:
      - /run
      - /tmp

provisioner:
  name: ansible
  inventory:
    host_vars:
      ubuntu2204:
        ansible_python_interpreter: /usr/bin/python3
      rocky9:
        ansible_python_interpreter: /usr/bin/python3
      fedora39:
        ansible_python_interpreter: /usr/bin/python3
```

## Container Networking

Configure custom networks for multi-container scenarios.

```yaml
# molecule/default/molecule.yml - containers with custom networking
driver:
  name: podman

platforms:
  - name: web
    image: "docker.io/geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    command: "/lib/systemd/systemd"
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    tmpfs:
      - /run
      - /tmp
    network: molecule-testnet

  - name: db
    image: "docker.io/geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    command: "/lib/systemd/systemd"
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    tmpfs:
      - /run
      - /tmp
    network: molecule-testnet
```

Create the network in a prepare step.

```yaml
# molecule/default/create.yml (or use prepare.yml)
- name: Create Podman network
  hosts: localhost
  tasks:
    - name: Create test network
      ansible.builtin.command:
        cmd: podman network create molecule-testnet
      ignore_errors: true  # ok if it already exists
```

## Rootless-Specific Configuration

When running Molecule as a non-root user, there are some adjustments to make.

```yaml
# molecule/default/molecule.yml - rootless Podman configuration
driver:
  name: podman

platforms:
  - name: instance
    image: "docker.io/geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: false  # not needed for rootless
    command: "/lib/systemd/systemd"
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    tmpfs:
      - /run
      - /tmp
    security_opts:
      - "label=disable"  # disable SELinux label for rootless

provisioner:
  name: ansible
  connection_options:
    ansible_connection: podman
  config_options:
    defaults:
      interpreter_python: auto_silent
```

## Using Podman Pods

Podman pods let you group containers that share a network namespace, just like Kubernetes pods. This is useful for testing sidecar patterns.

```yaml
# molecule/pod-scenario/molecule.yml - using Podman pods
driver:
  name: podman

platforms:
  - name: app-pod
    image: "docker.io/geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    command: "/lib/systemd/systemd"
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    tmpfs:
      - /run
      - /tmp
    published_ports:
      - "8080:8080"
      - "9090:9090"
```

## Registry Authentication

If you use private container registries, configure authentication.

```bash
# Login to a private registry before running Molecule
podman login registry.example.com -u myuser -p mypassword

# Or use a credentials file
podman login --authfile ~/.config/containers/auth.json registry.example.com
```

Then reference private images in your configuration.

```yaml
# molecule/default/molecule.yml - private registry image
platforms:
  - name: instance
    image: "registry.example.com/ansible-test/ubuntu2204:latest"
    pre_build_image: true
    registry:
      url: "registry.example.com"
      credentials:
        username: "{{ lookup('env', 'REGISTRY_USER') }}"
        password: "{{ lookup('env', 'REGISTRY_PASS') }}"
```

## Performance Tips for Podman

```yaml
# molecule/default/molecule.yml - performance-optimized Podman config
driver:
  name: podman

platforms:
  - name: instance
    image: "docker.io/geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true  # always pre-build, never build from Dockerfile in test
    privileged: true
    command: "/lib/systemd/systemd"
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    tmpfs:
      - /run
      - /tmp

provisioner:
  name: ansible
  config_options:
    defaults:
      gathering: smart
      fact_caching: jsonfile
      fact_caching_connection: /tmp/molecule-facts
      fact_caching_timeout: 3600
    ssh_connection:
      pipelining: true
  env:
    ANSIBLE_PIPELINING: "true"
    ANSIBLE_FORCE_COLOR: "true"
```

## Migrating from Docker to Podman Driver

If you are switching from Docker to Podman, here is what changes in your `molecule.yml`.

```yaml
# Docker configuration (before)
driver:
  name: docker
platforms:
  - name: instance
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    cgroupns_mode: host
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw

# Podman configuration (after)
driver:
  name: podman
platforms:
  - name: instance
    image: "docker.io/geerlingguy/docker-ubuntu2204-ansible:latest"  # full registry path
    pre_build_image: true
    privileged: true
    command: "/lib/systemd/systemd"  # explicit init command
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    tmpfs:
      - /run
      - /tmp
```

Key differences to note:

- Image paths need the full registry prefix (`docker.io/`)
- `cgroupns_mode` is not used with Podman
- The systemd `command` often needs to be explicit
- Network configuration syntax differs slightly

## Troubleshooting

1. **"Error: short-name resolution enforced"** - Podman requires full image paths. Change `ubuntu:22.04` to `docker.io/library/ubuntu:22.04`.

2. **Systemd fails to start.** Check your cgroup version and adjust the configuration accordingly. Also verify that the container image actually has systemd installed.

3. **Connection refused on Ansible connection.** Make sure `ansible_connection: podman` is set in the provisioner options.

4. **SELinux denials.** Add `security_opts: ["label=disable"]` to the platform configuration, or make sure the `:Z` suffix is on volume mounts.

The Podman driver for Molecule gives you container-based testing without the Docker daemon, which is exactly what you need in locked-down environments or on systems where Docker is simply not an option.
