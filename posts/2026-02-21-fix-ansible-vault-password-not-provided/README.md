# How to Fix Ansible Vault Password Not Provided Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Encryption, Troubleshooting, Security

Description: Resolve Ansible Vault password errors with proper password file configuration, environment variables, and vault ID management.

---

When you try to run a playbook that references vault-encrypted files without providing the decryption password, Ansible throws an error. This happens because the playbook needs to decrypt variables but has no way to do so.

## The Error

```
ERROR! Attempting to decrypt but no vault secrets found
```

Or:

```
fatal: [server1]: FAILED! => {"msg": "Attempting to decrypt but no vault secrets found"}
```

## Common Causes and Fixes

### Fix 1: Provide the Password Interactively

The simplest approach:

```bash
# Prompt for the vault password when running the playbook
ansible-playbook playbook.yml --ask-vault-pass
```

### Fix 2: Use a Password File

For automation and CI/CD, use a file:

```bash
# Create a password file (make sure it is not committed to git!)
echo "your-vault-password" > ~/.vault_pass.txt
chmod 600 ~/.vault_pass.txt

# Reference it in the command
ansible-playbook playbook.yml --vault-password-file ~/.vault_pass.txt
```

### Fix 3: Set It in ansible.cfg

```ini
# ansible.cfg - Default vault password file
[defaults]
vault_password_file = ~/.vault_pass.txt
```

### Fix 4: Use an Environment Variable

```bash
# Set the vault password via environment variable
export ANSIBLE_VAULT_PASSWORD_FILE=~/.vault_pass.txt
ansible-playbook playbook.yml
```

### Fix 5: Use a Script for Dynamic Passwords

```bash
#!/bin/bash
# ~/.vault_pass_script.sh - Fetch password from a secrets manager
# This script must output the password to stdout
aws secretsmanager get-secret-value --secret-id ansible-vault --query SecretString --output text
```

```ini
# ansible.cfg - Use a script instead of a file
[defaults]
vault_password_file = ~/.vault_pass_script.sh
```

### Fix 6: Using Vault IDs for Multiple Passwords

```bash
# Encrypt with a vault ID
ansible-vault encrypt --vault-id prod@~/.vault_pass_prod.txt secrets.yml

# Decrypt by providing the matching vault ID
ansible-playbook playbook.yml --vault-id prod@~/.vault_pass_prod.txt
```

### Fix 7: The File Is Not Actually Encrypted

Sometimes the file was meant to be encrypted but was not:

```bash
# Check if a file is vault-encrypted (starts with $ANSIBLE_VAULT)
head -1 group_vars/all/vault.yml

# If it is not encrypted but contains vault references, encrypt it
ansible-vault encrypt group_vars/all/vault.yml
```

## Summary

The vault password error is purely an authentication issue. Ansible needs the password to decrypt vault-encrypted content, and you need to tell it where to find that password. For development, `--ask-vault-pass` works fine. For CI/CD, use a password file or a script that retrieves the password from a secrets manager. Just make sure the password file itself is never committed to version control.

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

