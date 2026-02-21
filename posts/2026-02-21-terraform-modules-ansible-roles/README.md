# How to Use Terraform Modules with Ansible Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Terraform, Modules, Roles, Best Practices

Description: Align Terraform module and Ansible role boundaries for consistent, reusable infrastructure components across your organization.

---

Terraform modules and Ansible roles serve similar purposes in their respective tools: they package reusable, composable infrastructure components. Aligning your module and role boundaries creates a clean mapping between provisioning and configuration, making your infrastructure easier to understand and maintain.

## Aligned Structure

```
infrastructure/
  terraform/
    modules/
      webserver/       # Creates the VM, security group, ELB
      database/        # Creates the RDS instance, subnet group
      monitoring/      # Creates the monitoring infrastructure
  ansible/
    roles/
      webserver/       # Configures nginx, deploys app
      database/        # Configures client, runs migrations
      monitoring/      # Installs agents, configures dashboards
```

## Terraform Module

```hcl
# terraform/modules/webserver/main.tf
variable "instance_count" { default = 2 }
variable "instance_type" { default = "t3.medium" }

resource "aws_instance" "web" {
  count         = var.instance_count
  instance_type = var.instance_type
  ami           = data.aws_ami.ubuntu.id
  # ...
}

output "instance_ips" {
  value = aws_instance.web[*].public_ip
}

output "instance_ids" {
  value = aws_instance.web[*].id
}
```

## Corresponding Ansible Role

```yaml
# ansible/roles/webserver/tasks/main.yml
---
- name: Install web server packages
  apt:
    name:
      - nginx
      - certbot
    state: present

- name: Deploy application
  include_tasks: deploy.yml

- name: Configure SSL
  include_tasks: ssl.yml

- name: Configure monitoring
  include_tasks: monitoring.yml
```

## Using Them Together

```hcl
# terraform/main.tf
module "webserver" {
  source         = "./modules/webserver"
  instance_count = 3
  instance_type  = "t3.large"
}

module "database" {
  source        = "./modules/database"
  instance_class = "db.r5.large"
}
```

```yaml
# ansible/site.yml
---
- hosts: webservers
  become: yes
  roles:
    - webserver

- hosts: databases
  become: yes
  roles:
    - database
```

## Summary

When Terraform modules and Ansible roles share the same boundaries (webserver, database, monitoring), your infrastructure becomes intuitive. Each component has a Terraform module that creates it and an Ansible role that configures it. New team members can quickly understand the system because the organizational structure tells the story.

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

