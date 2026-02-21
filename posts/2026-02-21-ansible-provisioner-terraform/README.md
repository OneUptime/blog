# How to Run Ansible Provisioner in Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Terraform, Provisioner, DevOps, Automation

Description: Use Terraform's local-exec provisioner to run Ansible playbooks automatically after infrastructure is created for seamless provisioning.

---

Terraform has a built-in mechanism to trigger external tools after resource creation through provisioners. The `local-exec` provisioner runs a command on the machine where Terraform is executed, which is perfect for calling Ansible to configure newly created infrastructure.

## Basic Ansible Provisioner

```hcl
# main.tf - Run Ansible after VM creation
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.ssh_key_name

  tags = {
    Name = "web-server"
  }

  # Run Ansible after the instance is created
  provisioner "local-exec" {
    command = <<-EOT
      sleep 30  # Wait for SSH to be ready
      ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook         -i '${self.public_ip},'         -u ubuntu         --private-key ${var.ssh_private_key_path}         ../ansible/playbook.yml
    EOT
  }
}
```

## Using a Dynamic Inventory Approach

```hcl
# main.tf - Generate inventory file then run Ansible
resource "local_file" "ansible_inventory" {
  content = templatefile("inventory.tmpl", {
    web_ips = aws_instance.web[*].public_ip
    db_ip   = aws_instance.db.private_ip
  })
  filename = "${path.module}/../ansible/inventory/terraform.ini"
}

resource "null_resource" "ansible_provisioner" {
  depends_on = [local_file.ansible_inventory, aws_instance.web]

  provisioner "local-exec" {
    command     = "ansible-playbook -i ../ansible/inventory/terraform.ini ../ansible/playbook.yml"
    working_dir = path.module
    environment = {
      ANSIBLE_HOST_KEY_CHECKING = "False"
    }
  }

  # Re-run Ansible when the inventory changes
  triggers = {
    inventory = local_file.ansible_inventory.content
  }
}
```

## Inventory Template

```ini
# inventory.tmpl - Terraform template for Ansible inventory
[webservers]
%{ for ip in web_ips ~}
${ip} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/deploy.pem
%{ endfor ~}

[databases]
${db_ip} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/deploy.pem
```

## Handling Provisioner Failures

```hcl
# Provisioner failures do not destroy the resource by default
resource "null_resource" "ansible" {
  provisioner "local-exec" {
    command    = "ansible-playbook -i inventory playbook.yml"
    on_failure = continue  # Do not fail Terraform if Ansible fails
  }
}
```

## Triggering Re-provisioning

```hcl
# Use triggers to re-run Ansible when something changes
resource "null_resource" "ansible" {
  triggers = {
    always_run = timestamp()  # Run every time
    # Or based on specific changes:
    # playbook_hash = filemd5("../ansible/playbook.yml")
  }

  provisioner "local-exec" {
    command = "ansible-playbook -i inventory playbook.yml"
  }
}
```

## Best Practices

1. Use `null_resource` with explicit `depends_on` rather than inline provisioners
2. Use `triggers` to control when Ansible re-runs
3. Set `ANSIBLE_HOST_KEY_CHECKING=False` for new instances
4. Add a sleep or `wait_for_connection` to handle SSH startup delay
5. Consider using `on_failure = continue` so Terraform does not taint resources on Ansible failures

## Summary

Running Ansible through Terraform's local-exec provisioner creates a seamless workflow where infrastructure creation and configuration happen in a single `terraform apply`. Use `null_resource` with triggers for better control over when Ansible runs, and always handle the SSH readiness gap with a wait mechanism.

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

