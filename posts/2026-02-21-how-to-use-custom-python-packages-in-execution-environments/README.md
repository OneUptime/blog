# How to Use Custom Python Packages in Execution Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Execution Environments, Python, Ansible-builder

Description: Include custom and third-party Python packages in Ansible Execution Environments for filters, modules, and custom plugins.

---

Ansible runs on Python, and many collections, filters, and custom modules depend on specific Python packages that are not included in the base Execution Environment image. Whether you need boto3 for AWS, the Azure SDK, psycopg2 for PostgreSQL, or your own internal Python library, you need to get those packages into your EE. This post covers every approach for including custom Python packages, from simple pip installs to private package repositories and locally built wheels.

## Adding Python Packages via requirements.txt

The standard way to include Python packages in your EE is through the `requirements.txt` file referenced in your execution-environment.yml.

Start with the EE definition:

```yaml
# execution-environment.yml

---
version: 3

images:
  base_image:
    name: docker.io/redhat/ubi9:latest

dependencies:
  ansible_core:
    package_pip: ansible-core
  ansible_runner:
    package_pip: ansible-runner
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

Then create your requirements file:

```text
# requirements.txt - Python packages for the EE

# AWS automation
boto3>=1.28.0
botocore>=1.31.0

# Azure automation
azure-identity>=1.14.0
azure-mgmt-compute>=30.0.0

# Data manipulation
jmespath>=1.0.0
netaddr>=0.8.0
xmltodict>=0.13.0

# HTTP requests
requests>=2.31.0
urllib3>=2.0.0

# Template helpers
Jinja2>=3.1.0
```

Build the EE:

```bash
# Build the image with Python packages
ansible-builder build --tag my-ee:1.0 --verbosity 2
```

## Packages That Need Compilation

Some Python packages include native extensions that need to be compiled during installation. These packages require system-level build tools in your EE.

For example, source builds of `cryptography`, `lxml`, and `psycopg2` need compilers and development libraries. `cryptography` also needs a Rust compiler when it is built from source.

Add the build dependencies to bindep.txt:

```text
# bindep.txt - System packages needed for compilation
gcc [compile]
make [compile]
rust [compile platform:rhel-8 platform:rhel-9]
cargo [compile platform:rhel-8 platform:rhel-9]
python3-devel [compile platform:rhel-8 platform:rhel-9]
libffi-devel [compile platform:rhel-8 platform:rhel-9]
openssl-devel [compile platform:rhel-8 platform:rhel-9]
libxml2-devel [compile platform:rhel-8 platform:rhel-9]
libxslt-devel [compile platform:rhel-8 platform:rhel-9]
postgresql-devel [compile platform:rhel-8 platform:rhel-9]
```

The `[compile]` tag tells ansible-builder that these packages are only needed during the build, not in the final image. This keeps the final image smaller since compiler toolchains are not included.

Now your requirements.txt can include packages that need compilation:

```text
# requirements.txt - Packages requiring compilation
cryptography>=41.0.0
lxml>=4.9.0
psycopg2>=2.9.0
PyYAML>=6.0
cffi>=1.15.0
```

## Using Pre-built Binary Wheels

To avoid compilation entirely (which speeds up builds), use pre-built binary packages where available:

```text
# requirements.txt - Using binary-only packages
# Use the -binary variant when available
psycopg2-binary>=2.9.0

# Specify binary-only installation
--only-binary=:all:
cryptography>=41.0.0
```

Note that psycopg2-binary is a separate package from psycopg2. The binary version bundles its own PostgreSQL client library, so you do not need postgresql-devel in bindep.txt.

## Installing Packages from Private PyPI Repositories

Many organizations host internal Python packages on private PyPI servers (like Nexus, Artifactory, or devpi). You can configure pip to use these during the EE build.

Create a pip configuration file:

```ini
# files/pip.conf - Private PyPI configuration
[global]
index-url = https://pypi.example.com/simple/
extra-index-url = https://pypi.org/simple/
trusted-host = pypi.example.com
```

Reference it in your EE definition:

```yaml
# execution-environment.yml - With private PyPI
---
version: 3

images:
  base_image:
    name: docker.io/redhat/ubi9:latest

additional_build_files:
  - src: files/pip.conf
    dest: configs

additional_build_steps:
  prepend_builder:
    - COPY _build/configs/pip.conf /etc/pip.conf

dependencies:
  ansible_core:
    package_pip: ansible-core
  ansible_runner:
    package_pip: ansible-runner
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

Your requirements.txt can now reference packages from your private repository:

```text
# requirements.txt - Mix of public and private packages
# From PyPI (public)
boto3>=1.28.0
requests>=2.31.0

# From your private repository
mycompany-ansible-utils>=1.2.0
mycompany-cloud-helpers>=3.0.0
```

## Installing Packages from Git Repositories

You can install Python packages directly from Git repositories. This is useful for development builds or for packages that are not published to any PyPI server.

```text
# requirements.txt - Installing from Git
# From a public GitHub repo (specific tag)
git+https://github.com/myorg/ansible-helpers.git@v2.1.0

# From a specific branch
git+https://github.com/myorg/ansible-helpers.git@develop

# From a specific commit
git+https://github.com/myorg/ansible-helpers.git@abc123def456
```

For private repositories that need SSH authentication, do not copy private keys into the build context. Pass the key as a build secret and install the private package in a build step instead of listing it in requirements.txt:

```yaml
# execution-environment.yml - With SSH key as a build secret
---
version: 3

images:
  base_image:
    name: docker.io/redhat/ubi9:latest

additional_build_steps:
  append_final:
    - RUN --mount=type=secret,id=deploy_key mkdir -p /root/.ssh && cp /run/secrets/deploy_key /root/.ssh/id_rsa && chmod 600 /root/.ssh/id_rsa && ssh-keyscan github.com >> /root/.ssh/known_hosts && GIT_SSH_COMMAND="ssh -i /root/.ssh/id_rsa -o UserKnownHostsFile=/root/.ssh/known_hosts" $PYCMD -m pip install "git+ssh://git@github.com/myorg/private-lib.git@v1.0.0" && rm -f /root/.ssh/id_rsa

dependencies:
  ansible_core:
    package_pip: ansible-core
  ansible_runner:
    package_pip: ansible-runner
  galaxy: requirements.yml
  python: requirements.txt
  system:
    - git
```

Build with the secret passed to the container runtime:

```bash
ansible-builder build --tag my-ee:1.0 --verbosity 2 --extra-build-cli-args="--secret id=deploy_key,src=files/deploy_key"
```

## Including Local Python Packages

If you have Python packages that exist only on your local filesystem (not published anywhere), you can include them in the build.

Place the package wheel or source distribution in your project:

```bash
# Project structure with a local package
my-ee/
  execution-environment.yml
  requirements.yml
  requirements.txt
  bindep.txt
  packages/
    mycompany_helpers-1.0.0-py3-none-any.whl
    internal_filters-2.3.0.tar.gz
```

Reference them in the EE definition:

```yaml
# execution-environment.yml - With local packages
---
version: 3

images:
  base_image:
    name: docker.io/redhat/ubi9:latest

additional_build_files:
  - src: packages/
    dest: packages

additional_build_steps:
  append_final:
    - COPY _build/packages /tmp/packages
    - RUN $PYCMD -m pip install /tmp/packages/*.whl /tmp/packages/*.tar.gz && rm -rf /tmp/packages

dependencies:
  ansible_core:
    package_pip: ansible-core
  ansible_runner:
    package_pip: ansible-runner
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

## Creating Custom Ansible Filters with Python

A common reason to include custom Python packages is to provide custom Jinja2 filters for your playbooks. Here is an example of a custom filter plugin that uses a Python package.

The Python package (installed via requirements.txt):

```text
# requirements.txt
netaddr>=0.8.0
```

The custom filter plugin in your collection or role:

```python
# filter_plugins/network_filters.py
"""Custom network filter plugins using netaddr."""
from netaddr import IPAddress, IPNetwork


class FilterModule:
    """Custom filters for network operations."""

    def filters(self):
        return {
            'ip_in_subnet': self.ip_in_subnet,
            'next_usable_ip': self.next_usable_ip,
            'subnet_size': self.subnet_size,
        }

    @staticmethod
    def ip_in_subnet(ip, subnet):
        """Check if an IP address is in a given subnet."""
        return IPAddress(ip) in IPNetwork(subnet)

    @staticmethod
    def next_usable_ip(subnet):
        """Get the next usable IP address in a subnet."""
        network = IPNetwork(subnet)
        first_host = next(network.iter_hosts(), None)
        return str(first_host) if first_host is not None else None

    @staticmethod
    def subnet_size(subnet):
        """Get the number of usable hosts in a subnet."""
        return sum(1 for _ in IPNetwork(subnet).iter_hosts())
```

Use these filters in a playbook:

```yaml
---
# network-setup.yml - Using custom filters
- name: Configure network interfaces
  hosts: all
  tasks:
    - name: Check if host IP is in the management subnet
      ansible.builtin.debug:
        msg: "{{ ansible_default_ipv4.address | ip_in_subnet('10.0.0.0/8') }}"

    - name: Get the first usable IP in the subnet
      ansible.builtin.debug:
        msg: "First IP: {{ '192.168.1.0/24' | next_usable_ip }}"

    - name: Show subnet capacity
      ansible.builtin.debug:
        msg: "Subnet has {{ '10.0.0.0/16' | subnet_size }} usable addresses"
```

## Verifying Python Packages in the Built Image

After building your EE, verify that all expected packages are present:

```bash
# List all installed Python packages
podman run --rm my-ee:1.0 python3 -m pip list

# Check for a specific package
podman run --rm my-ee:1.0 python3 -c "import boto3; print(boto3.__version__)"

# Check for a custom package
podman run --rm my-ee:1.0 python3 -c "import mycompany_helpers; print('OK')"

# Run pip check to find broken dependencies
podman run --rm my-ee:1.0 python3 -m pip check
```

The `pip check` command is especially valuable. It verifies that all installed packages have compatible dependency versions. Run this as part of your build pipeline.

## Troubleshooting Python Package Issues

When Python packages fail to install during the build, here are the common fixes:

**Missing system libraries**: Add the required -devel packages to bindep.txt. The error message usually tells you which header file is missing.

**Version conflicts**: Use `pip install --dry-run -r requirements.txt` locally to test resolution before building.

**Network issues**: If builds fail pulling packages, consider using a local PyPI mirror or caching proxy.

```bash
# Debug a failing build with max verbosity
ansible-builder build --tag debug-ee:latest --verbosity 3 2>&1 | tee build.log

# Search for pip errors in the log
grep -i "error\|failed\|could not" build.log
```

## Wrapping Up

Python packages are the backbone of most Ansible modules, filters, and plugins. Getting them into your Execution Environment correctly means understanding the three paths (PyPI, Git, local), handling compilation dependencies, and verifying the result. Start with your requirements.txt, add system build dependencies as needed, and always run `pip check` on the final image to catch version conflicts before they bite you in production.
