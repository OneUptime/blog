# How to Handle Playbook Execution for Different OS Families

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Linux, Cross-Platform, DevOps, Configuration Management

Description: Learn how to write Ansible playbooks that work across Debian, RedHat, and other OS families by using conditionals, facts, and smart variable structures.

---

If you manage a mixed fleet of servers running Ubuntu, CentOS, Amazon Linux, and maybe even SUSE, you already know the pain of writing playbooks that work across all of them. Package names differ, service management varies, config file paths change, and even the default user accounts are different. Ansible provides several mechanisms for handling these differences cleanly, and in this post I will show you the most effective patterns I have used in production.

## Understanding ansible_os_family and Related Facts

When Ansible connects to a host, it gathers system facts automatically. The key facts for OS-specific logic are:

```yaml
# Key facts for OS detection:
# ansible_os_family: "Debian", "RedHat", "Suse", "Archlinux", etc.
# ansible_distribution: "Ubuntu", "CentOS", "Fedora", "Amazon", etc.
# ansible_distribution_major_version: "22", "9", "2023", etc.
# ansible_distribution_release: "jammy", "bookworm", etc.
# ansible_pkg_mgr: "apt", "dnf", "yum", "zypper", etc.
```

You can check what facts are available on any host:

```bash
# Gather and display all facts for a specific host
ansible webserver1 -m setup -a 'filter=ansible_os*,ansible_distribution*,ansible_pkg_mgr'
```

## Pattern 1: Simple when Conditionals

The most straightforward approach for small differences between OS families:

```yaml
---
# install-packages.yml
# Install packages using the correct module for each OS family

- hosts: all
  become: yes
  tasks:
    # Use apt for Debian-based systems (Ubuntu, Debian)
    - name: Install packages on Debian/Ubuntu
      apt:
        name:
          - nginx
          - python3
          - curl
        state: present
        update_cache: yes
      when: ansible_os_family == "Debian"

    # Use dnf for modern RedHat-based systems (RHEL 8+, Fedora, CentOS Stream)
    - name: Install packages on RedHat/CentOS
      dnf:
        name:
          - nginx
          - python3
          - curl
        state: present
      when: ansible_os_family == "RedHat"
```

This works fine for one or two tasks, but it gets repetitive fast when you have dozens of OS-specific tasks.

## Pattern 2: OS-Specific Variable Files

A much cleaner approach is to load OS-specific variables from separate files and use the `package` module (which auto-detects the package manager):

```yaml
# vars/Debian.yml
# Package names and paths for Debian-based systems
firewall_package: ufw
firewall_service: ufw
apache_package: apache2
apache_service: apache2
apache_config_dir: /etc/apache2
php_packages:
  - php
  - libapache2-mod-php
  - php-mysql
```

```yaml
# vars/RedHat.yml
# Package names and paths for RedHat-based systems
firewall_package: firewalld
firewall_service: firewalld
apache_package: httpd
apache_service: httpd
apache_config_dir: /etc/httpd
php_packages:
  - php
  - php-mysqlnd
  - mod_php
```

Now the playbook loads the right file based on the OS family:

```yaml
---
# setup-webserver.yml
# A single playbook that works on both Debian and RedHat systems

- hosts: webservers
  become: yes

  # Load OS-specific variables by matching ansible_os_family to a file name
  vars_files:
    - "vars/{{ ansible_os_family }}.yml"

  tasks:
    - name: Install Apache
      package:
        name: "{{ apache_package }}"
        state: present

    - name: Install PHP packages
      package:
        name: "{{ php_packages }}"
        state: present

    - name: Install firewall
      package:
        name: "{{ firewall_package }}"
        state: present

    - name: Start and enable Apache
      service:
        name: "{{ apache_service }}"
        state: started
        enabled: yes

    - name: Start and enable firewall
      service:
        name: "{{ firewall_service }}"
        state: started
        enabled: yes
```

The `package` module is your friend here. It automatically uses apt, dnf, yum, or zypper based on the target system.

## Pattern 3: Include Tasks by OS

When the tasks themselves are fundamentally different between operating systems (not just variable names), use task includes:

```yaml
---
# configure-firewall.yml
# Include OS-specific firewall configuration tasks

- hosts: all
  become: yes
  tasks:
    - name: Include OS-specific firewall tasks
      include_tasks: "tasks/firewall-{{ ansible_os_family }}.yml"
```

```yaml
# tasks/firewall-Debian.yml
# UFW firewall configuration for Debian/Ubuntu

- name: Install UFW
  apt:
    name: ufw
    state: present

- name: Set default UFW policies
  ufw:
    direction: "{{ item.direction }}"
    policy: "{{ item.policy }}"
  loop:
    - { direction: incoming, policy: deny }
    - { direction: outgoing, policy: allow }

- name: Allow SSH through UFW
  ufw:
    rule: allow
    port: '22'
    proto: tcp

- name: Allow HTTP and HTTPS through UFW
  ufw:
    rule: allow
    port: "{{ item }}"
    proto: tcp
  loop:
    - '80'
    - '443'

- name: Enable UFW
  ufw:
    state: enabled
```

```yaml
# tasks/firewall-RedHat.yml
# firewalld configuration for RedHat/CentOS

- name: Install firewalld
  dnf:
    name: firewalld
    state: present

- name: Start and enable firewalld
  service:
    name: firewalld
    state: started
    enabled: yes

- name: Allow SSH through firewalld
  firewalld:
    service: ssh
    permanent: yes
    state: enabled
    immediate: yes

- name: Allow HTTP and HTTPS through firewalld
  firewalld:
    service: "{{ item }}"
    permanent: yes
    state: enabled
    immediate: yes
  loop:
    - http
    - https
```

## Pattern 4: Cascading Variable Loading with Fallback

For more granular control, load variables from the most specific file available, falling back to the OS family:

```yaml
---
# setup-app.yml
# Load variables with increasing specificity, falling back gracefully

- hosts: all
  become: yes

  pre_tasks:
    # Try to load the most specific variable file first, fall back to general
    - name: Load OS-family variables
      include_vars: "vars/{{ ansible_os_family }}.yml"

    - name: Load distribution-specific overrides if available
      include_vars: "vars/{{ ansible_distribution }}.yml"
      ignore_errors: yes

    - name: Load version-specific overrides if available
      include_vars: "vars/{{ ansible_distribution }}-{{ ansible_distribution_major_version }}.yml"
      ignore_errors: yes
```

With this pattern, you might have:

```
vars/
  Debian.yml           # Base settings for all Debian-family systems
  RedHat.yml           # Base settings for all RedHat-family systems
  Ubuntu.yml           # Ubuntu-specific overrides
  Ubuntu-22.yml        # Ubuntu 22.04 specific overrides
  CentOS.yml           # CentOS-specific overrides
  Amazon.yml           # Amazon Linux overrides
```

## Pattern 5: Using the block/rescue/when Structure

For complex conditional logic, use block to group OS-specific tasks:

```yaml
---
# configure-ntp.yml
# Configure time synchronization differently per OS

- hosts: all
  become: yes
  tasks:
    - name: Configure chrony on modern systems
      block:
        - name: Install chrony
          package:
            name: chrony
            state: present

        - name: Deploy chrony configuration
          template:
            src: chrony.conf.j2
            dest: /etc/chrony.conf
          notify: restart chrony

        - name: Enable chrony service
          service:
            name: chronyd
            state: started
            enabled: yes
      when: >
        (ansible_os_family == "RedHat" and ansible_distribution_major_version | int >= 8)
        or
        (ansible_distribution == "Ubuntu" and ansible_distribution_major_version | int >= 20)

    - name: Configure ntpd on older systems
      block:
        - name: Install ntp
          package:
            name: ntp
            state: present

        - name: Deploy ntp configuration
          template:
            src: ntp.conf.j2
            dest: /etc/ntp.conf
          notify: restart ntp

        - name: Enable ntp service
          service:
            name: ntpd
            state: started
            enabled: yes
      when: >
        (ansible_os_family == "RedHat" and ansible_distribution_major_version | int < 8)
        or
        (ansible_distribution == "Ubuntu" and ansible_distribution_major_version | int < 20)

  handlers:
    - name: restart chrony
      service:
        name: chronyd
        state: restarted

    - name: restart ntp
      service:
        name: ntpd
        state: restarted
```

## Tips for Multi-OS Playbook Development

**Test with molecule.** Set up Molecule test scenarios with multiple OS images to catch compatibility issues early:

```yaml
# molecule/default/molecule.yml
platforms:
  - name: ubuntu2204
    image: ubuntu:22.04
  - name: centos9
    image: quay.io/centos/centos:stream9
  - name: debian12
    image: debian:12
```

**Use assert to fail early.** If your playbook only supports specific operating systems, check at the start:

```yaml
# Fail fast if the OS is not supported
- name: Verify supported operating system
  assert:
    that:
      - ansible_os_family in ['Debian', 'RedHat']
    fail_msg: "This playbook only supports Debian and RedHat OS families. Detected: {{ ansible_os_family }}"
```

**Use the package module for simple installs.** When package names happen to be the same across distributions, the generic `package` module saves you from writing conditionals at all.

## Wrapping Up

The pattern you choose depends on how different the OS-specific logic actually is. For minor differences (package names, paths), use OS-specific variable files loaded by `ansible_os_family`. For major differences (entirely different tools or workflows), use task includes. And always prefer the generic `package` and `service` modules when they get the job done. With these patterns in your toolkit, maintaining a mixed-OS fleet with Ansible becomes much more manageable.
