# How to Use Ansible to Deploy to Azure Container Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Azure, ACI, Containers, Cloud

Description: Deploy containers to Azure Container Instances using Ansible for quick serverless container deployments with virtual network integration.

---

Azure Container Instances (ACI) is the simplest way to run containers in Azure. There are no VMs to manage, no orchestrators to configure. You just specify your container image, resource requirements, and Azure runs it. Ansible's azure.azcollection provides modules to manage ACI deployments programmatically.

## Prerequisites

```bash
# Install Azure collection and SDK
ansible-galaxy collection install azure.azcollection
pip install azure-identity azure-mgmt-containerinstance azure-mgmt-resource
```

## Basic ACI Deployment

```yaml
# roles/aci_deploy/tasks/main.yml
# Deploy container to Azure Container Instances
- name: Create resource group
  azure.azcollection.azure_rm_resourcegroup:
    name: "{{ resource_group }}"
    location: "{{ azure_region }}"
    state: present

- name: Deploy container instance
  azure.azcollection.azure_rm_containerinstance:
    resource_group: "{{ resource_group }}"
    name: "{{ container_group_name }}"
    os_type: linux
    restart_policy: Always
    ip_address: public
    dns_name_label: "{{ dns_label }}"
    ports:
      - "{{ app_port }}"
    containers:
      - name: "{{ app_name }}"
        image: "{{ container_image }}"
        cpu: "{{ cpu_count }}"
        memory: "{{ memory_gb }}"
        ports:
          - "{{ app_port }}"
        environment_variables:
          - name: DATABASE_URL
            value: "{{ database_url }}"
          - name: LOG_LEVEL
            value: "{{ log_level }}"
        secure_environment_variables:
          - name: API_SECRET
            value: "{{ vault_api_secret }}"
    state: present
  register: aci_result

- name: Display container FQDN
  ansible.builtin.debug:
    msg: "Container accessible at: {{ aci_result.ip_address }}"
```

## Multi-Container Groups

ACI supports running multiple containers in a group that share the same network:

```yaml
# roles/aci_deploy/tasks/multi_container.yml
# Deploy multi-container group to ACI
- name: Deploy container group with sidecar
  azure.azcollection.azure_rm_containerinstance:
    resource_group: "{{ resource_group }}"
    name: "{{ container_group_name }}"
    os_type: linux
    ip_address: public
    ports:
      - 8080
    containers:
      - name: webapp
        image: "{{ app_image }}:{{ app_version }}"
        cpu: 1.0
        memory: 1.5
        ports:
          - 8080
        environment_variables:
          - name: REDIS_HOST
            value: "127.0.0.1"
      - name: redis-sidecar
        image: "redis:7-alpine"
        cpu: 0.5
        memory: 0.5
        ports:
          - 6379
    state: present
```

## VNet Integration

```yaml
# roles/aci_deploy/tasks/vnet.yml
# Deploy ACI into a virtual network
- name: Deploy ACI with VNet integration
  azure.azcollection.azure_rm_containerinstance:
    resource_group: "{{ resource_group }}"
    name: "{{ container_group_name }}"
    os_type: linux
    restart_policy: Always
    subnet_ids:
      - "{{ aci_subnet_id }}"
    containers:
      - name: "{{ app_name }}"
        image: "{{ container_image }}"
        cpu: "{{ cpu_count }}"
        memory: "{{ memory_gb }}"
        ports:
          - "{{ app_port }}"
    state: present
```

## Volume Mounts

```yaml
# roles/aci_deploy/tasks/volumes.yml
# Deploy ACI with Azure File Share volume
- name: Deploy with file share volume
  azure.azcollection.azure_rm_containerinstance:
    resource_group: "{{ resource_group }}"
    name: "{{ container_group_name }}"
    os_type: linux
    volumes:
      - name: app-data
        azure_file:
          storage_account_name: "{{ storage_account }}"
          share_name: "{{ file_share_name }}"
          storage_account_key: "{{ vault_storage_key }}"
    containers:
      - name: "{{ app_name }}"
        image: "{{ container_image }}"
        cpu: 1.0
        memory: 1.5
        volume_mounts:
          - name: app-data
            mount_path: /app/data
    state: present
```

## Health Monitoring

```yaml
# roles/aci_deploy/tasks/health.yml
# Monitor ACI container health
- name: Get container instance details
  azure.azcollection.azure_rm_containerinstance_info:
    resource_group: "{{ resource_group }}"
    name: "{{ container_group_name }}"
  register: aci_info

- name: Assert container is running
  ansible.builtin.assert:
    that:
      - aci_info.containerinstances[0].containers[0].instance_view.current_state.state == 'Running'
    fail_msg: "Container is not in Running state"

- name: Check application health endpoint
  ansible.builtin.uri:
    url: "http://{{ aci_info.containerinstances[0].ip_address }}:{{ app_port }}/health"
    status_code: 200
  register: health
  until: health.status == 200
  retries: 10
  delay: 15
```

## Cleanup

```yaml
# roles/aci_deploy/tasks/cleanup.yml
# Remove container instances
- name: Delete container instance
  azure.azcollection.azure_rm_containerinstance:
    resource_group: "{{ resource_group }}"
    name: "{{ container_group_name }}"
    state: absent
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

Azure Container Instances provides the fastest path to running containers in Azure, and Ansible makes the deployment repeatable and version-controlled. ACI is ideal for batch processing, dev/test environments, and applications that do not need the full power of AKS. Ansible's Azure collection modules handle container groups, networking, volumes, and monitoring, giving you complete lifecycle management through automation.
