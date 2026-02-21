# How to Use Terraform Outputs as Ansible Inventory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Terraform, Inventory, DevOps, Automation

Description: Convert Terraform outputs into Ansible inventory files for seamless handoff between infrastructure provisioning and configuration management.

---

After Terraform creates your infrastructure, Ansible needs to know the IP addresses and connection details of the new resources. Terraform outputs provide this information, and with a simple conversion step, you can feed it directly into Ansible's inventory.

## Method 1: Generate Static Inventory from Outputs

```hcl
# terraform/outputs.tf
output "web_servers" {
  value = {
    for i, instance in aws_instance.web :
    "web-${i + 1}" => {
      public_ip  = instance.public_ip
      private_ip = instance.private_ip
    }
  }
}

output "db_server" {
  value = {
    public_ip  = aws_instance.db.public_ip
    private_ip = aws_instance.db.private_ip
  }
}
```

```bash
#!/bin/bash
# scripts/generate_inventory.sh - Convert Terraform outputs to Ansible inventory
cd terraform

echo "[webservers]" > ../ansible/inventory/hosts.ini
terraform output -json web_servers | jq -r 'to_entries[] | "\(.key) ansible_host=\(.value.public_ip) private_ip=\(.value.private_ip)"' >> ../ansible/inventory/hosts.ini

echo "" >> ../ansible/inventory/hosts.ini
echo "[databases]" >> ../ansible/inventory/hosts.ini
terraform output -json db_server | jq -r '"db-1 ansible_host=\(.public_ip) private_ip=\(.private_ip)"' >> ../ansible/inventory/hosts.ini

echo "" >> ../ansible/inventory/hosts.ini
echo "[all:vars]" >> ../ansible/inventory/hosts.ini
echo "ansible_user=ubuntu" >> ../ansible/inventory/hosts.ini
echo "ansible_ssh_private_key_file=~/.ssh/deploy.pem" >> ../ansible/inventory/hosts.ini
```

## Method 2: Terraform Generates Inventory Directly

```hcl
# terraform/inventory.tf - Generate inventory as a Terraform resource
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/templates/inventory.tmpl", {
    web_servers = aws_instance.web
    db_server   = aws_instance.db
    ssh_user    = var.ssh_user
    ssh_key     = var.ssh_key_path
  })
  filename = "${path.module}/../ansible/inventory/terraform_hosts.ini"
}
```

```ini
# terraform/templates/inventory.tmpl
[webservers]
%{ for i, server in web_servers ~}
web-${i + 1} ansible_host=${server.public_ip} private_ip=${server.private_ip}
%{ endfor ~}

[databases]
db-1 ansible_host=${db_server.public_ip} private_ip=${db_server.private_ip}

[all:vars]
ansible_user=${ssh_user}
ansible_ssh_private_key_file=${ssh_key}
```

## Method 3: YAML Inventory from Terraform

```hcl
# Generate a YAML inventory for Ansible
resource "local_file" "ansible_inventory_yaml" {
  content = yamlencode({
    all = {
      children = {
        webservers = {
          hosts = {
            for i, instance in aws_instance.web :
            "web-${i + 1}" => {
              ansible_host = instance.public_ip
              private_ip   = instance.private_ip
            }
          }
        }
      }
      vars = {
        ansible_user                 = "ubuntu"
        ansible_ssh_private_key_file = "~/.ssh/deploy.pem"
      }
    }
  })
  filename = "${path.module}/../ansible/inventory/terraform_hosts.yml"
}
```

## Running the Combined Workflow

```bash
# Apply Terraform and generate inventory
cd terraform
terraform apply -auto-approve

# Run Ansible with the generated inventory
cd ../ansible
ansible-playbook -i inventory/terraform_hosts.ini playbook.yml
```

## Summary

Converting Terraform outputs to Ansible inventory is the bridge between provisioning and configuration. Whether you generate a static file with a script, use Terraform's `local_file` resource, or create a YAML inventory, the goal is the same: give Ansible the connection details it needs to configure the infrastructure Terraform just created.

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

