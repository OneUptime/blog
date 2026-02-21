# How to Use Ansible to Install PPAs on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ubuntu, PPA, Package Management, Launchpad

Description: Learn how to add, manage, and remove Personal Package Archives (PPAs) on Ubuntu systems using Ansible for access to newer or specialized software versions.

---

Personal Package Archives (PPAs) are Ubuntu-specific repositories hosted on Launchpad that provide packages outside the official Ubuntu archives. They are commonly used to get newer versions of software, specialized builds, or packages that are not included in Ubuntu at all. Things like the latest PHP versions, newer Git releases, or graphics drivers often come from PPAs.

Managing PPAs with Ansible keeps your Ubuntu servers consistent and makes it easy to add or remove PPAs across your entire fleet.

## The apt_repository Module

Ansible's `apt_repository` module handles PPA management. Adding a PPA is a one-liner.

```yaml
# Add a PPA for the latest Git version
- name: Add Git PPA
  ansible.builtin.apt_repository:
    repo: ppa:git-core/ppa
    state: present
    update_cache: true
```

This does three things: imports the PPA's GPG key, adds the repository to the system, and updates the APT cache so you can immediately install packages from it.

## Prerequisites

On minimal Ubuntu installations, the `add-apt-repository` command (which Ansible uses internally) might not be available. Make sure the prerequisites are installed.

```yaml
# Ensure PPA management tools are installed
- name: Install software-properties-common
  ansible.builtin.apt:
    name: software-properties-common
    state: present
    update_cache: true
```

The `software-properties-common` package provides `add-apt-repository` and is needed for PPA support.

## Adding Common PPAs

Here are practical examples of adding PPAs for commonly needed software.

```yaml
# Add PPAs for newer software versions
- name: Add Ondrej PHP PPA (latest PHP versions)
  ansible.builtin.apt_repository:
    repo: ppa:ondrej/php
    state: present

- name: Add Ondrej Apache2 PPA
  ansible.builtin.apt_repository:
    repo: ppa:ondrej/apache2
    state: present

- name: Add Ondrej Nginx PPA
  ansible.builtin.apt_repository:
    repo: ppa:ondrej/nginx
    state: present

- name: Add deadsnakes PPA (multiple Python versions)
  ansible.builtin.apt_repository:
    repo: ppa:deadsnakes/ppa
    state: present

- name: Update APT cache after adding all PPAs
  ansible.builtin.apt:
    update_cache: true
```

## Adding Multiple PPAs with a Loop

When you need several PPAs, use a loop to keep things organized.

```yaml
# Add multiple PPAs from a variable list
- name: Add required PPAs
  ansible.builtin.apt_repository:
    repo: "{{ item }}"
    state: present
  loop:
    - ppa:git-core/ppa
    - ppa:deadsnakes/ppa
    - ppa:ondrej/php
  register: ppa_results

- name: Update APT cache if any PPAs were added
  ansible.builtin.apt:
    update_cache: true
  when: ppa_results.changed
```

## A Complete Web Server Setup with PPAs

Here is a realistic playbook that uses PPAs to install a modern PHP stack on Ubuntu.

```yaml
---
# playbook: setup-php-stack.yml
# Install a modern PHP stack using PPAs for latest versions
- hosts: web_servers
  become: true

  vars:
    php_version: "8.3"
    php_packages:
      - "php{{ php_version }}"
      - "php{{ php_version }}-fpm"
      - "php{{ php_version }}-cli"
      - "php{{ php_version }}-mysql"
      - "php{{ php_version }}-pgsql"
      - "php{{ php_version }}-redis"
      - "php{{ php_version }}-curl"
      - "php{{ php_version }}-xml"
      - "php{{ php_version }}-mbstring"
      - "php{{ php_version }}-zip"
      - "php{{ php_version }}-gd"
      - "php{{ php_version }}-intl"

  tasks:
    - name: Install prerequisites
      ansible.builtin.apt:
        name: software-properties-common
        state: present

    - name: Add Ondrej PHP PPA
      ansible.builtin.apt_repository:
        repo: ppa:ondrej/php
        state: present
        update_cache: true

    - name: Install PHP packages
      ansible.builtin.apt:
        name: "{{ php_packages }}"
        state: present

    - name: Enable and start PHP-FPM
      ansible.builtin.systemd:
        name: "php{{ php_version }}-fpm"
        state: started
        enabled: true
```

## Installing Python from deadsnakes PPA

The deadsnakes PPA is the go-to source for multiple Python versions on Ubuntu.

```yaml
# Install Python 3.12 from the deadsnakes PPA
- name: Install prerequisites
  ansible.builtin.apt:
    name: software-properties-common
    state: present

- name: Add deadsnakes PPA
  ansible.builtin.apt_repository:
    repo: ppa:deadsnakes/ppa
    state: present
    update_cache: true

- name: Install Python 3.12
  ansible.builtin.apt:
    name:
      - python3.12
      - python3.12-venv
      - python3.12-dev
      - python3.12-distutils
    state: present
```

## Removing a PPA

When you no longer need a PPA, remove it cleanly.

```yaml
# Remove a PPA and optionally downgrade its packages
- name: Remove old PPA
  ansible.builtin.apt_repository:
    repo: ppa:oldpackage/ppa
    state: absent
    update_cache: true
```

Note that removing a PPA does not uninstall or downgrade packages that were installed from it. Those packages remain at their current version. If you want to revert to the Ubuntu-provided version, you need to handle that separately.

```yaml
# Downgrade packages after removing a PPA
- name: Remove the PPA
  ansible.builtin.apt_repository:
    repo: ppa:ondrej/php
    state: absent

- name: Install ppa-purge to revert packages
  ansible.builtin.apt:
    name: ppa-purge
    state: present

- name: Purge the PPA and revert packages to Ubuntu versions
  ansible.builtin.command:
    cmd: ppa-purge -y ppa:ondrej/php
  changed_when: true
```

## Using the Codename Parameter

By default, `apt_repository` uses the current Ubuntu release codename. You can override this if needed.

```yaml
# Add a PPA with a specific Ubuntu codename
- name: Add PPA targeting a specific release
  ansible.builtin.apt_repository:
    repo: ppa:deadsnakes/ppa
    codename: jammy
    state: present
```

This is useful when running on a newer Ubuntu version that a PPA has not been updated for yet. You can point to the most recent supported codename.

## Controlling the Repository Filename

By default, PPAs create files like `/etc/apt/sources.list.d/ppa_ondrej_php_jammy.list`. You can control the filename.

```yaml
# Add a PPA with a custom filename
- name: Add PHP PPA with custom filename
  ansible.builtin.apt_repository:
    repo: ppa:ondrej/php
    filename: ondrej-php
    state: present
```

## PPA Alternatives: Signed Repositories

For production environments, you might prefer signed repositories over PPAs. Here is the modern approach that works alongside PPAs.

```yaml
# Add a signed repository (recommended over PPA for production)
- name: Download repository signing key
  ansible.builtin.get_url:
    url: https://packages.sury.org/php/apt.gpg
    dest: /usr/share/keyrings/php-sury-keyring.gpg
    mode: '0644'

- name: Add PHP repository with signed-by
  ansible.builtin.apt_repository:
    repo: "deb [signed-by=/usr/share/keyrings/php-sury-keyring.gpg] https://packages.sury.org/php/ {{ ansible_distribution_release }} main"
    filename: php-sury
    state: present
```

This approach uses the `signed-by` directive instead of the deprecated `apt-key` method and works on Ubuntu 22.04+.

## Auditing Installed PPAs

To check which PPAs are configured on a system, you can look at the sources list directory.

```yaml
# List all configured PPAs/repositories
- name: Find all apt source files
  ansible.builtin.find:
    paths: /etc/apt/sources.list.d/
    patterns: "*.list,*.sources"
  register: apt_sources

- name: Display configured repositories
  ansible.builtin.debug:
    msg: "{{ apt_sources.files | map(attribute='path') | list }}"
```

## Handling PPA Errors

PPAs can fail for various reasons: the PPA does not support your Ubuntu version, the key server is down, or the PPA has been deleted. Here is how to handle these gracefully.

```yaml
# Add a PPA with error handling
- name: Try to add PPA
  ansible.builtin.apt_repository:
    repo: ppa:some/ppa
    state: present
    update_cache: true
  register: ppa_add
  ignore_errors: true

- name: Warn if PPA could not be added
  ansible.builtin.debug:
    msg: "WARNING: Could not add PPA ppa:some/ppa - {{ ppa_add.msg | default('unknown error') }}"
  when: ppa_add is failed

- name: Fall back to default packages if PPA failed
  ansible.builtin.apt:
    name: some-package
    state: present
  when: ppa_add is failed
```

## Wrapping Up

PPAs are a practical way to get newer software versions on Ubuntu servers and desktops. Ansible's `apt_repository` module handles the full lifecycle: adding PPAs, managing their GPG keys, and removing them when no longer needed. For production systems, consider using signed repositories instead of PPAs where possible, as they offer better security guarantees. Whether you are setting up a PHP development environment, installing a newer Python version, or getting the latest Git, the patterns in this post will keep your PPA management clean and automated.
