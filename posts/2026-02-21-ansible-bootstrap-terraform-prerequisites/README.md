# How to Use Ansible to Bootstrap Terraform Prerequisites

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Terraform, Bootstrap, Prerequisites, DevOps

Description: Use Ansible to set up Terraform prerequisites including backend storage, provider credentials, and execution environments.

---

Before Terraform can manage your infrastructure, certain prerequisites need to be in place: a state backend (S3 bucket, Azure blob, etc.), a DynamoDB table for state locking, IAM roles for Terraform execution, and potentially a CI/CD runner with Terraform installed. Ansible is ideal for bootstrapping these prerequisites since they need to exist before Terraform can run.

## Bootstrap Tasks

```yaml
# roles/terraform_bootstrap/tasks/main.yml
---
- name: Install Terraform binary
  get_url:
    url: "https://releases.hashicorp.com/terraform/{{ terraform_version }}/terraform_{{ terraform_version }}_linux_amd64.zip"
    dest: /tmp/terraform.zip
  become: yes

- name: Extract Terraform
  unarchive:
    src: /tmp/terraform.zip
    dest: /usr/local/bin/
    remote_src: yes
    creates: /usr/local/bin/terraform
  become: yes

- name: Create S3 bucket for state
  amazon.aws.s3_bucket:
    name: "{{ org_name }}-terraform-state"
    region: "{{ aws_region }}"
    versioning: yes
    encryption: AES256
    public_access:
      block_public_acls: true
      block_public_policy: true
      ignore_public_acls: true
      restrict_public_buckets: true

- name: Create DynamoDB table for locking
  community.aws.dynamodb_table:
    name: "{{ org_name }}-terraform-locks"
    region: "{{ aws_region }}"
    hash_key_name: LockID
    hash_key_type: STRING
    billing_mode: PAY_PER_REQUEST

- name: Generate backend configuration
  template:
    src: backend.tf.j2
    dest: "{{ terraform_projects_dir }}/{{ item }}/backend.tf"
    mode: '0644'
  loop: "{{ terraform_projects }}"
```

## Running the Bootstrap

```bash
# Bootstrap Terraform prerequisites
ansible-playbook bootstrap-terraform.yml --ask-vault-pass
```

## Summary

Ansible bootstraps the chicken-and-egg problem of Terraform prerequisites. It creates the state backend, locking mechanism, and execution environment that Terraform needs before it can manage anything. Run this once when setting up a new AWS account, region, or Terraform workspace.

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

