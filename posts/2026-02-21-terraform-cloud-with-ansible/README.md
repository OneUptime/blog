# How to Use Terraform Cloud with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Terraform Cloud, Remote State, DevOps, Automation

Description: Integrate Terraform Cloud's remote execution and state management with Ansible configuration workflows for team collaboration.

---

Terraform Cloud adds remote state storage, team collaboration, and remote execution to Terraform. When using it with Ansible, you need to handle the fact that Terraform runs remotely while Ansible typically runs from a local machine or CI server. The integration point is Terraform Cloud's API, which you can query for outputs to generate Ansible inventory.

## Reading Terraform Cloud Outputs

```bash
#!/bin/bash
# scripts/get_tf_cloud_outputs.sh - Fetch outputs from Terraform Cloud

TFC_ORG="my-org"
TFC_WORKSPACE="production"
TFC_TOKEN="$TF_CLOUD_TOKEN"

# Get the workspace ID
WORKSPACE_ID=$(curl -s   --header "Authorization: Bearer $TFC_TOKEN"   "https://app.terraform.io/api/v2/organizations/$TFC_ORG/workspaces/$TFC_WORKSPACE"   | jq -r '.data.id')

# Get the current state version
STATE_VERSION=$(curl -s   --header "Authorization: Bearer $TFC_TOKEN"   "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/current-state-version?include=outputs"   | jq -r '.included')

# Extract outputs
echo "$STATE_VERSION" | jq -r '.[] | select(.attributes.name == "web_ips") | .attributes.value[]'
```

## Generating Inventory from TFC

```python
#!/usr/bin/env python3
# inventory/tfc_inventory.py - Dynamic inventory from Terraform Cloud
import json
import os
import sys
import urllib.request

TFC_TOKEN = os.environ.get('TF_CLOUD_TOKEN')
TFC_ORG = os.environ.get('TFC_ORG', 'my-org')
TFC_WORKSPACE = os.environ.get('TFC_WORKSPACE', 'production')

def get_outputs():
    headers = {'Authorization': f'Bearer {TFC_TOKEN}', 'Content-Type': 'application/vnd.api+json'}

    # Get workspace ID
    req = urllib.request.Request(
        f'https://app.terraform.io/api/v2/organizations/{TFC_ORG}/workspaces/{TFC_WORKSPACE}',
        headers=headers)
    workspace = json.loads(urllib.request.urlopen(req).read())
    ws_id = workspace['data']['id']

    # Get state outputs
    req = urllib.request.Request(
        f'https://app.terraform.io/api/v2/workspaces/{ws_id}/current-state-version?include=outputs',
        headers=headers)
    state = json.loads(urllib.request.urlopen(req).read())

    outputs = {}
    for output in state.get('included', []):
        outputs[output['attributes']['name']] = output['attributes']['value']
    return outputs

def build_inventory(outputs):
    inventory = {'_meta': {'hostvars': {}}, 'all': {'children': []}}

    for ip in outputs.get('web_ips', []):
        group = 'webservers'
        if group not in inventory:
            inventory[group] = {'hosts': []}
            inventory['all']['children'].append(group)
        hostname = f'web-{ip.replace(".", "-")}'
        inventory[group]['hosts'].append(hostname)
        inventory['_meta']['hostvars'][hostname] = {
            'ansible_host': ip,
            'ansible_user': 'ubuntu'
        }

    return inventory

if __name__ == '__main__':
    if '--list' in sys.argv:
        outputs = get_outputs()
        print(json.dumps(build_inventory(outputs), indent=2))
    else:
        print(json.dumps({}))
```

## Running Ansible with TFC Inventory

```bash
# Set environment variables
export TF_CLOUD_TOKEN="your-tfc-token"
export TFC_ORG="my-org"
export TFC_WORKSPACE="production"

# Run Ansible with the dynamic inventory
ansible-playbook -i inventory/tfc_inventory.py playbook.yml
```

## Summary

Terraform Cloud's remote state is the bridge to Ansible. By querying the TFC API for workspace outputs, you can dynamically generate Ansible inventory that always reflects the current infrastructure state. This approach works whether Terraform runs locally, in TFC, or in a CI pipeline.

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

