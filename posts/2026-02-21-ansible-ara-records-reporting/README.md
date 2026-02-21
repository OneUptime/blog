# How to Use Ansible with ARA Records Ansible for Reporting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ARA, Reporting, DevOps

Description: Install and configure ARA to record and browse Ansible playbook execution results with a web interface and API.

---

ARA (ARA Records Ansible) is a tool that records Ansible playbook runs and provides a web interface and API to browse the results. It captures every task, host, and result, making it invaluable for debugging and auditing.

## Installing ARA

```yaml
# roles/ara/tasks/main.yml
---
- name: Install ARA
  ansible.builtin.pip:
    name:
      - "ara[server]"
    state: present

- name: Configure ARA callback
  ansible.builtin.blockinfile:
    path: /etc/ansible/ansible.cfg
    block: |
      [defaults]
      callback_plugins = {{ ara_callback_path }}
      [ara]
      api_client = http
      api_server = http://{{ ara_server_host }}:{{ ara_server_port }}

- name: Create ARA systemd service
  ansible.builtin.copy:
    content: |
      [Unit]
      Description=ARA API Server
      After=network.target
      [Service]
      Type=simple
      ExecStart=/usr/local/bin/ara-manage runserver 0.0.0.0:{{ ara_server_port }}
      Environment=ARA_DATABASE_NAME=/var/lib/ara/ansible.sqlite
      [Install]
      WantedBy=multi-user.target
    dest: /etc/systemd/system/ara.service
    mode: '0644'
  notify:
    - daemon reload
    - start ara

- name: Ensure ARA is running
  ansible.builtin.service:
    name: ara
    state: started
    enabled: true
```

## Querying ARA API

```yaml
# tasks/ara-query.yml
---
- name: Get recent playbook runs
  ansible.builtin.uri:
    url: "http://{{ ara_server_host }}:{{ ara_server_port }}/api/v1/playbooks?order=-started&limit=10"
  register: recent_runs

- name: Display recent runs
  ansible.builtin.debug:
    msg: "{{ item.path }} - {{ item.status }} - {{ item.started }}"
  loop: "{{ recent_runs.json.results }}"
```

## Key Takeaways

ARA provides complete visibility into every Ansible playbook run. Install the callback plugin to record automatically. Use the web interface for browsing results and the API for programmatic access. It is essential for teams that need audit trails and debugging capabilities for their Ansible automation.

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

