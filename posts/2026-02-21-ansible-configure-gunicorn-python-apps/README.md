# How to Use Ansible to Configure Gunicorn for Python Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Gunicorn, Python, WSGI, DevOps

Description: Configure Gunicorn WSGI server for Python applications using Ansible with worker tuning, systemd management, and logging.

---

Gunicorn (Green Unicorn) is the most widely used WSGI HTTP server for Python web applications. It works with any WSGI-compatible framework including Django, Flask, FastAPI (via uvicorn workers), and Pyramid. Configuring Gunicorn properly for production involves choosing the right number of workers, setting up proper logging, configuring graceful restarts, and managing it as a system service. Ansible handles all of this configuration consistently across your servers.

This guide covers setting up Gunicorn with Ansible, including worker optimization, different worker types, systemd integration, logging, and monitoring.

## Why Gunicorn Needs Careful Configuration

Gunicorn's default settings are fine for development but not for production. The default single worker means you cannot handle concurrent requests properly. The default logging goes to stdout, which is not useful for production debugging. And without a process manager, Gunicorn will not restart after a crash. We will fix all of these issues with Ansible.

## Project Structure

```
gunicorn-setup/
  inventory/
    hosts.yml
  group_vars/
    all.yml
  roles/
    gunicorn/
      tasks/
        main.yml
      templates/
        gunicorn.conf.py.j2
        gunicorn.service.j2
        gunicorn.socket.j2
        logrotate.conf.j2
      handlers/
        main.yml
  playbook.yml
```

## Variables

```yaml
# group_vars/all.yml
app_name: myapp
app_user: appuser
app_group: appuser
app_dir: /opt/myapp
venv_dir: /opt/myapp/venv
wsgi_module: "myapp.wsgi:application"  # Django style
# wsgi_module: "app:app"              # Flask style

# Gunicorn worker configuration
gunicorn_workers: "{{ (ansible_processor_vcpus * 2) + 1 }}"
gunicorn_worker_class: sync  # sync, gevent, uvicorn.workers.UvicornWorker
gunicorn_threads: 1
gunicorn_timeout: 120
gunicorn_graceful_timeout: 30
gunicorn_keepalive: 5
gunicorn_max_requests: 1000
gunicorn_max_requests_jitter: 50

# Binding configuration
gunicorn_bind_type: socket  # socket or tcp
gunicorn_bind_address: "127.0.0.1"
gunicorn_bind_port: 8000
gunicorn_socket_path: "/run/{{ app_name }}/gunicorn.sock"

# Logging
gunicorn_log_dir: "/var/log/{{ app_name }}"
gunicorn_access_log: "{{ gunicorn_log_dir }}/access.log"
gunicorn_error_log: "{{ gunicorn_log_dir }}/error.log"
gunicorn_log_level: info
```

## Role Tasks

```yaml
# roles/gunicorn/tasks/main.yml
---
- name: Install Gunicorn in the application virtual environment
  pip:
    name: gunicorn
    virtualenv: "{{ venv_dir }}"
  become_user: "{{ app_user }}"

- name: Install gevent for async workers (optional)
  pip:
    name: gevent
    virtualenv: "{{ venv_dir }}"
  become_user: "{{ app_user }}"
  when: gunicorn_worker_class == "gevent"

- name: Install uvicorn for ASGI support (optional)
  pip:
    name:
      - uvicorn
      - uvloop
      - httptools
    virtualenv: "{{ venv_dir }}"
  become_user: "{{ app_user }}"
  when: gunicorn_worker_class == "uvicorn.workers.UvicornWorker"

- name: Create log directory
  file:
    path: "{{ gunicorn_log_dir }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'

- name: Create runtime directory for socket
  file:
    path: "/run/{{ app_name }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'
  when: gunicorn_bind_type == "socket"

- name: Create tmpfiles.d entry for runtime directory persistence
  copy:
    content: "d /run/{{ app_name }} 0755 {{ app_user }} {{ app_group }} -"
    dest: "/etc/tmpfiles.d/{{ app_name }}.conf"
    mode: '0644'
  when: gunicorn_bind_type == "socket"

- name: Deploy Gunicorn configuration file
  template:
    src: gunicorn.conf.py.j2
    dest: "{{ app_dir }}/gunicorn.conf.py"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0644'
  notify: restart gunicorn

- name: Deploy Gunicorn systemd socket unit
  template:
    src: gunicorn.socket.j2
    dest: "/etc/systemd/system/{{ app_name }}.socket"
    mode: '0644'
  when: gunicorn_bind_type == "socket"
  notify:
    - reload systemd
    - restart gunicorn socket

- name: Deploy Gunicorn systemd service unit
  template:
    src: gunicorn.service.j2
    dest: "/etc/systemd/system/{{ app_name }}.service"
    mode: '0644'
  notify:
    - reload systemd
    - restart gunicorn

- name: Deploy logrotate configuration
  template:
    src: logrotate.conf.j2
    dest: "/etc/logrotate.d/{{ app_name }}"
    mode: '0644'

- name: Enable and start Gunicorn socket
  systemd:
    name: "{{ app_name }}.socket"
    enabled: yes
    state: started
  when: gunicorn_bind_type == "socket"

- name: Enable and start Gunicorn service
  systemd:
    name: "{{ app_name }}"
    enabled: yes
    state: started
  when: gunicorn_bind_type == "tcp"

- name: Verify Gunicorn is running
  command: "systemctl is-active {{ app_name }}"
  register: gunicorn_status
  changed_when: false
  failed_when: gunicorn_status.rc != 0
```

## Gunicorn Configuration File

This Python-based configuration file gives you full control over Gunicorn behavior.

```python
# roles/gunicorn/templates/gunicorn.conf.py.j2
# Gunicorn configuration file - managed by Ansible

# Binding
{% if gunicorn_bind_type == "socket" %}
bind = "unix:{{ gunicorn_socket_path }}"
{% else %}
bind = "{{ gunicorn_bind_address }}:{{ gunicorn_bind_port }}"
{% endif %}

# Worker configuration
workers = {{ gunicorn_workers }}
worker_class = "{{ gunicorn_worker_class }}"
threads = {{ gunicorn_threads }}
timeout = {{ gunicorn_timeout }}
graceful_timeout = {{ gunicorn_graceful_timeout }}
keepalive = {{ gunicorn_keepalive }}

# Restart workers after this many requests to prevent memory leaks
max_requests = {{ gunicorn_max_requests }}
max_requests_jitter = {{ gunicorn_max_requests_jitter }}

# Logging
accesslog = "{{ gunicorn_access_log }}"
errorlog = "{{ gunicorn_error_log }}"
loglevel = "{{ gunicorn_log_level }}"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "{{ app_name }}"

# Security
limit_request_line = 8190
limit_request_fields = 100
limit_request_field_size = 8190

# Server mechanics
preload_app = True
daemon = False
tmp_upload_dir = None

# Worker lifecycle hooks
def on_starting(server):
    """Called just before the master process starts."""
    pass

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def pre_exec(server):
    """Called just before a new master process is forked."""
    server.log.info("Forked child, re-executing.")

def worker_exit(server, worker):
    """Called when a worker exits."""
    server.log.info("Worker exited (pid: %s)", worker.pid)
```

## Systemd Socket Unit

```ini
# roles/gunicorn/templates/gunicorn.socket.j2
[Unit]
Description={{ app_name }} Gunicorn Socket

[Socket]
ListenStream={{ gunicorn_socket_path }}
SocketUser={{ app_user }}
SocketGroup=www-data
SocketMode=0660

[Install]
WantedBy=sockets.target
```

## Systemd Service Unit

```ini
# roles/gunicorn/templates/gunicorn.service.j2
[Unit]
Description=Gunicorn daemon for {{ app_name }}
{% if gunicorn_bind_type == "socket" %}
Requires={{ app_name }}.socket
After=network.target {{ app_name }}.socket
{% else %}
After=network.target
{% endif %}

[Service]
Type=notify
User={{ app_user }}
Group={{ app_group }}
RuntimeDirectory={{ app_name }}
WorkingDirectory={{ app_dir }}
ExecStart={{ venv_dir }}/bin/gunicorn {{ wsgi_module }} -c {{ app_dir }}/gunicorn.conf.py
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec={{ gunicorn_graceful_timeout + 5 }}
Restart=on-failure
RestartSec=5

# Security hardening
PrivateTmp=true
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

## Logrotate Configuration

```
# roles/gunicorn/templates/logrotate.conf.j2
{{ gunicorn_log_dir }}/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 {{ app_user }} {{ app_group }}
    sharedscripts
    postrotate
        systemctl reload {{ app_name }} 2>/dev/null || true
    endscript
}
```

## Handlers

```yaml
# roles/gunicorn/handlers/main.yml
---
- name: reload systemd
  systemd:
    daemon_reload: yes

- name: restart gunicorn
  systemd:
    name: "{{ app_name }}"
    state: restarted

- name: restart gunicorn socket
  systemd:
    name: "{{ app_name }}.socket"
    state: restarted
```

## Worker Type Selection Guide

Choosing the right worker class depends on your application:

| Worker Class | Best For | Use When |
|---|---|---|
| sync | CPU-bound work | Your app does heavy computation |
| gevent | I/O-bound work | Your app makes many external API calls |
| uvicorn.workers.UvicornWorker | ASGI apps | You use FastAPI or async Django |

## Running the Playbook

```bash
# Configure Gunicorn with default sync workers
ansible-playbook -i inventory/hosts.yml playbook.yml

# Use gevent async workers
ansible-playbook -i inventory/hosts.yml playbook.yml -e "gunicorn_worker_class=gevent"

# Use TCP binding instead of Unix socket
ansible-playbook -i inventory/hosts.yml playbook.yml -e "gunicorn_bind_type=tcp"
```

## Checking Gunicorn Status

```bash
# Check if Gunicorn is running
systemctl status myapp

# View Gunicorn logs
journalctl -u myapp -f

# Graceful restart (zero-downtime)
systemctl reload myapp
```

## Wrapping Up

Gunicorn is the standard WSGI server for Python applications in production. This Ansible playbook covers everything needed for a production setup: worker tuning based on CPU count, process recycling to prevent memory leaks, systemd management with socket activation, proper logging with rotation, and security hardening. The configuration file template is flexible enough to handle sync workers for CPU-bound apps, gevent for I/O-bound apps, and uvicorn workers for ASGI applications. With Ansible managing the configuration, you can apply consistent Gunicorn settings across all your Python application servers.
