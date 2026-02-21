# How to Create Ansible Roles for Monitoring Agents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Monitoring, Prometheus, Node Exporter, Roles

Description: Build an Ansible role for deploying and configuring monitoring agents like Prometheus Node Exporter across your entire infrastructure fleet.

---

You cannot fix what you cannot see. Monitoring agents need to be on every server, configured consistently, and updated without manual intervention. This is a perfect use case for an Ansible role. This post walks through building a role that deploys Prometheus Node Exporter, the most widely used monitoring agent for Linux servers. The same patterns apply to any monitoring agent you might use.

## What the Role Needs to Handle

A monitoring agent role needs to:

1. Download and install the agent binary
2. Create a dedicated service user
3. Set up a systemd service
4. Configure which metrics to collect
5. Open the right firewall ports
6. Handle upgrades without losing configuration

## Role Structure

```
roles/node_exporter/
  defaults/main.yml
  handlers/main.yml
  tasks/
    main.yml
    install.yml
    configure.yml
    firewall.yml
  templates/
    node_exporter.service.j2
    node_exporter.env.j2
  meta/main.yml
```

## Default Variables

```yaml
# roles/node_exporter/defaults/main.yml
# Node Exporter version and download settings
node_exporter_version: "1.7.0"
node_exporter_arch: "amd64"
node_exporter_download_url: "https://github.com/prometheus/node_exporter/releases/download/v{{ node_exporter_version }}/node_exporter-{{ node_exporter_version }}.linux-{{ node_exporter_arch }}.tar.gz"
node_exporter_install_dir: /usr/local/bin

# Service settings
node_exporter_user: node_exporter
node_exporter_group: node_exporter

# Network settings
node_exporter_listen_address: "0.0.0.0:9100"
node_exporter_web_telemetry_path: /metrics

# Collectors to enable (on top of defaults)
node_exporter_enabled_collectors:
  - systemd
  - processes

# Collectors to disable
node_exporter_disabled_collectors: []
# Example: [wifi, infiniband, nfs]

# Extra command line arguments
node_exporter_extra_args: ""

# TLS settings (optional)
node_exporter_tls_enabled: false
node_exporter_tls_cert: ""
node_exporter_tls_key: ""

# Basic auth (optional)
node_exporter_basic_auth_enabled: false
node_exporter_basic_auth_users: {}

# Firewall configuration
node_exporter_configure_firewall: false
node_exporter_firewall_source: "0.0.0.0/0"
```

## Installation Tasks

```yaml
# roles/node_exporter/tasks/install.yml
# Download and install Node Exporter binary
- name: Create node_exporter system group
  ansible.builtin.group:
    name: "{{ node_exporter_group }}"
    system: yes
    state: present

- name: Create node_exporter system user
  ansible.builtin.user:
    name: "{{ node_exporter_user }}"
    group: "{{ node_exporter_group }}"
    shell: /usr/sbin/nologin
    system: yes
    create_home: no
    state: present

- name: Check current node_exporter version
  ansible.builtin.command:
    cmd: "{{ node_exporter_install_dir }}/node_exporter --version"
  register: current_version
  changed_when: false
  failed_when: false

- name: Set version check fact
  ansible.builtin.set_fact:
    node_exporter_needs_update: >-
      {{ current_version.rc != 0 or
         node_exporter_version not in (current_version.stderr | default('')) }}

- name: Download node_exporter binary
  ansible.builtin.get_url:
    url: "{{ node_exporter_download_url }}"
    dest: "/tmp/node_exporter-{{ node_exporter_version }}.tar.gz"
    mode: '0644'
  when: node_exporter_needs_update

- name: Extract node_exporter binary
  ansible.builtin.unarchive:
    src: "/tmp/node_exporter-{{ node_exporter_version }}.tar.gz"
    dest: /tmp
    remote_src: yes
  when: node_exporter_needs_update

- name: Install node_exporter binary
  ansible.builtin.copy:
    src: "/tmp/node_exporter-{{ node_exporter_version }}.linux-{{ node_exporter_arch }}/node_exporter"
    dest: "{{ node_exporter_install_dir }}/node_exporter"
    owner: root
    group: root
    mode: '0755'
    remote_src: yes
  when: node_exporter_needs_update
  notify: restart node_exporter

- name: Clean up downloaded archive
  ansible.builtin.file:
    path: "{{ item }}"
    state: absent
  loop:
    - "/tmp/node_exporter-{{ node_exporter_version }}.tar.gz"
    - "/tmp/node_exporter-{{ node_exporter_version }}.linux-{{ node_exporter_arch }}"
  when: node_exporter_needs_update
```

## Configuration Tasks

```yaml
# roles/node_exporter/tasks/configure.yml
# Configure the systemd service and environment
- name: Deploy node_exporter systemd service
  ansible.builtin.template:
    src: node_exporter.service.j2
    dest: /etc/systemd/system/node_exporter.service
    owner: root
    group: root
    mode: '0644'
  notify:
    - reload systemd
    - restart node_exporter

- name: Deploy node_exporter environment file
  ansible.builtin.template:
    src: node_exporter.env.j2
    dest: /etc/default/node_exporter
    owner: root
    group: root
    mode: '0644'
  notify: restart node_exporter

- name: Create textfile collector directory
  ansible.builtin.file:
    path: /var/lib/node_exporter/textfile_collector
    state: directory
    owner: "{{ node_exporter_user }}"
    group: "{{ node_exporter_group }}"
    mode: '0755'
  when: "'textfile' not in node_exporter_disabled_collectors"

- name: Ensure node_exporter is started and enabled
  ansible.builtin.systemd:
    name: node_exporter
    state: started
    enabled: yes
    daemon_reload: yes
```

## Service Templates

```ini
# roles/node_exporter/templates/node_exporter.service.j2
# Node Exporter systemd service - managed by Ansible
[Unit]
Description=Prometheus Node Exporter
Documentation=https://prometheus.io/docs/guides/node-exporter/
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User={{ node_exporter_user }}
Group={{ node_exporter_group }}
EnvironmentFile=/etc/default/node_exporter
ExecStart={{ node_exporter_install_dir }}/node_exporter $NODE_EXPORTER_OPTS
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
# roles/node_exporter/templates/node_exporter.env.j2
# Node Exporter configuration - managed by Ansible
NODE_EXPORTER_OPTS="--web.listen-address={{ node_exporter_listen_address }} \
--web.telemetry-path={{ node_exporter_web_telemetry_path }} \
{% for collector in node_exporter_enabled_collectors %}
--collector.{{ collector }} \
{% endfor %}
{% for collector in node_exporter_disabled_collectors %}
--no-collector.{{ collector }} \
{% endfor %}
{% if 'textfile' not in node_exporter_disabled_collectors %}
--collector.textfile.directory=/var/lib/node_exporter/textfile_collector \
{% endif %}
{% if node_exporter_tls_enabled %}
--web.config.file=/etc/node_exporter/web-config.yml \
{% endif %}
{{ node_exporter_extra_args }}"
```

## Firewall Tasks

```yaml
# roles/node_exporter/tasks/firewall.yml
# Open firewall port for metrics scraping
- name: Allow node_exporter port through UFW
  community.general.ufw:
    rule: allow
    port: "{{ node_exporter_listen_address.split(':')[1] }}"
    proto: tcp
    from_ip: "{{ node_exporter_firewall_source }}"
    comment: "Allow Prometheus to scrape node_exporter"
  when: ansible_facts['os_family'] == 'Debian'

- name: Allow node_exporter port through firewalld
  ansible.posix.firewalld:
    port: "{{ node_exporter_listen_address.split(':')[1] }}/tcp"
    permanent: yes
    immediate: yes
    state: enabled
  when: ansible_facts['os_family'] == 'RedHat'
```

## Handlers

```yaml
# roles/node_exporter/handlers/main.yml
- name: reload systemd
  ansible.builtin.systemd:
    daemon_reload: yes

- name: restart node_exporter
  ansible.builtin.systemd:
    name: node_exporter
    state: restarted
```

## Main Task File

```yaml
# roles/node_exporter/tasks/main.yml
- name: Include installation tasks
  ansible.builtin.include_tasks: install.yml

- name: Include configuration tasks
  ansible.builtin.include_tasks: configure.yml

- name: Include firewall tasks
  ansible.builtin.include_tasks: firewall.yml
  when: node_exporter_configure_firewall
```

## Using the Role

Here is a playbook that deploys Node Exporter to all servers:

```yaml
# deploy-monitoring.yml
# Deploy Node Exporter to all servers in the fleet
- hosts: all
  become: yes
  roles:
    - role: node_exporter
      vars:
        node_exporter_version: "1.7.0"
        node_exporter_enabled_collectors:
          - systemd
          - processes
          - textfile
        node_exporter_disabled_collectors:
          - wifi
          - infiniband
        node_exporter_configure_firewall: true
        node_exporter_firewall_source: "10.0.0.0/8"
```

For a more advanced setup with TLS:

```yaml
# deploy-monitoring-secure.yml
- hosts: all
  become: yes
  roles:
    - role: node_exporter
      vars:
        node_exporter_tls_enabled: true
        node_exporter_tls_cert: /etc/ssl/certs/node_exporter.crt
        node_exporter_tls_key: /etc/ssl/private/node_exporter.key
        node_exporter_basic_auth_enabled: true
        node_exporter_basic_auth_users:
          prometheus: "{{ vault_prometheus_scrape_password_hash }}"
```

## Adding Custom Metrics via Textfile Collector

The textfile collector lets you expose custom metrics. Here is a task that deploys a script to generate custom metrics:

```yaml
# Extra task you can add to the role or your playbook
- name: Deploy custom metrics collection script
  ansible.builtin.copy:
    content: |
      #!/bin/bash
      # Custom metrics for node_exporter textfile collector
      echo "# HELP app_deployments_total Total application deployments"
      echo "# TYPE app_deployments_total counter"
      echo "app_deployments_total $(cat /var/lib/deploy-counter 2>/dev/null || echo 0)"
    dest: /usr/local/bin/collect-custom-metrics.sh
    mode: '0755'

- name: Set up cron for custom metrics
  ansible.builtin.cron:
    name: "Collect custom metrics"
    minute: "*/5"
    job: "/usr/local/bin/collect-custom-metrics.sh > /var/lib/node_exporter/textfile_collector/custom.prom"
```

This role handles the full lifecycle of a monitoring agent deployment. It checks the installed version before downloading, supports seamless upgrades, and locks down the service with systemd security options. Extend it with additional collectors and custom metrics as your monitoring needs grow.
