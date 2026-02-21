# How to Use Ansible with FreeIPA for Identity Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, FreeIPA, Identity Management, LDAP

Description: Deploy and configure FreeIPA with Ansible for centralized identity management, Kerberos authentication, and DNS management.

---

FreeIPA provides centralized identity, authentication, and authorization for Linux environments. Ansible has a dedicated FreeIPA collection for managing users, groups, hosts, DNS records, and policies.

## Installing FreeIPA Server

```yaml
# roles/freeipa_server/tasks/main.yml
---
- name: Install FreeIPA server packages
  ansible.builtin.apt:
    name:
      - freeipa-server
      - freeipa-server-dns
    state: present

- name: Run FreeIPA server installation
  ansible.builtin.command:
    cmd: >
      ipa-server-install
      --realm={{ ipa_realm }}
      --domain={{ ipa_domain }}
      --ds-password={{ ipa_ds_password }}
      --admin-password={{ ipa_admin_password }}
      --setup-dns
      --forwarder={{ dns_forwarder }}
      --unattended
    creates: /etc/ipa/default.conf
  no_log: true
```

## Managing Users and Groups

```yaml
# tasks/freeipa-users.yml
---
- name: Create user groups
  freeipa.ansible_freeipa.ipagroup:
    ipaadmin_password: "{{ ipa_admin_password }}"
    name: "{{ item.name }}"
    description: "{{ item.description }}"
  loop:
    - { name: developers, description: "Development team" }
    - { name: ops, description: "Operations team" }

- name: Create users
  freeipa.ansible_freeipa.ipauser:
    ipaadmin_password: "{{ ipa_admin_password }}"
    name: "{{ item.username }}"
    first: "{{ item.first_name }}"
    last: "{{ item.last_name }}"
    email: "{{ item.email }}"
    password: "{{ item.initial_password }}"
  loop: "{{ ipa_users }}"
  no_log: true
```

## Enrolling Clients

```yaml
# roles/freeipa_client/tasks/main.yml
---
- name: Install FreeIPA client
  ansible.builtin.apt:
    name: freeipa-client
    state: present

- name: Enroll in FreeIPA domain
  ansible.builtin.command:
    cmd: >
      ipa-client-install
      --server={{ ipa_server }}
      --domain={{ ipa_domain }}
      --realm={{ ipa_realm }}
      --principal=admin
      --password={{ ipa_admin_password }}
      --mkhomedir
      --unattended
    creates: /etc/ipa/default.conf
  no_log: true
```

## Key Takeaways

FreeIPA with Ansible provides automated identity management for Linux environments. Deploy the FreeIPA server, enroll clients, and manage users and groups through playbooks. The freeipa.ansible_freeipa collection handles all the IPA operations. This is essential for enterprises that need centralized authentication without Active Directory.

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

