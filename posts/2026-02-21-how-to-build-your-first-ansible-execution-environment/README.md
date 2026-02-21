# How to Build Your First Ansible Execution Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Execution Environments, Containers, ansible-builder

Description: A beginner-friendly walkthrough for building your first Ansible Execution Environment using ansible-builder and running it with ansible-navigator.

---

Execution Environments (EEs) are container images that package Ansible, its dependencies, collections, and Python libraries into a single portable unit. Instead of installing Ansible and all its dependencies directly on your workstation or CI server, you build a container image once and run it anywhere. This post walks through building your first EE from scratch.

## Why Execution Environments Exist

Before EEs, managing Ansible dependencies was painful. You had Python version conflicts, collection dependencies that clashed with each other, and the classic "it works on my machine" problem. Different team members would have different versions of collections installed, leading to inconsistent behavior.

EEs solve this by putting everything inside a container. Everyone on the team uses the same image, so the behavior is identical everywhere: your laptop, your coworker's laptop, your CI pipeline, and AWX/Tower.

## Prerequisites

You need three things installed on your machine:

1. Python 3.8 or newer
2. Either Podman or Docker
3. ansible-builder (the tool that creates EE images)

Install ansible-builder and ansible-navigator:

```bash
# Install the tools you need
pip install ansible-builder ansible-navigator
```

Verify the installations:

```bash
# Check versions
ansible-builder --version
ansible-navigator --version

# Make sure you have a container runtime
podman --version || docker --version
```

## Understanding the EE Definition File

The core of any Execution Environment is the `execution-environment.yml` file. This is where you declare what goes into the image.

Create a directory for your project and add the definition file:

```bash
# Create the project directory
mkdir my-first-ee && cd my-first-ee
```

Here is the simplest possible definition file:

```yaml
# execution-environment.yml - Minimal EE definition
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

Version 3 is the current format used by ansible-builder. The `images` section specifies the base container image. The `dependencies` section points to files that list what should be installed.

## Creating Dependency Files

You need three dependency files. Let us start with the Ansible collections you want in the image.

The Galaxy requirements file lists Ansible collections:

```yaml
# requirements.yml - Ansible collections to include
---
collections:
  - name: ansible.posix
    version: ">=1.5.0"
  - name: community.general
    version: ">=8.0.0"
  - name: ansible.utils
    version: ">=3.0.0"
```

The Python requirements file lists Python packages your collections or playbooks need:

```text
# requirements.txt - Python packages to include
jmespath>=1.0.0
netaddr>=0.8.0
```

The bindep file lists system packages. The format uses bindep syntax:

```text
# bindep.txt - System packages to include
python3-devel [platform:centos-8 platform:rhel-8]
gcc [compile]
```

If you do not need system packages, you can still create an empty file or omit the `system` key from the definition.

## Building the Image

With your files in place, run ansible-builder:

```bash
# Build the execution environment image
ansible-builder build --tag my-first-ee:1.0 --verbosity 3
```

The `--tag` flag names your image. The `--verbosity 3` flag shows detailed output so you can see what is happening during the build. This is especially useful for your first build.

The build process does several things:
1. Creates a build context directory with a Containerfile
2. Installs system packages from bindep.txt
3. Installs Python packages from requirements.txt
4. Installs Ansible collections from requirements.yml
5. Produces a container image

The first build takes a few minutes because it downloads base images and installs everything from scratch. Subsequent builds are faster thanks to layer caching.

## Verifying the Build

After the build completes, verify that the image exists and contains what you expect.

```bash
# List the image
podman images my-first-ee

# Check what collections are installed inside the image
podman run --rm my-first-ee:1.0 ansible-galaxy collection list

# Check the Python packages
podman run --rm my-first-ee:1.0 pip list

# Check the Ansible version
podman run --rm my-first-ee:1.0 ansible --version
```

If you are using Docker instead of Podman, just replace `podman` with `docker` in all the commands.

## Running a Playbook with Your EE

Now that you have an image, use ansible-navigator to run a playbook inside it.

Create a simple test playbook:

```yaml
---
# test-playbook.yml - Simple test for the execution environment
- name: Test the execution environment
  hosts: localhost
  connection: local
  gather_facts: true
  tasks:
    - name: Show the OS running inside the container
      ansible.builtin.debug:
        msg: "Running on {{ ansible_distribution }} {{ ansible_distribution_version }}"

    - name: Test that jmespath is available
      ansible.builtin.set_fact:
        filtered: "{{ [{'name': 'alice'}, {'name': 'bob'}] | json_query('[?name==`alice`]') }}"

    - name: Show filtered result
      ansible.builtin.debug:
        msg: "{{ filtered }}"

    - name: Test community.general collection
      ansible.builtin.debug:
        msg: "community.general is available"
```

Run it with ansible-navigator:

```bash
# Run the playbook using your execution environment
ansible-navigator run test-playbook.yml \
  --execution-environment-image my-first-ee:1.0 \
  --mode stdout \
  --pull-policy missing
```

The `--mode stdout` flag makes ansible-navigator behave like ansible-playbook, printing output directly to your terminal. The `--pull-policy missing` flag prevents it from trying to pull the image from a registry since it only exists locally.

## Customizing the Base Image

The default base image from quay.io works fine, but you might want to use a different base for compliance or size reasons.

Here is a definition that uses a minimal base image:

```yaml
# execution-environment.yml - Custom base image
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

build_arg_defaults:
  ANSIBLE_GALAXY_CLI_COLLECTION_OPTS: '--pre'

additional_build_files:
  - src: ansible.cfg
    dest: configs

additional_build_steps:
  prepend_galaxy:
    - COPY _build/configs/ansible.cfg /etc/ansible/ansible.cfg
  append_final:
    - RUN echo "Build completed at $(date)" > /etc/ee-build-info
    - LABEL maintainer="devops-team@example.com"

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

The `additional_build_steps` section lets you inject custom Dockerfile/Containerfile instructions at various points in the build process. This is useful for adding configuration files, setting labels, or running custom setup scripts.

## Project Structure

After creating everything, your project directory should look like this:

```
my-first-ee/
  execution-environment.yml    # Main definition file
  requirements.yml             # Ansible collections
  requirements.txt             # Python packages
  bindep.txt                   # System packages
  test-playbook.yml           # Test playbook
```

When you run `ansible-builder build`, it creates a `context/` directory with the generated Containerfile and build artifacts. You can inspect this directory to understand exactly what the build process does:

```bash
# Look at the generated Containerfile
ansible-builder create --file execution-environment.yml
cat context/Containerfile
```

The `create` command generates the build context without actually building the image. This is useful for debugging or for integrating with your own container build pipeline.

## Common First-Build Problems

Here are issues you will likely hit on your first build and how to fix them:

**"Collection not found"**: Check that the collection name and version in requirements.yml are correct. Run `ansible-galaxy collection list` to see available versions.

**"Pip install fails"**: Some Python packages need system-level build tools. Add `gcc`, `python3-devel`, and similar packages to bindep.txt.

**"Permission denied"**: If using Podman in rootless mode, make sure your user has the right subuid/subgid mappings configured.

**"Base image pull fails"**: Check your network connectivity and container registry authentication. You might need to `podman login quay.io` first.

## Next Steps

Once you have a working EE, you can version it, push it to a container registry, share it with your team, and use it in CI/CD pipelines. The image becomes your team's standard Ansible runtime, eliminating the "works on my machine" problem for good.

In follow-up posts, we will cover publishing EEs to a registry, using them with AWX/Tower, and creating minimal images for production use.
