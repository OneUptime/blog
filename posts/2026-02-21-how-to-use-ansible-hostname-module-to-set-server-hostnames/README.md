# How to Use Ansible hostname Module to Set Server Hostnames

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, hostname, Server Configuration, Linux, DevOps

Description: Set and manage server hostnames with the Ansible hostname module for consistent naming across your infrastructure.

---

The `ansible.builtin.hostname` module sets the system hostname on remote servers. This is one of the first tasks in any server provisioning workflow, as many services and logs depend on a properly configured hostname.

## Basic Hostname Setting

```yaml
- name: Set server hostname
  ansible.builtin.hostname:
    name: "{{ inventory_hostname }}"
```

## With FQDN Configuration

```yaml
- name: Set hostname and FQDN
  hosts: all
  become: true
  tasks:
    - name: Set the hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Configure /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}.{{ domain }} {{ inventory_hostname }}"
```

## Different Hostname Strategies

```yaml
# Use a custom hostname pattern
- name: Set hostname based on role and index
  ansible.builtin.hostname:
    name: "{{ host_role }}-{{ host_index }}.{{ domain }}"
  vars:
    host_role: web
    host_index: "{{ groups['webservers'].index(inventory_hostname) + 1 }}"
    domain: prod.example.com
```

## Hostname with Use Parameter

```yaml
# Specify the hostname strategy
- name: Set hostname using systemd
  ansible.builtin.hostname:
    name: "{{ inventory_hostname }}"
    use: systemd  # or 'redhat', 'debian', 'alpine', etc.
```

## Verification

```yaml
- name: Verify hostname was set
  ansible.builtin.command: hostname -f
  register: hostname_check
  changed_when: false

- name: Assert hostname is correct
  ansible.builtin.assert:
    that:
      - inventory_hostname in hostname_check.stdout
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


## Handling Cloud Environments

In cloud environments, hostnames often need to persist across reboots and not be overwritten by cloud-init:

```yaml
# Preserve hostname across cloud-init runs
- name: Set hostname
  ansible.builtin.hostname:
    name: "{{ inventory_hostname }}"

- name: Prevent cloud-init from resetting hostname
  ansible.builtin.lineinfile:
    path: /etc/cloud/cloud.cfg
    regexp: '^preserve_hostname'
    line: 'preserve_hostname: true'
  when: ansible_service_mgr == 'systemd'
```

## Conclusion

Setting hostnames is a fundamental provisioning task. The hostname module handles the OS-specific details of updating hostname files and running the appropriate system commands. Always pair it with /etc/hosts configuration for proper FQDN resolution, prevent cloud-init from overwriting your settings, and verify the result to ensure downstream services see the correct hostname.

