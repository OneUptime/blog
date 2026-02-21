# How to Use Ansible to Check if a Service is Running

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Service Management, Linux, Monitoring

Description: Learn multiple methods to check if a service is running using Ansible, from simple status checks to conditional task execution based on service state.

---

Checking whether a service is running is one of the most basic operations in infrastructure management, but there are several ways to do it in Ansible, and each has its place. You might need a quick pre-flight check before a deployment, a health verification after a configuration change, or a conditional branch that skips tasks if a service is not present. This guide covers every practical approach.

## Method 1: Using the service_facts Module

This is the most Ansible-native approach. Gather all service facts and then query the dictionary.

Gather service facts and check a specific service:

```yaml
---
- name: Check service status using service_facts
  hosts: all
  become: yes
  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Check if nginx is running
      ansible.builtin.debug:
        msg: "Nginx is running"
      when:
        - "'nginx.service' in ansible_facts.services"
        - "ansible_facts.services['nginx.service']['state'] == 'running'"

    - name: Check if nginx is NOT running
      ansible.builtin.debug:
        msg: "Nginx is NOT running on {{ inventory_hostname }}"
      when: >
        'nginx.service' not in ansible_facts.services or
        ansible_facts.services['nginx.service']['state'] != 'running'
```

The advantage of `service_facts` is that it gives you the complete picture in one call. The downside is that it queries every service on the system, which takes a bit longer than checking just one.

## Method 2: Using systemctl Command

For a quick check of a single service, the `command` module with `systemctl` is efficient.

Check a single service with systemctl:

```yaml
- name: Check if PostgreSQL is active
  ansible.builtin.command: systemctl is-active postgresql
  register: pg_status
  changed_when: false
  failed_when: false

- name: Report PostgreSQL status
  ansible.builtin.debug:
    msg: "PostgreSQL is {{ 'running' if pg_status.rc == 0 else 'not running' }}"

- name: Proceed only if PostgreSQL is running
  ansible.builtin.debug:
    msg: "Database is ready, proceeding with migration"
  when: pg_status.rc == 0
```

`systemctl is-active` returns exit code 0 if the service is active and non-zero otherwise. Setting `failed_when: false` prevents the task from failing when the service is down, which is expected behavior when you are just checking.

## Method 3: Using the stat Module for PID Files

Some services write a PID file when they start. You can check for the existence of this file as a quick indicator.

Check for a service's PID file:

```yaml
- name: Check if Nginx PID file exists
  ansible.builtin.stat:
    path: /run/nginx.pid
  register: nginx_pid

- name: Nginx is running
  ansible.builtin.debug:
    msg: "Nginx PID file found - service is likely running"
  when: nginx_pid.stat.exists
```

This method is less reliable because a PID file can be stale (left behind after a crash), but it works in situations where you do not have access to systemctl.

## Method 4: Using wait_for to Check a Port

If a service listens on a specific port, you can check if that port is open.

Check if a service is listening on its expected port:

```yaml
- name: Check if web server is listening on port 80
  ansible.builtin.wait_for:
    port: 80
    host: 127.0.0.1
    timeout: 5
    state: started
  register: port_check
  ignore_errors: yes

- name: Web server is responding
  ansible.builtin.debug:
    msg: "Web server is up and listening on port 80"
  when: port_check is success

- name: Web server is down
  ansible.builtin.debug:
    msg: "WARNING: Web server is not listening on port 80"
  when: port_check is failed
```

This is actually a better health check than just checking the process, because a process can be running but not accepting connections (stuck, deadlocked, or still initializing).

## Method 5: Using the uri Module for HTTP Services

For web services, you can make an actual HTTP request to a health endpoint.

Check a service's HTTP health endpoint:

```yaml
- name: Check application health endpoint
  ansible.builtin.uri:
    url: "http://localhost:8080/health"
    method: GET
    return_content: yes
    timeout: 10
  register: health_check
  ignore_errors: yes

- name: Application is healthy
  ansible.builtin.debug:
    msg: "App health: {{ health_check.json }}"
  when:
    - health_check is success
    - health_check.status == 200

- name: Application is not healthy
  ansible.builtin.fail:
    msg: "Health check failed: {{ health_check.msg | default('unreachable') }}"
  when: health_check is failed
```

## Building a Pre-Deployment Check Playbook

In real deployments, you want to verify prerequisites before making changes. Here is a complete pre-flight check playbook.

Pre-deployment verification playbook:

```yaml
---
- name: Pre-deployment checks
  hosts: app_servers
  become: yes

  vars:
    required_services:
      - { name: "docker.service", description: "Docker" }
      - { name: "nginx.service", description: "Nginx" }
    required_ports:
      - { port: 5432, host: "db.internal", description: "PostgreSQL" }
      - { port: 6379, host: "cache.internal", description: "Redis" }

  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Check required services
      ansible.builtin.assert:
        that:
          - "item.name in ansible_facts.services"
          - "ansible_facts.services[item.name]['state'] == 'running'"
        fail_msg: "{{ item.description }} is not running on {{ inventory_hostname }}"
        success_msg: "{{ item.description }} is running"
      loop: "{{ required_services }}"

    - name: Check required external services
      ansible.builtin.wait_for:
        host: "{{ item.host }}"
        port: "{{ item.port }}"
        timeout: 10
        state: started
      loop: "{{ required_ports }}"
      register: port_checks

    - name: All pre-flight checks passed
      ansible.builtin.debug:
        msg: "All pre-deployment checks passed on {{ inventory_hostname }}"
```

## Checking Multiple Services in a Loop

When you need to check many services and collect results:

```yaml
- name: Gather service facts
  ansible.builtin.service_facts:

- name: Check status of all critical services
  ansible.builtin.set_fact:
    service_report: >-
      {{ service_report | default([]) + [{
        'name': item,
        'status': (ansible_facts.services[item]['state']
                   if item in ansible_facts.services
                   else 'not installed'),
        'enabled': (ansible_facts.services[item]['status']
                    if item in ansible_facts.services
                    else 'n/a')
      }] }}
  loop:
    - sshd.service
    - nginx.service
    - postgresql.service
    - docker.service
    - redis-server.service
    - prometheus-node-exporter.service

- name: Display service report
  ansible.builtin.debug:
    msg: |
      Service Status Report for {{ inventory_hostname }}:
      {% for svc in service_report %}
        {{ svc.name }}: state={{ svc.status }}, enabled={{ svc.enabled }}
      {% endfor %}
```

## Cross-Platform Service Checking

If your fleet includes both systemd and non-systemd hosts, use the `service` module with a check:

```yaml
- name: Check if service exists and is running (cross-platform)
  ansible.builtin.service:
    name: "{{ service_to_check }}"
    state: started
  check_mode: yes
  register: service_check
  ignore_errors: yes

- name: Service is running
  ansible.builtin.debug:
    msg: "{{ service_to_check }} is running"
  when: service_check is success and not service_check.changed

- name: Service is stopped but exists
  ansible.builtin.debug:
    msg: "{{ service_to_check }} exists but is stopped"
  when: service_check is success and service_check.changed

- name: Service does not exist
  ansible.builtin.debug:
    msg: "{{ service_to_check }} does not exist on this host"
  when: service_check is failed
```

Using `check_mode: yes` (dry run) means Ansible will report what it would do without actually making changes. If `changed` is true, it means the service is not in the desired state. If the task fails entirely, the service likely does not exist.

## Sending Alerts When Services Are Down

Combine service checks with notification:

```yaml
- name: Gather service facts
  ansible.builtin.service_facts:

- name: Find stopped critical services
  ansible.builtin.set_fact:
    stopped_services: >-
      {{ critical_services
         | select('in', ansible_facts.services.keys())
         | select('in',
             ansible_facts.services | dict2items
             | rejectattr('value.state', 'equalto', 'running')
             | map(attribute='key')
             | list)
         | list }}
  vars:
    critical_services:
      - sshd.service
      - nginx.service
      - docker.service

- name: Send alert for stopped services
  ansible.builtin.uri:
    url: "{{ slack_webhook_url }}"
    method: POST
    body_format: json
    body:
      text: "ALERT: Stopped services on {{ inventory_hostname }}: {{ stopped_services | join(', ') }}"
  when: stopped_services | length > 0
  delegate_to: localhost
```

## Summary

There is no single "best" way to check if a service is running in Ansible. Use `service_facts` when you need to check multiple services or build conditional logic. Use `systemctl is-active` for quick single-service checks. Use `wait_for` to verify a service is actually accepting connections. Use the `uri` module for HTTP health checks. In production playbooks, you will often combine several of these approaches in a pre-deployment check phase to verify your infrastructure is ready before pushing changes.
