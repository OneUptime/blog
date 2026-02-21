# How to Use Ansible to Detect Linux Distribution Automatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Linux, Facts, Cross-Platform, Distribution Detection

Description: Use Ansible facts to automatically detect the Linux distribution, version, and family for building adaptive, portable playbooks.

---

Ansible gathers facts about every host it manages, including detailed information about the operating system. Knowing which facts to use and how they differ across distributions is key to writing playbooks that adapt automatically. This guide covers all the distribution-related facts and how to use them effectively.

## Key Distribution Facts

When Ansible gathers facts, it provides these OS-related variables:

```yaml
# Example output for Ubuntu 24.04
ansible_distribution: "Ubuntu"
ansible_distribution_version: "24.04"
ansible_distribution_major_version: "24"
ansible_distribution_release: "noble"
ansible_os_family: "Debian"
ansible_system: "Linux"
ansible_kernel: "6.8.0-31-generic"
ansible_architecture: "x86_64"
ansible_pkg_mgr: "apt"
ansible_service_mgr: "systemd"
```

```yaml
# Example output for Rocky Linux 9.3
ansible_distribution: "Rocky"
ansible_distribution_version: "9.3"
ansible_distribution_major_version: "9"
ansible_distribution_release: "Blue Onyx"
ansible_os_family: "RedHat"
ansible_pkg_mgr: "dnf"
ansible_service_mgr: "systemd"
```

```yaml
# Example output for Alpine 3.19
ansible_distribution: "Alpine"
ansible_distribution_version: "3.19.1"
ansible_distribution_major_version: "3"
ansible_os_family: "Alpine"
ansible_pkg_mgr: "apk"
ansible_service_mgr: "openrc"
```

## Using Facts for Distribution Detection

### Basic Conditionals

```yaml
- name: Install package using correct manager
  block:
    - name: Install on Debian/Ubuntu
      ansible.builtin.apt:
        name: nginx
        state: present
      when: ansible_os_family == "Debian"

    - name: Install on RHEL/CentOS/Rocky
      ansible.builtin.dnf:
        name: nginx
        state: present
      when: ansible_os_family == "RedHat"

    - name: Install on SUSE
      community.general.zypper:
        name: nginx
        state: present
      when: ansible_os_family == "Suse"

    - name: Install on Arch
      community.general.pacman:
        name: nginx
        state: present
      when: ansible_os_family == "Archlinux"

    - name: Install on Alpine
      community.general.apk:
        name: nginx
        state: present
      when: ansible_os_family == "Alpine"
```

### Using the Package Module

The `ansible.builtin.package` module auto-detects the package manager:

```yaml
# Automatically uses apt/dnf/zypper/pacman based on the OS
- name: Install nginx on any distribution
  ansible.builtin.package:
    name: nginx
    state: present
```

This works when the package name is the same across distributions. For different names, combine with variables.

### Version-Specific Conditionals

```yaml
- name: Ubuntu 24.04 specific config
  ansible.builtin.template:
    src: netplan-24.04.yml.j2
    dest: /etc/netplan/01-config.yaml
  when:
    - ansible_distribution == "Ubuntu"
    - ansible_distribution_version == "24.04"

- name: RHEL 9+ specific config
  ansible.builtin.command: update-crypto-policies --set DEFAULT:NO-SHA1
  when:
    - ansible_os_family == "RedHat"
    - ansible_distribution_major_version | int >= 9
```

## Distribution Family Mapping

Here is how `ansible_os_family` maps across distributions:

| Distribution | ansible_distribution | ansible_os_family |
|-------------|---------------------|-------------------|
| Ubuntu | Ubuntu | Debian |
| Debian | Debian | Debian |
| RHEL | RedHat | RedHat |
| CentOS Stream | CentOS | RedHat |
| Rocky Linux | Rocky | RedHat |
| AlmaLinux | AlmaLinux | RedHat |
| Oracle Linux | OracleLinux | RedHat |
| Amazon Linux 2023 | Amazon | RedHat |
| Fedora | Fedora | RedHat |
| SLES | SLES | Suse |
| openSUSE Leap | openSUSE Leap | Suse |
| Arch Linux | Archlinux | Archlinux |
| Alpine | Alpine | Alpine |
| FreeBSD | FreeBSD | FreeBSD |

## Advanced Detection Pattern

Load variables with fallback chain for maximum flexibility:

```yaml
---
- name: Adaptive playbook
  hosts: all
  become: true

  pre_tasks:
    - name: Load OS-specific variables with fallback
      ansible.builtin.include_vars: "{{ item }}"
      with_first_found:
        - files:
            - "{{ ansible_distribution }}_{{ ansible_distribution_major_version }}.yml"
            - "{{ ansible_distribution }}.yml"
            - "{{ ansible_os_family }}.yml"
            - "default.yml"
          paths:
            - vars/os
      tags: always
```

This tries files in order:
1. `Ubuntu_24.yml` (most specific)
2. `Ubuntu.yml`
3. `Debian.yml` (family level)
4. `default.yml` (fallback)

## Displaying Detected Information

Useful for debugging and inventory audits:

```yaml
    - name: Display detected OS information
      ansible.builtin.debug:
        msg: |
          Distribution: {{ ansible_distribution }}
          Version: {{ ansible_distribution_version }}
          Major Version: {{ ansible_distribution_major_version }}
          Release: {{ ansible_distribution_release }}
          OS Family: {{ ansible_os_family }}
          Kernel: {{ ansible_kernel }}
          Architecture: {{ ansible_architecture }}
          Package Manager: {{ ansible_pkg_mgr }}
          Service Manager: {{ ansible_service_mgr }}
          Python: {{ ansible_python_version }}
```

## Using ansible_pkg_mgr and ansible_service_mgr

These facts tell you which package manager and service manager are in use:

```yaml
- name: Service management that adapts to init system
  ansible.builtin.service:
    name: nginx
    enabled: true
    state: started
  # ansible.builtin.service works with both systemd and openrc

- name: Show which package manager is used
  ansible.builtin.debug:
    msg: "This host uses {{ ansible_pkg_mgr }}"
  # Output: "apt" or "dnf" or "zypper" or "pacman" or "apk"
```

## Creating Distribution-Aware Roles

```yaml
# roles/common/tasks/main.yml
- name: Include distribution-specific tasks
  ansible.builtin.include_tasks: "{{ item }}"
  with_first_found:
    - files:
        - "install_{{ ansible_distribution | lower }}.yml"
        - "install_{{ ansible_os_family | lower }}.yml"
        - "install_generic.yml"
      paths:
        - tasks
```

This lets you have:
- `tasks/install_ubuntu.yml` for Ubuntu-specific steps
- `tasks/install_debian.yml` for Debian family
- `tasks/install_generic.yml` as a fallback

## Summary

Ansible facts provide comprehensive distribution detection through `ansible_distribution`, `ansible_os_family`, `ansible_distribution_version`, and related variables. Use `ansible_os_family` for broad conditionals, `ansible_distribution` for specific distributions, and version facts for version-gated features. The `with_first_found` pattern creates clean fallback chains from specific to generic. Combine these detection techniques with variable mapping files for fully portable playbooks.
