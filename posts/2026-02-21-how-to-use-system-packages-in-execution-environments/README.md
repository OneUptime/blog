# How to Use System Packages in Execution Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Execution Environments, System Packages, bindep

Description: Add OS-level system packages to Ansible Execution Environments using bindep with platform selectors and build-time dependencies.

---

Some Ansible modules and Python libraries need OS-level packages to work. For example, the `lxml` Python package needs `libxml2-devel` to compile. Network automation tools might need SNMP libraries. Database modules often need client libraries. These system packages must be present in your Execution Environment, and the way to get them there is through bindep. This post covers how to use bindep effectively for EE builds.

## What Is bindep?

bindep (Binary Dependencies) is a tool that describes binary dependencies of a project. In the context of Execution Environments, it tells ansible-builder which OS packages to install in the container image.

The configuration lives in a file called `bindep.txt` referenced from your EE definition:

```yaml
# execution-environment.yml
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

## Basic bindep Syntax

Each line in `bindep.txt` specifies a package name followed by optional selectors in square brackets:

```text
# bindep.txt - Basic format
# package-name [selector1 selector2]

# Always install this package
gcc [compile]

# Install on RHEL-based systems
python3-devel [platform:rhel-8 platform:rhel-9]

# Install on Debian-based systems
python3-dev [platform:debian platform:ubuntu]
```

A line without selectors means the package is always installed:

```text
# bindep.txt - Always installed
rsync
sshpass
git
```

## Platform Selectors

Platform selectors target specific operating systems. Since most EE base images are RHEL-based (UBI 8 or UBI 9), the RHEL selectors are the most commonly used.

Here are the available platform selectors:

```text
# bindep.txt - Platform selector reference

# RHEL and CentOS
package-rhel8 [platform:rhel-8]
package-rhel9 [platform:rhel-9]
package-centos8 [platform:centos-8]
package-centos9 [platform:centos-stream-9]

# Fedora
package-fedora [platform:fedora]

# Generic RPM-based
package-rpm [platform:rpm]

# Debian and Ubuntu
package-debian [platform:debian]
package-ubuntu [platform:ubuntu]
package-ubuntu-jammy [platform:ubuntu-jammy]

# Generic dpkg-based
package-dpkg [platform:dpkg]
```

You can combine selectors. A package is installed if any of its selectors match:

```text
# Install on any RHEL or CentOS 8+
python3-devel [platform:rhel-8 platform:rhel-9 platform:centos-8]
```

## The compile Selector

The `[compile]` selector has special meaning in ansible-builder. Packages tagged with `[compile]` are installed during the builder stage but are not included in the final image. This keeps the final image smaller.

```text
# bindep.txt - Compile-time vs runtime packages

# These are only needed to build Python packages (not in final image)
gcc [compile]
make [compile]
python3-devel [compile platform:rhel-8 platform:rhel-9]
libffi-devel [compile platform:rhel-8 platform:rhel-9]
openssl-devel [compile platform:rhel-8 platform:rhel-9]

# These are needed at runtime (included in final image)
openssh-clients [platform:rhel-8 platform:rhel-9]
sshpass [platform:rhel-8 platform:rhel-9]
rsync [platform:rhel-8 platform:rhel-9]
```

## Common System Dependencies

Here is a comprehensive bindep file covering the most common scenarios:

```text
# bindep.txt - Comprehensive system dependencies

# === Build Tools (compile-time only) ===
gcc [compile]
gcc-c++ [compile platform:rhel-8 platform:rhel-9]
make [compile]
redhat-rpm-config [compile platform:rhel-8 platform:rhel-9]

# === Python Development Headers ===
python3-devel [compile platform:rhel-8 platform:rhel-9]
python3-dev [compile platform:debian platform:ubuntu]

# === Cryptography and SSL ===
openssl-devel [compile platform:rhel-8 platform:rhel-9]
libssl-dev [compile platform:debian platform:ubuntu]
libffi-devel [compile platform:rhel-8 platform:rhel-9]
libffi-dev [compile platform:debian platform:ubuntu]

# === XML Processing ===
libxml2-devel [compile platform:rhel-8 platform:rhel-9]
libxslt-devel [compile platform:rhel-8 platform:rhel-9]
libxml2-dev [compile platform:debian platform:ubuntu]
libxslt1-dev [compile platform:debian platform:ubuntu]

# === Database Client Libraries ===
# PostgreSQL
postgresql-devel [compile platform:rhel-8 platform:rhel-9]
libpq-dev [compile platform:debian platform:ubuntu]
# MySQL/MariaDB
mariadb-devel [compile platform:rhel-8 platform:rhel-9]
libmariadb-dev [compile platform:debian platform:ubuntu]

# === Kerberos (for AD integration) ===
krb5-devel [compile platform:rhel-8 platform:rhel-9]
krb5-libs [platform:rhel-8 platform:rhel-9]
libkrb5-dev [compile platform:debian platform:ubuntu]

# === SSH and Remote Access ===
openssh-clients [platform:rhel-8 platform:rhel-9]
openssh-client [platform:debian platform:ubuntu]
sshpass [platform:rhel-8 platform:rhel-9 platform:debian platform:ubuntu]

# === General Utilities ===
rsync [platform:rpm platform:dpkg]
unzip [platform:rpm platform:dpkg]
git [platform:rpm platform:dpkg]
wget [platform:rpm platform:dpkg]
jq [platform:rpm platform:dpkg]

# === SNMP (for network automation) ===
net-snmp-libs [platform:rhel-8 platform:rhel-9]
net-snmp-devel [compile platform:rhel-8 platform:rhel-9]
libsnmp-dev [compile platform:debian platform:ubuntu]
snmp [platform:debian platform:ubuntu]

# === LDAP Client Libraries ===
openldap-devel [compile platform:rhel-8 platform:rhel-9]
openldap-clients [platform:rhel-8 platform:rhel-9]
libldap-dev [compile platform:debian platform:ubuntu]
ldap-utils [platform:debian platform:ubuntu]
```

## Adding Custom RPM Repositories

Sometimes you need packages from repositories that are not enabled by default in the base image. You can add repository configurations through build steps.

```yaml
# execution-environment.yml - With custom RPM repositories
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

additional_build_files:
  - src: files/custom-repo.repo
    dest: repos

additional_build_steps:
  prepend_base:
    - COPY _build/repos/custom-repo.repo /etc/yum.repos.d/
    - RUN dnf makecache

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

The repository file:

```ini
# files/custom-repo.repo
[custom-tools]
name=Custom Tools Repository
baseurl=https://rpm.example.com/el$releasever/$basearch/
enabled=1
gpgcheck=0
```

Now your bindep.txt can reference packages from this repository:

```text
# bindep.txt - Including packages from custom repo
custom-monitoring-agent [platform:rhel-8 platform:rhel-9]
custom-cli-tools [platform:rhel-8 platform:rhel-9]
```

## Installing System Packages via Build Steps

For cases where bindep does not provide enough flexibility, you can install packages directly in the build steps:

```yaml
# execution-environment.yml - Direct package installation
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

additional_build_steps:
  prepend_base:
    # Enable a specific module stream
    - RUN dnf module enable -y nodejs:18
    - RUN dnf install -y nodejs npm
  append_final:
    # Install packages that need special handling
    - RUN dnf install -y https://rpm.example.com/special-tool-1.0.rpm
    # Clean up to reduce image size
    - RUN dnf clean all && rm -rf /var/cache/dnf

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

## Keeping the Image Size Down

System packages can significantly increase your image size. Here are techniques to keep it manageable.

Use compile selectors for build-only packages:

```text
# bindep.txt - Minimize runtime packages
# These add ~200MB but are not in the final image
gcc [compile]
gcc-c++ [compile platform:rhel-9]
python3-devel [compile platform:rhel-9]

# These add ~5MB and ARE in the final image
openssh-clients [platform:rhel-9]
```

Clean up package caches in build steps:

```yaml
additional_build_steps:
  append_final:
    - RUN dnf clean all && rm -rf /var/cache/dnf
    - RUN rm -rf /tmp/* /var/tmp/*
```

Check image size before and after adding packages:

```bash
# Check image size
podman images my-ee

# See layer sizes
podman history my-ee:1.0

# Compare two versions
podman images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | grep my-ee
```

## Verifying System Packages

After building, verify that the packages you need are actually in the image:

```bash
# Check if a specific package is installed
podman run --rm my-ee:1.0 rpm -q openssh-clients

# List all installed RPM packages
podman run --rm my-ee:1.0 rpm -qa | sort

# Check if a specific binary is available
podman run --rm my-ee:1.0 which rsync

# Verify shared libraries are available
podman run --rm my-ee:1.0 ldd /usr/bin/python3
```

Create a verification playbook:

```yaml
---
# verify-system-packages.yml
- name: Verify system packages in EE
  hosts: localhost
  connection: local
  gather_facts: false
  tasks:
    - name: Check for required binaries
      ansible.builtin.command: "which {{ item }}"
      loop:
        - rsync
        - sshpass
        - git
        - jq
      register: binary_checks
      changed_when: false

    - name: Show binary locations
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ item.stdout }}"
      loop: "{{ binary_checks.results }}"
      loop_control:
        label: "{{ item.item }}"
```

## Troubleshooting Package Installation

When packages fail to install during the build, check these things:

```bash
# See what packages are available in the base image repos
podman run --rm quay.io/ansible/ansible-runner:latest dnf list available | grep python3

# Search for a package by name
podman run --rm quay.io/ansible/ansible-runner:latest dnf search libxml2

# Check which repo provides a package
podman run --rm quay.io/ansible/ansible-runner:latest dnf provides "*/libxml2.so"

# Check the OS version of the base image
podman run --rm quay.io/ansible/ansible-runner:latest cat /etc/os-release
```

## Wrapping Up

System packages are the foundation that Python libraries and Ansible modules build on. Use bindep.txt for declarative package management, leverage the `[compile]` selector to keep your final image lean, and always verify that critical packages made it into the built image. Most build failures related to system packages come down to wrong package names (they differ between RHEL and Debian) or missing development headers, so keep the platform selector reference handy and test your bindep file against the actual base image before running a full build.
