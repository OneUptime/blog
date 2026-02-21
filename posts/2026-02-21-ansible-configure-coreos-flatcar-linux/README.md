# How to Use Ansible to Configure CoreOS/Flatcar Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Flatcar Linux, CoreOS, Containers, Immutable Infrastructure

Description: Manage Flatcar Container Linux with Ansible for container-optimized infrastructure, immutable OS updates, and systemd unit management.

---

Flatcar Container Linux (the successor to CoreOS Container Linux) is an immutable, container-optimized OS. It has a read-only root filesystem, automatic atomic updates, and ships with Docker/containerd. Managing Flatcar with Ansible is different from traditional distributions because you cannot install packages with apt or dnf. Instead, you manage systemd units, container workloads, and configuration files.

## Key Differences

Flatcar is fundamentally different from traditional Linux:

- Read-only root filesystem (no package manager)
- All software runs in containers
- Automatic atomic OS updates via Nebraska/update_engine
- Python is NOT installed (needs special handling for Ansible)
- systemd is the primary configuration tool
- Uses Ignition/cloud-init for initial provisioning

## Bootstrap: Python in a Container

Since Flatcar has no package manager, run Python in a container for Ansible:

```yaml
---
- name: Bootstrap Flatcar for Ansible
  hosts: flatcar
  gather_facts: false
  tasks:
    - name: Install PyPy in a known location
      ansible.builtin.raw: |
        docker run --rm -v /opt/bin:/target alpine sh -c \
        'apk add --no-cache python3 && cp /usr/bin/python3 /target/python3 && \
         cp -r /usr/lib/python3.* /target/'
      changed_when: true
```

Alternatively, use the `ansible_python_interpreter` to point to a toolbox:

```ini
[flatcar:vars]
ansible_user=core
ansible_python_interpreter=/opt/bin/python3
```

## Configuration Playbook

```yaml
---
- name: Configure Flatcar Container Linux
  hosts: flatcar
  become: true

  tasks:
    - name: Verify Flatcar
      ansible.builtin.assert:
        that:
          - ansible_distribution == "Flatcar" or ansible_distribution == "Container Linux by CoreOS"
        fail_msg: "Expected Flatcar Container Linux"

    - name: Configure automatic updates
      ansible.builtin.copy:
        content: |
          GROUP=stable
          REBOOT_STRATEGY=reboot
          LOCKSMITHD_REBOOT_WINDOW_START=02:00
          LOCKSMITHD_REBOOT_WINDOW_LENGTH=1h
        dest: /etc/flatcar/update.conf
        mode: '0644'

    - name: Configure Docker daemon
      ansible.builtin.copy:
        content: |
          {
            "storage-driver": "overlay2",
            "log-driver": "json-file",
            "log-opts": {
              "max-size": "50m",
              "max-file": "3"
            },
            "default-ulimits": {
              "nofile": {
                "Name": "nofile",
                "Hard": 65535,
                "Soft": 65535
              }
            }
          }
        dest: /etc/docker/daemon.json
        mode: '0644'
      notify: restart docker

    - name: Enable and start Docker
      ansible.builtin.systemd:
        name: docker
        enabled: true
        state: started

    - name: Deploy application as systemd unit
      ansible.builtin.copy:
        content: |
          [Unit]
          Description=My Web Application
          After=docker.service
          Requires=docker.service

          [Service]
          TimeoutStartSec=0
          ExecStartPre=-/usr/bin/docker stop myapp
          ExecStartPre=-/usr/bin/docker rm myapp
          ExecStartPre=/usr/bin/docker pull myorg/myapp:latest
          ExecStart=/usr/bin/docker run --name myapp \
            -p 8080:8080 \
            -v /data/myapp:/app/data \
            --restart=unless-stopped \
            myorg/myapp:latest
          ExecStop=/usr/bin/docker stop myapp
          Restart=always
          RestartSec=10

          [Install]
          WantedBy=multi-user.target
        dest: /etc/systemd/system/myapp.service
        mode: '0644'
      notify:
        - reload systemd
        - restart myapp

    - name: Enable application service
      ansible.builtin.systemd:
        name: myapp
        enabled: true
        state: started

    - name: Configure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure sysctl
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'vm.swappiness', value: '10' }
        - { key: 'fs.file-max', value: '2097152' }

  handlers:
    - name: restart docker
      ansible.builtin.systemd:
        name: docker
        state: restarted

    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: true

    - name: restart myapp
      ansible.builtin.systemd:
        name: myapp
        state: restarted

    - name: restart sshd
      ansible.builtin.systemd:
        name: sshd
        state: restarted
```

## Summary

Flatcar Container Linux management with Ansible focuses on systemd units, Docker configuration, and config files rather than packages. Since the filesystem is read-only and there is no package manager, all application deployment happens through containers. Bootstrap Python first (via a container or static binary), then use Ansible to manage systemd services, Docker daemon settings, update policies, and sysctl tuning. This is a fundamentally different approach from traditional distribution management.

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

