# How to Use Ansible to Manage Supervisor Processes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Supervisor, Process Management, Python, DevOps

Description: Learn how to install, configure, and manage Supervisor processes with Ansible for reliable application process management on Linux servers.

---

Supervisor is a process control system for Unix-like operating systems. It lets you manage long-running processes, automatically restart them on failure, and provide a unified interface for starting, stopping, and monitoring your applications. While systemd has largely taken over process management on modern Linux, Supervisor remains popular in Python-heavy environments, legacy deployments, and situations where you want process management that is independent of the init system.

Ansible has a dedicated `community.general.supervisorctl` module that interfaces directly with Supervisor. In this guide, I will cover installing Supervisor, deploying program configurations, and managing processes with Ansible.

## Installing Supervisor

Supervisor can be installed from system packages or via pip.

Install Supervisor and configure it to start on boot:

```yaml
---
- name: Install and configure Supervisor
  hosts: app_servers
  become: yes
  tasks:
    - name: Install Supervisor via apt
      ansible.builtin.apt:
        name: supervisor
        state: present
        update_cache: yes

    - name: Ensure Supervisor is running
      ansible.builtin.systemd:
        name: supervisor
        state: started
        enabled: yes

    - name: Create log directory
      ansible.builtin.file:
        path: /var/log/supervisor
        state: directory
        owner: root
        group: root
        mode: '0755'
```

If you prefer installing via pip (for a newer version):

```yaml
    - name: Install Supervisor via pip
      ansible.builtin.pip:
        name: supervisor
        state: present

    - name: Deploy Supervisor systemd unit
      ansible.builtin.copy:
        dest: /etc/systemd/system/supervisor.service
        content: |
          [Unit]
          Description=Supervisor process manager
          After=network.target

          [Service]
          Type=forking
          ExecStart=/usr/local/bin/supervisord -c /etc/supervisor/supervisord.conf
          ExecStop=/usr/local/bin/supervisorctl shutdown
          ExecReload=/usr/local/bin/supervisorctl reload
          KillMode=process
          Restart=on-failure
          RestartSec=5

          [Install]
          WantedBy=multi-user.target
        mode: '0644'
      notify: Reload systemd

  handlers:
    - name: Reload systemd
      ansible.builtin.systemd:
        daemon_reload: yes
```

## Deploying the Main Configuration

Deploy the main supervisord configuration file:

```yaml
- name: Deploy supervisord.conf
  ansible.builtin.template:
    src: supervisord.conf.j2
    dest: /etc/supervisor/supervisord.conf
    owner: root
    group: root
    mode: '0644'
  notify: Restart Supervisor
```

The template:

```ini
; roles/supervisor/templates/supervisord.conf.j2
[unix_http_server]
file=/var/run/supervisor.sock
chmod=0700

[supervisord]
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid
childlogdir=/var/log/supervisor
logfile_maxbytes=50MB
logfile_backups=10
loglevel=info
nodaemon=false
minfds=1024
minprocs=200

[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface

[supervisorctl]
serverurl=unix:///var/run/supervisor.sock

[include]
files = /etc/supervisor/conf.d/*.conf
```

## Deploying Program Configurations

Each application managed by Supervisor gets its own configuration file.

Jinja2 template for a Supervisor program:

```jinja2
; roles/supervisor/templates/program.conf.j2
[program:{{ program_name }}]
command={{ program_command }}
directory={{ program_directory | default('/opt/' + program_name) }}
user={{ program_user | default('appuser') }}
autostart={{ program_autostart | default('true') }}
autorestart={{ program_autorestart | default('true') }}
startsecs={{ program_startsecs | default(5) }}
startretries={{ program_startretries | default(3) }}
stopwaitsecs={{ program_stopwaitsecs | default(10) }}
stopsignal={{ program_stopsignal | default('TERM') }}
redirect_stderr={{ program_redirect_stderr | default('true') }}
stdout_logfile=/var/log/supervisor/{{ program_name }}.log
stdout_logfile_maxbytes={{ program_log_maxbytes | default('50MB') }}
stdout_logfile_backups={{ program_log_backups | default(10) }}
stderr_logfile=/var/log/supervisor/{{ program_name }}-error.log
stderr_logfile_maxbytes={{ program_log_maxbytes | default('50MB') }}
{% if program_environment is defined %}
environment={{ program_environment | dict2items | map('join', '=') | map('regex_replace', '(.+)', '"\1"') | join(',') }}
{% endif %}
{% if program_numprocs is defined and program_numprocs > 1 %}
numprocs={{ program_numprocs }}
process_name=%(program_name)s_%(process_num)02d
{% endif %}
{% if program_priority is defined %}
priority={{ program_priority }}
{% endif %}
```

## Managing Programs with the supervisorctl Module

The `community.general.supervisorctl` module lets you control programs.

Start, stop, and manage Supervisor programs:

```yaml
---
- name: Manage Supervisor programs
  hosts: app_servers
  become: yes
  tasks:
    # Deploy a program configuration
    - name: Deploy web worker config
      ansible.builtin.template:
        src: program.conf.j2
        dest: /etc/supervisor/conf.d/web-worker.conf
      vars:
        program_name: web-worker
        program_command: "/opt/myapp/venv/bin/python /opt/myapp/worker.py"
        program_directory: /opt/myapp
        program_user: appuser
        program_numprocs: 4
        program_environment:
          PYTHONPATH: "/opt/myapp"
          DATABASE_URL: "postgresql://user:pass@db:5432/myapp"
          REDIS_URL: "redis://cache:6379/0"
      notify: Reread Supervisor config

    # Use supervisorctl to manage the program
    - name: Ensure web-worker is running
      community.general.supervisorctl:
        name: "web-worker:"
        state: started

    - name: Stop a specific program
      community.general.supervisorctl:
        name: "old-worker"
        state: stopped

    - name: Restart a program
      community.general.supervisorctl:
        name: "api-server"
        state: restarted

  handlers:
    - name: Reread Supervisor config
      community.general.supervisorctl:
        name: all
        state: present  # This triggers supervisorctl reread + update
```

## Module Parameters

The `supervisorctl` module parameters:

| Parameter | Description |
|-----------|-------------|
| `name` | Program or group name (use `name:` with colon for groups) |
| `state` | `present`, `started`, `stopped`, `restarted`, `absent` |
| `supervisorctl_path` | Path to supervisorctl binary |
| `config` | Path to supervisord.conf |
| `server_url` | Supervisor XML-RPC server URL |
| `username` | Username for authentication |
| `password` | Password for authentication |
| `signal` | Signal to send (with state=signalled) |

## Deploying a Complete Application Stack

Here is a full example deploying a Python web application with multiple Supervisor-managed processes.

Deploy a multi-process application:

```yaml
---
- name: Deploy application with Supervisor
  hosts: app_servers
  become: yes

  vars:
    app_dir: /opt/myapp
    app_user: myapp
    app_venv: "{{ app_dir }}/venv"

    supervisor_programs:
      - name: gunicorn
        command: "{{ app_venv }}/bin/gunicorn myapp.wsgi:application -b 0.0.0.0:8000 -w 4"
        directory: "{{ app_dir }}"
        user: "{{ app_user }}"
        priority: 10
        environment:
          DJANGO_SETTINGS_MODULE: myapp.settings.production
          DATABASE_URL: "{{ db_url }}"
      - name: celery-worker
        command: "{{ app_venv }}/bin/celery -A myapp worker -l info -c 4"
        directory: "{{ app_dir }}"
        user: "{{ app_user }}"
        priority: 20
        environment:
          DJANGO_SETTINGS_MODULE: myapp.settings.production
          CELERY_BROKER_URL: "{{ redis_url }}"
      - name: celery-beat
        command: "{{ app_venv }}/bin/celery -A myapp beat -l info"
        directory: "{{ app_dir }}"
        user: "{{ app_user }}"
        priority: 30
        environment:
          DJANGO_SETTINGS_MODULE: myapp.settings.production
          CELERY_BROKER_URL: "{{ redis_url }}"

  tasks:
    - name: Deploy Supervisor program configs
      ansible.builtin.template:
        src: program.conf.j2
        dest: "/etc/supervisor/conf.d/{{ item.name }}.conf"
      loop: "{{ supervisor_programs }}"
      loop_control:
        label: "{{ item.name }}"
      vars:
        program_name: "{{ item.name }}"
        program_command: "{{ item.command }}"
        program_directory: "{{ item.directory }}"
        program_user: "{{ item.user }}"
        program_priority: "{{ item.priority | default(999) }}"
        program_environment: "{{ item.environment | default({}) }}"
      notify: Update Supervisor

    - name: Flush handlers
      ansible.builtin.meta: flush_handlers

    - name: Ensure all programs are running
      community.general.supervisorctl:
        name: "{{ item.name }}"
        state: started
      loop: "{{ supervisor_programs }}"
      loop_control:
        label: "{{ item.name }}"

  handlers:
    - name: Update Supervisor
      ansible.builtin.command: supervisorctl reread && supervisorctl update
```

## Using Program Groups

Supervisor supports grouping related programs for batch management.

Deploy a program group:

```yaml
- name: Deploy group configuration
  ansible.builtin.copy:
    dest: /etc/supervisor/conf.d/myapp-group.conf
    content: |
      [group:myapp]
      programs=gunicorn,celery-worker,celery-beat
      priority=999
  notify: Update Supervisor

# Manage the entire group
- name: Restart the entire application group
  community.general.supervisorctl:
    name: "myapp:"
    state: restarted
```

The colon after the group name (`myapp:`) tells Supervisor to operate on all programs in the group.

## Checking Program Status

Monitor Supervisor program status through Ansible:

```yaml
- name: Check status of all programs
  ansible.builtin.command: supervisorctl status
  register: supervisor_status
  changed_when: false

- name: Display program status
  ansible.builtin.debug:
    var: supervisor_status.stdout_lines

- name: Check specific program
  ansible.builtin.command: "supervisorctl status {{ item }}"
  register: program_checks
  loop:
    - gunicorn
    - celery-worker
    - celery-beat
  changed_when: false

- name: Find stopped programs
  ansible.builtin.debug:
    msg: "WARNING: {{ item.item }} is not running"
  loop: "{{ program_checks.results }}"
  loop_control:
    label: "{{ item.item }}"
  when: "'RUNNING' not in item.stdout"
```

## Removing Programs

When you need to remove a Supervisor-managed program:

```yaml
- name: Stop the program
  community.general.supervisorctl:
    name: old-worker
    state: stopped
  ignore_errors: yes

- name: Remove program configuration
  ansible.builtin.file:
    path: /etc/supervisor/conf.d/old-worker.conf
    state: absent

- name: Update Supervisor to remove the program
  ansible.builtin.command: supervisorctl reread && supervisorctl update
```

## Summary

Supervisor remains a solid choice for process management, especially in Python application stacks with Gunicorn, Celery, and similar tools. Ansible's `supervisorctl` module gives you declarative control over program state, while templates handle configuration deployment. The key patterns are: use program configuration templates for consistency, group related programs for batch management, use handlers to trigger config reread after changes, and check status to verify your programs are healthy. For new deployments on modern Linux, consider whether systemd unit files might be simpler, but for existing Supervisor setups, Ansible integrates well with the existing workflow.
