# How to Use Ansible Conditionals for Cross-Platform Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cross-Platform, Conditionals, Linux, DevOps

Description: Build Ansible playbooks that work across multiple operating systems and distributions by using conditionals with gathered facts.

---

One of the biggest challenges in managing a fleet of servers is dealing with the differences between operating systems. Package names differ between Debian and RedHat. Config file locations change between Ubuntu and CentOS. Service management commands vary between Linux distributions and versions. Ansible conditionals let you write a single playbook that handles all of these differences gracefully.

## The Facts You Need

Ansible gathers system facts automatically at the start of each play (unless you disable it with `gather_facts: false`). The facts most relevant for cross-platform work are:

- `ansible_os_family` - broad OS family like "Debian", "RedHat", "Suse", "Windows"
- `ansible_distribution` - specific distribution like "Ubuntu", "CentOS", "Fedora"
- `ansible_distribution_version` - the version number like "22.04" or "9.3"
- `ansible_distribution_major_version` - just the major version like "22" or "9"
- `ansible_pkg_mgr` - the package manager: "apt", "yum", "dnf", "zypper"
- `ansible_service_mgr` - service manager: "systemd", "sysvinit", "upstart"
- `ansible_architecture` - CPU architecture: "x86_64", "aarch64"

Here is how to inspect these facts on a target host:

```yaml
# Display OS-related facts for a host
- name: Show platform facts
  hosts: all
  tasks:
    - name: Print OS information
      ansible.builtin.debug:
        msg:
          os_family: "{{ ansible_os_family }}"
          distribution: "{{ ansible_distribution }}"
          version: "{{ ansible_distribution_version }}"
          major_version: "{{ ansible_distribution_major_version }}"
          pkg_mgr: "{{ ansible_pkg_mgr }}"
          service_mgr: "{{ ansible_service_mgr }}"
          arch: "{{ ansible_architecture }}"
```

## Basic OS Family Branching

The simplest cross-platform pattern branches on `ansible_os_family`:

```yaml
# Install nginx using the correct package manager for each OS family
- name: Install nginx on Debian-based systems
  ansible.builtin.apt:
    name: nginx
    state: present
    update_cache: yes
  when: ansible_os_family == "Debian"

- name: Install nginx on RedHat-based systems
  ansible.builtin.yum:
    name: nginx
    state: present
  when: ansible_os_family == "RedHat"

- name: Install nginx on SUSE-based systems
  community.general.zypper:
    name: nginx
    state: present
  when: ansible_os_family == "Suse"
```

This works, but it gets verbose quickly when you have many packages to install. A better approach uses variables.

## Using Variables for Cross-Platform Differences

Instead of scattering conditions throughout your playbook, centralize platform differences in variables:

```yaml
# Define platform-specific variables and use them uniformly
- name: Cross-platform web server setup
  hosts: web_servers
  vars:
    platform_packages:
      Debian:
        web_server: nginx
        firewall: ufw
        php: php-fpm
        config_dir: /etc/nginx
      RedHat:
        web_server: nginx
        firewall: firewalld
        php: php-fpm
        config_dir: /etc/nginx

    pkg: "{{ platform_packages[ansible_os_family] }}"

  tasks:
    - name: Install web server package
      ansible.builtin.package:
        name: "{{ pkg.web_server }}"
        state: present

    - name: Install firewall package
      ansible.builtin.package:
        name: "{{ pkg.firewall }}"
        state: present

    - name: Deploy web server config
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: "{{ pkg.config_dir }}/nginx.conf"
```

The `package` module is itself cross-platform and delegates to the right package manager, so you often do not need to specify `apt` or `yum` directly. Combined with the variable lookup pattern, this keeps your tasks clean.

## Loading Variables from Files

For more complex setups, move platform variables into separate files:

```yaml
# Load OS-specific variables from files named after the OS family
- name: Cross-platform setup with variable files
  hosts: all
  pre_tasks:
    - name: Load OS-specific variables
      ansible.builtin.include_vars: "{{ item }}"
      with_first_found:
        - "vars/{{ ansible_distribution }}-{{ ansible_distribution_major_version }}.yml"
        - "vars/{{ ansible_distribution }}.yml"
        - "vars/{{ ansible_os_family }}.yml"
        - "vars/default.yml"
```

This tries to load the most specific variable file first (like `Ubuntu-22.yml`), then falls back to less specific ones (`Ubuntu.yml`, then `Debian.yml`, then `default.yml`). Here is what those variable files might look like:

```yaml
# vars/Debian.yml
package_names:
  web: nginx
  database: postgresql
  cache: redis-server
service_names:
  web: nginx
  database: postgresql
  cache: redis-server
config_paths:
  web: /etc/nginx
  database: /etc/postgresql
  cache: /etc/redis
```

```yaml
# vars/RedHat.yml
package_names:
  web: nginx
  database: postgresql-server
  cache: redis
service_names:
  web: nginx
  database: postgresql
  cache: redis
config_paths:
  web: /etc/nginx
  database: /var/lib/pgsql/data
  cache: /etc/redis
```

## Conditional Task Includes

For tasks that differ significantly between platforms, use conditional includes:

```yaml
# Include platform-specific task files
- name: Setup monitoring
  hosts: all
  tasks:
    - name: Common monitoring tasks
      ansible.builtin.package:
        name: prometheus-node-exporter
        state: present

    - name: Include Debian-specific monitoring setup
      ansible.builtin.include_tasks: tasks/monitoring-debian.yml
      when: ansible_os_family == "Debian"

    - name: Include RedHat-specific monitoring setup
      ansible.builtin.include_tasks: tasks/monitoring-redhat.yml
      when: ansible_os_family == "RedHat"
```

This keeps the main playbook focused on the workflow while delegating platform-specific details to separate files.

## Handling Distribution-Specific Edge Cases

Sometimes the differences go beyond OS family. Different distributions within the same family can have quirks:

```yaml
# Handle differences between CentOS, RHEL, and Fedora
- name: Setup EPEL repository
  ansible.builtin.yum:
    name: epel-release
    state: present
  when:
    - ansible_os_family == "RedHat"
    - ansible_distribution != "Fedora"

- name: Install development tools
  ansible.builtin.yum:
    name: "@Development tools"
    state: present
  when:
    - ansible_os_family == "RedHat"
    - ansible_distribution_major_version | int >= 8

- name: Use legacy network scripts on CentOS 7
  ansible.builtin.template:
    src: ifcfg.j2
    dest: "/etc/sysconfig/network-scripts/ifcfg-{{ interface_name }}"
  when:
    - ansible_distribution == "CentOS"
    - ansible_distribution_major_version == "7"
```

## Cross-Platform Service Management

Service names and configurations often differ between platforms:

```yaml
# Manage services with platform-aware names
- name: Cross-platform service management
  hosts: all
  vars:
    service_map:
      Debian:
        ntp: ntp
        cron: cron
        syslog: rsyslog
      RedHat:
        ntp: chronyd
        cron: crond
        syslog: rsyslog
    services: "{{ service_map[ansible_os_family] }}"

  tasks:
    - name: Ensure NTP service is running
      ansible.builtin.service:
        name: "{{ services.ntp }}"
        state: started
        enabled: yes

    - name: Ensure cron service is running
      ansible.builtin.service:
        name: "{{ services.cron }}"
        state: started
        enabled: yes
```

## Architecture-Aware Downloads

When downloading binaries, you need to account for CPU architecture:

```yaml
# Download the correct binary for the host architecture
- name: Set architecture mapping
  ansible.builtin.set_fact:
    arch_map:
      x86_64: amd64
      aarch64: arm64
    binary_arch: "{{ arch_map[ansible_architecture] | default(ansible_architecture) }}"

- name: Download monitoring agent
  ansible.builtin.get_url:
    url: "https://releases.example.com/agent-{{ binary_arch }}-{{ agent_version }}.tar.gz"
    dest: "/tmp/agent-{{ agent_version }}.tar.gz"
    checksum: "sha256:{{ checksums[binary_arch] }}"
```

## Full Cross-Platform Playbook Example

Here is a complete playbook that ties everything together:

```yaml
# Complete cross-platform playbook for setting up a web server
- name: Setup web application server
  hosts: app_servers
  become: yes
  vars_files:
    - "vars/{{ ansible_os_family }}.yml"

  tasks:
    - name: Update package cache on Debian systems
      ansible.builtin.apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"

    - name: Install required packages
      ansible.builtin.package:
        name: "{{ item }}"
        state: present
      loop: "{{ required_packages }}"

    - name: Configure firewall on Debian
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "80"
        - "443"
      when: ansible_os_family == "Debian"

    - name: Configure firewall on RedHat
      ansible.posix.firewalld:
        port: "{{ item }}/tcp"
        permanent: yes
        state: enabled
        immediate: yes
      loop:
        - "80"
        - "443"
      when: ansible_os_family == "RedHat"

    - name: Deploy application config
      ansible.builtin.template:
        src: app.conf.j2
        dest: "{{ config_paths.app }}/app.conf"
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: '0640'
      notify: restart application

  handlers:
    - name: restart application
      ansible.builtin.service:
        name: "{{ service_names.app }}"
        state: restarted
```

## Tips for Cross-Platform Playbook Design

First, use `ansible.builtin.package` instead of `apt` or `yum` when the package name is the same across distributions. It automatically delegates to the right package manager.

Second, prefer `ansible_os_family` over `ansible_distribution` when the difference is just packaging. Only drop to distribution-level checks when there are actual behavioral differences.

Third, use the `with_first_found` pattern for variable files so your playbook gracefully handles distributions you have not explicitly tested against.

Fourth, test your cross-platform playbooks in containers or VMs for each target distribution. Molecule is great for this since it can spin up test instances for multiple platforms and verify your playbook against all of them in a single test run.

Finally, document which platforms your playbook supports. A comment at the top of the playbook listing supported distributions saves future team members a lot of guesswork.
