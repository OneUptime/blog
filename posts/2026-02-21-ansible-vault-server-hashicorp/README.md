# How to Use Ansible to Set Up a Vault Server (HashiCorp)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, HashiCorp Vault, Secrets Management, Security, DevOps

Description: Deploy a HashiCorp Vault server with auto-unseal, secret engines, authentication backends, and policies using Ansible automation.

---

Storing secrets in plain text files, environment variables, or configuration management tools is a known security risk. HashiCorp Vault solves this by providing a centralized secrets management system with access control, audit logging, dynamic credentials, and encryption as a service. Deploying Vault properly involves setting up the storage backend, configuring TLS, initializing the seal, enabling secret engines, and defining access policies. Ansible automates all of this into a repeatable process.

## Role Defaults

```yaml
# roles/vault/defaults/main.yml - Vault server configuration
vault_version: "1.15.4"
vault_domain: vault.example.internal
vault_api_port: 8200
vault_cluster_port: 8201
vault_data_dir: /opt/vault/data
vault_config_dir: /etc/vault.d
vault_log_dir: /var/log/vault

# Storage backend (file for single node, consul for HA)
vault_storage_backend: file

# TLS configuration
vault_tls_enabled: true
vault_tls_cert_file: "{{ vault_config_dir }}/tls/vault-cert.pem"
vault_tls_key_file: "{{ vault_config_dir }}/tls/vault-key.pem"

# Secret engines to enable
vault_secret_engines:
  - path: secret
    type: kv-v2
  - path: database
    type: database
  - path: pki
    type: pki

# Auth methods to enable
vault_auth_methods:
  - type: userpass
  - type: approle
```

## Main Tasks

```yaml
# roles/vault/tasks/main.yml - Install and configure Vault
---
- name: Create vault system user
  user:
    name: vault
    system: yes
    shell: /usr/sbin/nologin
    create_home: no

- name: Create Vault directories
  file:
    path: "{{ item }}"
    state: directory
    owner: vault
    group: vault
    mode: '0755'
  loop:
    - "{{ vault_data_dir }}"
    - "{{ vault_config_dir }}"
    - "{{ vault_config_dir }}/tls"
    - "{{ vault_log_dir }}"

- name: Download Vault binary
  get_url:
    url: "https://releases.hashicorp.com/vault/{{ vault_version }}/vault_{{ vault_version }}_linux_amd64.zip"
    dest: /tmp/vault.zip

- name: Install unzip
  apt:
    name: unzip
    state: present

- name: Extract Vault binary
  unarchive:
    src: /tmp/vault.zip
    dest: /usr/local/bin/
    remote_src: yes
    creates: /usr/local/bin/vault

- name: Set Vault binary capabilities
  capabilities:
    path: /usr/local/bin/vault
    capability: cap_ipc_lock=+ep
    state: present

- name: Deploy TLS certificates
  copy:
    src: "{{ item.src }}"
    dest: "{{ item.dest }}"
    owner: vault
    group: vault
    mode: '0600'
  loop:
    - { src: "files/vault-cert.pem", dest: "{{ vault_tls_cert_file }}" }
    - { src: "files/vault-key.pem", dest: "{{ vault_tls_key_file }}" }
  when: vault_tls_enabled
  notify: restart vault

- name: Deploy Vault configuration
  template:
    src: vault.hcl.j2
    dest: "{{ vault_config_dir }}/vault.hcl"
    owner: vault
    group: vault
    mode: '0640'
  notify: restart vault

- name: Create Vault systemd service
  template:
    src: vault.service.j2
    dest: /etc/systemd/system/vault.service
    mode: '0644'
  notify:
    - reload systemd
    - restart vault

- name: Start and enable Vault
  systemd:
    name: vault
    state: started
    enabled: yes
    daemon_reload: yes

- name: Wait for Vault to be available
  uri:
    url: "{{ vault_tls_enabled | ternary('https', 'http') }}://127.0.0.1:{{ vault_api_port }}/v1/sys/health"
    validate_certs: no
    status_code: [200, 429, 472, 473, 501, 503]
  register: vault_health
  until: vault_health.status is defined
  retries: 15
  delay: 5
```

## Vault Configuration Template

```hcl
# roles/vault/templates/vault.hcl.j2 - Vault server configuration
ui = true
disable_mlock = false

{% if vault_storage_backend == 'file' %}
storage "file" {
  path = "{{ vault_data_dir }}"
}
{% elif vault_storage_backend == 'consul' %}
storage "consul" {
  address = "127.0.0.1:8500"
  path    = "vault/"
}
{% endif %}

listener "tcp" {
  address     = "0.0.0.0:{{ vault_api_port }}"
{% if vault_tls_enabled %}
  tls_cert_file = "{{ vault_tls_cert_file }}"
  tls_key_file  = "{{ vault_tls_key_file }}"
{% else %}
  tls_disable = 1
{% endif %}
}

api_addr = "{{ vault_tls_enabled | ternary('https', 'http') }}://{{ vault_domain }}:{{ vault_api_port }}"
cluster_addr = "https://{{ vault_domain }}:{{ vault_cluster_port }}"

telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = true
}
```

## Systemd Service Template

```ini
# roles/vault/templates/vault.service.j2
[Unit]
Description=HashiCorp Vault
After=network-online.target
Wants=network-online.target

[Service]
User=vault
Group=vault
ExecStart=/usr/local/bin/vault server -config={{ vault_config_dir }}/vault.hcl
ExecReload=/bin/kill -HUP $MAINPID
KillMode=process
KillSignal=SIGINT
Restart=on-failure
RestartSec=5
LimitNOFILE=65536
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
```

## Initialization and Unsealing

Vault needs to be initialized once and unsealed on every restart:

```yaml
# roles/vault/tasks/init.yml - Initialize Vault (run once)
---
- name: Check Vault initialization status
  uri:
    url: "{{ vault_tls_enabled | ternary('https', 'http') }}://127.0.0.1:{{ vault_api_port }}/v1/sys/init"
    validate_certs: no
  register: vault_init_status

- name: Initialize Vault
  uri:
    url: "{{ vault_tls_enabled | ternary('https', 'http') }}://127.0.0.1:{{ vault_api_port }}/v1/sys/init"
    method: PUT
    validate_certs: no
    body_format: json
    body:
      secret_shares: 5
      secret_threshold: 3
  register: vault_init
  when: not vault_init_status.json.initialized

- name: Save Vault init keys securely
  copy:
    content: "{{ vault_init.json | to_nice_json }}"
    dest: "/root/vault-init-keys.json"
    mode: '0400'
  when: vault_init.changed
  no_log: true
```

## Handlers

```yaml
# roles/vault/handlers/main.yml
---
- name: restart vault
  systemd:
    name: vault
    state: restarted

- name: reload systemd
  systemd:
    daemon_reload: yes
```

## Running the Playbook

```bash
# Deploy Vault
ansible-playbook -i inventory/hosts.ini playbook.yml --ask-vault-pass

# After deployment, initialize Vault (one time only)
export VAULT_ADDR='https://vault.example.internal:8200'
vault operator init

# Unseal with 3 of 5 keys
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>
```

## Summary

This Ansible playbook automates the deployment of a HashiCorp Vault server with proper security settings: TLS encryption, mlock capability, and a clean systemd service. The playbook handles installation, configuration, and service setup, while the initialization and unsealing steps are kept separate since they involve sensitive key material that should not be automated without careful consideration. Once Vault is running, it becomes the central hub for all your infrastructure secrets.
