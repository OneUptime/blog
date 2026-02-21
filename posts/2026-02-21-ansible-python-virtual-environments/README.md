# How to Use Ansible with Python Virtual Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Python, Virtual Environments, venv, pip

Description: Configure Ansible to work with Python virtual environments on both the control node and remote hosts for isolated dependency management.

---

Python virtual environments isolate dependencies so different projects can use different package versions without conflicts. When working with Ansible, virtual environments come into play in two places: on the control node where Ansible runs, and on remote hosts where Ansible modules execute. This guide covers both scenarios.

## Installing Ansible in a Virtual Environment

The recommended way to install Ansible on your control node is inside a virtual environment. This prevents conflicts with system Python packages.

```bash
# Create a virtual environment for Ansible
python3 -m venv ~/ansible-venv

# Activate it
source ~/ansible-venv/bin/activate

# Install Ansible
pip install ansible ansible-lint molecule

# Verify
ansible --version
```

Create a wrapper script so you do not need to activate manually:

```bash
#!/bin/bash
# ~/bin/ansible-playbook - Wrapper that uses the venv
exec ~/ansible-venv/bin/ansible-playbook "$@"
```

## Managing Virtual Environments on Remote Hosts

Use Ansible to create and manage virtual environments for your applications:

```yaml
---
- name: Deploy Python application with virtual environment
  hosts: app_servers
  become: true

  vars:
    app_name: myapp
    app_dir: /opt/myapp
    venv_dir: /opt/myapp/venv
    python_version: python3.11

  tasks:
    - name: Install Python and venv package
      ansible.builtin.apt:
        name:
          - "{{ python_version }}"
          - "{{ python_version }}-venv"
          - "{{ python_version }}-dev"
        state: present

    - name: Create application directory
      ansible.builtin.file:
        path: "{{ app_dir }}"
        state: directory
        owner: www-data
        group: www-data
        mode: '0755'

    - name: Create virtual environment
      ansible.builtin.pip:
        virtualenv: "{{ venv_dir }}"
        virtualenv_command: "{{ python_version }} -m venv"
        name: pip
        state: latest

    - name: Install application dependencies
      ansible.builtin.pip:
        virtualenv: "{{ venv_dir }}"
        requirements: "{{ app_dir }}/requirements.txt"

    - name: Install specific packages
      ansible.builtin.pip:
        virtualenv: "{{ venv_dir }}"
        name:
          - gunicorn==21.2.0
          - uvicorn==0.25.0

    - name: Deploy systemd service using the venv Python
      ansible.builtin.copy:
        content: |
          [Unit]
          Description={{ app_name }}
          After=network.target

          [Service]
          Type=simple
          User=www-data
          WorkingDirectory={{ app_dir }}
          ExecStart={{ venv_dir }}/bin/gunicorn app:app -b 0.0.0.0:8000
          Restart=always

          [Install]
          WantedBy=multi-user.target
        dest: "/etc/systemd/system/{{ app_name }}.service"
        mode: '0644'
      notify: restart app

  handlers:
    - name: restart app
      ansible.builtin.systemd:
        name: "{{ app_name }}"
        state: restarted
        daemon_reload: true
```

## Running Ansible Modules in a Remote venv

If your Ansible modules need specific Python packages on the remote host, point the interpreter to the venv:

```yaml
- name: Run tasks using specific Python from venv
  hosts: app_servers
  vars:
    ansible_python_interpreter: /opt/myapp/venv/bin/python

  tasks:
    - name: This task uses the venv Python
      ansible.builtin.command: python -c "import django; print(django.VERSION)"
```

## Upgrading Virtual Environments

```yaml
    - name: Upgrade pip in the virtual environment
      ansible.builtin.pip:
        virtualenv: "{{ venv_dir }}"
        name:
          - pip
          - setuptools
          - wheel
        state: latest

    - name: Upgrade all packages in venv
      ansible.builtin.pip:
        virtualenv: "{{ venv_dir }}"
        requirements: "{{ app_dir }}/requirements.txt"
        state: latest
```

## Cleaning Up Old Virtual Environments

```yaml
    - name: Remove old virtual environment
      ansible.builtin.file:
        path: "{{ venv_dir }}"
        state: absent

    - name: Recreate fresh virtual environment
      ansible.builtin.pip:
        virtualenv: "{{ venv_dir }}"
        virtualenv_command: "{{ python_version }} -m venv"
        requirements: "{{ app_dir }}/requirements.txt"
```

## Summary

Virtual environments are essential for isolating Python dependencies. Install Ansible itself in a venv on your control node to avoid system package conflicts. On remote hosts, use the `ansible.builtin.pip` module with the `virtualenv` parameter to create and manage venvs. Point `ansible_python_interpreter` to a venv's Python when you need Ansible modules to use specific packages. Always use the venv Python path in systemd services and cron jobs.

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

