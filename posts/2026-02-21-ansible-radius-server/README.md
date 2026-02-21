# How to Use Ansible to Set Up a RADIUS Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, RADIUS, FreeRADIUS, Networking, Authentication

Description: Deploy and configure a FreeRADIUS server with client definitions, user authentication, and LDAP integration using Ansible automation.

---

RADIUS (Remote Authentication Dial-In User Service) is the standard protocol for centralized network authentication. If you have managed switches, wireless access points, or VPN concentrators, chances are they authenticate users against a RADIUS server. FreeRADIUS is the most deployed RADIUS server in the world, handling everything from small office Wi-Fi authentication to ISP-scale deployments. Setting it up manually involves editing multiple configuration files with tricky syntax, but Ansible streamlines the entire process.

This guide covers deploying FreeRADIUS with Ansible, including client definitions, local user databases, and optional LDAP backend integration.

## Role Defaults

```yaml
# roles/freeradius/defaults/main.yml - FreeRADIUS configuration
radius_listen_address: "*"
radius_auth_port: 1812
radius_acct_port: 1813

# Shared secret for RADIUS clients (network devices)
radius_clients:
  - name: wifi-controller
    ipaddr: 10.0.1.100
    secret: "{{ vault_radius_wifi_secret }}"
    shortname: wifi
  - name: vpn-gateway
    ipaddr: 10.0.1.200
    secret: "{{ vault_radius_vpn_secret }}"
    shortname: vpn
  - name: switch-stack
    ipaddr: 10.0.1.0/24
    secret: "{{ vault_radius_switch_secret }}"
    shortname: switches

# Local user accounts
radius_users:
  - username: john.doe
    password: "{{ vault_radius_john_password }}"
    groups:
      - network-admins
  - username: jane.smith
    password: "{{ vault_radius_jane_password }}"
    groups:
      - network-users

# LDAP integration (optional)
radius_ldap_enabled: false
radius_ldap_server: ldap://ldap.example.internal
radius_ldap_base_dn: "dc=example,dc=internal"
radius_ldap_bind_dn: "cn=radius,dc=example,dc=internal"
radius_ldap_bind_password: "{{ vault_radius_ldap_password }}"
```

## Main Tasks

```yaml
# roles/freeradius/tasks/main.yml - Install and configure FreeRADIUS
---
- name: Install FreeRADIUS packages
  apt:
    name:
      - freeradius
      - freeradius-utils
      - freeradius-ldap
    state: present
    update_cache: yes

- name: Configure FreeRADIUS radiusd.conf
  template:
    src: radiusd.conf.j2
    dest: /etc/freeradius/3.0/radiusd.conf
    owner: freerad
    group: freerad
    mode: '0640'
  notify: restart freeradius

- name: Configure RADIUS clients
  template:
    src: clients.conf.j2
    dest: /etc/freeradius/3.0/clients.conf
    owner: freerad
    group: freerad
    mode: '0640'
  notify: restart freeradius

- name: Configure local users database
  template:
    src: users.j2
    dest: /etc/freeradius/3.0/mods-config/files/authorize
    owner: freerad
    group: freerad
    mode: '0640'
  notify: restart freeradius

- name: Configure LDAP module
  template:
    src: ldap.j2
    dest: /etc/freeradius/3.0/mods-available/ldap
    owner: freerad
    group: freerad
    mode: '0640'
  when: radius_ldap_enabled
  notify: restart freeradius

- name: Enable LDAP module
  file:
    src: /etc/freeradius/3.0/mods-available/ldap
    dest: /etc/freeradius/3.0/mods-enabled/ldap
    state: link
  when: radius_ldap_enabled
  notify: restart freeradius

- name: Ensure FreeRADIUS is started and enabled
  systemd:
    name: freeradius
    state: started
    enabled: yes

- name: Allow RADIUS ports through firewall
  ufw:
    rule: allow
    port: "{{ item }}"
    proto: udp
  loop:
    - "{{ radius_auth_port }}"
    - "{{ radius_acct_port }}"
```

## Clients Configuration Template

```
# roles/freeradius/templates/clients.conf.j2 - RADIUS client definitions
# Each entry represents a network device that authenticates via RADIUS
{% for client in radius_clients %}
client {{ client.name }} {
    ipaddr = {{ client.ipaddr }}
    secret = {{ client.secret }}
    shortname = {{ client.shortname }}
    require_message_authenticator = no
    nas_type = other
}

{% endfor %}
```

## Users Configuration Template

```
# roles/freeradius/templates/users.j2 - Local user authentication database
# Format: username  Auth-Type := Local, User-Password == "password"
{% for user in radius_users %}
{{ user.username }}  Cleartext-Password := "{{ user.password }}"
{% for group in user.groups %}
    Filter-Id = "{{ group }}",
{% endfor %}
    Reply-Message = "Welcome, {{ user.username }}"

{% endfor %}

# Default deny rule for unknown users
DEFAULT Auth-Type := Reject
    Reply-Message = "Access denied"
```

## Testing RADIUS Authentication

```bash
# Test authentication from the RADIUS server itself
radtest john.doe secretpassword localhost 0 testing123

# Test from a remote machine
radtest john.doe secretpassword radius.example.internal 0 shared_secret

# Run FreeRADIUS in debug mode for troubleshooting
sudo freeradius -X
```

## Handlers

```yaml
# roles/freeradius/handlers/main.yml
---
- name: restart freeradius
  systemd:
    name: freeradius
    state: restarted
```

## Adding EAP for Wi-Fi (WPA2-Enterprise)

For 802.1X wireless authentication, configure the EAP module:

```yaml
# Task to configure EAP for WPA2-Enterprise Wi-Fi
- name: Configure EAP module for Wi-Fi authentication
  template:
    src: eap.j2
    dest: /etc/freeradius/3.0/mods-available/eap
    owner: freerad
    group: freerad
    mode: '0640'
  notify: restart freeradius

- name: Deploy TLS certificates for EAP
  copy:
    src: "{{ item.src }}"
    dest: "/etc/freeradius/3.0/certs/{{ item.dest }}"
    owner: freerad
    group: freerad
    mode: '0600'
  loop:
    - { src: "files/radius-cert.pem", dest: "server.pem" }
    - { src: "files/radius-key.pem", dest: "server.key" }
    - { src: "files/ca-cert.pem", dest: "ca.pem" }
  notify: restart freeradius
```

## Running the Playbook

```bash
# Deploy the RADIUS server
ansible-playbook -i inventory/hosts.ini playbook.yml --ask-vault-pass
```

## Summary

FreeRADIUS is powerful but its configuration can be overwhelming. By managing it with Ansible, you define clients, users, and authentication policies in clean YAML variables, and the playbook generates all the necessary configuration files. Adding new network devices or user accounts is as simple as updating the variable lists and running the playbook. This approach is especially valuable when you need consistent RADIUS configurations across primary and backup servers for high availability.

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

