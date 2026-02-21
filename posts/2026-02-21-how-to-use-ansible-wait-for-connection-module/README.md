# How to Use Ansible wait_for_connection Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, wait_for_connection, SSH, Connection, DevOps

Description: Use the Ansible wait_for_connection module to wait for remote hosts to become accessible after reboots and provisioning.

---

The `ansible.builtin.wait_for_connection` module waits until Ansible can establish a connection to a remote host. Unlike `wait_for` which checks for ports, this module uses Ansible's actual connection mechanism (SSH, WinRM, etc.) to verify the host is fully accessible.

## After a Reboot

```yaml
# Reboot and wait for the host to come back
- name: Reboot the server
  ansible.builtin.reboot:
    msg: "Rebooting for kernel update"

# If you need more control than the reboot module provides:
- name: Initiate reboot
  ansible.builtin.command: /sbin/shutdown -r now
  async: 0
  poll: 0
  ignore_errors: true

- name: Wait for connection to be re-established
  ansible.builtin.wait_for_connection:
    delay: 30
    timeout: 300
    sleep: 10
```

## After Cloud Instance Provisioning

```yaml
# Wait for newly provisioned cloud instances
- name: Provision EC2 instance
  amazon.aws.ec2_instance:
    name: web-server
    instance_type: t3.medium
    image_id: ami-12345678
    wait: true
  register: ec2

- name: Add new instance to inventory
  ansible.builtin.add_host:
    name: "{{ ec2.instances[0].public_ip_address }}"
    groups: new_instances

- name: Wait for SSH to be ready on new instance
  ansible.builtin.wait_for_connection:
    delay: 60
    timeout: 600
    sleep: 15
  delegate_to: "{{ ec2.instances[0].public_ip_address }}"
```

## Parameters

```yaml
# All available parameters
- name: Wait with full configuration
  ansible.builtin.wait_for_connection:
    # Seconds to wait before first check
    delay: 30
    # Total time to wait before giving up
    timeout: 300
    # Seconds between connection attempts
    sleep: 10
    # Connect timeout for each attempt
    connect_timeout: 5
```

## After Network Changes

```yaml
# Wait after changing network configuration
- name: Change network interface
  ansible.builtin.template:
    src: interfaces.j2
    dest: /etc/network/interfaces

- name: Restart networking
  ansible.builtin.service:
    name: networking
    state: restarted
  async: 0
  poll: 0
  ignore_errors: true

- name: Wait for connection after network change
  ansible.builtin.wait_for_connection:
    delay: 10
    timeout: 120
```

## In Rolling Updates

```yaml
# Rolling kernel update with reboot
- name: Kernel update with rolling reboot
  hosts: webservers
  serial: 1
  tasks:
    - name: Update kernel
      ansible.builtin.apt:
        name: linux-generic
        state: latest

    - name: Reboot if needed
      ansible.builtin.reboot:
        reboot_timeout: 300
      when: reboot_required

    - name: Wait for connection
      ansible.builtin.wait_for_connection:
        delay: 30
        timeout: 300
      when: reboot_required

    - name: Verify services are running
      ansible.builtin.service_facts:
```


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


## Conclusion

The `wait_for_connection` module is the correct way to handle post-reboot and post-provisioning scenarios in Ansible. It uses Ansible's native connection mechanism rather than just checking a port, which means it verifies that the host is truly ready for Ansible operations. Use it after reboots, cloud instance provisioning, and network configuration changes.

