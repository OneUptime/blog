# How to Use Ansible to Configure CoreOS/Flatcar Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Flatcar Linux, CoreOS, Container, Immutable Infrastructure

Description: Manage Flatcar Container Linux with Ansible for container-optimized infrastructure, immutable OS updates, and systemd unit management.

---

Flatcar Container Linux (the successor to CoreOS Container Linux) is an immutable, container-optimized OS. It has a read-only OS partition, automatic atomic updates, and ships with Docker/containerd. Managing Flatcar with Ansible is different from traditional distributions because you cannot install packages with apt or dnf. Instead, you manage systemd units, container workloads, and configuration files.

## Key Differences

Flatcar is fundamentally different from traditional Linux:

- Read-only OS partition (no package manager)
- User applications generally run in containers or system extensions
- Automatic atomic OS updates via Nebraska/update_engine
- Python is NOT installed (needs special handling for Ansible)
- systemd is the primary configuration tool
- Uses Ignition, usually generated from Butane, for initial provisioning

## Bootstrap: Python as a System Extension

Since Flatcar has no package manager, enable the official Python system extension for Ansible on Flatcar releases that provide it:

```yaml
---
- name: Bootstrap Flatcar for Ansible
  hosts: flatcar
  gather_facts: false
  tasks:
    - name: Enable Python system extension
      ansible.builtin.raw: |
        set -e
        sudo mkdir -p /etc/flatcar
        grep -qxF python /etc/flatcar/enabled-sysext.conf 2>/dev/null || \
          echo python | sudo tee -a /etc/flatcar/enabled-sysext.conf
        sudo systemctl restart systemd-sysext
        test -x /usr/bin/python3
      changed_when: false
```

Then use the `ansible_python_interpreter` to point to the Python binary provided by the extension:

```ini
[flatcar:vars]
ansible_user=core
ansible_python_interpreter=/usr/bin/python3
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
          LOCKSMITHD_REBOOT_WINDOW_START="Thu 02:00"
          LOCKSMITHD_REBOOT_WINDOW_LENGTH=1h
        dest: /etc/flatcar/update.conf
        mode: '0644'

    - name: Ensure Docker configuration directory exists
      ansible.builtin.file:
        path: /etc/docker
        state: directory
        mode: '0755'

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

Flatcar Container Linux management with Ansible focuses on systemd units, Docker configuration, and config files rather than packages. Since the OS partition is read-only and there is no package manager, application deployment usually happens through containers or system extensions. Bootstrap Python first, then use Ansible to manage systemd services, Docker daemon settings, update policies, and sysctl tuning. This is a fundamentally different approach from traditional distribution management.

## Common Use Cases

Here are several practical scenarios for Flatcar-focused playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow for a Flatcar host

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

    - name: Verify container runtime tools
      ansible.builtin.command: docker --version
      register: docker_version
      changed_when: false

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

    - name: Configure application firewall policy
      ansible.builtin.copy:
        dest: /etc/systemd/system/myapp-firewall.service
        mode: '0644'
        content: |
          [Unit]
          Description=Example host firewall policy
          After=network-online.target

          [Service]
          Type=oneshot
          ExecStart=/bin/sh -c '/usr/sbin/iptables -C INPUT -p tcp -m multiport --dports 22,80,443 -j ACCEPT || /usr/sbin/iptables -A INPUT -p tcp -m multiport --dports 22,80,443 -j ACCEPT'
          RemainAfterExit=yes

          [Install]
          WantedBy=multi-user.target
      notify: reload systemd

    - name: Enable firewall service
      ansible.builtin.systemd:
        name: myapp-firewall
        enabled: true
        state: started

  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: true

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
# Set up scheduled compliance scans using a systemd timer
- name: Configure automated scans
  hosts: all
  become: true
  tasks:
    - name: Create scripts directory
      ansible.builtin.file:
        path: /opt/scripts
        state: directory
        mode: '0755'

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

    - name: Create compliance scan service
      ansible.builtin.copy:
        dest: /etc/systemd/system/compliance-scan.service
        mode: '0644'
        content: |
          [Unit]
          Description=Compliance scan

          [Service]
          Type=oneshot
          User=ansible
          ExecStart=/opt/scripts/compliance_scan.sh

    - name: Create weekly compliance scan timer
      ansible.builtin.copy:
        dest: /etc/systemd/system/compliance-scan.timer
        mode: '0644'
        content: |
          [Unit]
          Description=Weekly compliance scan

          [Timer]
          OnCalendar=Mon *-*-* 03:00:00
          Persistent=true

          [Install]
          WantedBy=timers.target

    - name: Enable weekly compliance scan timer
      ansible.builtin.systemd:
        name: compliance-scan.timer
        enabled: true
        state: started
        daemon_reload: true
```
