# How to Use Ansible with GCP Deployment Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, GCP, Deployment Manager, Cloud

Description: Integrate Ansible with Google Cloud Deployment Manager and manage GCP resources using the google.cloud collection.

---

Google Cloud Platform provides Deployment Manager for infrastructure provisioning. Ansible's google.cloud collection offers modules for managing GCP resources directly, and you can trigger Deployment Manager templates from Ansible.

## Managing GCP Resources

```yaml
# playbooks/gcp-provision.yml
---
- name: Provision GCP infrastructure
  hosts: localhost
  connection: local
  tasks:
    - name: Create VPC network
      google.cloud.gcp_compute_network:
        name: "{{ network_name }}"
        project: "{{ gcp_project }}"
        auto_create_subnetworks: false
        auth_kind: serviceaccount
        service_account_file: "{{ gcp_sa_file }}"
      register: network

    - name: Create subnet
      google.cloud.gcp_compute_subnetwork:
        name: "{{ subnet_name }}"
        ip_cidr_range: 10.0.0.0/24
        network: "{{ network }}"
        region: "{{ gcp_region }}"
        project: "{{ gcp_project }}"
        auth_kind: serviceaccount
        service_account_file: "{{ gcp_sa_file }}"

    - name: Create compute instance
      google.cloud.gcp_compute_instance:
        name: "{{ instance_name }}"
        machine_type: n2-standard-2
        zone: "{{ gcp_zone }}"
        project: "{{ gcp_project }}"
        auth_kind: serviceaccount
        service_account_file: "{{ gcp_sa_file }}"
        disks:
          - auto_delete: true
            boot: true
            initialize_params:
              source_image: projects/ubuntu-os-cloud/global/images/family/ubuntu-2204-lts
        network_interfaces:
          - network: "{{ network }}"
            subnetwork: "{{ subnet }}"
      register: instance

    - name: Add to inventory
      ansible.builtin.add_host:
        name: "{{ instance.name }}"
        ansible_host: "{{ instance.networkInterfaces[0].networkIP }}"
        groups: gcp_servers
```

## GCP Secret Manager

```yaml
# tasks/gcp-secrets.yml
---
- name: Retrieve secret from GCP Secret Manager
  google.cloud.gcp_secretmanager_secret_version_info:
    project: "{{ gcp_project }}"
    secret: "{{ secret_name }}"
    version: latest
    auth_kind: serviceaccount
    service_account_file: "{{ gcp_sa_file }}"
  register: secret_version
  no_log: true
```

## Key Takeaways

The google.cloud Ansible collection provides comprehensive GCP resource management. Provision compute instances, networks, and storage through playbooks. Use GCP Secret Manager for sensitive credentials. Combine Ansible's configuration management with GCP Deployment Manager for complex resource provisioning.

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

