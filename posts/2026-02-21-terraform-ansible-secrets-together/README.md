# How to Handle Terraform and Ansible Secrets Together

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Terraform, Secrets, Vault, Security

Description: Manage secrets across Terraform and Ansible using HashiCorp Vault, environment variables, and encrypted variable files.

---

Both Terraform and Ansible need secrets: API keys, database passwords, SSH keys, and certificates. Managing these secrets consistently across both tools is critical for security and operational efficiency.

## Strategy 1: HashiCorp Vault for Both

```hcl
# Terraform reads from Vault
data "vault_generic_secret" "db" {
  path = "secret/data/production/database"
}

resource "aws_db_instance" "main" {
  username = data.vault_generic_secret.db.data["username"]
  password = data.vault_generic_secret.db.data["password"]
}
```

```yaml
# Ansible reads from the same Vault
- hosts: app_servers
  vars:
    db_password: "{{ lookup('community.hashi_vault.hashi_vault', 'secret/data/production/database:password') }}"
  tasks:
    - name: Deploy app config with database password
      template:
        src: database.yml.j2
        dest: /opt/app/config/database.yml
```

## Strategy 2: Environment Variables

```bash
# Both tools read from environment
export TF_VAR_db_password="secret123"
export ANSIBLE_DB_PASSWORD="secret123"

# Terraform uses TF_VAR_ prefix
terraform apply

# Ansible reads via lookup
# {{ lookup('env', 'ANSIBLE_DB_PASSWORD') }}
ansible-playbook playbook.yml
```

## Strategy 3: Ansible Vault for Both

```bash
# Encrypt shared secrets file
ansible-vault encrypt shared_secrets.yml
```

```yaml
# shared_secrets.yml (encrypted)
db_password: supersecret
api_key: abc123
ssl_cert_password: certpass
```

```yaml
# Ansible uses it directly
- hosts: all
  vars_files:
    - shared_secrets.yml
```

```bash
# Terraform reads it via external data source or script
# data "external" "secrets" {
#   program = ["ansible-vault", "view", "shared_secrets.yml", "--vault-password-file", "~/.vault_pass"]
# }
```

## Best Practices

1. Never commit secrets to version control
2. Use a single source of truth (Vault, AWS Secrets Manager, etc.)
3. Rotate secrets regularly
4. Audit secret access
5. Use least-privilege access for both tools

## Summary

The best approach is using a centralized secrets manager like HashiCorp Vault that both Terraform and Ansible can access. This ensures consistency, enables rotation, and provides audit logging. If Vault is too much overhead for your team, Ansible Vault with environment variables for Terraform is a simpler alternative that still keeps secrets out of version control.

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

