# How to Use Ansible to Configure uWSGI for Python Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, uWSGI, Python, WSGI, DevOps

Description: Configure uWSGI application server for Python web apps with Ansible including Emperor mode, vassals, and systemd integration.

---

uWSGI is a powerful, feature-rich application server for Python web applications. While Gunicorn is known for simplicity, uWSGI offers more advanced features like Emperor mode (managing multiple applications), built-in caching, process management options, and fine-grained resource controls. If you run multiple Python apps on the same server or need advanced features like offloading, caching, or subscription servers, uWSGI is worth considering. Ansible makes configuring uWSGI consistent and repeatable.

This guide covers setting up uWSGI with Ansible, including single-app configuration, Emperor mode for multi-app setups, and systemd integration.

## Single App vs Emperor Mode

uWSGI can run in two modes:

- **Single App Mode**: One uWSGI instance serves one application. Simple and straightforward.
- **Emperor Mode**: A master uWSGI process monitors configuration files (called vassals) and automatically starts, stops, and restarts application instances.

We will cover both in this guide.

## Project Structure

```
uwsgi-setup/
  inventory/
    hosts.yml
  group_vars/
    all.yml
  roles/
    uwsgi/
      tasks/
        main.yml
        single.yml
        emperor.yml
      templates/
        uwsgi-app.ini.j2
        uwsgi-emperor.service.j2
        uwsgi-single.service.j2
        logrotate.conf.j2
      handlers/
        main.yml
  playbook.yml
```

## Variables

```yaml
# group_vars/all.yml
uwsgi_mode: emperor  # single or emperor

# Single app settings
app_name: myapp
app_user: appuser
app_group: appuser
app_dir: /opt/myapp
venv_dir: /opt/myapp/venv
wsgi_module: myapp.wsgi
uwsgi_socket: /run/uwsgi/myapp.sock
uwsgi_http_port: 8000  # Use this if you want uWSGI to serve HTTP directly

# Worker configuration
uwsgi_processes: "{{ ansible_processor_vcpus * 2 }}"
uwsgi_threads: 2
uwsgi_harakiri: 120
uwsgi_max_requests: 5000
uwsgi_reload_on_rss: 256  # Reload worker if RSS exceeds 256MB
uwsgi_buffer_size: 8192

# Emperor mode settings
uwsgi_emperor_dir: /etc/uwsgi/vassals
uwsgi_log_dir: /var/log/uwsgi

# Multiple apps for Emperor mode
uwsgi_apps:
  - name: webapp
    app_dir: /opt/webapp
    venv_dir: /opt/webapp/venv
    wsgi_module: webapp.wsgi
    user: webapp
    group: webapp
    processes: 4
    threads: 2

  - name: apiserver
    app_dir: /opt/apiserver
    venv_dir: /opt/apiserver/venv
    wsgi_module: api.wsgi
    user: apiuser
    group: apiuser
    processes: 8
    threads: 1
```

## Main Tasks

```yaml
# roles/uwsgi/tasks/main.yml
---
- name: Install uWSGI system-wide
  apt:
    name:
      - uwsgi
      - uwsgi-plugin-python3
    state: present
    update_cache: yes

- name: Create uWSGI log directory
  file:
    path: "{{ uwsgi_log_dir }}"
    state: directory
    owner: root
    group: root
    mode: '0755'

- name: Create uWSGI runtime directory
  file:
    path: /run/uwsgi
    state: directory
    owner: root
    group: www-data
    mode: '0775'

- name: Create tmpfiles.d entry for runtime directory
  copy:
    content: "d /run/uwsgi 0775 root www-data -"
    dest: /etc/tmpfiles.d/uwsgi.conf
    mode: '0644'

- name: Deploy logrotate configuration for uWSGI
  template:
    src: logrotate.conf.j2
    dest: /etc/logrotate.d/uwsgi
    mode: '0644'

- name: Include single app tasks
  include_tasks: single.yml
  when: uwsgi_mode == "single"

- name: Include Emperor mode tasks
  include_tasks: emperor.yml
  when: uwsgi_mode == "emperor"
```

## Single App Mode Tasks

```yaml
# roles/uwsgi/tasks/single.yml
---
- name: Install uWSGI in the application virtual environment
  pip:
    name: uwsgi
    virtualenv: "{{ venv_dir }}"
  become_user: "{{ app_user }}"

- name: Deploy uWSGI application configuration
  template:
    src: uwsgi-app.ini.j2
    dest: "{{ app_dir }}/uwsgi.ini"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0644'
  vars:
    app:
      name: "{{ app_name }}"
      app_dir: "{{ app_dir }}"
      venv_dir: "{{ venv_dir }}"
      wsgi_module: "{{ wsgi_module }}"
      user: "{{ app_user }}"
      group: "{{ app_group }}"
      processes: "{{ uwsgi_processes }}"
      threads: "{{ uwsgi_threads }}"
  notify: restart uwsgi

- name: Deploy uWSGI systemd service
  template:
    src: uwsgi-single.service.j2
    dest: "/etc/systemd/system/{{ app_name }}-uwsgi.service"
    mode: '0644'
  notify:
    - reload systemd
    - restart uwsgi

- name: Enable and start uWSGI service
  systemd:
    name: "{{ app_name }}-uwsgi"
    enabled: yes
    state: started
```

## Emperor Mode Tasks

```yaml
# roles/uwsgi/tasks/emperor.yml
---
- name: Create Emperor vassals directory
  file:
    path: "{{ uwsgi_emperor_dir }}"
    state: directory
    owner: root
    group: root
    mode: '0755'

- name: Deploy vassal configuration for each application
  template:
    src: uwsgi-app.ini.j2
    dest: "{{ uwsgi_emperor_dir }}/{{ item.name }}.ini"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ uwsgi_apps }}"
  loop_control:
    loop_var: app
  notify: restart uwsgi emperor

- name: Deploy Emperor systemd service
  template:
    src: uwsgi-emperor.service.j2
    dest: /etc/systemd/system/uwsgi-emperor.service
    mode: '0644'
  notify:
    - reload systemd
    - restart uwsgi emperor

- name: Enable and start Emperor service
  systemd:
    name: uwsgi-emperor
    enabled: yes
    state: started
```

## uWSGI Application Configuration Template

```ini
# roles/uwsgi/templates/uwsgi-app.ini.j2
[uwsgi]
# Application settings
project = {{ app.name }}
chdir = {{ app.app_dir }}
virtualenv = {{ app.venv_dir }}
module = {{ app.wsgi_module }}
plugin = python3

# Process management
master = true
processes = {{ app.processes | default(uwsgi_processes) }}
threads = {{ app.threads | default(uwsgi_threads) }}
enable-threads = true

# Socket configuration
socket = /run/uwsgi/{{ app.name }}.sock
chmod-socket = 660
chown-socket = {{ app.user }}:www-data

# Process identity
uid = {{ app.user }}
gid = {{ app.group }}

# Worker lifecycle
harakiri = {{ uwsgi_harakiri }}
max-requests = {{ uwsgi_max_requests }}
reload-on-rss = {{ uwsgi_reload_on_rss }}

# Buffer settings
buffer-size = {{ uwsgi_buffer_size }}
post-buffering = 1

# Logging
logto = {{ uwsgi_log_dir }}/{{ app.name }}.log
log-maxsize = 10485760
log-backupname = {{ uwsgi_log_dir }}/{{ app.name }}.log.old

# Graceful restart support
lazy-apps = true
need-app = true

# Clean shutdown
vacuum = true
die-on-term = true

# Stats server for monitoring
stats = /run/uwsgi/{{ app.name }}-stats.sock
stats-http = true
```

## Emperor Systemd Service

```ini
# roles/uwsgi/templates/uwsgi-emperor.service.j2
[Unit]
Description=uWSGI Emperor
After=network.target

[Service]
Type=notify
ExecStart=/usr/bin/uwsgi --emperor {{ uwsgi_emperor_dir }} --die-on-term --master
Restart=on-failure
RestartSec=5
KillSignal=SIGQUIT
NotifyAccess=all

[Install]
WantedBy=multi-user.target
```

## Single App Systemd Service

```ini
# roles/uwsgi/templates/uwsgi-single.service.j2
[Unit]
Description=uWSGI instance for {{ app_name }}
After=network.target

[Service]
Type=notify
User={{ app_user }}
Group={{ app_group }}
WorkingDirectory={{ app_dir }}
ExecStart={{ venv_dir }}/bin/uwsgi --ini {{ app_dir }}/uwsgi.ini
ExecReload=/bin/kill -HUP $MAINPID
KillSignal=SIGQUIT
Restart=on-failure
RestartSec=5
NotifyAccess=all

[Install]
WantedBy=multi-user.target
```

## Logrotate Configuration

```
# roles/uwsgi/templates/logrotate.conf.j2
{{ uwsgi_log_dir }}/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        /bin/kill -HUP $(cat /run/uwsgi/*.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
```

## Handlers

```yaml
# roles/uwsgi/handlers/main.yml
---
- name: reload systemd
  systemd:
    daemon_reload: yes

- name: restart uwsgi
  systemd:
    name: "{{ app_name }}-uwsgi"
    state: restarted
  when: uwsgi_mode == "single"

- name: restart uwsgi emperor
  systemd:
    name: uwsgi-emperor
    state: restarted
  when: uwsgi_mode == "emperor"
```

## Running the Playbook

```bash
# Configure uWSGI in Emperor mode (default)
ansible-playbook -i inventory/hosts.yml playbook.yml

# Configure uWSGI in single app mode
ansible-playbook -i inventory/hosts.yml playbook.yml -e "uwsgi_mode=single"
```

## Monitoring uWSGI

uWSGI provides a stats server that you can query for real-time metrics:

```bash
# View uWSGI stats for an application
uwsgi --connect-and-read /run/uwsgi/myapp-stats.sock
```

You can also use the `uwsgitop` tool for a live dashboard:

```bash
# Install uwsgitop
pip install uwsgitop

# Monitor in real-time
uwsgitop /run/uwsgi/myapp-stats.sock
```

## Wrapping Up

uWSGI is a powerful application server that offers features beyond simple request handling. Emperor mode is particularly useful when you run multiple Python applications on the same server, as it automatically manages their lifecycle based on configuration files. This Ansible playbook handles both single-app and Emperor modes, with proper systemd integration, logging, and worker configuration. The configuration template includes important production settings like harakiri timeouts to kill stuck workers, max-requests for memory leak prevention, and reload-on-rss for RSS-based worker recycling.
