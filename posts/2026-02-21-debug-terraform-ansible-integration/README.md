# How to Debug Terraform-Ansible Integration Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Terraform, Debugging, Integration, Troubleshooting

Description: Diagnose and fix common issues in Terraform-Ansible integration including inventory generation, timing, and variable passing problems.

---

When Terraform and Ansible work together, integration issues can arise at the boundaries between the two tools. The most common problems involve inventory generation, SSH readiness timing, variable passing, and state synchronization. Here is how to debug each category.

## Problem 1: Inventory Not Generated Correctly

```bash
# Debug: Check what Terraform is outputting
terraform output -json | python3 -m json.tool

# Debug: Verify the generated inventory file
cat ansible/inventory/terraform_hosts.ini

# Debug: Test the inventory with Ansible
ansible-inventory -i ansible/inventory/terraform_hosts.ini --list
ansible -i ansible/inventory/terraform_hosts.ini all --list-hosts
```

Common fixes:
- Ensure Terraform outputs have the correct format
- Check that the inventory generation script handles empty outputs
- Verify the inventory file path matches what Ansible expects

## Problem 2: SSH Not Ready After Terraform Apply

```yaml
# Debug: Add explicit wait for SSH
- hosts: all
  gather_facts: false
  tasks:
    - name: Wait for SSH with debug output
      wait_for_connection:
        timeout: 300
        delay: 10
        sleep: 5
      register: ssh_wait

    - name: Show SSH connection timing
      debug:
        msg: "SSH became available after {{ ssh_wait.elapsed }} seconds"
```

Common fixes:
- Add sleep in provisioner before calling Ansible
- Use `wait_for_connection` module in Ansible
- Verify security groups allow SSH from the control node

## Problem 3: Variables Not Passing Between Tools

```bash
# Debug: Print all Terraform outputs
terraform output -json

# Debug: Check what Ansible sees
ansible-playbook playbook.yml -e "@terraform_vars.yml" -v

# Debug: Verify variable precedence
ansible-playbook playbook.yml -e "@terraform_vars.yml" --extra-vars "debug=true"
```

```yaml
# Debug task to show all variables from Terraform
- debug:
    msg: |
      db_endpoint: {{ db_endpoint | default('NOT SET') }}
      redis_host: {{ redis_host | default('NOT SET') }}
      s3_bucket: {{ s3_bucket | default('NOT SET') }}
```

## Problem 4: State Drift Between Tools

```bash
# Check Terraform state matches reality
terraform plan  # Should show no changes if in sync

# Check Ansible sees the same infrastructure
ansible -i inventory all -m ping

# Force Terraform state refresh
terraform refresh
```

## Problem 5: Provisioner Timing

```hcl
# Debug: Add timestamps to provisioner output
resource "null_resource" "debug" {
  provisioner "local-exec" {
    command = <<-EOT
      echo "Terraform finished at: $(date)"
      echo "Waiting 30 seconds for SSH..."
      sleep 30
      echo "Starting Ansible at: $(date)"
      ANSIBLE_STDOUT_CALLBACK=debug ansible-playbook -i inventory playbook.yml -vvv
    EOT
  }
}
```

## Debugging Checklist

1. Verify Terraform outputs: `terraform output -json`
2. Verify inventory generation: `ansible-inventory --list`
3. Test SSH connectivity: `ansible all -m ping`
4. Check variable values: `ansible-playbook ... -v`
5. Verify timing: add explicit waits and timeouts
6. Check state: `terraform plan` should show no changes

## Summary

Terraform-Ansible integration issues fall into five categories: inventory generation, SSH timing, variable passing, state drift, and provisioner ordering. The debugging approach for each is straightforward: verify each tool's outputs independently, then check the integration point between them. Verbose output flags (`-vvv` for Ansible, `-json` for Terraform) expose the details needed to identify the exact point of failure.

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

