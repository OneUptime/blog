# How to Use Ansible with JIRA for Ticketing Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, JIRA, Ticketing, DevOps

Description: Automate JIRA ticket creation and updates from Ansible playbooks for change tracking, incident documentation, and deployment records.

---

Tracking infrastructure changes in a ticketing system provides an audit trail and helps with change management processes. Ansible can create JIRA tickets, update them with deployment details, and transition them through workflows automatically.

## Integration Flow

```mermaid
graph LR
    A[Ansible Playbook] --> B[Create JIRA Ticket]
    B --> C[Run Deployment]
    C --> D[Update Ticket]
    D --> E[Close Ticket]
```

## Creating JIRA Tickets

```yaml
# tasks/jira-create.yml
---
- name: Create JIRA change ticket
  community.general.jira:
    uri: "{{ jira_url }}"
    username: "{{ jira_user }}"
    password: "{{ jira_api_token }}"
    project: OPS
    operation: create
    issuetype: Task
    summary: "Deploy {{ app_name }} {{ app_version }} to {{ environment_name }}"
    description: |
      Automated deployment ticket created by Ansible.

      *Details:*
      - Application: {{ app_name }}
      - Version: {{ app_version }}
      - Environment: {{ environment_name }}
      - Initiated by: {{ lookup('env', 'USER') }}
      - Timestamp: {{ ansible_date_time.iso8601 }}
  register: jira_ticket

- name: Display ticket number
  ansible.builtin.debug:
    msg: "Created JIRA ticket: {{ jira_ticket.meta.key }}"
```

## Updating Tickets

```yaml
# tasks/jira-update.yml
---
- name: Add deployment results to JIRA ticket
  community.general.jira:
    uri: "{{ jira_url }}"
    username: "{{ jira_user }}"
    password: "{{ jira_api_token }}"
    issue: "{{ jira_ticket_key }}"
    operation: comment
    comment: |
      Deployment completed.
      Status: {{ deploy_status }}
      Servers updated: {{ ansible_play_hosts | length }}
      Duration: {{ deploy_duration }} seconds
```

## Transitioning Tickets

```yaml
# tasks/jira-transition.yml
---
- name: Transition ticket to Done
  community.general.jira:
    uri: "{{ jira_url }}"
    username: "{{ jira_user }}"
    password: "{{ jira_api_token }}"
    issue: "{{ jira_ticket_key }}"
    operation: transition
    status: Done
  when: deploy_status == 'success'

- name: Transition ticket to Failed
  community.general.jira:
    uri: "{{ jira_url }}"
    username: "{{ jira_user }}"
    password: "{{ jira_api_token }}"
    issue: "{{ jira_ticket_key }}"
    operation: transition
    status: Blocked
  when: deploy_status == 'failed'
```

## Full Deployment Playbook with JIRA

```yaml
# playbooks/deploy-with-jira.yml
---
- name: Deploy with JIRA tracking
  hosts: localhost
  connection: local
  tasks:
    - name: Create change ticket
      ansible.builtin.include_tasks: tasks/jira-create.yml

- name: Run deployment
  hosts: app_servers
  become: true
  roles:
    - app_deploy

- name: Close ticket
  hosts: localhost
  connection: local
  tasks:
    - name: Update and close JIRA ticket
      ansible.builtin.include_tasks: tasks/jira-transition.yml
```

## Key Takeaways

JIRA integration with Ansible provides automated change tracking. Create tickets before deployments, update them with results, and transition them through your workflow. This satisfies change management requirements and provides a clear audit trail of every infrastructure change.

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

