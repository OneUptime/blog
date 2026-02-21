# How to Use ansible-builder to Create Execution Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-builder, Execution Environments, Containers

Description: Master ansible-builder to create custom Ansible Execution Environments with collections, Python packages, and system dependencies.

---

ansible-builder is the command-line tool that takes an Execution Environment definition and turns it into a container image. It handles the messy work of resolving dependencies, generating a Containerfile, and building the image. This post goes deep into how ansible-builder works, its options, and how to use it effectively for real-world scenarios.

## Installing ansible-builder

Install ansible-builder from PyPI:

```bash
# Install ansible-builder
pip install ansible-builder

# Verify the installation
ansible-builder --version
```

You also need a container runtime. ansible-builder supports both Podman and Docker. It defaults to Podman but will fall back to Docker if Podman is not available.

```bash
# Check for a container runtime
podman --version 2>/dev/null || docker --version
```

## The Build Process Explained

When you run `ansible-builder build`, it goes through these steps:

1. Reads your `execution-environment.yml` definition
2. Resolves collection dependencies (including transitive dependencies)
3. Generates a Containerfile in a `context/` directory
4. Copies dependency files into the build context
5. Runs the container build using Podman or Docker

Understanding these steps helps when troubleshooting build failures.

## The Definition File in Detail

The `execution-environment.yml` file is the central piece. Let us break down every option available in version 3 of the format.

```yaml
# execution-environment.yml - Full featured definition
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest
    signature_original_name: quay.io/ansible/ansible-runner:latest

build_arg_defaults:
  ANSIBLE_GALAXY_CLI_COLLECTION_OPTS: "--timeout 120"
  ANSIBLE_GALAXY_CLI_ROLE_OPTS: "--timeout 120"
  PKGMGR_PRESERVE_CACHE: "always"

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
  ansible_core:
    package_pip: ansible-core>=2.15.0,<2.17.0
  ansible_runner:
    package_pip: ansible-runner>=2.3.0

additional_build_files:
  - src: files/ansible.cfg
    dest: configs
  - src: files/custom-certs/
    dest: certs

additional_build_steps:
  prepend_base:
    - RUN whoami
  prepend_galaxy:
    - COPY _build/configs/ansible.cfg /etc/ansible/ansible.cfg
  prepend_builder:
    - RUN pip install --upgrade pip
  prepend_final:
    - COPY _build/certs/ /etc/pki/ca-trust/source/anchors/
    - RUN update-ca-trust
  append_final:
    - RUN chmod -R 755 /usr/share/ansible
    - LABEL version="1.0"
    - LABEL maintainer="devops@example.com"
```

Let me walk through each section.

The `images` section specifies the base image. For most use cases, the official `ansible-runner` image works well. You can also use `creator-ee` or your own custom base.

The `build_arg_defaults` section sets defaults for build arguments. The Galaxy timeout is useful when pulling large collections over slow connections. The `PKGMGR_PRESERVE_CACHE` option keeps the package manager cache in the image, which speeds up rebuilds but increases image size.

The `dependencies` section is where you declare what goes into the image. Besides the three files (galaxy, python, system), you can pin specific versions of ansible-core and ansible-runner.

## Building with Different Options

The basic build command:

```bash
# Basic build with a tag
ansible-builder build --tag my-ee:1.0
```

Build with verbose output to see every step:

```bash
# Verbose build (levels 0-3)
ansible-builder build --tag my-ee:1.0 --verbosity 3
```

Build without caching (useful for reproducible builds):

```bash
# Build without layer cache
ansible-builder build --tag my-ee:1.0 --no-cache
```

Build using Docker instead of Podman:

```bash
# Force Docker as the container runtime
ansible-builder build --tag my-ee:1.0 --container-runtime docker
```

Specify a custom definition file:

```bash
# Use a custom definition file path
ansible-builder build --tag my-ee:1.0 --file path/to/my-ee-def.yml
```

Build from a custom context directory:

```bash
# Use a specific build context directory
ansible-builder build --tag my-ee:1.0 --build-context-dir /tmp/ee-build
```

## Generating the Build Context Without Building

Sometimes you want to inspect or modify the generated Containerfile before building. The `create` subcommand does exactly this.

```bash
# Generate the build context without building
ansible-builder create --file execution-environment.yml

# View the generated Containerfile
cat context/Containerfile
```

This is useful for several scenarios: auditing what goes into the image, integrating with external build systems, or debugging build failures.

## Working with Galaxy Requirements

Your requirements.yml can include collections from Galaxy, Automation Hub, or private repositories.

A comprehensive requirements file:

```yaml
# requirements.yml - Collections from multiple sources
---
collections:
  # From Ansible Galaxy
  - name: community.general
    version: ">=8.0.0"
  - name: ansible.posix
    version: ">=1.5.0"
  - name: community.docker
    version: ">=3.4.0"

  # From Automation Hub (requires auth token)
  - name: redhat.rhel_system_roles
    source: https://console.redhat.com/api/automation-hub/

  # From a Git repository
  - name: https://github.com/myorg/my-collection.git
    type: git
    version: main

  # From a tarball
  - name: /path/to/my_namespace-my_collection-1.0.0.tar.gz
    type: file
```

If you need to authenticate with a private Galaxy server, add the configuration to ansible.cfg and include it in your build:

```ini
# files/ansible.cfg - Galaxy server configuration
[galaxy]
server_list = automation_hub, galaxy

[galaxy_server.automation_hub]
url = https://console.redhat.com/api/automation-hub/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = your-token-here

[galaxy_server.galaxy]
url = https://galaxy.ansible.com/
```

Include this in your EE definition:

```yaml
# execution-environment.yml - With Galaxy auth
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

additional_build_files:
  - src: files/ansible.cfg
    dest: configs

additional_build_steps:
  prepend_galaxy:
    - COPY _build/configs/ansible.cfg /etc/ansible/ansible.cfg

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

## Managing Python Dependencies

The requirements.txt file follows standard pip format. Collection dependencies are automatically resolved, but you often need additional packages.

```text
# requirements.txt - Python packages
# For JSON query filters
jmespath>=1.0.0

# For network automation
netaddr>=0.8.0
paramiko>=3.0.0

# For cloud providers
boto3>=1.28.0
google-auth>=2.23.0

# For database modules
psycopg2-binary>=2.9.0
PyMySQL>=1.1.0
```

## Managing System Dependencies with bindep

The bindep.txt file uses bindep format to specify OS packages. The syntax lets you target specific platforms.

```text
# bindep.txt - System packages
# Always install these
python3-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
python3-dev [platform:debian platform:ubuntu]
gcc [compile]
libffi-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
libffi-dev [platform:debian platform:ubuntu]
openssl-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
libssl-dev [platform:debian platform:ubuntu]

# For XML parsing
libxml2-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
libxml2-dev [platform:debian platform:ubuntu]

# For PostgreSQL modules
postgresql-devel [platform:centos-8 platform:rhel-8 platform:rhel-9]
libpq-dev [platform:debian platform:ubuntu]
```

The platform selectors ensure the right package names are used for each OS. Since the base images are typically RHEL-based, the centos/rhel selectors are most commonly needed.

## Multi-Stage Build Process

ansible-builder uses a multi-stage build internally. Understanding the stages helps with troubleshooting.

The stages are:
1. **base** - The base image with system packages installed
2. **galaxy** - Collections are installed here
3. **builder** - Python packages are compiled here
4. **final** - Everything is combined into the final image

The `additional_build_steps` section lets you inject commands at the beginning or end of each stage:

```yaml
additional_build_steps:
  prepend_base:
    - RUN echo "Starting base stage"
  append_base:
    - RUN echo "Finished base stage"
  prepend_galaxy:
    - RUN echo "Starting galaxy stage"
  append_galaxy:
    - RUN echo "Finished galaxy stage"
  prepend_builder:
    - RUN echo "Starting builder stage"
  append_builder:
    - RUN echo "Finished builder stage"
  prepend_final:
    - RUN echo "Starting final stage"
  append_final:
    - RUN echo "Finished final stage"
```

## Building for CI/CD

In CI/CD pipelines, you want deterministic builds. Here are the flags that help:

```bash
# Reproducible build for CI/CD
ansible-builder build \
  --tag registry.example.com/ansible-ee/my-ee:${CI_COMMIT_SHA} \
  --tag registry.example.com/ansible-ee/my-ee:latest \
  --no-cache \
  --verbosity 2 \
  --container-runtime docker
```

You can also use ansible-builder in a Makefile:

```makefile
# Makefile for EE builds
EE_IMAGE ?= my-ee
EE_TAG ?= latest
RUNTIME ?= podman

.PHONY: build create clean

build:
	ansible-builder build \
		--tag $(EE_IMAGE):$(EE_TAG) \
		--container-runtime $(RUNTIME) \
		--verbosity 2

create:
	ansible-builder create
	@echo "Build context generated in context/"

clean:
	rm -rf context/
	$(RUNTIME) rmi $(EE_IMAGE):$(EE_TAG) 2>/dev/null || true
```

## Wrapping Up

ansible-builder is a focused tool that does one thing well: it turns your EE definition into a container image. The key to using it effectively is understanding the definition file format, the multi-stage build process, and the dependency resolution. Start simple with a basic definition, get it building, and then add complexity as needed. Inspect the generated Containerfile with `ansible-builder create` when things go wrong, and use `--verbosity 3` to see exactly what is happening during the build.
