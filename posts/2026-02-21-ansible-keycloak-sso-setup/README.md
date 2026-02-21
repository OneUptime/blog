# How to Use Ansible with Keycloak for SSO Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Keycloak, SSO, Identity

Description: Deploy and configure Keycloak with Ansible for Single Sign-On across your applications with OIDC and SAML support.

---

Keycloak is an open-source identity and access management solution that provides SSO, user federation, and social login. Ansible can deploy Keycloak, configure realms, create clients, and manage users.

## Deploying Keycloak

```yaml
# roles/keycloak/tasks/main.yml
---
- name: Deploy Keycloak via Docker
  community.docker.docker_container:
    name: keycloak
    image: "quay.io/keycloak/keycloak:{{ keycloak_version }}"
    state: started
    restart_policy: unless-stopped
    ports:
      - "8443:8443"
      - "8080:8080"
    env:
      KEYCLOAK_ADMIN: "{{ keycloak_admin_user }}"
      KEYCLOAK_ADMIN_PASSWORD: "{{ keycloak_admin_password }}"
      KC_DB: postgres
      KC_DB_URL: "jdbc:postgresql://{{ db_host }}:5432/keycloak"
      KC_DB_USERNAME: "{{ keycloak_db_user }}"
      KC_DB_PASSWORD: "{{ keycloak_db_password }}"
    command: start
  no_log: true
```

## Configuring Realms and Clients

```yaml
# tasks/keycloak-config.yml
---
- name: Get admin token
  ansible.builtin.uri:
    url: "http://{{ keycloak_host }}:8080/realms/master/protocol/openid-connect/token"
    method: POST
    body_format: form-urlencoded
    body:
      grant_type: password
      client_id: admin-cli
      username: "{{ keycloak_admin_user }}"
      password: "{{ keycloak_admin_password }}"
  register: admin_token
  no_log: true

- name: Create application realm
  ansible.builtin.uri:
    url: "http://{{ keycloak_host }}:8080/admin/realms"
    method: POST
    headers:
      Authorization: "Bearer {{ admin_token.json.access_token }}"
    body_format: json
    body:
      realm: "{{ app_realm }}"
      enabled: true
      registrationAllowed: false
    status_code: [201, 409]

- name: Create OIDC client
  ansible.builtin.uri:
    url: "http://{{ keycloak_host }}:8080/admin/realms/{{ app_realm }}/clients"
    method: POST
    headers:
      Authorization: "Bearer {{ admin_token.json.access_token }}"
    body_format: json
    body:
      clientId: "{{ app_name }}"
      protocol: openid-connect
      publicClient: false
      redirectUris:
        - "https://{{ app_domain }}/*"
      webOrigins:
        - "https://{{ app_domain }}"
    status_code: [201, 409]
```

## Key Takeaways

Keycloak deployment and configuration with Ansible gives you repeatable SSO setup. Deploy Keycloak as a container, configure realms and clients through the admin API, and manage users programmatically. This approach lets you replicate the same SSO configuration across environments.

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

