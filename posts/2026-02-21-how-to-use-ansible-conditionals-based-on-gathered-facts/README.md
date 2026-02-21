# How to Use Ansible Conditionals Based on Gathered Facts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Facts, Conditionals, System Administration

Description: Learn how to use Ansible gathered facts in when conditionals to write playbooks that adapt to different operating systems and hardware.

---

Ansible's fact gathering system collects detailed information about target hosts before running tasks. This includes the operating system, kernel version, network interfaces, disk space, memory, CPU architecture, and much more. By using these facts in `when` conditionals, you can write a single playbook that works correctly across different Linux distributions, hardware configurations, and system states. This is what makes Ansible truly cross-platform.

## What Facts Are Available

Before using facts in conditionals, you need to know what is available. Run the `setup` module to see all gathered facts for a host.

```bash
# View all facts for a host
ansible webserver-01 -m setup

# Filter facts to find specific ones
ansible webserver-01 -m setup -a "filter=ansible_distribution*"
ansible webserver-01 -m setup -a "filter=ansible_memory*"
ansible webserver-01 -m setup -a "filter=ansible_processor*"
```

The most commonly used facts in conditionals include:

- `ansible_distribution` - Ubuntu, CentOS, Debian, RedHat, etc.
- `ansible_distribution_version` - 22.04, 9.2, etc.
- `ansible_os_family` - Debian, RedHat, Suse, etc.
- `ansible_architecture` - x86_64, aarch64, etc.
- `ansible_memtotal_mb` - Total RAM in MB
- `ansible_processor_vcpus` - Number of CPU cores
- `ansible_default_ipv4.address` - Primary IP address

## OS Distribution Conditionals

The most common use of facts is writing OS-specific tasks. This lets one playbook work across Ubuntu, CentOS, Debian, and other distributions.

```yaml
# Cross-distribution package management
---
- name: Install packages across distributions
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Install packages on Debian/Ubuntu
      ansible.builtin.apt:
        name:
          - nginx
          - postgresql-client
          - python3-pip
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Install packages on RedHat/CentOS
      ansible.builtin.yum:
        name:
          - nginx
          - postgresql
          - python3-pip
        state: present
      when: ansible_os_family == "RedHat"

    - name: Install packages on SUSE
      community.general.zypper:
        name:
          - nginx
          - postgresql
          - python3-pip
        state: present
      when: ansible_os_family == "Suse"
```

## Distribution Version Conditionals

Different versions of the same OS often need different configurations. For example, Ubuntu 20.04 and Ubuntu 22.04 have different default package versions and config file locations.

```yaml
# Version-specific configuration
---
- name: Version-aware configuration
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Use modern systemd features on Ubuntu 22.04+
      ansible.builtin.template:
        src: service-modern.j2
        dest: /etc/systemd/system/myapp.service
      when:
        - ansible_distribution == "Ubuntu"
        - ansible_distribution_version is version('22.04', '>=')

    - name: Use legacy init config on older Ubuntu
      ansible.builtin.template:
        src: service-legacy.j2
        dest: /etc/systemd/system/myapp.service
      when:
        - ansible_distribution == "Ubuntu"
        - ansible_distribution_version is version('22.04', '<')

    - name: Apply CentOS 9 specific config
      ansible.builtin.template:
        src: centos9.conf.j2
        dest: /etc/app/system.conf
      when:
        - ansible_distribution in ["CentOS", "Rocky", "AlmaLinux"]
        - ansible_distribution_major_version | int >= 9
```

## Memory-Based Conditionals

Adjusting configurations based on available memory is a practical pattern for environments with mixed hardware.

```yaml
# Memory-based configuration
---
- name: Memory-aware configuration
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Configure for low-memory systems (less than 2GB)
      ansible.builtin.template:
        src: app-low-memory.conf.j2
        dest: /etc/app/app.conf
      vars:
        java_heap: "512m"
        worker_processes: 1
        cache_size: "128m"
      when: ansible_memtotal_mb < 2048

    - name: Configure for medium-memory systems (2-8GB)
      ansible.builtin.template:
        src: app-medium-memory.conf.j2
        dest: /etc/app/app.conf
      vars:
        java_heap: "2g"
        worker_processes: 2
        cache_size: "512m"
      when:
        - ansible_memtotal_mb >= 2048
        - ansible_memtotal_mb < 8192

    - name: Configure for high-memory systems (8GB+)
      ansible.builtin.template:
        src: app-high-memory.conf.j2
        dest: /etc/app/app.conf
      vars:
        java_heap: "4g"
        worker_processes: 4
        cache_size: "2g"
      when: ansible_memtotal_mb >= 8192

    - name: Warn if system has very low memory
      ansible.builtin.debug:
        msg: "WARNING: {{ inventory_hostname }} has only {{ ansible_memtotal_mb }}MB RAM"
      when: ansible_memtotal_mb < 1024
```

## CPU-Based Conditionals

Similar to memory, you can scale configurations based on available CPU cores.

```yaml
# CPU-aware worker configuration
---
- name: CPU-based tuning
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Set nginx worker processes based on CPU count
      ansible.builtin.lineinfile:
        path: /etc/nginx/nginx.conf
        regexp: '^worker_processes'
        line: "worker_processes {{ ansible_processor_vcpus }};"
      notify: reload nginx

    - name: Configure parallel build jobs
      ansible.builtin.lineinfile:
        path: /etc/environment
        regexp: '^MAKEFLAGS='
        line: 'MAKEFLAGS="-j{{ ansible_processor_vcpus }}"'
        create: true

    - name: Enable multi-threaded compression only on 4+ core systems
      ansible.builtin.apt:
        name: pigz
        state: present
      when:
        - ansible_os_family == "Debian"
        - ansible_processor_vcpus >= 4
```

## Architecture-Based Conditionals

When managing mixed architectures (x86_64 and ARM), you need to download the right binaries and apply architecture-specific settings.

```yaml
# Architecture-specific tasks
---
- name: Architecture-aware deployment
  hosts: all
  become: true
  gather_facts: true

  vars:
    app_version: "2.5.0"
    arch_map:
      x86_64: "amd64"
      aarch64: "arm64"

  tasks:
    - name: Determine download architecture
      ansible.builtin.set_fact:
        download_arch: "{{ arch_map[ansible_architecture] | default('amd64') }}"

    - name: Download application binary
      ansible.builtin.get_url:
        url: "https://releases.example.com/app/{{ app_version }}/app-{{ download_arch }}"
        dest: /usr/local/bin/app
        mode: '0755'

    - name: Apply ARM-specific kernel tuning
      ansible.builtin.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        state: present
      loop:
        - { key: "vm.swappiness", value: "10" }
        - { key: "vm.vfs_cache_pressure", value: "50" }
      when: ansible_architecture == "aarch64"
```

## Network-Based Conditionals

Facts about network interfaces help you configure networking correctly across different environments.

```yaml
# Network fact-based configuration
---
- name: Network-aware setup
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Show primary network info
      ansible.builtin.debug:
        msg: >
          Interface: {{ ansible_default_ipv4.interface }},
          IP: {{ ansible_default_ipv4.address }},
          Gateway: {{ ansible_default_ipv4.gateway }}

    - name: Configure firewall for internal hosts
      ansible.builtin.template:
        src: iptables-internal.j2
        dest: /etc/iptables/rules.v4
      when: ansible_default_ipv4.address is match('10\.')

    - name: Configure firewall for DMZ hosts
      ansible.builtin.template:
        src: iptables-dmz.j2
        dest: /etc/iptables/rules.v4
      when: ansible_default_ipv4.address is match('172\.(1[6-9]|2[0-9]|3[01])\.')

    - name: Check if bonded interface exists
      ansible.builtin.debug:
        msg: "Bonded interface detected: bond0"
      when: "'bond0' in ansible_interfaces"

    - name: Configure based on number of network interfaces
      ansible.builtin.debug:
        msg: "This host has {{ ansible_interfaces | length }} network interfaces"
      when: ansible_interfaces | length > 2
```

## Disk Space Conditionals

Checking available disk space before performing operations prevents partial deployments that fill up a disk.

```yaml
# Disk space checks
---
- name: Disk-aware operations
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Check available space on root partition
      ansible.builtin.set_fact:
        root_free_gb: "{{ (ansible_mounts | selectattr('mount', 'equalto', '/') | first).size_available / (1024*1024*1024) }}"

    - name: Fail if insufficient disk space
      ansible.builtin.fail:
        msg: "Only {{ root_free_gb | float | round(1) }}GB free on /. Need at least 5GB."
      when: root_free_gb | float < 5.0

    - name: Enable log rotation if disk space is low
      ansible.builtin.template:
        src: logrotate-aggressive.j2
        dest: /etc/logrotate.d/app
      when: root_free_gb | float < 10.0

    - name: Keep extended logs if plenty of space
      ansible.builtin.template:
        src: logrotate-extended.j2
        dest: /etc/logrotate.d/app
      when: root_free_gb | float >= 10.0
```

## Virtualization and Container Detection

Facts tell you whether a host is a physical machine, a VM, or a container, and which hypervisor or runtime it uses.

```yaml
# Virtualization-aware configuration
---
- name: Virtualization-specific settings
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Show virtualization type
      ansible.builtin.debug:
        msg: "Virtualization: {{ ansible_virtualization_type }} (role: {{ ansible_virtualization_role }})"

    - name: Apply bare metal tuning
      ansible.builtin.include_role:
        name: baremetal_tuning
      when: ansible_virtualization_role == "host"

    - name: Apply VM guest tuning
      ansible.builtin.include_role:
        name: vm_tuning
      when:
        - ansible_virtualization_role == "guest"
        - ansible_virtualization_type in ["kvm", "vmware", "xen"]

    - name: Skip hardware monitoring in containers
      ansible.builtin.debug:
        msg: "Skipping hardware monitoring (running in container)"
      when: ansible_virtualization_type in ["docker", "lxc", "podman", "containerd"]
```

## Combining Multiple Facts

Real playbooks often combine several fact-based conditions.

```yaml
# Multi-fact conditional example
---
- name: Complex fact-based deployment
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Deploy optimized build for production x86 with enough resources
      ansible.builtin.copy:
        src: "app-optimized"
        dest: /opt/app/app
        mode: '0755'
      when:
        - ansible_architecture == "x86_64"
        - ansible_memtotal_mb >= 4096
        - ansible_processor_vcpus >= 4
        - "'production' in group_names"

    - name: Deploy standard build for everything else
      ansible.builtin.copy:
        src: "app-standard"
        dest: /opt/app/app
        mode: '0755'
      when: >
        ansible_architecture != "x86_64" or
        ansible_memtotal_mb < 4096 or
        ansible_processor_vcpus < 4 or
        'production' not in group_names
```

Gathered facts make Ansible playbooks truly adaptive. Instead of maintaining separate playbooks for each OS, architecture, or hardware configuration, you write one playbook that uses fact-based conditionals to do the right thing everywhere. This is how you scale infrastructure automation from a handful of identical servers to a diverse fleet of hundreds or thousands of machines.
