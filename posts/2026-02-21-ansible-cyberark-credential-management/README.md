# How to Use Ansible with CyberArk for Credential Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, CyberArk, Credentials, Security

Description: Integrate Ansible with CyberArk Privilege Access Management to retrieve privileged credentials securely during playbook execution.

---

CyberArk is an enterprise privileged access management platform. Ansible can retrieve credentials from CyberArk vaults using lookup plugins, eliminating the need to store sensitive credentials in playbooks or variable files.

## Integration Architecture

```mermaid
graph LR
    A[Ansible Playbook] --> B[CyberArk Lookup]
    B --> C[CyberArk Vault]
    C --> D[Return Credential]
    D --> A
```

## Installing the CyberArk Collection

```bash
ansible-galaxy collection install cyberark.conjur
ansible-galaxy collection install cyberark.pas
```

## Retrieving Credentials

```yaml
# playbooks/deploy-with-cyberark.yml
---
- name: Deploy with CyberArk credentials
  hosts: app_servers
  become: true
  vars:
    db_password: "{{ lookup('cyberark.pas.cyberark_credential', 'Database-Production-Admin', query='Content') }}"

  tasks:
    - name: Deploy database configuration
      ansible.builtin.template:
        src: database.yml.j2
        dest: "{{ app_config_dir }}/database.yml"
        mode: '0640'
      no_log: true
      notify: restart application
```

## CyberArk Central Credential Provider

```yaml
# tasks/cyberark-ccp.yml
---
- name: Retrieve credential from CyberArk CCP
  ansible.builtin.uri:
    url: "https://{{ cyberark_ccp_host }}/AIMWebService/api/Accounts?AppID={{ app_id }}&Safe={{ safe_name }}&Object={{ object_name }}"
    method: GET
    validate_certs: true
    client_cert: "{{ cyberark_client_cert }}"
    client_key: "{{ cyberark_client_key }}"
  register: cyberark_cred
  no_log: true

- name: Set credential fact
  ansible.builtin.set_fact:
    retrieved_password: "{{ cyberark_cred.json.Content }}"
  no_log: true
```

## Key Takeaways

CyberArk integration with Ansible keeps privileged credentials out of your playbooks and variable files. Use the lookup plugin for inline credential retrieval or the CCP API for programmatic access. Always use no_log on tasks handling credentials to prevent them from appearing in output.

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

