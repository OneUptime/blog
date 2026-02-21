# How to Use Ansible to Install Node Exporter for Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Prometheus, Node Exporter, Monitoring, DevOps

Description: Automate the deployment of Prometheus Node Exporter across your server fleet using Ansible for consistent system metrics collection.

---

Node Exporter is the standard agent for collecting hardware and OS-level metrics from Linux servers. It exposes CPU, memory, disk, network, and filesystem metrics in the Prometheus format. Every server you want to monitor needs Node Exporter running, which makes it a perfect candidate for Ansible automation. You install it once through a role, add the role to every server in your inventory, and every machine gets consistent metrics collection.

This post walks through building a production-ready Ansible role for Node Exporter that handles installation, systemd configuration, firewall rules, and collector tuning.

## What Node Exporter Collects

Out of the box, Node Exporter collects a wide range of system metrics:

- CPU utilization and per-core stats
- Memory usage (total, available, buffers, cached)
- Disk I/O and filesystem usage
- Network interface statistics
- System load averages
- Boot time and uptime

You can also enable optional collectors for NTP, systemd, and hardware monitoring.

```mermaid
flowchart LR
    A[Linux Kernel] --> B[Node Exporter :9100]
    B --> C[/metrics endpoint]
    C --> D[Prometheus scrapes every 15s]
    D --> E[Grafana dashboards]
```

## Project Structure

```
node-exporter/
  inventory/
    hosts.yml
  roles/
    node_exporter/
      tasks/
        main.yml
        install.yml
        configure.yml
        firewall.yml
      templates/
        node_exporter.service.j2
        node_exporter.env.j2
      defaults/
        main.yml
      handlers/
        main.yml
  playbook.yml
```

## Default Variables

```yaml
# roles/node_exporter/defaults/main.yml
node_exporter_version: "1.7.0"
node_exporter_platform: "linux-amd64"

# System user
node_exporter_user: "node_exporter"
node_exporter_group: "node_exporter"

# Network settings
node_exporter_listen_address: "0.0.0.0"
node_exporter_port: 9100

# Textfile collector directory for custom metrics
node_exporter_textfile_dir: "/var/lib/node_exporter/textfile_collector"

# Enabled collectors (on top of defaults)
node_exporter_enabled_collectors:
  - systemd
  - textfile

# Disabled collectors (to reduce noise)
node_exporter_disabled_collectors:
  - infiniband
  - nfs
  - nfsd

# Extra command line flags
node_exporter_extra_args: []

# Firewall configuration
node_exporter_configure_firewall: false
node_exporter_allowed_ips:
  - "10.0.0.0/8"
```

## Installation Tasks

```yaml
# roles/node_exporter/tasks/install.yml
---
- name: Create node_exporter group
  ansible.builtin.group:
    name: "{{ node_exporter_group }}"
    system: true
    state: present
  become: true

- name: Create node_exporter user
  ansible.builtin.user:
    name: "{{ node_exporter_user }}"
    group: "{{ node_exporter_group }}"
    shell: /usr/sbin/nologin
    system: true
    create_home: false
  become: true

- name: Check if Node Exporter is already installed
  ansible.builtin.stat:
    path: /usr/local/bin/node_exporter
  register: node_exporter_binary

- name: Check installed version
  ansible.builtin.command: /usr/local/bin/node_exporter --version
  register: installed_version
  changed_when: false
  failed_when: false
  when: node_exporter_binary.stat.exists

- name: Set version check fact
  ansible.builtin.set_fact:
    node_exporter_needs_update: "{{ not node_exporter_binary.stat.exists or node_exporter_version not in (installed_version.stdout | default('')) }}"

- name: Download Node Exporter
  ansible.builtin.get_url:
    url: "https://github.com/prometheus/node_exporter/releases/download/v{{ node_exporter_version }}/node_exporter-{{ node_exporter_version }}.{{ node_exporter_platform }}.tar.gz"
    dest: "/tmp/node_exporter-{{ node_exporter_version }}.tar.gz"
    mode: "0644"
    checksum: "sha256:https://github.com/prometheus/node_exporter/releases/download/v{{ node_exporter_version }}/sha256sums.txt"
  when: node_exporter_needs_update

- name: Extract Node Exporter
  ansible.builtin.unarchive:
    src: "/tmp/node_exporter-{{ node_exporter_version }}.tar.gz"
    dest: /tmp/
    remote_src: true
  when: node_exporter_needs_update

- name: Install Node Exporter binary
  ansible.builtin.copy:
    src: "/tmp/node_exporter-{{ node_exporter_version }}.{{ node_exporter_platform }}/node_exporter"
    dest: /usr/local/bin/node_exporter
    owner: root
    group: root
    mode: "0755"
    remote_src: true
  become: true
  when: node_exporter_needs_update
  notify: Restart node_exporter

- name: Clean up download artifacts
  ansible.builtin.file:
    path: "{{ item }}"
    state: absent
  loop:
    - "/tmp/node_exporter-{{ node_exporter_version }}.tar.gz"
    - "/tmp/node_exporter-{{ node_exporter_version }}.{{ node_exporter_platform }}"
  when: node_exporter_needs_update
```

## Configuration Tasks

```yaml
# roles/node_exporter/tasks/configure.yml
---
- name: Create textfile collector directory
  ansible.builtin.file:
    path: "{{ node_exporter_textfile_dir }}"
    state: directory
    owner: "{{ node_exporter_user }}"
    group: "{{ node_exporter_group }}"
    mode: "0755"
  become: true
  when: "'textfile' in node_exporter_enabled_collectors"

- name: Deploy Node Exporter environment file
  ansible.builtin.template:
    src: node_exporter.env.j2
    dest: /etc/default/node_exporter
    owner: root
    group: root
    mode: "0644"
  become: true
  notify: Restart node_exporter

- name: Deploy Node Exporter systemd service
  ansible.builtin.template:
    src: node_exporter.service.j2
    dest: /etc/systemd/system/node_exporter.service
    owner: root
    group: root
    mode: "0644"
  become: true
  notify: Restart node_exporter

- name: Enable and start Node Exporter
  ansible.builtin.systemd:
    name: node_exporter
    state: started
    enabled: true
    daemon_reload: true
  become: true

- name: Verify Node Exporter is responding
  ansible.builtin.uri:
    url: "http://localhost:{{ node_exporter_port }}/metrics"
    status_code: 200
  register: ne_check
  until: ne_check.status == 200
  retries: 5
  delay: 2
```

## Firewall Tasks

```yaml
# roles/node_exporter/tasks/firewall.yml
---
- name: Allow Node Exporter port from monitoring network (UFW)
  community.general.ufw:
    rule: allow
    port: "{{ node_exporter_port }}"
    proto: tcp
    from_ip: "{{ item }}"
    comment: "Node Exporter for Prometheus"
  loop: "{{ node_exporter_allowed_ips }}"
  become: true
  when: ansible_facts['os_family'] == 'Debian'

- name: Allow Node Exporter port from monitoring network (firewalld)
  ansible.posix.firewalld:
    rich_rule: 'rule family="ipv4" source address="{{ item }}" port protocol="tcp" port="{{ node_exporter_port }}" accept'
    permanent: true
    immediate: true
    state: enabled
  loop: "{{ node_exporter_allowed_ips }}"
  become: true
  when: ansible_facts['os_family'] == 'RedHat'
```

## Systemd Service Template

```ini
# roles/node_exporter/templates/node_exporter.service.j2
[Unit]
Description=Prometheus Node Exporter
Documentation=https://github.com/prometheus/node_exporter
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User={{ node_exporter_user }}
Group={{ node_exporter_group }}
EnvironmentFile=/etc/default/node_exporter
ExecStart=/usr/local/bin/node_exporter $NODE_EXPORTER_OPTS
SyslogIdentifier=node_exporter
Restart=always
RestartSec=5

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths={{ node_exporter_textfile_dir }}
ProtectKernelTunables=true
ProtectControlGroups=true

[Install]
WantedBy=multi-user.target
```

## Environment File Template

This template builds the command-line flags for Node Exporter based on the enabled and disabled collectors.

```bash
# roles/node_exporter/templates/node_exporter.env.j2
# Node Exporter command-line options
# Managed by Ansible

NODE_EXPORTER_OPTS="\
  --web.listen-address={{ node_exporter_listen_address }}:{{ node_exporter_port }} \
{% for collector in node_exporter_enabled_collectors %}
  --collector.{{ collector }} \
{% endfor %}
{% if 'textfile' in node_exporter_enabled_collectors %}
  --collector.textfile.directory={{ node_exporter_textfile_dir }} \
{% endif %}
{% for collector in node_exporter_disabled_collectors %}
  --no-collector.{{ collector }} \
{% endfor %}
{% for arg in node_exporter_extra_args %}
  {{ arg }} \
{% endfor %}
"
```

## Main Tasks Entry Point

```yaml
# roles/node_exporter/tasks/main.yml
---
- name: Install Node Exporter
  ansible.builtin.include_tasks: install.yml

- name: Configure Node Exporter
  ansible.builtin.include_tasks: configure.yml

- name: Configure firewall for Node Exporter
  ansible.builtin.include_tasks: firewall.yml
  when: node_exporter_configure_firewall
```

## Handlers

```yaml
# roles/node_exporter/handlers/main.yml
---
- name: Restart node_exporter
  ansible.builtin.systemd:
    name: node_exporter
    state: restarted
    daemon_reload: true
  become: true
```

## The Playbook

```yaml
# playbook.yml
---
- name: Install Node Exporter on all servers
  hosts: all
  become: true
  vars:
    node_exporter_configure_firewall: true
    node_exporter_allowed_ips:
      - "10.0.1.5/32"
  roles:
    - node_exporter
```

## Custom Metrics with the Textfile Collector

The textfile collector reads `.prom` files from a directory and exposes them as metrics. This is useful for metrics that cannot be collected in real time, like backup status or batch job results.

Here is a simple cron job that writes a custom metric:

```yaml
# Add this to your playbook to create a custom metric
- name: Create backup status metric cron
  ansible.builtin.cron:
    name: "Update backup status metric"
    minute: "*/5"
    job: |
      echo "backup_last_success_timestamp $(date +%s)" > {{ node_exporter_textfile_dir }}/backup.prom
    user: "{{ node_exporter_user }}"
  become: true
```

## Running the Playbook

```bash
# Install Node Exporter on all hosts
ansible-playbook -i inventory/hosts.yml playbook.yml

# Verify metrics are being collected
curl -s http://server-ip:9100/metrics | head -20

# Check a specific metric
curl -s http://server-ip:9100/metrics | grep node_cpu_seconds_total | head -5
```

## Summary

Node Exporter is the foundation of server monitoring with Prometheus, and Ansible makes it trivial to deploy across your entire fleet. This role handles version management, systemd integration with security hardening, optional firewall rules, and the textfile collector for custom metrics. Once deployed, every server in your inventory exposes a consistent set of system metrics that Prometheus can scrape automatically.
