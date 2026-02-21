# How to Use Ansible with Azure Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Azure, Automation, Cloud

Description: Integrate Ansible with Azure Automation for hybrid runbook execution, desired state configuration, and Azure resource management.

---

Azure Automation provides cloud-based automation capabilities. Ansible can manage Azure resources, trigger Azure Automation runbooks, and use Azure Key Vault for secrets management.

## Managing Azure Resources

```yaml
# playbooks/azure-provision.yml
---
- name: Provision Azure infrastructure
  hosts: localhost
  connection: local
  tasks:
    - name: Create resource group
      azure.azcollection.azure_rm_resourcegroup:
        name: "{{ resource_group }}"
        location: "{{ azure_region }}"
        tags:
          Environment: "{{ environment_name }}"
          ManagedBy: ansible

    - name: Create virtual network
      azure.azcollection.azure_rm_virtualnetwork:
        resource_group: "{{ resource_group }}"
        name: "{{ vnet_name }}"
        address_prefixes: ["10.0.0.0/16"]

    - name: Create VM
      azure.azcollection.azure_rm_virtualmachine:
        resource_group: "{{ resource_group }}"
        name: "{{ vm_name }}"
        vm_size: Standard_D2s_v3
        admin_username: deploy
        ssh_password_enabled: false
        ssh_public_keys:
          - path: /home/deploy/.ssh/authorized_keys
            key_data: "{{ ssh_public_key }}"
        image:
          offer: UbuntuServer
          publisher: Canonical
          sku: 22_04-lts
          version: latest
```

## Azure Key Vault Integration

```yaml
# tasks/azure-keyvault.yml
---
- name: Retrieve secret from Azure Key Vault
  azure.azcollection.azure_rm_keyvaultsecret_info:
    vault_uri: "https://{{ keyvault_name }}.vault.azure.net"
    name: "{{ secret_name }}"
  register: kv_secret
  no_log: true

- name: Use the secret
  ansible.builtin.set_fact:
    db_password: "{{ kv_secret.secrets[0].secret }}"
  no_log: true
```

## Key Takeaways

Ansible's Azure collection provides modules for managing all Azure resources. Use Azure Key Vault for secrets management. Combine Ansible with Azure Automation for hybrid scenarios where some automation runs in Azure and some runs from your infrastructure.

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

