# How to Use Ansible Facts to Get CPU Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, CPU, Facts, Performance Tuning

Description: How to use Ansible facts to discover CPU details including core count, architecture, and model on managed hosts for application tuning.

---

CPU information is critical for tuning application worker counts, setting parallelism levels, choosing the right binary architecture, and ensuring your hosts have the processing power required by your workloads. Ansible gathers detailed CPU information during fact collection, and knowing how to use it makes your playbooks smarter about resource allocation.

## CPU Facts Overview

Ansible provides CPU information through several fact keys:

- `ansible_facts['processor']` - a list containing CPU model strings
- `ansible_facts['processor_count']` - number of physical CPUs (sockets)
- `ansible_facts['processor_cores']` - cores per physical CPU
- `ansible_facts['processor_threads_per_core']` - threads per core (hyperthreading)
- `ansible_facts['processor_vcpus']` - total virtual CPUs (what most applications care about)
- `ansible_facts['processor_nproc']` - number of usable processors (same as nproc command output)
- `ansible_facts['architecture']` - CPU architecture (x86_64, aarch64, etc.)

```yaml
# cpu-facts-overview.yml
# Displays all major CPU-related facts
---
- name: Show CPU facts
  hosts: all
  gather_facts: yes
  tasks:
    - name: Display CPU summary
      ansible.builtin.debug:
        msg:
          - "Architecture: {{ ansible_facts['architecture'] }}"
          - "Physical CPUs (sockets): {{ ansible_facts['processor_count'] }}"
          - "Cores per CPU: {{ ansible_facts['processor_cores'] }}"
          - "Threads per core: {{ ansible_facts['processor_threads_per_core'] }}"
          - "Total vCPUs: {{ ansible_facts['processor_vcpus'] }}"
          - "nproc: {{ ansible_facts['processor_nproc'] }}"

    - name: Show CPU model
      ansible.builtin.debug:
        msg: "CPU model: {{ ansible_facts['processor'] | select('match', '.*[A-Za-z].*') | first }}"
```

## Understanding vCPU Count

The `processor_vcpus` fact is the total number of virtual processors available to the OS. It equals `processor_count * processor_cores * processor_threads_per_core`. This is the number most applications use to determine their default parallelism.

```yaml
# vcpu-calculation.yml
# Shows how vCPU count is calculated
---
- name: Show vCPU calculation
  hosts: all
  gather_facts: yes
  tasks:
    - name: Display vCPU breakdown
      ansible.builtin.debug:
        msg:
          - "Sockets: {{ ansible_facts['processor_count'] }}"
          - "Cores per socket: {{ ansible_facts['processor_cores'] }}"
          - "Threads per core: {{ ansible_facts['processor_threads_per_core'] }}"
          - "Calculated vCPUs: {{ ansible_facts['processor_count'] * ansible_facts['processor_cores'] * ansible_facts['processor_threads_per_core'] }}"
          - "Reported vCPUs: {{ ansible_facts['processor_vcpus'] }}"
          - "Hyperthreading: {{ 'yes' if ansible_facts['processor_threads_per_core'] | int > 1 else 'no' }}"
```

## Tuning Application Workers Based on CPU

The most common use of CPU facts is sizing worker processes and thread pools to match the available cores.

```yaml
# tune-nginx-workers.yml
# Sets nginx worker count based on available CPUs
---
- name: Configure nginx workers
  hosts: webservers
  gather_facts: yes
  become: yes
  tasks:
    - name: Calculate worker count
      ansible.builtin.set_fact:
        nginx_workers: "{{ ansible_facts['processor_vcpus'] }}"
        nginx_worker_connections: "{{ ansible_facts['processor_vcpus'] * 1024 }}"

    - name: Deploy nginx config with tuned workers
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        mode: '0644'
      notify: reload nginx

  handlers:
    - name: reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
```

```jinja2
{# templates/nginx.conf.j2 #}
{# Nginx config auto-tuned for {{ ansible_facts['processor_vcpus'] }} vCPUs #}

# One worker per vCPU for optimal performance
worker_processes {{ nginx_workers }};

events {
    worker_connections {{ nginx_worker_connections }};
    use epoll;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    include /etc/nginx/conf.d/*.conf;
}
```

## Configuring Gunicorn Workers

For Python applications behind Gunicorn, the recommended formula is `(2 * CPU) + 1`.

```yaml
# tune-gunicorn.yml
# Configures Gunicorn workers based on CPU facts
---
- name: Configure Gunicorn workers
  hosts: appservers
  gather_facts: yes
  become: yes
  tasks:
    - name: Calculate Gunicorn workers
      ansible.builtin.set_fact:
        gunicorn_workers: "{{ (ansible_facts['processor_vcpus'] * 2) + 1 }}"
        gunicorn_threads: "{{ [2, ansible_facts['processor_vcpus']] | min }}"

    - name: Deploy Gunicorn config
      ansible.builtin.template:
        src: gunicorn.conf.py.j2
        dest: /opt/myapp/gunicorn.conf.py
        mode: '0644'
      notify: restart myapp

  handlers:
    - name: restart myapp
      ansible.builtin.service:
        name: myapp
        state: restarted
```

```jinja2
{# templates/gunicorn.conf.py.j2 #}
# Gunicorn config - auto-tuned for {{ ansible_facts['processor_vcpus'] }} vCPUs
# Formula: (2 * CPU cores) + 1

workers = {{ gunicorn_workers }}
threads = {{ gunicorn_threads }}
worker_class = 'gthread'
bind = '0.0.0.0:8000'
timeout = 120
keepalive = 5
```

## Database Connection Pool Sizing

Database connection pools should also be sized relative to available CPUs.

```yaml
# tune-connection-pool.yml
# Sizes connection pools based on CPU and a per-core multiplier
---
- name: Configure database connection pool
  hosts: appservers
  gather_facts: yes
  vars:
    connections_per_vcpu: 5
    min_pool_size: 10
    max_pool_size: 100
  tasks:
    - name: Calculate pool size
      ansible.builtin.set_fact:
        pool_size: >-
          {{
            [max_pool_size, [min_pool_size, ansible_facts['processor_vcpus'] * connections_per_vcpu] | max] | min
          }}

    - name: Display pool configuration
      ansible.builtin.debug:
        msg: "Connection pool size: {{ pool_size }} ({{ ansible_facts['processor_vcpus'] }} vCPUs * {{ connections_per_vcpu }} = {{ ansible_facts['processor_vcpus'] * connections_per_vcpu }}, clamped to {{ min_pool_size }}-{{ max_pool_size }})"
```

## CPU Requirements Validation

Before deploying resource-intensive applications, validate that the host has enough CPU power.

```yaml
# validate-cpu.yml
# Ensures hosts meet minimum CPU requirements
---
- name: Validate CPU requirements
  hosts: all
  gather_facts: yes
  vars:
    min_vcpus: 4
    required_arch: "x86_64"
  tasks:
    - name: Check CPU count
      ansible.builtin.assert:
        that:
          - ansible_facts['processor_vcpus'] >= min_vcpus
        fail_msg: >
          Host {{ inventory_hostname }} has {{ ansible_facts['processor_vcpus'] }} vCPUs.
          Minimum required: {{ min_vcpus }}.
        success_msg: "CPU count OK: {{ ansible_facts['processor_vcpus'] }} vCPUs"

    - name: Check CPU architecture
      ansible.builtin.assert:
        that:
          - ansible_facts['architecture'] == required_arch
        fail_msg: >
          Host {{ inventory_hostname }} has architecture {{ ansible_facts['architecture'] }}.
          Required: {{ required_arch }}.
        success_msg: "Architecture OK: {{ ansible_facts['architecture'] }}"
```

## Architecture-Based Binary Selection

Different CPU architectures need different binaries. Use facts to download the right one.

```yaml
# download-correct-binary.yml
# Downloads the correct binary based on CPU architecture
---
- name: Download architecture-appropriate binary
  hosts: all
  gather_facts: yes
  vars:
    app_version: "1.5.0"
    arch_map:
      x86_64: "amd64"
      aarch64: "arm64"
      armv7l: "armv7"
      s390x: "s390x"
      ppc64le: "ppc64le"
  tasks:
    - name: Set download architecture
      ansible.builtin.set_fact:
        download_arch: "{{ arch_map[ansible_facts['architecture']] | default('amd64') }}"

    - name: Download binary
      ansible.builtin.get_url:
        url: "https://releases.example.com/myapp/{{ app_version }}/myapp-{{ app_version }}-linux-{{ download_arch }}"
        dest: /usr/local/bin/myapp
        mode: '0755'
```

## Grouping Hosts by CPU Capacity

Dynamically group hosts by their CPU tier for differentiated configuration.

```yaml
# group-by-cpu.yml
# Creates groups based on CPU capacity for tiered configuration
---
- name: Group hosts by CPU capacity
  hosts: all
  gather_facts: yes
  tasks:
    - name: Assign CPU tier
      ansible.builtin.group_by:
        key: "cpu_{{ 'small' if ansible_facts['processor_vcpus'] <= 2 else 'medium' if ansible_facts['processor_vcpus'] <= 8 else 'large' if ansible_facts['processor_vcpus'] <= 32 else 'xlarge' }}"

- name: Configure small CPU hosts
  hosts: cpu_small
  tasks:
    - name: Apply lightweight worker configuration
      ansible.builtin.debug:
        msg: "Small host - {{ ansible_facts['processor_vcpus'] }} vCPUs - single worker config"

- name: Configure large CPU hosts
  hosts: cpu_large
  tasks:
    - name: Apply high-throughput worker configuration
      ansible.builtin.debug:
        msg: "Large host - {{ ansible_facts['processor_vcpus'] }} vCPUs - multi-worker config"
```

## Build System Configuration

Build servers need CPU-aware parallelism settings for `make`, `maven`, and other tools.

```yaml
# configure-build-server.yml
# Sets up build parallelism based on CPU count
---
- name: Configure build server
  hosts: build_servers
  gather_facts: yes
  become: yes
  tasks:
    - name: Set build parallelism variables
      ansible.builtin.set_fact:
        make_jobs: "{{ ansible_facts['processor_vcpus'] }}"
        maven_threads: "{{ [1, (ansible_facts['processor_vcpus'] / 2) | int] | max }}"
        gradle_workers: "{{ ansible_facts['processor_vcpus'] }}"

    - name: Create build environment config
      ansible.builtin.copy:
        dest: /etc/profile.d/build-env.sh
        content: |
          # Auto-configured by Ansible for {{ ansible_facts['processor_vcpus'] }} vCPUs
          export MAKEFLAGS="-j{{ make_jobs }}"
          export MAVEN_OPTS="-T {{ maven_threads }}"
          export GRADLE_OPTS="-Dorg.gradle.workers.max={{ gradle_workers }}"
        mode: '0644'
```

## CPU Inventory Report

Generate a report showing CPU capacity across your entire fleet.

```yaml
# cpu-inventory-report.yml
# Generates a CPU capacity report for all hosts
---
- name: CPU inventory report
  hosts: all
  gather_facts: yes
  tasks:
    - name: Report CPU details
      ansible.builtin.debug:
        msg: >
          {{ inventory_hostname }}:
          {{ ansible_facts['processor_vcpus'] }} vCPUs
          ({{ ansible_facts['processor_count'] }} socket(s),
          {{ ansible_facts['processor_cores'] }} cores,
          {{ ansible_facts['processor_threads_per_core'] }} threads/core)
          {{ ansible_facts['architecture'] }}
          {{ ansible_facts['processor'] | select('match', '.*[A-Za-z].*') | first | default('Unknown') }}
```

## Summary

Ansible CPU facts give you the information needed to size applications, choose binaries, and validate requirements. The key fact is `processor_vcpus` for total available processing power, while `processor_count` and `processor_cores` give you the physical topology. Use these facts to auto-tune worker processes (nginx, gunicorn, database pools), set build parallelism, and ensure hosts meet minimum CPU requirements before deployment. When you let facts drive your configuration, you get optimal performance across heterogeneous hardware without manual tuning.
