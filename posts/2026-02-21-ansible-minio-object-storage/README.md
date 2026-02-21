# How to Use Ansible to Set Up a MinIO Object Storage Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, MinIO, Object Storage, S3, Infrastructure

Description: Deploy a MinIO S3-compatible object storage server with TLS, bucket policies, and lifecycle rules using Ansible for self-hosted storage.

---

MinIO provides S3-compatible object storage that you can run on your own hardware. If your applications need object storage but you cannot or do not want to use AWS S3, MinIO is the standard choice. It supports the S3 API, which means any tool or SDK that works with S3 works with MinIO without code changes. The deployment itself is straightforward, but getting TLS, bucket policies, and lifecycle rules configured correctly requires attention to detail. Ansible handles all of this consistently.

## Role Defaults

```yaml
# roles/minio/defaults/main.yml - MinIO configuration
minio_version: "RELEASE.2024-01-16T16-07-38Z"
minio_domain: s3.example.internal
minio_console_port: 9001
minio_api_port: 9000
minio_data_dir: /data/minio
minio_config_dir: /etc/minio
minio_user: minio-user

minio_root_user: minioadmin
minio_root_password: "{{ vault_minio_root_password }}"

# TLS configuration
minio_tls_enabled: true
minio_tls_cert: /etc/minio/certs/public.crt
minio_tls_key: /etc/minio/certs/private.key

# Default buckets to create
minio_buckets:
  - name: app-assets
    policy: download
    versioning: true
  - name: backups
    policy: none
    versioning: false
    lifecycle_days: 90
  - name: logs
    policy: none
    versioning: false
    lifecycle_days: 30
```

## Main Tasks

```yaml
# roles/minio/tasks/main.yml - Install and configure MinIO
---
- name: Create minio system user
  user:
    name: "{{ minio_user }}"
    system: yes
    shell: /usr/sbin/nologin
    create_home: no

- name: Create MinIO directories
  file:
    path: "{{ item }}"
    state: directory
    owner: "{{ minio_user }}"
    group: "{{ minio_user }}"
    mode: '0755'
  loop:
    - "{{ minio_data_dir }}"
    - "{{ minio_config_dir }}"
    - "{{ minio_config_dir }}/certs"

- name: Download MinIO server binary
  get_url:
    url: "https://dl.min.io/server/minio/release/linux-amd64/minio"
    dest: /usr/local/bin/minio
    mode: '0755'

- name: Download MinIO client (mc)
  get_url:
    url: "https://dl.min.io/client/mc/release/linux-amd64/mc"
    dest: /usr/local/bin/mc
    mode: '0755'

- name: Deploy TLS certificates
  copy:
    src: "{{ item.src }}"
    dest: "{{ item.dest }}"
    owner: "{{ minio_user }}"
    group: "{{ minio_user }}"
    mode: '0600'
  loop:
    - { src: "files/certs/minio-cert.pem", dest: "{{ minio_tls_cert }}" }
    - { src: "files/certs/minio-key.pem", dest: "{{ minio_tls_key }}" }
  when: minio_tls_enabled
  notify: restart minio

- name: Deploy MinIO environment file
  template:
    src: minio.env.j2
    dest: "{{ minio_config_dir }}/minio.env"
    owner: "{{ minio_user }}"
    group: "{{ minio_user }}"
    mode: '0600'
  notify: restart minio

- name: Create MinIO systemd service
  template:
    src: minio.service.j2
    dest: /etc/systemd/system/minio.service
    mode: '0644'
  notify:
    - reload systemd
    - restart minio

- name: Start and enable MinIO
  systemd:
    name: minio
    state: started
    enabled: yes
    daemon_reload: yes

- name: Wait for MinIO to be ready
  uri:
    url: "http://localhost:{{ minio_api_port }}/minio/health/live"
    status_code: 200
  register: minio_health
  until: minio_health.status == 200
  retries: 15
  delay: 5

- name: Configure mc client alias
  command: >
    mc alias set local
    http://localhost:{{ minio_api_port }}
    {{ minio_root_user }}
    {{ minio_root_password }}
  changed_when: false
  no_log: true

- name: Create default buckets
  command: "mc mb --ignore-existing local/{{ item.name }}"
  loop: "{{ minio_buckets }}"
  changed_when: false

- name: Set bucket versioning
  command: "mc version enable local/{{ item.name }}"
  loop: "{{ minio_buckets }}"
  when: item.versioning | default(false)
  changed_when: false

- name: Set bucket policies
  command: "mc anonymous set {{ item.policy }} local/{{ item.name }}"
  loop: "{{ minio_buckets }}"
  when: item.policy != 'none'
  changed_when: false

- name: Configure lifecycle rules for buckets
  command: >
    mc ilm rule add --expire-days {{ item.lifecycle_days }}
    local/{{ item.name }}
  loop: "{{ minio_buckets }}"
  when: item.lifecycle_days is defined
  changed_when: false
```

## Environment File Template

```
# roles/minio/templates/minio.env.j2 - MinIO environment variables
MINIO_ROOT_USER={{ minio_root_user }}
MINIO_ROOT_PASSWORD={{ minio_root_password }}
MINIO_VOLUMES="{{ minio_data_dir }}"
MINIO_OPTS="--console-address :{{ minio_console_port }}"
{% if minio_tls_enabled %}
MINIO_CERTS_DIR="{{ minio_config_dir }}/certs"
{% endif %}
```

## Systemd Service Template

```ini
# roles/minio/templates/minio.service.j2
[Unit]
Description=MinIO Object Storage
After=network-online.target
Wants=network-online.target

[Service]
User={{ minio_user }}
Group={{ minio_user }}
EnvironmentFile={{ minio_config_dir }}/minio.env
ExecStart=/usr/local/bin/minio server $MINIO_VOLUMES $MINIO_OPTS
Restart=always
RestartSec=10
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

## Handlers

```yaml
# roles/minio/handlers/main.yml
---
- name: restart minio
  systemd:
    name: minio
    state: restarted

- name: reload systemd
  systemd:
    daemon_reload: yes
```

## Testing

```bash
# Upload a test file
mc cp /etc/hostname local/app-assets/test.txt

# List bucket contents
mc ls local/app-assets/

# Test S3 API compatibility with AWS CLI
aws --endpoint-url http://localhost:9000 s3 ls s3://app-assets/
```

## Running the Playbook

```bash
# Deploy MinIO
ansible-playbook -i inventory/hosts.ini playbook.yml --ask-vault-pass
```

## Summary

This Ansible playbook deploys MinIO with pre-configured buckets, policies, versioning, and lifecycle rules. Because MinIO is S3-compatible, you can use the same AWS SDKs and tools your team already knows. The automation ensures that every MinIO deployment, whether for development, staging, or production, starts with identical configuration.

## Common Use Cases

Here are several practical scenarios where this module proves essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating this module
- name: Infrastructure provisioning
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install required packages
      ansible.builtin.package:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - jq
        state: present

    - name: Configure system timezone
      ansible.builtin.timezone:
        name: "{{ system_timezone | default('UTC') }}"

    - name: Configure hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}"

    - name: Configure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"

    - name: Enable firewall
      community.general.ufw:
        state: enabled
        policy: deny

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on system specs
  hosts: all
  become: true
  tasks:
    - name: Set monitoring thresholds based on hardware
      ansible.builtin.template:
        src: monitoring_config.yml.j2
        dest: /etc/monitoring/config.yml
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling with this module
- name: Robust task execution
  hosts: all
  tasks:
    - name: Attempt primary operation
      ansible.builtin.command: /opt/app/primary-task.sh
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.builtin.command: /opt/app/fallback-task.sh
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using cron
- name: Configure automated scans
  hosts: all
  become: true
  tasks:
    - name: Create scan script
      ansible.builtin.copy:
        dest: /opt/scripts/compliance_scan.sh
        mode: '0755'
        content: |
          #!/bin/bash
          cd /opt/ansible
          ansible-playbook playbooks/validate.yml -i inventory/ > /var/log/compliance_scan.log 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            curl -X POST https://hooks.example.com/alert \
              -H "Content-Type: application/json" \
              -d "{\"text\":\"Compliance scan failed on $(hostname)\"}"
          fi
          exit $EXIT_CODE

    - name: Schedule weekly compliance scan
      ansible.builtin.cron:
        name: "Weekly compliance scan"
        minute: "0"
        hour: "3"
        weekday: "1"
        job: "/opt/scripts/compliance_scan.sh"
        user: ansible
```

