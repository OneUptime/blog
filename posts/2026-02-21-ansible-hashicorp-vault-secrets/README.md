# How to Use Ansible with HashiCorp Vault for Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, HashiCorp Vault, Secrets Management, Security

Description: Integrate Ansible with HashiCorp Vault to securely retrieve and manage secrets during playbook execution across your infrastructure.

---

Managing secrets in Ansible playbooks is a challenge. Ansible Vault encrypts files, but it still stores secrets alongside your code. HashiCorp Vault provides a centralized secrets management platform, and Ansible integrates with it through lookup plugins and modules.

This post shows how to connect Ansible with HashiCorp Vault for dynamic secret retrieval.

## Why HashiCorp Vault with Ansible

Ansible Vault encrypts secrets at rest, but the secrets are still static. HashiCorp Vault provides dynamic secrets (generated on demand), automatic rotation, audit logging, and fine-grained access policies. Combining them gives you the best of both worlds.

```mermaid
graph LR
    A[Ansible Playbook] --> B[Vault Lookup Plugin]
    B --> C[HashiCorp Vault API]
    C --> D[Return Secret]
    D --> A
```

## Setting Up the Integration

Install the HashiCorp Vault collection:

```bash
# Install the community HashiCorp collection
ansible-galaxy collection install community.hashi_vault
```

Configure Vault connection in your ansible.cfg or environment:

```ini
# ansible.cfg
[hashi_vault_connection]
url = https://vault.example.com:8200
auth_method = token
```

Or set environment variables:

```bash
export VAULT_ADDR=https://vault.example.com:8200
export VAULT_TOKEN=s.your-vault-token
```

## Using the Vault Lookup Plugin

The lookup plugin retrieves secrets inline during playbook execution:

```yaml
# playbooks/deploy-with-vault.yml
# Deploy application using secrets from Vault
---
- name: Deploy application with Vault secrets
  hosts: app_servers
  become: true
  vars:
    db_password: "{{ lookup('community.hashi_vault.hashi_vault', 'secret/data/database/production', token=vault_token) }}"

  tasks:
    - name: Deploy database configuration
      ansible.builtin.template:
        src: database.yml.j2
        dest: "{{ app_config_dir }}/database.yml"
        mode: '0640'
      vars:
        db_pass: "{{ lookup('community.hashi_vault.hashi_vault', 'secret/data/database/production token=' + vault_token) | from_json }}"
      no_log: true
      notify: restart application
```

## Retrieving KV Secrets

```yaml
# tasks/get-vault-secrets.yml
# Retrieve secrets from Vault KV v2 engine
---
- name: Get database credentials
  ansible.builtin.set_fact:
    db_creds: "{{ lookup('community.hashi_vault.vault_kv2_get', 'database/production', engine_mount_point='secret') }}"
  no_log: true

- name: Use retrieved credentials
  ansible.builtin.template:
    src: app-config.j2
    dest: /etc/myapp/config.yml
    mode: '0640'
  vars:
    database_user: "{{ db_creds.secret.username }}"
    database_password: "{{ db_creds.secret.password }}"
  no_log: true
```

## Dynamic Database Credentials

Vault can generate temporary database credentials on the fly:

```yaml
# tasks/dynamic-db-creds.yml
# Get dynamic database credentials from Vault
---
- name: Generate dynamic database credentials
  ansible.builtin.set_fact:
    dynamic_creds: "{{ lookup('community.hashi_vault.vault_read', 'database/creds/app-role') }}"
  no_log: true

- name: Deploy config with dynamic credentials
  ansible.builtin.template:
    src: database.yml.j2
    dest: "{{ app_config_dir }}/database.yml"
    mode: '0640'
  vars:
    db_user: "{{ dynamic_creds.data.username }}"
    db_pass: "{{ dynamic_creds.data.password }}"
    db_lease_id: "{{ dynamic_creds.lease_id }}"
  no_log: true
  notify: restart application
```

## AppRole Authentication

For automation, use AppRole instead of static tokens:

```yaml
# playbooks/vault-approle-auth.yml
# Authenticate to Vault using AppRole
---
- name: Authenticate and retrieve secrets
  hosts: app_servers
  vars:
    vault_addr: https://vault.example.com:8200

  tasks:
    - name: Authenticate with AppRole
      ansible.builtin.uri:
        url: "{{ vault_addr }}/v1/auth/approle/login"
        method: POST
        body_format: json
        body:
          role_id: "{{ vault_role_id }}"
          secret_id: "{{ vault_secret_id }}"
      register: vault_auth
      no_log: true

    - name: Set Vault token
      ansible.builtin.set_fact:
        vault_token: "{{ vault_auth.json.auth.client_token }}"
      no_log: true

    - name: Retrieve application secrets
      ansible.builtin.set_fact:
        app_secrets: "{{ lookup('community.hashi_vault.vault_kv2_get', 'app/production', token=vault_token, url=vault_addr) }}"
      no_log: true
```

## Writing Secrets to Vault

Ansible can also write secrets back to Vault:

```yaml
# tasks/write-to-vault.yml
# Store generated secrets in Vault
---
- name: Generate new API key
  ansible.builtin.set_fact:
    new_api_key: "{{ lookup('password', '/dev/null length=48 chars=ascii_letters,digits') }}"
  no_log: true

- name: Store in Vault
  community.hashi_vault.vault_kv2_write:
    url: "{{ vault_addr }}"
    token: "{{ vault_token }}"
    engine_mount_point: secret
    path: "api-keys/{{ service_name }}"
    data:
      key: "{{ new_api_key }}"
      created_at: "{{ ansible_date_time.iso8601 }}"
      created_by: ansible
  no_log: true
```

## Vault Agent for Token Management

For long-running automation, use Vault Agent to handle token renewal:

```yaml
# roles/vault_agent/tasks/main.yml
# Install and configure Vault Agent for auto-auth
---
- name: Install Vault binary
  ansible.builtin.get_url:
    url: "https://releases.hashicorp.com/vault/{{ vault_version }}/vault_{{ vault_version }}_linux_amd64.zip"
    dest: /tmp/vault.zip
    mode: '0644'

- name: Extract Vault binary
  ansible.builtin.unarchive:
    src: /tmp/vault.zip
    dest: /usr/local/bin/
    remote_src: true

- name: Deploy Vault Agent config
  ansible.builtin.template:
    src: vault-agent.hcl.j2
    dest: /etc/vault-agent.hcl
    mode: '0640'

- name: Create Vault Agent systemd service
  ansible.builtin.template:
    src: vault-agent.service.j2
    dest: /etc/systemd/system/vault-agent.service
    mode: '0644'
  notify:
    - daemon reload
    - start vault agent
```

## Key Takeaways

Integrating Ansible with HashiCorp Vault gives you centralized secret management with audit trails and automatic rotation. Use the lookup plugin for inline secret retrieval. Use AppRole for machine authentication instead of static tokens. Leverage dynamic secrets for database credentials that expire automatically. Always use no_log on tasks that handle secrets to prevent them from appearing in Ansible output. This combination provides much stronger security than managing secrets as encrypted files in your repository.

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

