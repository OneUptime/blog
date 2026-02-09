# How to Use Ansible to Deploy and Configure OpenTelemetry Collectors Across a Fleet of Linux Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Ansible, Linux, Deployment, Configuration Management

Description: Use Ansible playbooks and roles to deploy and configure OpenTelemetry Collectors across a fleet of Linux servers consistently.

When you manage dozens or hundreds of Linux servers, manually installing and configuring the OpenTelemetry Collector on each one is not practical. Ansible automates this entire process: downloading the right binary, deploying the configuration, setting up the systemd service, and ensuring everything is running correctly.

## Ansible Role Structure

```
roles/otel-collector/
  tasks/
    main.yml
    install.yml
    configure.yml
    service.yml
  templates/
    collector-config.yaml.j2
    otel-collector.service.j2
  defaults/
    main.yml
  handlers/
    main.yml
```

## Default Variables

```yaml
# roles/otel-collector/defaults/main.yml

# Collector version and download
otel_collector_version: "0.96.0"
otel_collector_arch: "amd64"
otel_collector_download_url: "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v{{ otel_collector_version }}/otelcol-contrib_{{ otel_collector_version }}_linux_{{ otel_collector_arch }}.tar.gz"

# Installation paths
otel_collector_install_dir: "/opt/otel-collector"
otel_collector_config_dir: "/etc/otel-collector"
otel_collector_data_dir: "/var/lib/otel-collector"

# Service user
otel_collector_user: "otel"
otel_collector_group: "otel"

# OTLP backend configuration
otel_collector_otlp_endpoint: "backend.internal:4317"
otel_collector_environment: "production"

# Pipeline configuration
otel_collector_batch_timeout: "5s"
otel_collector_batch_size: 512

# Log collection
otel_collector_log_paths:
  - "/var/log/syslog"
  - "/var/log/auth.log"
```

## Installation Tasks

```yaml
# roles/otel-collector/tasks/install.yml

- name: Create otel collector group
  group:
    name: "{{ otel_collector_group }}"
    system: true
    state: present

- name: Create otel collector user
  user:
    name: "{{ otel_collector_user }}"
    group: "{{ otel_collector_group }}"
    system: true
    shell: /usr/sbin/nologin
    home: "{{ otel_collector_data_dir }}"
    create_home: false

- name: Create installation directories
  file:
    path: "{{ item }}"
    state: directory
    owner: "{{ otel_collector_user }}"
    group: "{{ otel_collector_group }}"
    mode: "0755"
  loop:
    - "{{ otel_collector_install_dir }}"
    - "{{ otel_collector_config_dir }}"
    - "{{ otel_collector_data_dir }}"

- name: Download OpenTelemetry Collector
  get_url:
    url: "{{ otel_collector_download_url }}"
    dest: "/tmp/otelcol-contrib.tar.gz"
    mode: "0644"

- name: Extract collector binary
  unarchive:
    src: "/tmp/otelcol-contrib.tar.gz"
    dest: "{{ otel_collector_install_dir }}"
    remote_src: true
    owner: "{{ otel_collector_user }}"
    group: "{{ otel_collector_group }}"

- name: Create symlink to binary
  file:
    src: "{{ otel_collector_install_dir }}/otelcol-contrib"
    dest: /usr/local/bin/otelcol-contrib
    state: link

- name: Clean up download
  file:
    path: "/tmp/otelcol-contrib.tar.gz"
    state: absent
```

## Configuration Template

```yaml
# roles/otel-collector/templates/collector-config.yaml.j2

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu: {}
      memory: {}
      disk: {}
      filesystem: {}
      load: {}
      network: {}
      processes: {}

{% if otel_collector_log_paths | length > 0 %}
  filelog:
    include:
{% for path in otel_collector_log_paths %}
      - "{{ path }}"
{% endfor %}
    start_at: end
{% endif %}

processors:
  batch:
    timeout: {{ otel_collector_batch_timeout }}
    send_batch_size: {{ otel_collector_batch_size }}

  resource:
    attributes:
      - key: deployment.environment
        value: "{{ otel_collector_environment }}"
        action: upsert
      - key: host.name
        value: "{{ ansible_hostname }}"
        action: upsert
      - key: host.ip
        value: "{{ ansible_default_ipv4.address }}"
        action: upsert

  resourcedetection:
    detectors: [system, env]
    system:
      hostname_sources: ["os"]

exporters:
  otlp:
    endpoint: "{{ otel_collector_otlp_endpoint }}"
{% if otel_collector_otlp_api_key is defined %}
    headers:
      Authorization: "Bearer {{ otel_collector_otlp_api_key }}"
{% endif %}
    tls:
      insecure: {{ otel_collector_otlp_insecure | default(false) | lower }}

extensions:
  health_check:
    endpoint: "0.0.0.0:13133"

service:
  extensions: [health_check]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, resourcedetection, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp, hostmetrics]
      processors: [resource, resourcedetection, batch]
      exporters: [otlp]
{% if otel_collector_log_paths | length > 0 %}
    logs:
      receivers: [otlp, filelog]
      processors: [resource, resourcedetection, batch]
      exporters: [otlp]
{% endif %}
```

## Systemd Service Template

```ini
# roles/otel-collector/templates/otel-collector.service.j2

[Unit]
Description=OpenTelemetry Collector
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User={{ otel_collector_user }}
Group={{ otel_collector_group }}
ExecStart=/usr/local/bin/otelcol-contrib --config={{ otel_collector_config_dir }}/collector-config.yaml
Restart=always
RestartSec=5
LimitNOFILE=65536

# Security hardening
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

## Configuration and Service Tasks

```yaml
# roles/otel-collector/tasks/configure.yml
- name: Deploy collector configuration
  template:
    src: collector-config.yaml.j2
    dest: "{{ otel_collector_config_dir }}/collector-config.yaml"
    owner: "{{ otel_collector_user }}"
    group: "{{ otel_collector_group }}"
    mode: "0640"
  notify: restart otel-collector

# roles/otel-collector/tasks/service.yml
- name: Deploy systemd service
  template:
    src: otel-collector.service.j2
    dest: /etc/systemd/system/otel-collector.service
    mode: "0644"
  notify: restart otel-collector

- name: Enable and start collector service
  systemd:
    name: otel-collector
    enabled: true
    state: started
    daemon_reload: true

# roles/otel-collector/handlers/main.yml
- name: restart otel-collector
  systemd:
    name: otel-collector
    state: restarted
    daemon_reload: true
```

## Main Task File

```yaml
# roles/otel-collector/tasks/main.yml
- include_tasks: install.yml
- include_tasks: configure.yml
- include_tasks: service.yml
```

## Playbook

```yaml
# deploy-collectors.yml
- hosts: all
  become: true
  roles:
    - role: otel-collector
      vars:
        otel_collector_otlp_endpoint: "otel-gateway.internal:4317"
        otel_collector_environment: "production"
```

Run it:

```bash
ansible-playbook -i inventory.ini deploy-collectors.yml
```

This Ansible role gives you a repeatable, version-controlled way to deploy and configure OpenTelemetry Collectors across your entire fleet. Configuration changes go through your normal Ansible workflow, and the handler ensures collectors restart when config changes.
