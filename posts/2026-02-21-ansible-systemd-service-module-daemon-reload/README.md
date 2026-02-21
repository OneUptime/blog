# How to Use the Ansible systemd_service Module with daemon_reload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, systemd, daemon_reload, Linux, Service Management

Description: Deep dive into the daemon_reload parameter of the Ansible systemd_service module, covering when it is needed, common pitfalls, and patterns for safe unit file management.

---

If you have ever deployed a new systemd service unit file with Ansible and then wondered why the service was still using the old configuration, the answer is almost certainly a missing `daemon_reload`. systemd caches its unit file configuration in memory, and changing the file on disk does not automatically make systemd pick up the changes. You need to explicitly tell systemd to re-read its configuration with `systemctl daemon-reload`.

The `daemon_reload` parameter on Ansible's `systemd_service` module handles this, but there are subtleties to using it correctly that are worth understanding.

## When daemon_reload Is Needed

You need a daemon_reload any time you modify a systemd unit file. This includes:

- Creating a new service unit file
- Modifying an existing service unit file
- Adding or changing drop-in override files
- Removing a service unit file
- Changing timer unit files
- Modifying socket unit files

You do NOT need daemon_reload when:

- Starting or stopping an existing service
- Enabling or disabling a service
- Modifying the service's application configuration (like nginx.conf)

## Basic Usage

The `daemon_reload` parameter is a boolean that triggers `systemctl daemon-reload` before performing the requested state change.

```yaml
# Reload systemd configuration and restart the service
- name: Restart service with daemon reload
  ansible.builtin.systemd_service:
    name: myapp
    state: restarted
    daemon_reload: true
```

## The Common Pattern: Deploy Unit File Then Manage Service

The most frequent workflow is deploying a unit file and then using daemon_reload to pick up the changes.

```yaml
# Deploy a service unit file and reload systemd
- name: Create application service unit
  ansible.builtin.template:
    src: myapp.service.j2
    dest: /etc/systemd/system/myapp.service
    mode: '0644'
  register: unit_file

- name: Reload systemd and restart if unit file changed
  ansible.builtin.systemd_service:
    name: myapp
    state: restarted
    daemon_reload: true
  when: unit_file.changed
```

## Using Handlers for daemon_reload

A cleaner approach is to use handlers, which only fire when a task makes a change.

```yaml
# tasks/main.yml
- name: Deploy service unit file
  ansible.builtin.template:
    src: myapp.service.j2
    dest: /etc/systemd/system/myapp.service
    mode: '0644'
  notify:
    - reload systemd
    - restart myapp

- name: Deploy timer unit file
  ansible.builtin.template:
    src: myapp-cleanup.timer.j2
    dest: /etc/systemd/system/myapp-cleanup.timer
    mode: '0644'
  notify:
    - reload systemd
    - restart cleanup timer

- name: Ensure service is started and enabled
  ansible.builtin.systemd_service:
    name: myapp
    state: started
    enabled: true
```

```yaml
# handlers/main.yml
# Note: handler order matters - reload must happen before restart
- name: reload systemd
  ansible.builtin.systemd_service:
    daemon_reload: true

- name: restart myapp
  ansible.builtin.systemd_service:
    name: myapp
    state: restarted

- name: restart cleanup timer
  ansible.builtin.systemd_service:
    name: myapp-cleanup.timer
    state: restarted
```

Notice that the `reload systemd` handler does not specify a service name. It just triggers daemon_reload. Handlers run in the order they are defined in the handlers file, so placing the reload handler before the restart handler ensures systemd has the new configuration before the restart happens.

## daemon_reload Without a Service Name

You can trigger daemon_reload independently of any service operation.

```yaml
# Just reload systemd configuration without touching any service
- name: Reload systemd daemon
  ansible.builtin.systemd_service:
    daemon_reload: true
```

This is useful when you are deploying multiple unit files and want to reload once at the end rather than with each file.

```yaml
# Deploy multiple unit files, then reload once
- name: Deploy all service unit files
  ansible.builtin.template:
    src: "{{ item }}.service.j2"
    dest: "/etc/systemd/system/{{ item }}.service"
    mode: '0644'
  loop:
    - myapp-web
    - myapp-worker
    - myapp-scheduler
  register: unit_files

- name: Reload systemd if any unit files changed
  ansible.builtin.systemd_service:
    daemon_reload: true
  when: unit_files.changed

- name: Ensure all services are started
  ansible.builtin.systemd_service:
    name: "{{ item }}"
    state: started
    enabled: true
  loop:
    - myapp-web
    - myapp-worker
    - myapp-scheduler
```

## A Complete Deployment Example

Here is a full deployment that shows daemon_reload in context with a multi-component application.

```yaml
---
# playbook: deploy-microservices.yml
# Deploy a multi-service application with proper systemd management
- hosts: app_servers
  become: true

  vars:
    services:
      - name: api-gateway
        port: 8080
        workers: 4
      - name: auth-service
        port: 8081
        workers: 2
      - name: data-service
        port: 8082
        workers: 2

  tasks:
    - name: Create application user
      ansible.builtin.user:
        name: appuser
        system: true
        shell: /usr/sbin/nologin

    - name: Deploy service binaries
      ansible.builtin.copy:
        src: "build/{{ item.name }}"
        dest: "/opt/services/{{ item.name }}/bin/{{ item.name }}"
        owner: appuser
        mode: '0755'
      loop: "{{ services }}"
      notify: restart services

    - name: Deploy systemd unit files
      ansible.builtin.template:
        src: service.unit.j2
        dest: "/etc/systemd/system/{{ item.name }}.service"
        mode: '0644'
      loop: "{{ services }}"
      register: unit_files_result
      notify:
        - daemon reload
        - restart services

    - name: Deploy environment files
      ansible.builtin.template:
        src: "{{ item.name }}.env.j2"
        dest: "/etc/default/{{ item.name }}"
        mode: '0600'
        owner: root
        group: appuser
      loop: "{{ services }}"
      notify: restart services

    - name: Ensure all services are started and enabled
      ansible.builtin.systemd_service:
        name: "{{ item.name }}"
        state: started
        enabled: true
        daemon_reload: "{{ unit_files_result.changed | default(false) }}"
      loop: "{{ services }}"

  handlers:
    - name: daemon reload
      ansible.builtin.systemd_service:
        daemon_reload: true

    - name: restart services
      ansible.builtin.systemd_service:
        name: "{{ item.name }}"
        state: restarted
      loop: "{{ services }}"
```

The template for the service unit file:

```jinja2
{# templates/service.unit.j2 #}
[Unit]
Description={{ item.name }} Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=appuser
Group=appuser
WorkingDirectory=/opt/services/{{ item.name }}
ExecStart=/opt/services/{{ item.name }}/bin/{{ item.name }}
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5

Environment=PORT={{ item.port }}
Environment=WORKERS={{ item.workers }}
EnvironmentFile=-/etc/default/{{ item.name }}

LimitNOFILE=65535
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/log/services/{{ item.name }}

[Install]
WantedBy=multi-user.target
```

## Managing Drop-In Overrides with daemon_reload

Drop-in files are a powerful systemd feature that lets you override specific settings without modifying the original unit file.

```yaml
# Add a memory limit override to an existing service
- name: Create override directory
  ansible.builtin.file:
    path: /etc/systemd/system/nginx.service.d
    state: directory
    mode: '0755'

- name: Deploy resource limit override
  ansible.builtin.copy:
    dest: /etc/systemd/system/nginx.service.d/limits.conf
    content: |
      [Service]
      MemoryMax=1G
      CPUQuota=150%
      LimitNOFILE=65535
    mode: '0644'
  notify:
    - reload systemd
    - restart nginx

- name: Deploy restart policy override
  ansible.builtin.copy:
    dest: /etc/systemd/system/nginx.service.d/restart.conf
    content: |
      [Service]
      Restart=always
      RestartSec=3
      StartLimitIntervalSec=300
      StartLimitBurst=10
    mode: '0644'
  notify:
    - reload systemd
    - restart nginx
```

Drop-in files need daemon_reload just like regular unit files do.

## Removing Services Cleanly

When decommissioning a service, the order of operations matters.

```yaml
# Properly remove a systemd service
- name: Stop and disable the service
  ansible.builtin.systemd_service:
    name: myapp
    state: stopped
    enabled: false
  ignore_errors: true

- name: Remove the service unit file
  ansible.builtin.file:
    path: /etc/systemd/system/myapp.service
    state: absent

- name: Remove any drop-in overrides
  ansible.builtin.file:
    path: /etc/systemd/system/myapp.service.d
    state: absent

- name: Remove the environment file
  ansible.builtin.file:
    path: /etc/default/myapp
    state: absent

- name: Reload systemd to forget about the removed service
  ansible.builtin.systemd_service:
    daemon_reload: true
```

The daemon_reload at the end is essential. Without it, systemd will still think the service exists even though the file is gone.

## Common Pitfalls

### Forgetting daemon_reload After Unit File Changes

This is the most common mistake. The service restarts but uses the old configuration because systemd has not re-read the unit file.

```yaml
# WRONG: Missing daemon_reload
- name: Update service unit
  ansible.builtin.template:
    src: myapp.service.j2
    dest: /etc/systemd/system/myapp.service

- name: Restart service (will use OLD unit file config!)
  ansible.builtin.systemd_service:
    name: myapp
    state: restarted
```

```yaml
# CORRECT: Include daemon_reload
- name: Update service unit
  ansible.builtin.template:
    src: myapp.service.j2
    dest: /etc/systemd/system/myapp.service

- name: Restart service with daemon reload
  ansible.builtin.systemd_service:
    name: myapp
    state: restarted
    daemon_reload: true
```

### Running daemon_reload Too Often

On the other hand, running daemon_reload when it is not needed adds a small delay. On systems with hundreds of unit files, this can add up.

```yaml
# LESS EFFICIENT: daemon_reload on every service start
- name: Start services
  ansible.builtin.systemd_service:
    name: "{{ item }}"
    state: started
    daemon_reload: true
  loop:
    - service1
    - service2
    - service3
```

```yaml
# MORE EFFICIENT: Reload once, then start
- name: Reload systemd once
  ansible.builtin.systemd_service:
    daemon_reload: true

- name: Start services
  ansible.builtin.systemd_service:
    name: "{{ item }}"
    state: started
  loop:
    - service1
    - service2
    - service3
```

## Verifying daemon_reload Took Effect

You can verify that systemd has the latest configuration.

```yaml
# Verify the unit file is loaded correctly
- name: Check service unit properties
  ansible.builtin.command:
    cmd: systemctl show myapp.service --property=ExecStart,MemoryMax,Restart
  register: service_props
  changed_when: false

- name: Display service properties
  ansible.builtin.debug:
    var: service_props.stdout_lines
```

## Wrapping Up

The `daemon_reload` parameter is a small but crucial detail in Ansible systemd management. The rule is simple: any time you create, modify, or delete a systemd unit file (including drop-in overrides and timer files), you need a daemon_reload before the changes take effect. Use handlers to trigger it only when needed, and place the reload handler before any restart handlers to ensure the correct ordering. Getting this right means your service deployments work correctly on the first run, every time.
