# How to Use Ansible import_playbook for Modular Playbook Design

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, import_playbook, Modular Design, Organization, DevOps

Description: Structure large Ansible projects with import_playbook for reusable, modular playbook design with clear separation of concerns.

---

The `ansible.builtin.import_playbook` directive lets you build a master playbook from smaller, focused sub-playbooks. This is the top-level organizational pattern for large Ansible projects, where a single `site.yml` orchestrates the entire infrastructure by importing specialized playbooks.

## Basic Structure

```yaml
# site.yml - master playbook
- import_playbook: playbooks/common.yml
- import_playbook: playbooks/security.yml
- import_playbook: playbooks/databases.yml
- import_playbook: playbooks/applications.yml
- import_playbook: playbooks/monitoring.yml
```

Each imported playbook is a complete, standalone playbook:

```yaml
# playbooks/common.yml
- name: Apply common configuration
  hosts: all
  become: true
  roles:
    - common
    - ntp
    - log_agent
```

```yaml
# playbooks/databases.yml
- name: Configure database servers
  hosts: databases
  become: true
  serial: 1
  roles:
    - postgresql
    - backup_agent
```

## Conditional Imports

```yaml
# site.yml with conditional imports
- import_playbook: playbooks/common.yml

- import_playbook: playbooks/databases.yml
  when: "'databases' in groups and groups['databases'] | length > 0"

- import_playbook: playbooks/monitoring.yml
  when: monitoring_enabled | default(true)
```

## Environment-Specific Imports

```yaml
# site.yml
- import_playbook: playbooks/common.yml
- import_playbook: "playbooks/{{ deploy_environment }}_specific.yml"
```

## Layered Architecture

```yaml
# deploy.yml - deployment orchestration
# Layer 1: Infrastructure
- import_playbook: playbooks/infrastructure/network.yml
- import_playbook: playbooks/infrastructure/storage.yml
- import_playbook: playbooks/infrastructure/compute.yml

# Layer 2: Platform
- import_playbook: playbooks/platform/kubernetes.yml
- import_playbook: playbooks/platform/databases.yml
- import_playbook: playbooks/platform/messaging.yml

# Layer 3: Applications
- import_playbook: playbooks/apps/api.yml
- import_playbook: playbooks/apps/frontend.yml
- import_playbook: playbooks/apps/workers.yml

# Layer 4: Validation
- import_playbook: playbooks/validation/smoke_tests.yml
- import_playbook: playbooks/validation/health_checks.yml
```

## import_playbook vs include (Deprecated)

```yaml
# import_playbook is static - processed at parse time
# This means:
# - Tags from imported playbooks are visible to --tags
# - Variable files are loaded immediately
# - Cannot use loops or runtime conditions effectively

# For most use cases, import_playbook is what you want
- import_playbook: playbooks/web.yml
```

## Project Structure

```
project/
  site.yml                    # Master playbook
  playbooks/
    common.yml                # Base configuration
    security.yml              # Security hardening
    databases.yml             # Database setup
    applications.yml          # Application deployment
    monitoring.yml            # Monitoring stack
    infrastructure/
      network.yml
      storage.yml
    validation/
      smoke_tests.yml
  roles/
    common/
    nginx/
    postgresql/
  inventories/
    production/
    staging/
  group_vars/
  host_vars/
```

## Selective Execution

```bash
# Run only specific imported playbooks using tags
ansible-playbook site.yml --tags databases

# Run everything except monitoring
ansible-playbook site.yml --skip-tags monitoring

# Run just the common playbook
ansible-playbook playbooks/common.yml
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

The `import_playbook` directive is the backbone of modular Ansible project design. It lets you compose a complete infrastructure deployment from focused, testable sub-playbooks. Each sub-playbook handles one concern (databases, applications, monitoring), can be run independently for testing, and combines into a master playbook for full deployments. This pattern scales from small projects to enterprise-wide automation.

