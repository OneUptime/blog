# How to Create Event-Driven Ansible Rulebooks for Automated Incident Response

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Event-Driven Ansible, EDA, Incident Response, Automation

Description: Learn how to write Event-Driven Ansible (EDA) rulebooks that automatically respond to system events and incidents on RHEL infrastructure.

---

Event-Driven Ansible (EDA) enables you to create automated responses to system events. Instead of manually running playbooks, EDA listens for events and triggers actions based on rules you define in rulebooks.

## Installing Event-Driven Ansible

```bash
# Install ansible-rulebook on the control node
pip install ansible-rulebook

# Install the required Java dependency (for Drools rule engine)
sudo dnf install java-17-openjdk -y

# Verify installation
ansible-rulebook --version
```

## Rulebook Structure

A rulebook contains sources (event listeners), conditions (filters), and actions (responses).

```yaml
# rulebook-disk-alert.yml
---
- name: Respond to disk space alerts
  hosts: all
  sources:
    # Listen for webhook events from monitoring
    - ansible.eda.webhook:
        host: 0.0.0.0
        port: 5000

  rules:
    - name: Disk space critical
      condition: event.payload.alert_type == "disk_critical"
      action:
        run_playbook:
          name: playbooks/cleanup-disk.yml
          extra_vars:
            target_host: "{{ event.payload.hostname }}"

    - name: Disk space warning
      condition: event.payload.alert_type == "disk_warning"
      action:
        run_playbook:
          name: playbooks/report-disk.yml
```

## Creating the Response Playbook

```yaml
# playbooks/cleanup-disk.yml
---
- name: Clean up disk space on target host
  hosts: "{{ target_host }}"
  become: true
  tasks:
    - name: Remove old log files
      find:
        paths: /var/log
        age: 30d
        recurse: yes
      register: old_logs

    - name: Delete old log files
      file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_logs.files }}"

    - name: Clean DNF cache
      command: dnf clean all
```

## Running the Rulebook

```bash
# Start the rulebook listener
ansible-rulebook --rulebook rulebook-disk-alert.yml -i inventory.yml

# Test by sending a webhook event
curl -X POST http://localhost:5000/endpoint \
  -H "Content-Type: application/json" \
  -d '{"alert_type": "disk_critical", "hostname": "web01.example.com"}'
```

## Using File Watch Source

```yaml
# rulebook-file-watch.yml
---
- name: Respond to file changes
  hosts: localhost
  sources:
    - ansible.eda.file_watch:
        path: /etc/ssh/sshd_config
        recursive: false

  rules:
    - name: SSH config changed
      condition: event.type == "FileModifiedEvent"
      action:
        run_playbook:
          name: playbooks/validate-ssh-config.yml
```

EDA rulebooks let you build self-healing infrastructure that responds to events in real time, reducing mean time to resolution for common incidents.
