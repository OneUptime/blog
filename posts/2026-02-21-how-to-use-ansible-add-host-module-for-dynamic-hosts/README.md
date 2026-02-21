# How to Use Ansible add_host Module for Dynamic Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, add_host, Dynamic Inventory, Provisioning, DevOps

Description: Add hosts to the Ansible inventory at runtime with the add_host module for cloud provisioning and dynamic infrastructure management.

---

The `ansible.builtin.add_host` module adds a host to the in-memory inventory during playbook execution. This is essential for workflows where you provision new infrastructure and need to configure it in the same playbook run.

## Basic Usage

```yaml
- name: Add a host dynamically
  ansible.builtin.add_host:
    name: new-server
    ansible_host: 10.0.1.50
    ansible_user: deploy
    groups:
      - webservers
      - production
```

## After Cloud Provisioning

```yaml
# Provision and configure in one playbook
- name: Provision new servers
  hosts: localhost
  connection: local
  tasks:
    - name: Create EC2 instances
      amazon.aws.ec2_instance:
        name: "web-{{ item }}"
        instance_type: t3.medium
        image_id: ami-12345678
        key_name: deploy-key
        wait: true
      register: ec2_result
      loop: [1, 2, 3]

    - name: Add new instances to inventory
      ansible.builtin.add_host:
        name: "web-{{ item.item }}"
        ansible_host: "{{ item.instances[0].public_ip_address }}"
        ansible_user: ubuntu
        ansible_ssh_private_key_file: ~/.ssh/deploy-key.pem
        groups:
          - new_webservers
      loop: "{{ ec2_result.results }}"

    - name: Wait for SSH
      ansible.builtin.wait_for:
        host: "{{ item.instances[0].public_ip_address }}"
        port: 22
        delay: 30
        timeout: 300
      loop: "{{ ec2_result.results }}"

- name: Configure new servers
  hosts: new_webservers
  become: true
  roles:
    - common
    - nginx
```

## Adding Host Variables

```yaml
- name: Add host with custom variables
  ansible.builtin.add_host:
    name: "{{ new_hostname }}"
    ansible_host: "{{ new_ip }}"
    groups:
      - app_servers
    # Custom variables for the host
    app_port: 8080
    app_version: "v2.1.0"
    deploy_environment: staging
```

## Dynamic Inventory from API

```yaml
# Query an API and build inventory dynamically
- name: Build inventory from CMDB
  hosts: localhost
  tasks:
    - name: Query CMDB API
      ansible.builtin.uri:
        url: "https://cmdb.example.com/api/hosts"
        return_content: true
      register: cmdb_response

    - name: Add hosts from CMDB
      ansible.builtin.add_host:
        name: "{{ item.hostname }}"
        ansible_host: "{{ item.ip_address }}"
        groups: "{{ item.groups }}"
      loop: "{{ cmdb_response.json }}"

- name: Configure all discovered hosts
  hosts: all:!localhost
  become: true
  roles:
    - common
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

The `add_host` module bridges the gap between infrastructure provisioning and configuration management. It lets you provision servers and configure them in a single playbook run, which is essential for immutable infrastructure patterns and cloud-native workflows. Combined with `wait_for_connection`, it handles the full lifecycle from creation to configuration.

