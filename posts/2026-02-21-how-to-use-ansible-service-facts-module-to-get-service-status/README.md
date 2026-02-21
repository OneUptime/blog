# How to Use Ansible service_facts Module to Get Service Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Services, Facts, System Administration

Description: Learn how to use the Ansible service_facts module to discover running services, their status, and make decisions based on service state.

---

When managing servers, you frequently need to know which services are running, which are stopped, and which are enabled at boot. The `ansible.builtin.service_facts` module collects this information from systemd, SysVinit, or other init systems and makes it available as Ansible facts. This lets your playbooks adapt based on the actual state of services rather than assuming everything is running as expected.

## How service_facts Works

Like `package_facts`, service information is not gathered during the default fact collection. You need to call the `service_facts` module explicitly. Once called, it populates `ansible_facts['services']` with a dictionary of all services and their current state.

```yaml
# basic-service-facts.yml
# Gathers service facts and shows a summary
---
- name: Gather service facts
  hosts: all
  become: yes
  tasks:
    - name: Collect service information
      ansible.builtin.service_facts:

    - name: Show total services
      ansible.builtin.debug:
        msg: "Total services: {{ ansible_facts['services'] | length }}"

    - name: Check if nginx is running
      ansible.builtin.debug:
        msg: "nginx status: {{ ansible_facts['services']['nginx.service']['state'] }}"
      when: "'nginx.service' in ansible_facts['services']"
```

## Service Facts Data Structure

Each service in `ansible_facts['services']` has several attributes. The exact attributes depend on the init system, but for systemd (the most common), you get:

```yaml
# inspect-service-structure.yml
# Shows the full data structure for a service
---
- name: Inspect service data structure
  hosts: all
  become: yes
  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Show detailed info for sshd
      ansible.builtin.debug:
        var: ansible_facts['services']['sshd.service']
      when: "'sshd.service' in ansible_facts['services']"
```

A typical systemd service entry looks like this:

```json
{
  "sshd.service": {
    "name": "sshd.service",
    "source": "systemd",
    "state": "running",
    "status": "enabled"
  }
}
```

The key fields are:
- `state` - current state: running, stopped, inactive, or unknown
- `status` - boot configuration: enabled, disabled, static, or masked
- `source` - init system: systemd, sysv, upstart
- `name` - full service name

## Checking Multiple Services

Here is how to check a list of required services.

```yaml
# check-services.yml
# Verifies that critical services are running
---
- name: Verify critical services
  hosts: all
  become: yes
  vars:
    critical_services:
      - sshd.service
      - chronyd.service
      - rsyslog.service
      - firewalld.service
  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Check each critical service
      ansible.builtin.debug:
        msg: >
          {{ item }}:
          {{ ansible_facts['services'][item]['state'] | default('not found') }}
          ({{ ansible_facts['services'][item]['status'] | default('unknown') }})
      loop: "{{ critical_services }}"

    - name: Identify stopped critical services
      ansible.builtin.set_fact:
        stopped_services: >-
          {{
            critical_services
            | select('in', ansible_facts['services'])
            | select('match', '.*')
            | list
            | map('extract', ansible_facts['services'])
            | selectattr('state', 'ne', 'running')
            | map(attribute='name')
            | list
          }}

    - name: Alert on stopped services
      ansible.builtin.debug:
        msg: "WARNING: Stopped critical services: {{ stopped_services | join(', ') }}"
      when: stopped_services | length > 0
```

## Conditional Actions Based on Service State

Make deployment decisions based on which services are already running.

```yaml
# conditional-service-config.yml
# Configures application based on discovered services
---
- name: Configure app based on available services
  hosts: appservers
  become: yes
  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Configure app to use local Redis if running
      ansible.builtin.set_fact:
        cache_host: "127.0.0.1"
        cache_port: 6379
      when:
        - "'redis.service' in ansible_facts['services']"
        - ansible_facts['services']['redis.service']['state'] == 'running'

    - name: Use external Redis if local is not running
      ansible.builtin.set_fact:
        cache_host: "redis.internal.example.com"
        cache_port: 6379
      when: >
        'redis.service' not in ansible_facts['services'] or
        ansible_facts['services']['redis.service']['state'] != 'running'

    - name: Configure app to use local PostgreSQL if running
      ansible.builtin.set_fact:
        db_host: "127.0.0.1"
      when:
        - "'postgresql.service' in ansible_facts['services']"
        - ansible_facts['services']['postgresql.service']['state'] == 'running'

    - name: Deploy application config
      ansible.builtin.template:
        src: app-config.yml.j2
        dest: /etc/myapp/config.yml
        mode: '0640'
```

## Finding All Running Services

Sometimes you need a list of everything that is currently running.

```yaml
# list-running-services.yml
# Lists all currently running services
---
- name: List running services
  hosts: all
  become: yes
  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Build list of running services
      ansible.builtin.set_fact:
        running_services: >-
          {{
            ansible_facts['services']
            | dict2items
            | selectattr('value.state', 'equalto', 'running')
            | map(attribute='key')
            | sort
            | list
          }}

    - name: Display running services
      ansible.builtin.debug:
        msg: "Running services ({{ running_services | length }}): {{ running_services | join(', ') }}"

    - name: Build list of enabled but not running services
      ansible.builtin.set_fact:
        enabled_stopped: >-
          {{
            ansible_facts['services']
            | dict2items
            | selectattr('value.status', 'defined')
            | selectattr('value.status', 'equalto', 'enabled')
            | selectattr('value.state', 'ne', 'running')
            | map(attribute='key')
            | sort
            | list
          }}

    - name: Show enabled but stopped services
      ansible.builtin.debug:
        msg: "Enabled but not running: {{ enabled_stopped | join(', ') }}"
      when: enabled_stopped | length > 0
```

## Pre-Deployment Service Validation

Before deploying new versions, verify that dependent services are healthy.

```yaml
# pre-deploy-check.yml
# Validates service dependencies before deployment
---
- name: Pre-deployment service check
  hosts: appservers
  become: yes
  vars:
    required_running:
      - nginx.service
      - postgresql.service
      - redis.service
    required_stopped:
      - myapp-maintenance.service
  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Check required running services
      ansible.builtin.assert:
        that:
          - item in ansible_facts['services']
          - ansible_facts['services'][item]['state'] == 'running'
        fail_msg: "{{ item }} is not running. Cannot proceed with deployment."
        success_msg: "{{ item }} is running."
      loop: "{{ required_running }}"

    - name: Check services that should be stopped
      ansible.builtin.assert:
        that:
          - item not in ansible_facts['services'] or ansible_facts['services'][item]['state'] != 'running'
        fail_msg: "{{ item }} should be stopped before deployment."
        success_msg: "{{ item }} is correctly stopped."
      loop: "{{ required_stopped }}"

    - name: All pre-deployment checks passed
      ansible.builtin.debug:
        msg: "All service checks passed. Safe to deploy."
```

## Service Health Report

Generate a comprehensive service health report.

```yaml
# service-health-report.yml
# Generates a service health report for all hosts
---
- name: Generate service health report
  hosts: all
  become: yes
  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Generate report
      ansible.builtin.template:
        src: service-report.txt.j2
        dest: "/tmp/service-report-{{ inventory_hostname }}.txt"
      delegate_to: localhost
```

```jinja2
{# templates/service-report.txt.j2 #}
{# Service health report generated by Ansible #}
Service Health Report: {{ inventory_hostname }}
Date: {{ ansible_date_time.iso8601 }}
================================================================

{% set services_list = ansible_facts['services'] | dict2items %}
Total Services: {{ services_list | length }}
Running: {{ services_list | selectattr('value.state', 'equalto', 'running') | list | length }}
Stopped: {{ services_list | selectattr('value.state', 'equalto', 'stopped') | list | length }}

Running Services:
{% for svc in services_list | selectattr('value.state', 'equalto', 'running') | sort(attribute='key') %}
  [RUNNING] {{ "%-50s" | format(svc.key) }} ({{ svc.value.status | default('unknown') }})
{% endfor %}

Stopped/Inactive Services:
{% for svc in services_list | rejectattr('value.state', 'equalto', 'running') | sort(attribute='key') %}
  [{{ svc.value.state | upper }}] {{ "%-50s" | format(svc.key) }} ({{ svc.value.status | default('unknown') }})
{% endfor %}
```

## Detecting Service Conflicts

Check for services that might conflict with your deployment.

```yaml
# detect-conflicts.yml
# Checks for conflicting services before installing new ones
---
- name: Detect service conflicts
  hosts: webservers
  become: yes
  vars:
    # If we are installing nginx, apache should not be running
    conflict_map:
      nginx:
        conflicts_with:
          - apache2.service
          - httpd.service
      postgresql:
        conflicts_with:
          - mysql.service
          - mariadb.service
    service_to_install: nginx
  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Check for conflicting services
      ansible.builtin.fail:
        msg: >
          Cannot install {{ service_to_install }}:
          conflicting service {{ item }} is currently running.
          Please stop it first.
      loop: "{{ conflict_map[service_to_install]['conflicts_with'] }}"
      when:
        - item in ansible_facts['services']
        - ansible_facts['services'][item]['state'] == 'running'
```

## Restarting Failed Services

Use service facts to find and restart services that should be running but are not.

```yaml
# restart-failed.yml
# Finds and restarts services that should be running but are not
---
- name: Restart failed services
  hosts: all
  become: yes
  vars:
    expected_running:
      - sshd.service
      - chronyd.service
      - rsyslog.service
      - node_exporter.service
  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Restart services that should be running
      ansible.builtin.service:
        name: "{{ item }}"
        state: started
      loop: "{{ expected_running }}"
      when:
        - item in ansible_facts['services']
        - ansible_facts['services'][item]['state'] != 'running'
        - ansible_facts['services'][item]['status'] | default('') == 'enabled'
      register: restart_results

    - name: Report restart results
      ansible.builtin.debug:
        msg: "Restarted {{ item.item }}"
      loop: "{{ restart_results.results }}"
      when: item.changed | default(false)
      loop_control:
        label: "{{ item.item }}"
```

## Summary

The `service_facts` module gives you a real-time view of service state across your infrastructure. Use it for pre-deployment validation (ensuring dependencies are running), conflict detection (checking for competing services), health monitoring (finding stopped services that should be running), and adaptive configuration (adjusting settings based on available services). Call it explicitly as a task, then access the data through `ansible_facts['services']`. Combined with conditionals and assertions, it makes your playbooks aware of the actual runtime state of your servers.
