# How to Handle Package Dependencies in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Package Management, Dependencies, Linux, DevOps

Description: Learn strategies for handling package dependencies in Ansible, including resolving conflicts, installing build dependencies, and managing dependency chains across distributions.

---

Package dependencies are one of those things that work silently in the background until they do not. Then you are staring at a failed Ansible playbook with cryptic error messages about unmet dependencies, version conflicts, or missing libraries. Understanding how to handle dependencies properly in Ansible saves you from these headaches and makes your automation more robust.

This post covers the common dependency scenarios you will encounter and the Ansible patterns for dealing with each one.

## How Package Managers Handle Dependencies

Before diving into Ansible specifics, it helps to understand what the package manager is doing under the hood.

When you install a package with `apt` or `dnf`, the package manager reads the dependency metadata, resolves the dependency tree, and installs everything needed. Most of the time this works transparently. Problems arise when:

- Two packages require conflicting versions of the same dependency
- A required dependency is not available in any enabled repository
- You need a specific version of a package that conflicts with other installed software
- Build dependencies are needed for compilation but not runtime

## Installing Packages with Their Dependencies

The simplest case: you install a package and let the package manager resolve dependencies automatically. This is the default behavior.

```yaml
# Install a package along with all its dependencies (automatic)
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present
```

The package manager pulls in all required dependencies. No extra work needed on your part.

## Installing Build Dependencies

When compiling software from source, you need build dependencies that are separate from runtime dependencies. On Debian-based systems, `build-dep` installs everything needed to compile a package.

```yaml
# Install build dependencies for a package (Debian/Ubuntu)
- name: Install build dependencies for Python 3.12
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop:
    - build-essential
    - libssl-dev
    - zlib1g-dev
    - libbz2-dev
    - libreadline-dev
    - libsqlite3-dev
    - libncursesw5-dev
    - xz-utils
    - tk-dev
    - libxml2-dev
    - libxmlsec1-dev
    - libffi-dev
    - liblzma-dev
```

For RHEL systems, use group install for development tools.

```yaml
# Install development tools group on RHEL
- name: Install Development Tools group
  ansible.builtin.dnf:
    name: "@Development Tools"
    state: present

# Install specific build dependencies
- name: Install Python build dependencies on RHEL
  ansible.builtin.dnf:
    name:
      - gcc
      - openssl-devel
      - bzip2-devel
      - libffi-devel
      - zlib-devel
      - readline-devel
      - sqlite-devel
    state: present
```

## Handling Missing Dependencies

Sometimes a required dependency is not in any enabled repository. You need to either enable the right repository or provide the package yourself.

```yaml
# Enable a repository to satisfy a dependency, then install the package
- name: Enable EPEL for missing dependencies
  ansible.builtin.dnf:
    name: epel-release
    state: present

- name: Install package that depends on EPEL packages
  ansible.builtin.dnf:
    name: htop
    state: present
```

A more complex example involves checking whether a dependency exists and handling the failure gracefully.

```yaml
# Attempt installation and handle dependency failures
- name: Try to install the package
  ansible.builtin.apt:
    name: my-custom-package
    state: present
  register: install_result
  ignore_errors: true

- name: Fix broken dependencies if installation failed
  ansible.builtin.command:
    cmd: apt-get install -f -y
  when: install_result is failed
  changed_when: true

- name: Retry installation after fixing dependencies
  ansible.builtin.apt:
    name: my-custom-package
    state: present
  when: install_result is failed
```

## Resolving Version Conflicts

Version conflicts happen when two packages need different versions of the same library. This is trickier to handle, and the solution depends on the situation.

### Pinning a Specific Version

```yaml
# Install a specific version to avoid conflicts
- name: Install a specific version of libssl
  ansible.builtin.apt:
    name: "libssl1.1=1.1.1f-1ubuntu2.20"
    state: present
    allow_downgrade: true
```

### Using apt Preferences for Priority

You can use APT pinning to prefer packages from specific sources.

```yaml
# Create an APT pin to prefer a specific repository for certain packages
- name: Pin PostgreSQL packages to PGDG repository
  ansible.builtin.copy:
    dest: /etc/apt/preferences.d/pgdg
    content: |
      Package: postgresql*
      Pin: origin apt.postgresql.org
      Pin-Priority: 900

      Package: *
      Pin: origin apt.postgresql.org
      Pin-Priority: 100
    mode: '0644'
```

## Pre-Installing Dependencies

For complex applications, it is sometimes cleaner to install dependencies explicitly before the main package.

```yaml
# Pre-install dependencies to ensure they are the right versions
- name: Install specific dependency versions first
  ansible.builtin.apt:
    name:
      - "libc6=2.35-0ubuntu3.4"
      - "libgcc-s1=12.3.0-1ubuntu1~22.04"
    state: present

- name: Now install the application
  ansible.builtin.apt:
    name: my-application
    state: present
```

## Using the package_facts Module for Dependency Checks

You can check if dependencies are met before attempting an installation.

```yaml
# Check if required dependencies are installed before proceeding
- name: Gather package facts
  ansible.builtin.package_facts:
    manager: auto

- name: Verify required dependencies are present
  ansible.builtin.assert:
    that:
      - "'libssl-dev' in ansible_facts.packages"
      - "'libffi-dev' in ansible_facts.packages"
    fail_msg: "Missing required build dependencies. Run the dependency installation task first."
    success_msg: "All required dependencies are present"
```

## Handling Dependency Chains Across Roles

When you have multiple Ansible roles that install different applications, dependency conflicts can arise between roles. Here is a pattern that manages this.

```yaml
# meta/main.yml for a role that depends on another role
dependencies:
  - role: common_libs
    vars:
      common_libs_packages:
        - openssl
        - libcurl4-openssl-dev
  - role: python
    vars:
      python_version: "3.11"
```

```yaml
# Use role dependencies to ensure proper ordering
---
# playbook: deploy-app.yml
- hosts: app_servers
  become: true
  roles:
    - role: base_packages
    - role: python
      vars:
        python_version: "3.11"
    - role: nodejs
      vars:
        node_version: "20"
    - role: application
```

## Handling Virtual Packages and Alternatives

Some packages provide virtual packages that satisfy dependencies. For example, both `postfix` and `exim4` provide the `mail-transport-agent` virtual package.

```yaml
# Install a package that satisfies a virtual dependency
- name: Ensure a mail transport agent is installed
  ansible.builtin.apt:
    name: postfix
    state: present

# Check which package provides a virtual package
- name: Check mail transport agent provider
  ansible.builtin.command:
    cmd: dpkg -l | grep mail-transport-agent
  register: mta_check
  changed_when: false
  failed_when: false
```

## Cleaning Up Unused Dependencies

After removing packages, orphaned dependencies can pile up. Clean them periodically.

```yaml
# Remove packages that were installed as dependencies but are no longer needed
- name: Remove orphaned dependencies (Debian)
  ansible.builtin.apt:
    autoremove: true
  when: ansible_os_family == "Debian"

- name: Remove orphaned dependencies (RHEL)
  ansible.builtin.dnf:
    autoremove: true
  when: ansible_os_family == "RedHat"
```

## Creating a Dependency Check Playbook

For complex deployments, I run a dependency check playbook before the actual deployment.

```yaml
---
# playbook: check-dependencies.yml
# Verify all dependencies are satisfied before deployment
- hosts: app_servers
  become: true

  vars:
    required_packages:
      - libpq-dev
      - libxml2-dev
      - libxslt1-dev
      - imagemagick
      - redis-tools
    required_commands:
      - psql
      - convert
      - redis-cli

  tasks:
    - name: Gather package facts
      ansible.builtin.package_facts:
        manager: auto

    - name: Check for missing required packages
      ansible.builtin.set_fact:
        missing_deps: "{{ required_packages | reject('in', ansible_facts.packages) | list }}"

    - name: Report missing packages
      ansible.builtin.debug:
        msg: "Missing packages on {{ inventory_hostname }}: {{ missing_deps }}"
      when: missing_deps | length > 0

    - name: Check for required commands
      ansible.builtin.command:
        cmd: "which {{ item }}"
      loop: "{{ required_commands }}"
      register: command_checks
      changed_when: false
      failed_when: false

    - name: Report missing commands
      ansible.builtin.debug:
        msg: "Command '{{ item.item }}' not found on {{ inventory_hostname }}"
      loop: "{{ command_checks.results }}"
      when: item.rc != 0
```

## Wrapping Up

Package dependencies in Ansible mostly take care of themselves because you are leveraging the underlying package manager. Where it gets interesting is when you need to handle conflicts, pin versions, manage build dependencies, or coordinate dependencies across roles. The patterns in this post cover the most common scenarios. The key principle is to be explicit about what you need: do not assume a dependency will be there just because another package pulled it in. Install it explicitly, check for it before you need it, and keep your dependency management visible and auditable in your playbooks.
