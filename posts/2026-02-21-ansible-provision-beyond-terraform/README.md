# How to Use Ansible to Provision Resources Terraform Cannot Manage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Terraform, Provisioning, Configuration, DevOps

Description: Use Ansible to manage resources and configurations that fall outside Terraform's provider ecosystem including legacy systems and custom APIs.

---

Terraform's provider ecosystem is extensive but not unlimited. There are resources and configurations that Terraform cannot manage: legacy systems without APIs, internal tools without Terraform providers, complex multi-step provisioning procedures, and configurations that require imperative logic. Ansible fills these gaps.

## Common Gaps Ansible Fills

```yaml
# Things Terraform cannot do but Ansible can:

# 1. Configure legacy systems via SSH
- name: Configure legacy application server
  hosts: legacy_servers
  tasks:
    - name: Edit proprietary config file
      lineinfile:
        path: /opt/legacyapp/config.ini
        regexp: '^database_host='
        line: "database_host={{ db_host }}"

# 2. Run complex multi-step provisioning
- name: Initialize application database
  hosts: db_servers
  tasks:
    - name: Run database migrations
      command: /opt/app/manage.py migrate
    - name: Load initial data
      command: /opt/app/manage.py loaddata initial.json
    - name: Create admin user
      command: /opt/app/manage.py createsuperuser --noinput

# 3. Interact with systems that have no API
- name: Configure network switch via SSH
  hosts: network_switches
  tasks:
    - name: Push switch configuration
      ansible.netcommon.cli_config:
        config: "{{ lookup('template', 'switch_config.j2') }}"

# 4. Coordinate across multiple systems
- name: Rolling restart with load balancer drain
  hosts: webservers
  serial: 1
  tasks:
    - name: Drain from load balancer
      uri:
        url: "http://lb.internal/api/drain/{{ inventory_hostname }}"
        method: POST
      delegate_to: localhost
    - name: Wait for connections to drain
      pause:
        seconds: 30
    - name: Restart application
      systemd:
        name: app
        state: restarted
    - name: Wait for health check
      uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        status_code: 200
      retries: 10
      delay: 5
    - name: Re-enable in load balancer
      uri:
        url: "http://lb.internal/api/enable/{{ inventory_hostname }}"
        method: POST
      delegate_to: localhost
```

## Summary

Ansible complements Terraform by handling everything that falls outside Terraform's provider-based model: legacy system configuration, complex procedural workflows, cross-system orchestration, and ad-hoc operational tasks. Together, they cover the complete spectrum of infrastructure management.

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

