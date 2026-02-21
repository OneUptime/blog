# How to Use the Ansible systemd_service Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, systemd, Linux, Services, System Administration

Description: A comprehensive guide to the Ansible systemd_service module for managing systemd services, including unit management, scope control, and advanced systemd features.

---

While the generic `service` module works across different init systems, the `systemd_service` module (previously just `systemd`) is purpose-built for systemd and exposes features that the generic module cannot. If your infrastructure runs on modern Linux distributions (which almost certainly means systemd), this module gives you finer control over service management.

Let me walk through what the `systemd_service` module offers and when you should reach for it instead of the generic `service` module.

## When to Use systemd_service vs service

Use the generic `service` module when you need cross-platform compatibility or are doing simple start/stop/enable operations. Use `systemd_service` when you need:

- `daemon_reload` after modifying unit files
- Control over user vs system scope
- Masking/unmasking services
- Force operations
- Any systemd-specific feature

## Basic Usage

The basic interface is similar to the `service` module.

```yaml
# Start and enable a service using the systemd module
- name: Start and enable nginx
  ansible.builtin.systemd_service:
    name: nginx
    state: started
    enabled: true
```

## Starting, Stopping, and Restarting

```yaml
# Start a service
- name: Start PostgreSQL
  ansible.builtin.systemd_service:
    name: postgresql
    state: started

# Stop a service
- name: Stop PostgreSQL
  ansible.builtin.systemd_service:
    name: postgresql
    state: stopped

# Restart a service
- name: Restart PostgreSQL
  ansible.builtin.systemd_service:
    name: postgresql
    state: restarted

# Reload a service configuration
- name: Reload nginx
  ansible.builtin.systemd_service:
    name: nginx
    state: reloaded
```

## daemon_reload

This is the most common reason to use `systemd_service` over `service`. When you modify a systemd unit file, systemd needs to be told to re-read its configuration. The `daemon_reload` parameter handles this.

```yaml
# Deploy a custom service unit and reload systemd
- name: Deploy myapp service unit
  ansible.builtin.copy:
    dest: /etc/systemd/system/myapp.service
    content: |
      [Unit]
      Description=My Application
      After=network.target postgresql.service
      Requires=postgresql.service

      [Service]
      Type=simple
      User=appuser
      WorkingDirectory=/opt/myapp
      ExecStart=/opt/myapp/bin/server
      Restart=always
      RestartSec=5
      Environment=NODE_ENV=production

      [Install]
      WantedBy=multi-user.target
    mode: '0644'

- name: Reload systemd and start the service
  ansible.builtin.systemd_service:
    name: myapp
    state: started
    enabled: true
    daemon_reload: true
```

The `daemon_reload: true` parameter triggers `systemctl daemon-reload` before managing the service. Without this, systemd would use the old unit file configuration.

## Masking and Unmasking Services

Masking a service prevents it from being started, even manually. This is stronger than disabling.

```yaml
# Mask a service to prevent it from being started at all
- name: Mask unnecessary services
  ansible.builtin.systemd_service:
    name: "{{ item }}"
    masked: true
  loop:
    - cups
    - avahi-daemon
    - bluetooth

# Unmask a service to allow it to be started again
- name: Unmask a service
  ansible.builtin.systemd_service:
    name: cups
    masked: false
```

Masked services cannot be started even with `systemctl start`. You would need to unmask them first.

## Managing User Services

systemd supports user-level services (running in the user's session). The `scope` parameter controls this.

```yaml
# Manage a user-level systemd service
- name: Start a user service
  ansible.builtin.systemd_service:
    name: syncthing
    state: started
    enabled: true
    scope: user
  become: true
  become_user: developer
  environment:
    XDG_RUNTIME_DIR: "/run/user/{{ developer_uid }}"
```

User services are useful for development tools, personal daemons, and services that should not have system-wide impact.

## Creating and Managing Custom Services

Here is a complete example of creating a custom systemd service for a Go application.

```yaml
---
# playbook: deploy-go-service.yml
# Deploy a Go application as a systemd service
- hosts: app_servers
  become: true

  vars:
    app_name: myapi
    app_user: myapi
    app_dir: /opt/myapi
    app_port: 8080

  tasks:
    - name: Create application user
      ansible.builtin.user:
        name: "{{ app_user }}"
        system: true
        shell: /usr/sbin/nologin
        home: "{{ app_dir }}"
        create_home: false

    - name: Create application directories
      ansible.builtin.file:
        path: "{{ item }}"
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
        mode: '0755'
      loop:
        - "{{ app_dir }}"
        - "{{ app_dir }}/bin"
        - /var/log/{{ app_name }}

    - name: Deploy application binary
      ansible.builtin.copy:
        src: "build/{{ app_name }}"
        dest: "{{ app_dir }}/bin/{{ app_name }}"
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
        mode: '0755'
      notify: restart myapi

    - name: Create systemd service unit
      ansible.builtin.copy:
        dest: "/etc/systemd/system/{{ app_name }}.service"
        content: |
          [Unit]
          Description={{ app_name }} API Service
          Documentation=https://docs.company.com/{{ app_name }}
          After=network-online.target
          Wants=network-online.target

          [Service]
          Type=simple
          User={{ app_user }}
          Group={{ app_user }}
          WorkingDirectory={{ app_dir }}
          ExecStart={{ app_dir }}/bin/{{ app_name }}
          ExecReload=/bin/kill -HUP $MAINPID
          Restart=on-failure
          RestartSec=5
          StartLimitIntervalSec=60
          StartLimitBurst=3

          # Security hardening
          NoNewPrivileges=true
          ProtectSystem=strict
          ProtectHome=true
          ReadWritePaths=/var/log/{{ app_name }}
          PrivateTmp=true
          PrivateDevices=true
          ProtectKernelTunables=true
          ProtectKernelModules=true
          ProtectControlGroups=true

          # Resource limits
          LimitNOFILE=65535
          MemoryMax=512M
          CPUQuota=200%

          # Environment
          Environment=PORT={{ app_port }}
          Environment=LOG_DIR=/var/log/{{ app_name }}
          EnvironmentFile=-/etc/default/{{ app_name }}

          [Install]
          WantedBy=multi-user.target
        mode: '0644'
      notify: reload and restart myapi

    - name: Create environment file
      ansible.builtin.copy:
        dest: "/etc/default/{{ app_name }}"
        content: |
          DATABASE_URL={{ database_url }}
          REDIS_URL={{ redis_url }}
          LOG_LEVEL=info
        mode: '0600'
        owner: root
        group: "{{ app_user }}"
      notify: restart myapi

    - name: Enable and start the service
      ansible.builtin.systemd_service:
        name: "{{ app_name }}"
        state: started
        enabled: true
        daemon_reload: true

  handlers:
    - name: reload and restart myapi
      ansible.builtin.systemd_service:
        name: "{{ app_name }}"
        state: restarted
        daemon_reload: true

    - name: restart myapi
      ansible.builtin.systemd_service:
        name: "{{ app_name }}"
        state: restarted
```

## Managing Systemd Timers

systemd timers are the modern replacement for cron jobs. You can manage them with the same module.

```yaml
# Create a systemd timer for periodic tasks
- name: Create backup service unit
  ansible.builtin.copy:
    dest: /etc/systemd/system/backup-db.service
    content: |
      [Unit]
      Description=Database Backup

      [Service]
      Type=oneshot
      User=backup
      ExecStart=/opt/scripts/backup-database.sh
      StandardOutput=journal
      StandardError=journal
    mode: '0644'

- name: Create backup timer unit
  ansible.builtin.copy:
    dest: /etc/systemd/system/backup-db.timer
    content: |
      [Unit]
      Description=Run database backup daily

      [Timer]
      OnCalendar=*-*-* 02:00:00
      Persistent=true
      RandomizedDelaySec=1800

      [Install]
      WantedBy=timers.target
    mode: '0644'

- name: Enable and start the backup timer
  ansible.builtin.systemd_service:
    name: backup-db.timer
    state: started
    enabled: true
    daemon_reload: true
```

## Gathering Service Facts

The `systemd_service` module can also gather facts about services.

```yaml
# Gather systemd service facts
- name: Gather service facts
  ansible.builtin.service_facts:

- name: Show status of specific services
  ansible.builtin.debug:
    msg: |
      nginx: {{ ansible_facts.services['nginx.service'].state | default('not found') }}
      postgresql: {{ ansible_facts.services['postgresql.service'].state | default('not found') }}
      redis: {{ ansible_facts.services['redis-server.service'].state | default('not found') }}
```

## Managing Service Overrides

systemd allows you to override parts of a service unit without modifying the original file. This is done through drop-in files.

```yaml
# Create a systemd drop-in override for nginx
- name: Create nginx override directory
  ansible.builtin.file:
    path: /etc/systemd/system/nginx.service.d
    state: directory
    mode: '0755'

- name: Add nginx override for increased limits
  ansible.builtin.copy:
    dest: /etc/systemd/system/nginx.service.d/override.conf
    content: |
      [Service]
      LimitNOFILE=65535
      Restart=always
      RestartSec=3
    mode: '0644'
  notify: reload systemd and restart nginx
```

```yaml
# Handler
- name: reload systemd and restart nginx
  ansible.builtin.systemd_service:
    name: nginx
    state: restarted
    daemon_reload: true
```

## Wrapping Up

The `systemd_service` module is what you should use when managing services on modern Linux systems. Its daemon_reload capability alone makes it essential for any playbook that deploys or modifies service unit files. The ability to mask services, manage user-scope services, and work with systemd timers gives you complete control over the systemd ecosystem. For most production Ansible roles, I default to `systemd_service` over the generic `service` module because the systemd-specific features come up more often than you might expect.
