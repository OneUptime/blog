# How to Use Ansible with Semaphore UI for Web Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Semaphore, Web UI, DevOps

Description: Deploy Semaphore UI as a web-based interface for running Ansible playbooks with scheduling, access control, and execution history.

---

Semaphore is an open-source web UI for Ansible. It provides a visual interface for running playbooks, managing inventories, scheduling jobs, and tracking execution history. This makes Ansible accessible to team members who are not comfortable with the command line.

## Installing Semaphore with Ansible

```yaml
# roles/semaphore/tasks/main.yml
---
- name: Install prerequisites
  ansible.builtin.apt:
    name:
      - git
      - python3
      - python3-pip
    state: present

- name: Install Ansible
  ansible.builtin.pip:
    name: ansible
    state: present

- name: Download Semaphore
  ansible.builtin.get_url:
    url: "https://github.com/ansible-semaphore/semaphore/releases/download/v{{ semaphore_version }}/semaphore_{{ semaphore_version }}_linux_amd64.deb"
    dest: /tmp/semaphore.deb
    mode: '0644'

- name: Install Semaphore
  ansible.builtin.apt:
    deb: /tmp/semaphore.deb
    state: present

- name: Create Semaphore config directory
  ansible.builtin.file:
    path: /etc/semaphore
    state: directory
    mode: '0755'

- name: Deploy Semaphore configuration
  ansible.builtin.template:
    src: config.json.j2
    dest: /etc/semaphore/config.json
    mode: '0640'

- name: Create systemd service
  ansible.builtin.copy:
    content: |
      [Unit]
      Description=Semaphore Ansible UI
      After=network.target
      [Service]
      Type=simple
      ExecStart=/usr/bin/semaphore server --config /etc/semaphore/config.json
      Restart=always
      [Install]
      WantedBy=multi-user.target
    dest: /etc/systemd/system/semaphore.service
    mode: '0644'
  notify:
    - daemon reload
    - restart semaphore

- name: Ensure Semaphore is running
  ansible.builtin.service:
    name: semaphore
    state: started
    enabled: true
```

## Semaphore Configuration

```json
{
  "mysql": {
    "host": "{{ db_host }}:3306",
    "user": "{{ semaphore_db_user }}",
    "pass": "{{ semaphore_db_password }}",
    "name": "semaphore"
  },
  "port": "{{ semaphore_port | default('3000') }}",
  "interface": "0.0.0.0",
  "tmp_path": "/tmp/semaphore",
  "cookie_hash": "{{ semaphore_cookie_hash }}",
  "cookie_encryption": "{{ semaphore_cookie_encryption }}",
  "access_key_encryption": "{{ semaphore_access_key_encryption }}"
}
```

## Setting Up Projects

```yaml
# tasks/semaphore-setup.yml
---
- name: Create admin user
  ansible.builtin.command:
    cmd: >
      semaphore user add
      --config /etc/semaphore/config.json
      --login admin
      --name "Admin"
      --email admin@example.com
      --password {{ semaphore_admin_password }}
      --admin
  changed_when: true
  no_log: true
```

## Key Takeaways

Semaphore provides a user-friendly web interface for Ansible that includes job scheduling, access control, and execution history. Install it with Ansible for a self-managing setup. It is a great option for teams that want the power of Ansible with a visual interface for non-CLI users.

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

