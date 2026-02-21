# How to Use the Ansible sysvinit Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, sysvinit, Linux, Service Management

Description: Learn how to manage legacy SysV init services using the Ansible sysvinit module for older Linux distributions and compatibility scenarios.

---

Not every server in your fleet runs systemd. If you manage older distributions like CentOS 6, Debian Wheezy, or embedded Linux systems, you are dealing with SysV init scripts. The Ansible `sysvinit` module exists specifically for these cases. It gives you direct control over services managed by the traditional `/etc/init.d/` scripts and runlevel-based startup configuration.

In this post, I will cover how to use the `sysvinit` module, when to choose it over the generic `service` module, and practical examples for managing legacy services.

## What is SysV Init?

SysV init is the traditional initialization system used by Linux distributions before systemd took over. Services are managed through shell scripts in `/etc/init.d/`, and startup behavior is controlled by symlinks in `/etc/rc.d/` or `/etc/rcN.d/` directories (where N is the runlevel number).

Runlevels determine which services start at boot:
- Runlevel 0: Halt
- Runlevel 1: Single-user mode
- Runlevel 2: Multi-user without networking (Debian) or with networking (Red Hat)
- Runlevel 3: Full multi-user with networking
- Runlevel 5: Multi-user with GUI
- Runlevel 6: Reboot

## When to Use sysvinit vs service

The generic `ansible.builtin.service` module auto-detects the init system and delegates to the appropriate backend. So why use `sysvinit` directly?

You would reach for `sysvinit` when you need runlevel-specific control. The generic `service` module has no concept of runlevels. If you need a service enabled only in runlevels 3 and 5 but disabled in 2, you need `sysvinit`.

## Basic Usage

The simplest use case is starting or stopping a service.

Start the Apache service and ensure it is running:

```yaml
---
- name: Manage legacy services
  hosts: legacy_servers
  become: yes
  tasks:
    - name: Start Apache
      ansible.builtin.sysvinit:
        name: httpd
        state: started
```

Stop a service that should not be running:

```yaml
    - name: Stop and disable telnet
      ansible.builtin.sysvinit:
        name: telnetd
        state: stopped
        enabled: no
```

## Module Parameters

The `sysvinit` module accepts these key parameters:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | Name of the service (the init script name in /etc/init.d/) |
| `state` | No | `started`, `stopped`, `restarted`, `reloaded` |
| `enabled` | No | Whether the service starts at boot (`yes`/`no`) |
| `runlevels` | No | List of runlevels to enable/disable the service for |
| `daemonize` | No | Whether to daemonize the process (rarely needed) |
| `sleep` | No | Seconds to sleep between stop and start during restart |
| `pattern` | No | Pattern to match in the process table for status checks |
| `arguments` | No | Additional arguments passed to the init script |

## Controlling Runlevels

This is the killer feature of the `sysvinit` module. You can specify exactly which runlevels a service should be enabled for.

Enable a service only for multi-user runlevels with networking:

```yaml
- name: Enable MySQL only for runlevels 3 and 5
  ansible.builtin.sysvinit:
    name: mysqld
    enabled: yes
    runlevels:
      - 3
      - 5
```

Disable a service for specific runlevels while keeping it enabled for others:

```yaml
- name: Disable NFS in runlevel 2
  ansible.builtin.sysvinit:
    name: nfs
    enabled: no
    runlevels:
      - 2
```

## Working with Custom Init Scripts

If you deploy your own application with a custom init script, you can manage the full lifecycle with Ansible.

First, deploy the init script, then manage it with sysvinit:

```yaml
---
- name: Deploy and manage custom service
  hosts: app_servers
  become: yes
  tasks:
    - name: Deploy init script
      ansible.builtin.template:
        src: myapp-init.sh.j2
        dest: /etc/init.d/myapp
        owner: root
        group: root
        mode: '0755'

    - name: Ensure myapp is enabled and running
      ansible.builtin.sysvinit:
        name: myapp
        state: started
        enabled: yes
        runlevels:
          - 2
          - 3
          - 4
          - 5
```

Here is what a basic init script template looks like:

```bash
#!/bin/bash
# /etc/init.d/myapp
# chkconfig: 2345 95 05
# description: My Application Service

### BEGIN INIT INFO
# Provides:          myapp
# Required-Start:    $network $syslog
# Required-Stop:     $network $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: My Application
# Description:       Starts the My Application daemon
### END INIT INFO

APP_NAME="myapp"
APP_DIR="{{ app_install_dir }}"
APP_BIN="${APP_DIR}/bin/${APP_NAME}"
APP_USER="{{ app_user }}"
PID_FILE="/var/run/${APP_NAME}.pid"
LOG_FILE="/var/log/${APP_NAME}/${APP_NAME}.log"

start() {
    echo "Starting ${APP_NAME}..."
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "${APP_NAME} is already running (PID: $PID)"
            return 1
        fi
    fi
    su -s /bin/bash -c "${APP_BIN} >> ${LOG_FILE} 2>&1 &" "$APP_USER"
    echo $! > "$PID_FILE"
    echo "${APP_NAME} started"
}

stop() {
    echo "Stopping ${APP_NAME}..."
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        kill "$PID" 2>/dev/null
        rm -f "$PID_FILE"
        echo "${APP_NAME} stopped"
    else
        echo "${APP_NAME} is not running"
    fi
}

status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "${APP_NAME} is running (PID: $PID)"
            return 0
        fi
    fi
    echo "${APP_NAME} is not running"
    return 3
}

case "$1" in
    start)   start ;;
    stop)    stop ;;
    restart) stop; sleep 2; start ;;
    status)  status ;;
    *)       echo "Usage: $0 {start|stop|restart|status}"; exit 1 ;;
esac
```

## Using the Pattern Parameter

Some init scripts do not implement a proper `status` command. The `pattern` parameter tells Ansible what to look for in the process table to determine if the service is running.

Use pattern matching when the init script lacks proper status support:

```yaml
- name: Manage legacy daemon with pattern detection
  ansible.builtin.sysvinit:
    name: legacy_daemon
    state: started
    pattern: "legacy_daemon.*--config"
```

Ansible will run `ps` and look for processes matching that pattern to determine the current state.

## Passing Arguments to Init Scripts

Some init scripts accept extra arguments beyond the standard start/stop/restart.

Pass additional arguments to the init script:

```yaml
- name: Start service with extra arguments
  ansible.builtin.sysvinit:
    name: myapp
    state: started
    arguments: "--verbose --port 9090"
```

This translates to running `/etc/init.d/myapp start --verbose --port 9090`.

## Handling the Sleep Parameter

When you restart a service, the `sleep` parameter adds a delay between the stop and start phases. This is useful for services that take time to release resources like TCP ports or file locks.

Add a 5-second delay between stop and start during restart:

```yaml
- name: Restart service with delay
  ansible.builtin.sysvinit:
    name: myapp
    state: restarted
    sleep: 5
```

## A Complete Playbook Example

Here is a full playbook that manages multiple legacy services across different server groups.

Complete playbook for managing SysV services:

```yaml
---
- name: Manage SysV init services on legacy servers
  hosts: legacy_fleet
  become: yes

  vars:
    required_services:
      - name: sshd
        state: started
        enabled: yes
        runlevels: [2, 3, 4, 5]
      - name: rsyslog
        state: started
        enabled: yes
        runlevels: [2, 3, 4, 5]
      - name: crond
        state: started
        enabled: yes
        runlevels: [2, 3, 4, 5]
      - name: ntpd
        state: started
        enabled: yes
        runlevels: [3, 5]

    disabled_services:
      - name: cups
        state: stopped
        enabled: no
      - name: avahi-daemon
        state: stopped
        enabled: no
      - name: bluetooth
        state: stopped
        enabled: no

  tasks:
    - name: Ensure required services are running
      ansible.builtin.sysvinit:
        name: "{{ item.name }}"
        state: "{{ item.state }}"
        enabled: "{{ item.enabled }}"
        runlevels: "{{ item.runlevels }}"
      loop: "{{ required_services }}"

    - name: Disable unnecessary services
      ansible.builtin.sysvinit:
        name: "{{ item.name }}"
        state: "{{ item.state }}"
        enabled: "{{ item.enabled }}"
      loop: "{{ disabled_services }}"
      ignore_errors: yes  # Some services may not exist on all hosts

    - name: Check current runlevel
      ansible.builtin.command: runlevel
      register: current_runlevel
      changed_when: false

    - name: Display current runlevel
      ansible.builtin.debug:
        msg: "Server {{ inventory_hostname }} is at runlevel {{ current_runlevel.stdout.split()[1] }}"
```

## Migration Path: SysV to systemd

If you are gradually migrating from SysV to systemd, you can use Ansible facts to detect the init system and choose the right module.

Auto-detect the init system and use the appropriate module:

```yaml
- name: Start service (systemd)
  ansible.builtin.systemd:
    name: myapp
    state: started
    enabled: yes
  when: ansible_service_mgr == 'systemd'

- name: Start service (sysvinit)
  ansible.builtin.sysvinit:
    name: myapp
    state: started
    enabled: yes
    runlevels: [3, 5]
  when: ansible_service_mgr == 'sysvinit'
```

## Summary

The `sysvinit` module is purpose-built for managing services on systems that predate systemd. Its main advantages over the generic `service` module are runlevel control, pattern-based status detection, and the sleep parameter for restart operations. If you still have CentOS 6 boxes or older embedded systems in your infrastructure, this module will save you from writing raw shell commands to manage their services. For mixed environments, use `ansible_service_mgr` to branch your logic and handle both init systems cleanly.
