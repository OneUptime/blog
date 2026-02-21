# How to Use Ansible to Manage Multiple Services in a Loop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Service Management, Automation

Description: Learn how to manage multiple services efficiently using Ansible loops, from simple lists to complex data structures with per-service configuration.

---

Managing a handful of services one task at a time is fine. But when you have 10, 20, or more services to manage across different server roles, writing individual tasks for each one becomes tedious and hard to maintain. Ansible's loop constructs let you manage many services with a single task definition, and when combined with variables and data structures, you get a powerful, DRY approach to fleet-wide service management.

## Basic Loop with a List

The simplest case: ensure multiple services are running.

Start and enable a list of services:

```yaml
---
- name: Manage multiple services
  hosts: all
  become: yes
  tasks:
    - name: Ensure critical services are running
      ansible.builtin.systemd:
        name: "{{ item }}"
        state: started
        enabled: yes
      loop:
        - sshd
        - chronyd
        - rsyslog
        - auditd
        - crond
```

This is equivalent to writing five separate tasks, but it is much easier to read and maintain.

## Loop with a Variable List

Pull the service list from a variable for better reusability.

Define services per host group using group variables:

```yaml
# group_vars/web_servers.yml
managed_services:
  - nginx
  - php-fpm
  - redis
  - node_exporter

# group_vars/db_servers.yml
managed_services:
  - postgresql-15
  - pgbouncer
  - node_exporter

# group_vars/all.yml
base_services:
  - sshd
  - chronyd
  - rsyslog
```

The playbook then combines base services with role-specific ones:

```yaml
---
- name: Manage services by server role
  hosts: all
  become: yes
  tasks:
    - name: Enable base services
      ansible.builtin.systemd:
        name: "{{ item }}"
        state: started
        enabled: yes
      loop: "{{ base_services }}"

    - name: Enable role-specific services
      ansible.builtin.systemd:
        name: "{{ item }}"
        state: started
        enabled: yes
      loop: "{{ managed_services | default([]) }}"
```

## Loop with Dictionaries for Per-Service Config

When different services need different states, use a list of dictionaries.

Manage services with different desired states:

```yaml
---
- name: Manage services with specific states
  hosts: all
  become: yes

  vars:
    service_config:
      - name: nginx
        state: started
        enabled: yes
      - name: php-fpm
        state: started
        enabled: yes
      - name: apache2
        state: stopped
        enabled: no
      - name: cups
        state: stopped
        enabled: no
      - name: bluetooth
        state: stopped
        enabled: no

  tasks:
    - name: Apply service configuration
      ansible.builtin.systemd:
        name: "{{ item.name }}"
        state: "{{ item.state }}"
        enabled: "{{ item.enabled }}"
      loop: "{{ service_config }}"
      loop_control:
        label: "{{ item.name }} -> {{ item.state }}"
      ignore_errors: yes
```

The `loop_control.label` parameter controls what is displayed in the output. Without it, Ansible would print the entire dictionary for each iteration, which gets noisy.

## Using with_items vs loop

In older Ansible versions, you would use `with_items`. The modern `loop` keyword is preferred, but both work.

```yaml
# Modern syntax (recommended)
- name: Start services (loop)
  ansible.builtin.systemd:
    name: "{{ item }}"
    state: started
  loop:
    - nginx
    - redis

# Legacy syntax (still works)
- name: Start services (with_items)
  ansible.builtin.systemd:
    name: "{{ item }}"
    state: started
  with_items:
    - nginx
    - redis
```

## Complex Data Structures

For environments where each service has detailed configuration, use richer data structures.

Full service specification with config files and handlers:

```yaml
---
- name: Deploy and manage services
  hosts: app_servers
  become: yes

  vars:
    services:
      - name: nginx
        package: nginx
        config_src: nginx.conf.j2
        config_dest: /etc/nginx/nginx.conf
        state: started
        enabled: yes
        restart_handler: Restart Nginx
      - name: redis-server
        package: redis
        config_src: redis.conf.j2
        config_dest: /etc/redis/redis.conf
        state: started
        enabled: yes
        restart_handler: Restart Redis
      - name: myapp
        package: null
        config_src: myapp.yaml.j2
        config_dest: /etc/myapp/config.yaml
        state: started
        enabled: yes
        restart_handler: Restart MyApp

  tasks:
    - name: Install service packages
      ansible.builtin.apt:
        name: "{{ item.package }}"
        state: present
      loop: "{{ services }}"
      loop_control:
        label: "{{ item.package }}"
      when: item.package is not none

    - name: Deploy service configs
      ansible.builtin.template:
        src: "{{ item.config_src }}"
        dest: "{{ item.config_dest }}"
      loop: "{{ services }}"
      loop_control:
        label: "{{ item.name }}"
      notify: "{{ item.restart_handler }}"

    - name: Manage service state
      ansible.builtin.systemd:
        name: "{{ item.name }}"
        state: "{{ item.state }}"
        enabled: "{{ item.enabled }}"
      loop: "{{ services }}"
      loop_control:
        label: "{{ item.name }}"

  handlers:
    - name: Restart Nginx
      ansible.builtin.systemd:
        name: nginx
        state: restarted

    - name: Restart Redis
      ansible.builtin.systemd:
        name: redis-server
        state: restarted

    - name: Restart MyApp
      ansible.builtin.systemd:
        name: myapp
        state: restarted
```

## Conditional Loops

Filter services based on conditions.

Only manage services that match certain criteria:

```yaml
vars:
  all_services:
    - name: nginx
      state: started
      enabled: yes
      production_only: false
    - name: debug-tools
      state: started
      enabled: yes
      production_only: false
    - name: profiler
      state: started
      enabled: no
      production_only: true

tasks:
  - name: Manage services (exclude production-only in staging)
    ansible.builtin.systemd:
      name: "{{ item.name }}"
      state: "{{ item.state }}"
      enabled: "{{ item.enabled }}"
    loop: "{{ all_services | rejectattr('production_only') | list }}"
    loop_control:
      label: "{{ item.name }}"
    when: env != 'production'

  - name: Manage all services in production
    ansible.builtin.systemd:
      name: "{{ item.name }}"
      state: "{{ item.state }}"
      enabled: "{{ item.enabled }}"
    loop: "{{ all_services }}"
    loop_control:
      label: "{{ item.name }}"
    when: env == 'production'
```

## Stopping Unwanted Services

Just as important as starting the right services is stopping the wrong ones.

Stop and disable services that should not be running:

```yaml
vars:
  unwanted_services:
    - cups
    - avahi-daemon
    - bluetooth
    - ModemManager
    - wpa_supplicant
    - rpcbind
    - telnet

tasks:
  - name: Gather service facts
    ansible.builtin.service_facts:

  - name: Stop unwanted services that exist on this host
    ansible.builtin.systemd:
      name: "{{ item }}"
      state: stopped
      enabled: no
    loop: "{{ unwanted_services }}"
    when: "(item + '.service') in ansible_facts.services"
    loop_control:
      label: "{{ item }}"
```

By checking `service_facts` first, we avoid errors from trying to stop services that are not installed.

## Loop with Retry Logic

For services that might take time to start, add retry logic.

Start services with retry on failure:

```yaml
- name: Start services with retry
  ansible.builtin.systemd:
    name: "{{ item }}"
    state: started
  loop:
    - elasticsearch
    - kibana
    - logstash
  register: start_result
  retries: 3
  delay: 10
  until: start_result is success
  loop_control:
    label: "{{ item }}"
```

## Generating Status Reports

Loop through services and build a report.

Generate a service status report for all managed services:

```yaml
- name: Gather service facts
  ansible.builtin.service_facts:

- name: Build service report
  ansible.builtin.set_fact:
    service_report: >-
      {{ service_report | default({}) | combine({
        item: {
          'state': ansible_facts.services[item + '.service']['state']
                   if (item + '.service') in ansible_facts.services
                   else 'not installed',
          'enabled': ansible_facts.services[item + '.service']['status']
                     if (item + '.service') in ansible_facts.services
                     else 'n/a'
        }
      }) }}
  loop:
    - sshd
    - nginx
    - docker
    - postgresql
    - redis-server
    - myapp

- name: Display report
  ansible.builtin.debug:
    msg: |
      Service Status Report for {{ inventory_hostname }}
      ================================================
      {% for svc, info in service_report.items() %}
      {{ "%-20s" | format(svc) }} state={{ info.state }}  enabled={{ info.enabled }}
      {% endfor %}
```

## Using include_tasks with Loops

For more complex per-service logic, loop over an include file.

Include a task file for each service:

```yaml
# main playbook
- name: Configure each service
  ansible.builtin.include_tasks: configure-service.yml
  loop: "{{ services }}"
  loop_control:
    loop_var: svc

# configure-service.yml
---
- name: "Install {{ svc.name }}"
  ansible.builtin.apt:
    name: "{{ svc.package }}"
    state: present
  when: svc.package is defined

- name: "Deploy config for {{ svc.name }}"
  ansible.builtin.template:
    src: "{{ svc.config_template }}"
    dest: "{{ svc.config_path }}"
  register: config_result

- name: "Restart {{ svc.name }} if config changed"
  ansible.builtin.systemd:
    name: "{{ svc.name }}"
    state: restarted
  when: config_result.changed

- name: "Enable {{ svc.name }}"
  ansible.builtin.systemd:
    name: "{{ svc.name }}"
    enabled: yes
    state: started
```

Note the use of `loop_var: svc` to avoid conflicts with `item` inside the included file.

## Performance: Batching with async

If you need to manage many services and each operation takes time, you can use async for parallelism.

Start services in parallel using async:

```yaml
- name: Start all services in parallel
  ansible.builtin.systemd:
    name: "{{ item }}"
    state: started
  loop:
    - elasticsearch
    - kibana
    - logstash
    - redis
    - nginx
  async: 120
  poll: 0
  register: async_results

- name: Wait for all services to start
  ansible.builtin.async_status:
    jid: "{{ item.ansible_job_id }}"
  loop: "{{ async_results.results }}"
  loop_control:
    label: "{{ item.item }}"
  register: job_results
  until: job_results.finished
  retries: 30
  delay: 5
```

## Summary

Loops in Ansible transform service management from a list of repetitive tasks into clean, data-driven automation. Start with simple lists for basic cases, move to dictionaries when services need different configurations, and use `include_tasks` with loops for complex per-service workflows. Combine loops with `service_facts` to make your playbooks adapt to what is actually installed on each host. The end result is playbooks that are shorter, easier to maintain, and more flexible than writing individual tasks for each service.
