# How to Fix Ansible No module named Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Python, Troubleshooting, Modules, Dependencies

Description: Resolve Ansible no module named errors caused by missing Python libraries, wrong Python interpreter, and collection installation issues.

---

The "No module named" error means a Python library required by an Ansible module is not installed on the target host (or sometimes the control node). Ansible modules are Python scripts that run on the target, so they need their dependencies available there.

## The Error

```
fatal: [server1]: FAILED! => {
    "msg": "No module named 'pymysql'"
}
```

Or:

```
fatal: [server1]: FAILED! => {
    "msg": "Failed to import the required Python library (docker) on server1's Python /usr/bin/python3"
}
```

## Fixes

### Fix 1: Install the Python Library on the Target

```yaml
# Install the missing Python package on the remote host
- name: Install PyMySQL for MySQL modules
  pip:
    name: pymysql
    state: present
  become: yes

# Or via apt for system packages
- name: Install Python MySQL library
  apt:
    name: python3-pymysql
    state: present
  become: yes
```

Common module dependencies:

| Ansible Module | Python Package | Apt Package |
|---|---|---|
| mysql_db / mysql_user | pymysql | python3-pymysql |
| postgresql_db | psycopg2 | python3-psycopg2 |
| docker_container | docker | python3-docker |
| pip | pip | python3-pip |
| uri (with HTTPS) | urllib3 | python3-urllib3 |

### Fix 2: Wrong Python Interpreter

```ini
# Specify the correct Python interpreter
[all:vars]
ansible_python_interpreter=/usr/bin/python3
```

Or per-host:

```ini
server1 ansible_host=10.0.1.10 ansible_python_interpreter=/usr/bin/python3
```

### Fix 3: Missing Ansible Collection

If the error mentions an Ansible module (not a Python library):

```bash
# Install the required collection
ansible-galaxy collection install community.mysql
ansible-galaxy collection install community.docker
ansible-galaxy collection install community.postgresql
```

### Fix 4: Virtual Environment Issues

```yaml
# If using a virtualenv, install there
- name: Install library in virtualenv
  pip:
    name: pymysql
    virtualenv: /opt/app/venv
```

### Fix 5: Install Dependencies as a Pre-Task

```yaml
# Install module dependencies before using them
- hosts: db_servers
  become: yes
  pre_tasks:
    - name: Install Python MySQL library
      apt:
        name: python3-pymysql
        state: present
  tasks:
    - name: Create database
      mysql_db:
        name: myapp
        state: present
```

## Summary

"No module named" errors mean a Python dependency is missing where Ansible needs it. The fix is installing the package on the target host using pip or the system package manager. Check which Python interpreter Ansible is using with `-vvv` and install the library for that specific Python version. Using a pre-task to install dependencies before the main tasks guarantees availability.

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

