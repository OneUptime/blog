# How to Define Execution Environment Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Execution Environments, Dependencies, ansible-builder

Description: Learn how to properly define and manage Galaxy collections, Python packages, and system dependencies for Ansible Execution Environments.

---

The whole point of an Execution Environment is to bundle all your dependencies into one portable image. But defining those dependencies correctly takes some thought. Get it wrong and your EE will be bloated with unnecessary packages, missing critical libraries, or failing to build because of conflicting versions. This post covers the three types of dependencies you can include and how to define them properly.

## The Three Dependency Types

Every Execution Environment can include three categories of dependencies:

1. **Galaxy dependencies** - Ansible collections and roles
2. **Python dependencies** - Python packages installed via pip
3. **System dependencies** - OS-level packages installed via the package manager

These are declared in the `execution-environment.yml` file and each points to a separate requirements file:

```yaml
# execution-environment.yml - Dependency file references
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

## Galaxy Dependencies (requirements.yml)

The Galaxy requirements file defines which Ansible collections and roles should be installed. This uses the same format as `ansible-galaxy install`.

A well-structured requirements file:

```yaml
# requirements.yml - Ansible Galaxy dependencies
---
collections:
  # Cloud provider collections
  - name: amazon.aws
    version: ">=7.0.0,<8.0.0"
  - name: google.cloud
    version: ">=1.3.0"
  - name: azure.azcollection
    version: ">=2.1.0"

  # Infrastructure collections
  - name: community.general
    version: ">=8.0.0"
  - name: ansible.posix
    version: ">=1.5.0"
  - name: community.docker
    version: ">=3.4.0"

  # Network collections
  - name: cisco.ios
    version: ">=6.0.0"
  - name: arista.eos
    version: ">=7.0.0"

  # Utility collections
  - name: ansible.utils
    version: ">=3.0.0"
  - name: ansible.netcommon
    version: ">=6.0.0"

roles:
  - name: geerlingguy.docker
    version: "6.1.0"
  - name: geerlingguy.mysql
    version: "4.3.4"
```

### Version Pinning Strategies

There are several approaches to version pinning. Each has trade-offs.

**Exact pinning** gives reproducible builds but requires manual updates:

```yaml
collections:
  - name: community.general
    version: "8.2.0"
```

**Range pinning** allows patch updates while preventing breaking changes:

```yaml
collections:
  - name: community.general
    version: ">=8.0.0,<9.0.0"
```

**Minimum version** ensures you get at least a known-good version:

```yaml
collections:
  - name: community.general
    version: ">=8.0.0"
```

I recommend range pinning for most cases. It gives you bug fixes and security patches automatically while protecting against major version changes that might break your playbooks.

### Installing from Private Sources

You can install collections from sources other than Galaxy:

```yaml
# requirements.yml - Mixed sources
---
collections:
  # From Ansible Galaxy (default)
  - name: community.general
    version: ">=8.0.0"

  # From Automation Hub
  - name: redhat.rhel_system_roles
    source: https://console.redhat.com/api/automation-hub/

  # From a Git repository
  - name: https://github.com/myorg/my-collection.git
    type: git
    version: v1.2.0

  # From a local tarball (must be available during build)
  - name: ./local-collections/myorg-mycollection-1.0.0.tar.gz
    type: file
```

## Python Dependencies (requirements.txt)

The Python requirements file follows the standard pip requirements format. You need to list packages that your collections or playbooks depend on that are not already included in the base image.

A typical requirements file:

```text
# requirements.txt - Python dependencies

# JSON query support (used by json_query filter)
jmespath>=1.0.0

# Network address manipulation
netaddr>=0.8.0

# SSH connectivity
paramiko>=3.0.0

# AWS SDK
boto3>=1.28.0
botocore>=1.31.0

# Azure SDK
azure-identity>=1.14.0
azure-mgmt-compute>=30.0.0
azure-mgmt-network>=25.0.0
azure-mgmt-resource>=23.0.0

# Google Cloud SDK
google-auth>=2.23.0
google-cloud-compute>=1.14.0

# Database clients
psycopg2-binary>=2.9.0
PyMySQL>=1.1.0

# YAML processing
PyYAML>=6.0

# XML parsing
lxml>=4.9.0

# DNS lookups
dnspython>=2.4.0

# Cryptography for vault and SSL
cryptography>=41.0.0
```

### Automatic Dependency Resolution

Here is something important: ansible-builder automatically resolves Python dependencies declared by collections. When a collection includes a `requirements.txt` in its metadata, those packages are merged with yours.

To see what dependencies a collection requires:

```bash
# Check what Python packages a collection needs
ansible-galaxy collection info community.docker --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('metadata', {}).get('dependencies', {}))
"
```

This means you sometimes do not need to list packages in your requirements.txt if the collection already declares them. However, I prefer to be explicit. Relying on transitive dependencies can break when collections update their metadata.

### Handling Conflicting Python Versions

When two collections require incompatible versions of the same Python package, the build will fail. You need to find a version that satisfies both requirements.

```text
# requirements.txt - Resolving conflicts
# If collection A needs requests>=2.28 and collection B needs requests<2.30,
# pin to a version in the overlap:
requests>=2.28.0,<2.30.0
```

Use `pip install --dry-run` to test compatibility before building:

```bash
# Test dependency resolution locally
pip install --dry-run -r requirements.txt
```

## System Dependencies (bindep.txt)

The bindep file declares OS-level packages. It uses the bindep format, which supports platform selectors so you can specify different package names for different distributions.

A comprehensive bindep file:

```text
# bindep.txt - System package dependencies

# Build tools (needed to compile Python packages)
python3-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
python3-dev [platform:debian platform:ubuntu]
gcc [compile]
make [compile]

# SSL/TLS libraries
openssl-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
libssl-dev [platform:debian platform:ubuntu]

# Foreign function interface (needed by cffi/cryptography)
libffi-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
libffi-dev [platform:debian platform:ubuntu]

# XML processing (needed by lxml)
libxml2-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
libxslt-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
libxml2-dev [platform:debian platform:ubuntu]
libxslt1-dev [platform:debian platform:ubuntu]

# PostgreSQL client library
postgresql-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
libpq-dev [platform:debian platform:ubuntu]

# SNMP tools (for network automation)
net-snmp-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
libsnmp-dev [platform:debian platform:ubuntu]

# Kerberos (for AD authentication)
krb5-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
libkrb5-dev [platform:debian platform:ubuntu]

# SSH client
openssh-clients [platform:centos-8 platform:rhel-8 platform:rhel-9]
openssh-client [platform:debian platform:ubuntu]

# General utilities
unzip [platform:dpkg platform:rpm]
git [platform:dpkg platform:rpm]
rsync [platform:dpkg platform:rpm]
sshpass [platform:dpkg platform:rpm]
```

### Platform Selectors

The platform selectors in bindep map to the operating system of the base image. Since most EE base images are RHEL-based, you primarily need the `platform:rhel-*` selectors:

```text
# Common platform selectors
# platform:centos-8 - CentOS 8
# platform:rhel-8 - RHEL 8
# platform:rhel-9 - RHEL 9
# platform:fedora - Fedora
# platform:debian - Debian
# platform:ubuntu - Ubuntu
# platform:rpm - Any RPM-based distro
# platform:dpkg - Any dpkg-based distro
```

The `[compile]` selector means the package is only needed during the build phase, not in the final image. ansible-builder uses this to keep the final image smaller.

## Inline Dependencies

For simple EEs, you can define dependencies directly in the execution-environment.yml without creating separate files:

```yaml
# execution-environment.yml - Inline dependencies
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

dependencies:
  galaxy:
    collections:
      - name: community.general
        version: ">=8.0.0"
      - name: ansible.posix
  python:
    - jmespath>=1.0.0
    - netaddr>=0.8.0
  system:
    - gcc [compile]
    - python3-devel [platform:rhel-8 platform:rhel-9]
```

This is convenient for small EEs but gets unwieldy as the dependency list grows.

## Pinning ansible-core and ansible-runner

You can also control which versions of ansible-core and ansible-runner are installed in your EE:

```yaml
# execution-environment.yml - Pinning core versions
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

This is important for reproducibility. Without pinning, the version of ansible-core in your EE depends on what is in the base image, which can change when the image is updated.

## Validating Dependencies Before Building

Before running a full build, validate your dependency files:

```bash
# Validate the Galaxy requirements
ansible-galaxy collection install -r requirements.yml --dry-run 2>&1 || echo "Galaxy validation failed"

# Validate Python requirements
pip install --dry-run -r requirements.txt 2>&1 || echo "Python validation failed"

# Validate the EE definition
ansible-builder create --file execution-environment.yml
echo "Definition is valid if no errors above"
```

## Wrapping Up

Defining dependencies correctly is the foundation of a reliable Execution Environment. Be explicit about what you need, use version ranges to balance stability with updates, and test your dependency files before running full builds. The time you spend getting your requirements files right pays off every time someone on your team builds the image and it just works without surprises.
