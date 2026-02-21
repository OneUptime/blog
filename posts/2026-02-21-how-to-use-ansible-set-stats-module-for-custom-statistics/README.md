# How to Use Ansible set_stats Module for Custom Statistics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, set_stats, Statistics, Reporting, Automation

Description: Track custom statistics during Ansible playbook runs with the set_stats module for reporting and pipeline integration.

---

The `ansible.builtin.set_stats` module lets you define custom statistics that are displayed in the playbook summary and can be consumed by callback plugins or Ansible Tower/AWX. This is useful for tracking deployment metrics, counting changes, and passing data between playbook runs.

## Basic Usage

```yaml
- name: Track deployment statistics
  ansible.builtin.set_stats:
    data:
      deployed_version: "v2.1.0"
      deployment_time: "{{ ansible_date_time.iso8601 }}"
      hosts_updated: "{{ ansible_play_hosts | length }}"
```

## Tracking Changes

```yaml
- name: Deploy application
  hosts: appservers
  tasks:
    - name: Update application
      ansible.builtin.apt:
        name: myapp
        state: latest
      register: app_update

    - name: Record update statistics
      ansible.builtin.set_stats:
        data:
          packages_updated: "{{ app_update.changed | int }}"
        aggregate: true  # Sum across all hosts
```

## Per-Host Statistics

```yaml
- name: Gather system info
  ansible.builtin.set_stats:
    data:
      disk_usage: "{{ ansible_mounts | selectattr('mount', 'equalto', '/') | map(attribute='size_available') | first }}"
    per_host: true  # Track per host, not aggregated
```

## Pipeline Integration

When using Ansible Tower/AWX, set_stats data is available via the API:

```yaml
- name: Report to pipeline
  ansible.builtin.set_stats:
    data:
      deploy_status: "success"
      image_tag: "{{ app_version }}"
      rollback_version: "{{ previous_version }}"
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


## Aggregating Statistics Across Hosts

The `aggregate` parameter is key for multi-host deployments. When set to true, numeric values are summed across all hosts:

```yaml
# playbooks/patching.yml
# Track patch statistics across the entire fleet
- name: Patch all servers
  hosts: all
  become: true
  tasks:
    - name: Update all packages
      ansible.builtin.apt:
        upgrade: safe
      register: update_result

    - name: Count updated packages
      ansible.builtin.set_stats:
        data:
          total_packages_updated: "{{ update_result.stdout_lines | select('match', '^Inst') | list | length }}"
          hosts_patched: 1
        aggregate: true

    - name: Record host-specific details
      ansible.builtin.set_stats:
        data:
          last_patch_time: "{{ ansible_date_time.iso8601 }}"
          reboot_required: "{{ ansible_reboot_pending | default(false) }}"
        per_host: true
```

At the end of the playbook run, Ansible displays the aggregated totals in the PLAY RECAP section.

## Using Stats in Ansible Tower/AWX

When running playbooks through Tower/AWX, set_stats data becomes available through the job API endpoint. This is useful for building dashboards and triggering downstream workflows.

```yaml
# playbooks/deploy_with_stats.yml
- name: Deploy with tracking
  hosts: appservers
  tasks:
    - name: Deploy application
      ansible.builtin.include_role:
        name: deploy
      register: deploy_result

    - name: Track deployment metrics
      ansible.builtin.set_stats:
        data:
          deployment_successful: "{{ deploy_result is not failed }}"
          deploy_duration_seconds: "{{ (ansible_date_time.epoch | int) - (deploy_start_time | int) }}"
          version_deployed: "{{ app_version }}"
          environment: "{{ deploy_environment }}"
```

## Conclusion

The `set_stats` module provides a clean way to expose custom metrics from your playbook runs. Use it to track deployment versions, count changes across hosts with aggregation, and pass data to external systems through callback plugins or Ansible Tower's API. When combined with per-host tracking, you get both fleet-wide totals and host-specific details in a single playbook run.

