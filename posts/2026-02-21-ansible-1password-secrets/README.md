# How to Use Ansible with 1Password for Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, 1Password, Secrets Management, Security

Description: Retrieve secrets from 1Password vaults during Ansible playbook execution using the 1Password CLI and lookup plugins.

---

1Password is a popular password manager that also works for team secrets management. Ansible can retrieve secrets from 1Password vaults using the 1Password CLI, making it easy to keep secrets out of your playbooks.

## Setup

Install the 1Password CLI:

```yaml
# roles/onepassword_setup/tasks/main.yml
---
- name: Install 1Password CLI
  ansible.builtin.get_url:
    url: "https://cache.agilebits.com/dist/1P/op2/pkg/v{{ op_version }}/op_linux_amd64_v{{ op_version }}.zip"
    dest: /tmp/op.zip
    mode: '0644'

- name: Extract 1Password CLI
  ansible.builtin.unarchive:
    src: /tmp/op.zip
    dest: /usr/local/bin/
    remote_src: true
```

## Retrieving Secrets

```yaml
# playbooks/deploy-with-1password.yml
---
- name: Deploy with 1Password secrets
  hosts: app_servers
  become: true
  vars:
    db_password: "{{ lookup('pipe', 'op read op://Production/DatabaseAdmin/password') }}"
    api_key: "{{ lookup('pipe', 'op read op://Production/StripeAPI/credential') }}"

  tasks:
    - name: Deploy application config
      ansible.builtin.template:
        src: config.yml.j2
        dest: "{{ app_config_dir }}/config.yml"
        mode: '0640'
      no_log: true
      notify: restart application
```

## Using 1Password Service Accounts

For automation, use service accounts instead of personal accounts:

```bash
# Set the service account token
export OP_SERVICE_ACCOUNT_TOKEN="ops_your_token_here"
```

```yaml
# tasks/1password-secrets.yml
---
- name: Retrieve all app secrets from 1Password
  ansible.builtin.set_fact:
    app_secrets:
      db_password: "{{ lookup('pipe', 'op read op://Production/Database/password') }}"
      redis_password: "{{ lookup('pipe', 'op read op://Production/Redis/password') }}"
      jwt_secret: "{{ lookup('pipe', 'op read op://Production/JWT/secret') }}"
  no_log: true
```

## Key Takeaways

1Password with Ansible provides a user-friendly way to manage secrets for automation. Use the 1Password CLI with the pipe lookup plugin to retrieve secrets at runtime. Service accounts provide non-interactive access for CI/CD pipelines. Always use no_log to prevent secrets from appearing in Ansible output.

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

