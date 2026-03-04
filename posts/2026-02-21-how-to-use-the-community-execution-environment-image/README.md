# How to Use the Community Execution Environment Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Execution Environments, Community, ansible-navigator

Description: Get started with the community Ansible Execution Environment image, understand what it includes, and learn when to use it versus building custom EEs.

---

The community Execution Environment image is a pre-built container image maintained by the Ansible community. It includes ansible-core, ansible-runner, and a curated set of popular collections. If you want to try out Execution Environments without building your own image, this is the fastest way to get started. This post covers what the community EE includes, how to use it, and when you should move on to a custom image.

## What Is the Community EE?

The community EE is published at `ghcr.io/ansible/community-ansible-dev-tools` and `quay.io/ansible/community-ee-minimal`. There are actually a few community images available:

- **community-ee-minimal** - A lightweight image with ansible-core and minimal collections
- **community-ee-base** - A mid-size image with more collections and Python packages
- **ansible-dev-tools** - A development-focused image with linting tools and testing frameworks

For most people getting started, the community-ee-minimal image is the right choice.

## Pulling the Community EE

Pull the image with Podman or Docker:

```bash
# Pull the minimal community EE
podman pull quay.io/ansible/community-ee-minimal:latest

# Or pull the development tools image
podman pull ghcr.io/ansible/community-ansible-dev-tools:latest

# Check the image size
podman images | grep community
```

## What Is Inside the Community EE

Let us inspect what the community EE contains:

```bash
# Check the Ansible version
podman run --rm quay.io/ansible/community-ee-minimal:latest ansible --version

# List installed collections
podman run --rm quay.io/ansible/community-ee-minimal:latest ansible-galaxy collection list

# List installed Python packages
podman run --rm quay.io/ansible/community-ee-minimal:latest pip list

# Check the OS
podman run --rm quay.io/ansible/community-ee-minimal:latest cat /etc/os-release
```

The minimal community EE typically includes:
- ansible-core (latest stable)
- ansible-runner
- ansible.posix collection
- ansible.utils collection
- Basic Python utilities (jmespath, PyYAML, etc.)

The development tools image adds:
- ansible-lint
- molecule
- pytest
- yamllint
- ansible-navigator itself

## Running Playbooks with the Community EE

Use ansible-navigator to run playbooks against the community EE:

```bash
# Run a playbook using the community EE
ansible-navigator run site.yml \
  --execution-environment-image quay.io/ansible/community-ee-minimal:latest \
  --mode stdout
```

Create a simple test playbook to verify it works:

```yaml
---
# test-community-ee.yml - Test the community EE
- name: Test community Execution Environment
  hosts: localhost
  connection: local
  gather_facts: true
  tasks:
    - name: Show the Ansible version
      ansible.builtin.debug:
        msg: "ansible-core {{ ansible_version.full }}"

    - name: Show the Python version
      ansible.builtin.debug:
        msg: "Python {{ ansible_python_version }}"

    - name: Show the OS inside the container
      ansible.builtin.debug:
        msg: "{{ ansible_distribution }} {{ ansible_distribution_version }}"

    - name: List available collections
      ansible.builtin.command: ansible-galaxy collection list
      register: collections
      changed_when: false

    - name: Show first 10 collections
      ansible.builtin.debug:
        msg: "{{ collections.stdout_lines[:10] }}"

    - name: Test ansible.posix collection is available
      ansible.posix.synchronize:
        src: /etc/hostname
        dest: /tmp/hostname-backup
        delegate_to: "{{ inventory_hostname }}"
      ignore_errors: true
      register: sync_result

    - name: Confirm posix collection loaded
      ansible.builtin.debug:
        msg: "ansible.posix module loaded successfully (even if task failed due to rsync)"
```

Run the test:

```bash
ansible-navigator run test-community-ee.yml \
  --execution-environment-image quay.io/ansible/community-ee-minimal:latest \
  --mode stdout \
  --pull-policy missing
```

## Configuring ansible-navigator to Use the Community EE by Default

Instead of specifying the image on every command, set it as the default in your ansible-navigator configuration:

```yaml
# ansible-navigator.yml - Default to community EE
---
ansible-navigator:
  execution-environment:
    image: quay.io/ansible/community-ee-minimal:latest
    pull:
      policy: missing
  mode: stdout
  playbook-artifact:
    enable: true
    save-as: "{playbook_dir}/{playbook_name}-artifact-{time_stamp}.json"
```

Now you can just run:

```bash
# No need to specify the image every time
ansible-navigator run site.yml
```

## Using the Dev Tools Image for Development

The development tools image is great for writing and testing playbooks because it includes linting and testing tools:

```bash
# Run ansible-lint inside the dev tools EE
podman run --rm -v $(pwd):/work:z ghcr.io/ansible/community-ansible-dev-tools:latest \
  ansible-lint /work/site.yml

# Run yamllint
podman run --rm -v $(pwd):/work:z ghcr.io/ansible/community-ansible-dev-tools:latest \
  yamllint /work/

# Run molecule tests
podman run --rm -v $(pwd):/work:z -w /work ghcr.io/ansible/community-ansible-dev-tools:latest \
  molecule test
```

Or use ansible-navigator to access these tools:

```bash
# Use ansible-navigator with the dev tools image
ansible-navigator --execution-environment-image ghcr.io/ansible/community-ansible-dev-tools:latest \
  lint site.yml
```

## When to Stay with the Community EE

The community EE is perfectly fine for:

- Learning Ansible and experimenting with playbooks
- Running playbooks that only need built-in modules and common collections
- Quick one-off automation tasks
- Development and testing workflows
- Training and workshop environments

If your playbooks only use modules from `ansible.builtin`, `ansible.posix`, and `community.general`, you probably do not need a custom EE.

## When to Build a Custom EE

You need a custom EE when:

- Your playbooks use collections not included in the community EE (like `amazon.aws` or `azure.azcollection`)
- You need specific Python packages (like `boto3` for AWS or `psycopg2` for PostgreSQL)
- You need system packages (like SNMP tools or Kerberos libraries)
- Your organization has internal collections
- You need to pin exact versions for reproducibility
- You need to include custom CA certificates
- Security policy requires a specific base image

## Using the Community EE as a Base for Custom EEs

You can use the community EE as the base image for your own custom EE. This saves time because the community collections are already installed.

```yaml
# execution-environment.yml - Based on community EE
---
version: 3

images:
  base_image:
    name: quay.io/ansible/community-ee-minimal:latest

dependencies:
  galaxy:
    collections:
      # Add collections not in the community EE
      - name: amazon.aws
        version: ">=7.0.0"
      - name: community.docker
        version: ">=3.4.0"
  python:
    - boto3>=1.28.0
    - docker>=6.0.0
  system: []
```

Build your extended image:

```bash
ansible-builder build --tag my-extended-ee:1.0 --verbosity 2
```

This approach gives you the community collections plus your custom additions.

## Pinning the Community EE Version

Do not use `latest` in production. Community EE images are updated regularly, and an unexpected update could change behavior.

```bash
# Check available tags
skopeo list-tags docker://quay.io/ansible/community-ee-minimal

# Use a specific version tag
podman pull quay.io/ansible/community-ee-minimal:2.16-latest
```

Pin the version in your navigator config:

```yaml
# ansible-navigator.yml - Pinned community EE version
---
ansible-navigator:
  execution-environment:
    image: quay.io/ansible/community-ee-minimal:2.16-latest
    pull:
      policy: missing
```

## Comparing Community EE Images

Check what differs between the available community images:

```bash
# Compare collection lists
podman run --rm quay.io/ansible/community-ee-minimal:latest \
  ansible-galaxy collection list > /tmp/minimal-collections.txt

podman run --rm ghcr.io/ansible/community-ansible-dev-tools:latest \
  ansible-galaxy collection list > /tmp/dev-collections.txt

diff /tmp/minimal-collections.txt /tmp/dev-collections.txt

# Compare Python packages
podman run --rm quay.io/ansible/community-ee-minimal:latest \
  pip list --format=freeze > /tmp/minimal-pip.txt

podman run --rm ghcr.io/ansible/community-ansible-dev-tools:latest \
  pip list --format=freeze > /tmp/dev-pip.txt

diff /tmp/minimal-pip.txt /tmp/dev-pip.txt
```

## Offline Usage

If your target environment does not have internet access, pre-pull the community EE and export it:

```bash
# Save the image to a tar file
podman save quay.io/ansible/community-ee-minimal:latest -o community-ee.tar

# Transfer the tar file to the offline machine
scp community-ee.tar offline-host:/tmp/

# Load the image on the offline machine
ssh offline-host "podman load -i /tmp/community-ee.tar"
```

## Wrapping Up

The community Execution Environment is the fastest way to get started with EEs. It includes enough to run most basic playbooks and provides a solid base for building custom images. Use it for development and learning, pin the version for any production-adjacent work, and switch to a custom EE when your playbooks need dependencies that the community image does not include. The transition from community EE to custom EE is straightforward since you have already learned the workflow with ansible-navigator.
