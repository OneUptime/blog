# How to Share Variables Between Terraform and Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Terraform, Variables, Integration, DevOps

Description: Share variables between Terraform and Ansible using output files, environment variables, and shared variable stores for consistent configuration.

---

When Terraform and Ansible manage different aspects of the same infrastructure, they need to share configuration values. Database endpoints created by Terraform need to be known by Ansible for application configuration. Shared variables prevent hardcoding and ensure both tools work with the same values.

## Method 1: Terraform Outputs to Ansible Variables

```hcl
# terraform/outputs.tf
output "db_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "s3_bucket" {
  value = aws_s3_bucket.assets.id
}
```

```bash
# Generate Ansible variable file from Terraform outputs
terraform output -json | python3 -c "
import json, sys
outputs = json.load(sys.stdin)
vars_dict = {k: v['value'] for k, v in outputs.items()}
print('---')
for k, v in vars_dict.items():
    print(f'{k}: {json.dumps(v)}')
" > ../ansible/group_vars/all/terraform_vars.yml
```

## Method 2: Terraform Generates Ansible Variable File

```hcl
# terraform/ansible_vars.tf
resource "local_file" "ansible_vars" {
  content = yamlencode({
    db_endpoint    = aws_db_instance.main.endpoint
    db_name        = aws_db_instance.main.db_name
    redis_endpoint = aws_elasticache_cluster.main.cache_nodes[0].address
    s3_bucket      = aws_s3_bucket.assets.id
    vpc_cidr       = aws_vpc.main.cidr_block
  })
  filename = "${path.module}/../ansible/group_vars/all/terraform_vars.yml"
}
```

## Method 3: Shared tfvars and Ansible Variables

```yaml
# shared_config.yml - Shared configuration
environment: production
region: us-east-1
app_name: myapp
domain: app.example.com
```

```hcl
# Read shared config in Terraform
locals {
  shared = yamldecode(file("${path.module}/../shared_config.yml"))
}

resource "aws_instance" "app" {
  tags = {
    Environment = local.shared.environment
    Application = local.shared.app_name
  }
}
```

```yaml
# Read shared config in Ansible
- hosts: all
  vars_files:
    - ../shared_config.yml
  tasks:
    - debug:
        msg: "Deploying {{ app_name }} to {{ environment }}"
```

## Summary

Sharing variables between Terraform and Ansible eliminates hardcoding and keeps both tools in sync. The simplest approach is generating an Ansible variables file from Terraform outputs. For bidirectional sharing, use a common configuration file that both tools read. Choose the method that fits your workflow, and automate the variable generation in your deployment pipeline.

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

