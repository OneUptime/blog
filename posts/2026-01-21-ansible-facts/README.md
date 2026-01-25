# How to Use Ansible Facts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Facts, Variables, System Information, DevOps, Automation

Description: Master Ansible facts to gather system information, make dynamic decisions in playbooks, and create custom facts for organization-specific data.

---

Ansible facts are system properties collected from managed hosts at the start of playbook execution. They include everything from IP addresses and disk space to OS versions and installed packages. Facts enable dynamic playbooks that adapt to each host's configuration without hardcoding values.

This guide covers using built-in facts, creating custom facts, and optimizing fact gathering for performance.

## Understanding Facts

When Ansible runs, it automatically collects facts about each host using the `setup` module. These facts become variables you can use in playbooks and templates.

```bash
# View all facts for a host
ansible web1.example.com -m setup

# Filter facts by name
ansible web1.example.com -m setup -a 'filter=ansible_distribution*'

# View specific fact
ansible web1.example.com -m setup -a 'filter=ansible_memory_mb'
```

## Common Built-in Facts

Facts cover hardware, networking, and OS information.

### System Facts

```yaml
# OS Information
ansible_distribution: "Ubuntu"
ansible_distribution_version: "22.04"
ansible_distribution_release: "jammy"
ansible_os_family: "Debian"
ansible_system: "Linux"
ansible_kernel: "5.15.0-91-generic"
ansible_architecture: "x86_64"

# Hostname
ansible_hostname: "web1"
ansible_fqdn: "web1.example.com"
ansible_domain: "example.com"

# Time
ansible_date_time:
  date: "2026-01-21"
  time: "14:30:45"
  tz: "UTC"
  epoch: "1769010645"
```

### Hardware Facts

```yaml
# CPU
ansible_processor_count: 4
ansible_processor_cores: 2
ansible_processor_vcpus: 8
ansible_processor: ["Intel Xeon E5-2670"]

# Memory
ansible_memtotal_mb: 16384
ansible_memfree_mb: 8192
ansible_swaptotal_mb: 2048

# Storage
ansible_devices:
  sda:
    size: "100.00 GB"
    model: "Virtual disk"

ansible_mounts:
  - mount: "/"
    device: "/dev/sda1"
    fstype: "ext4"
    size_total: 107374182400
    size_available: 53687091200
```

### Network Facts

```yaml
# Default interface
ansible_default_ipv4:
  address: "192.168.1.10"
  gateway: "192.168.1.1"
  interface: "eth0"
  netmask: "255.255.255.0"

# All interfaces
ansible_interfaces: ["lo", "eth0", "eth1"]

ansible_eth0:
  ipv4:
    address: "192.168.1.10"
    netmask: "255.255.255.0"
  macaddress: "00:11:22:33:44:55"
  active: true
```

## Using Facts in Playbooks

Reference facts like any other variable.

```yaml
# playbooks/system-info.yml
---
- name: Display system information
  hosts: all
  gather_facts: yes

  tasks:
    - name: Show OS information
      debug:
        msg: |
          Hostname: {{ ansible_hostname }}
          OS: {{ ansible_distribution }} {{ ansible_distribution_version }}
          Kernel: {{ ansible_kernel }}
          Architecture: {{ ansible_architecture }}

    - name: Show hardware information
      debug:
        msg: |
          CPUs: {{ ansible_processor_vcpus }}
          Memory: {{ ansible_memtotal_mb }} MB
          Disk: {{ ansible_mounts | selectattr('mount', 'equalto', '/') | map(attribute='size_total') | first | human_readable }}

    - name: Show network information
      debug:
        msg: |
          IP Address: {{ ansible_default_ipv4.address }}
          Gateway: {{ ansible_default_ipv4.gateway }}
          Interface: {{ ansible_default_ipv4.interface }}
```

## Conditional Logic with Facts

Make decisions based on system characteristics.

```yaml
# playbooks/conditional-tasks.yml
---
- name: OS-specific configuration
  hosts: all
  gather_facts: yes

  tasks:
    - name: Install packages (Debian/Ubuntu)
      apt:
        name: "{{ packages }}"
        state: present
        update_cache: yes
      when: ansible_os_family == "Debian"

    - name: Install packages (RHEL/CentOS)
      dnf:
        name: "{{ packages }}"
        state: present
      when: ansible_os_family == "RedHat"

    - name: Configure for large memory systems
      template:
        src: high-memory.conf.j2
        dest: /etc/app/config.conf
      when: ansible_memtotal_mb >= 16384

    - name: Set up swap on low memory systems
      include_tasks: setup-swap.yml
      when: ansible_memtotal_mb < 4096

    - name: Skip task on virtual machines
      command: /opt/hardware-specific-tool
      when: ansible_virtualization_type == "NA"

    - name: Configure IPv6 if available
      template:
        src: ipv6.conf.j2
        dest: /etc/network/ipv6.conf
      when: ansible_default_ipv6.address is defined
```

## Facts in Templates

Use facts to generate dynamic configuration files.

```jinja2
# templates/nginx.conf.j2
# Generated for {{ ansible_fqdn }}
# OS: {{ ansible_distribution }} {{ ansible_distribution_version }}

user www-data;

# Set workers based on CPU count
worker_processes {{ ansible_processor_vcpus }};

pid /run/nginx.pid;

events {
    # Calculate connections based on available memory
    # ~1024 per GB of RAM, max 4096
    worker_connections {{ [ansible_memtotal_mb // 1024 * 1024, 4096] | min }};
    multi_accept on;
}

http {
    server {
        listen 80;
        server_name {{ ansible_fqdn }};

        # Log to hostname-specific file
        access_log /var/log/nginx/{{ ansible_hostname }}-access.log;

        location / {
            proxy_pass http://localhost:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Server-IP {{ ansible_default_ipv4.address }};
        }
    }
}
```

```jinja2
# templates/hosts.j2
# /etc/hosts generated by Ansible
127.0.0.1   localhost
{{ ansible_default_ipv4.address }}  {{ ansible_fqdn }} {{ ansible_hostname }}

# IPv6
::1         localhost ip6-localhost ip6-loopback
{% if ansible_default_ipv6.address is defined %}
{{ ansible_default_ipv6.address }}  {{ ansible_fqdn }} {{ ansible_hostname }}
{% endif %}
```

## Custom Facts

Create organization-specific facts with custom fact scripts.

### Static Custom Facts

Place JSON or INI files in `/etc/ansible/facts.d/`.

```json
// /etc/ansible/facts.d/application.fact
{
    "name": "myapp",
    "version": "2.1.0",
    "environment": "production",
    "owner": "platform-team",
    "datacenter": "us-east-1"
}
```

```ini
# /etc/ansible/facts.d/business.fact
[info]
department=engineering
cost_center=12345
project=infrastructure
```

Access custom facts:

```yaml
- name: Display custom facts
  debug:
    msg: |
      Application: {{ ansible_local.application.name }}
      Version: {{ ansible_local.application.version }}
      Department: {{ ansible_local.business.info.department }}
```

### Dynamic Custom Facts

Create executable scripts that output JSON.

```python
#!/usr/bin/env python3
# /etc/ansible/facts.d/app_status.fact

import json
import subprocess
import os

def get_app_status():
    """Gather application-specific facts"""
    facts = {
        'running_services': [],
        'disk_usage_percent': 0,
        'database_connection': False
    }

    # Check running services
    try:
        result = subprocess.run(
            ['systemctl', 'list-units', '--type=service', '--state=running', '--no-pager', '--plain'],
            capture_output=True,
            text=True
        )
        services = [line.split()[0] for line in result.stdout.strip().split('\n')[1:] if line]
        facts['running_services'] = [s for s in services if 'myapp' in s]
    except Exception:
        pass

    # Check disk usage
    try:
        statvfs = os.statvfs('/')
        facts['disk_usage_percent'] = round(
            (1 - statvfs.f_bavail / statvfs.f_blocks) * 100, 2
        )
    except Exception:
        pass

    # Check database connection
    try:
        result = subprocess.run(
            ['pg_isready', '-h', 'localhost'],
            capture_output=True
        )
        facts['database_connection'] = result.returncode == 0
    except Exception:
        pass

    return facts

if __name__ == '__main__':
    print(json.dumps(get_app_status()))
```

```bash
# Make the script executable
chmod +x /etc/ansible/facts.d/app_status.fact
```

Access dynamic facts:

```yaml
- name: Check application status
  debug:
    msg: |
      Running services: {{ ansible_local.app_status.running_services | join(', ') }}
      Disk usage: {{ ansible_local.app_status.disk_usage_percent }}%
      Database connected: {{ ansible_local.app_status.database_connection }}

- name: Alert on high disk usage
  slack:
    token: "{{ slack_token }}"
    msg: "High disk usage on {{ ansible_hostname }}: {{ ansible_local.app_status.disk_usage_percent }}%"
  when: ansible_local.app_status.disk_usage_percent > 80
```

### Deploy Custom Facts with Ansible

```yaml
# playbooks/deploy-facts.yml
---
- name: Deploy custom facts
  hosts: all
  become: yes

  tasks:
    - name: Create facts directory
      file:
        path: /etc/ansible/facts.d
        state: directory
        mode: '0755'

    - name: Deploy static application fact
      copy:
        content: |
          {
            "name": "{{ app_name }}",
            "version": "{{ app_version }}",
            "environment": "{{ environment }}"
          }
        dest: /etc/ansible/facts.d/application.fact
        mode: '0644'

    - name: Deploy dynamic status fact
      copy:
        src: files/app_status.fact
        dest: /etc/ansible/facts.d/app_status.fact
        mode: '0755'

    - name: Reload facts
      setup:
        filter: ansible_local
```

## Set Facts at Runtime

Create facts dynamically during playbook execution.

```yaml
# playbooks/set-facts.yml
---
- name: Set facts dynamically
  hosts: all

  tasks:
    - name: Calculate deployment path
      set_fact:
        deploy_path: "/var/www/{{ ansible_hostname }}/{{ app_name }}"
        config_path: "/etc/{{ app_name }}"

    - name: Set facts based on environment
      set_fact:
        log_level: "{{ 'debug' if ansible_hostname.startswith('dev') else 'info' }}"
        replicas: "{{ 1 if ansible_memtotal_mb < 4096 else 3 }}"

    - name: Register command output as fact
      command: git rev-parse HEAD
      args:
        chdir: /var/www/app
      register: git_result

    - name: Set git commit fact
      set_fact:
        current_commit: "{{ git_result.stdout }}"

    - name: Use calculated facts
      debug:
        msg: |
          Deploy to: {{ deploy_path }}
          Log level: {{ log_level }}
          Commit: {{ current_commit }}
```

## Optimizing Fact Gathering

Control fact collection for better performance.

```yaml
# Disable fact gathering entirely
- hosts: all
  gather_facts: no
  tasks:
    - name: Quick task that doesn't need facts
      ping:

# Gather only specific facts
- hosts: all
  gather_facts: no
  tasks:
    - name: Gather only network facts
      setup:
        gather_subset:
          - network

# Cache facts for faster subsequent runs
# ansible.cfg
# [defaults]
# fact_caching = jsonfile
# fact_caching_connection = /tmp/ansible_facts_cache
# fact_caching_timeout = 86400

# Gather subset in playbook
- hosts: all
  gather_facts: yes
  gather_subset:
    - min
    - network
```

Available gather_subset options:
- `all` - Gather all facts (default)
- `min` - Minimal facts (fastest)
- `hardware` - CPU, memory, devices
- `network` - IP addresses, interfaces
- `virtual` - Virtualization info
- `ohai` - Ohai facts (Chef compatibility)
- `facter` - Facter facts (Puppet compatibility)

---

Facts transform static playbooks into dynamic automation that adapts to each host. Use built-in facts for OS detection and resource-based decisions, create custom facts for organization-specific data, and optimize fact gathering for large inventories. The combination of automatic discovery and custom facts means your playbooks always have the context they need to make intelligent decisions.
