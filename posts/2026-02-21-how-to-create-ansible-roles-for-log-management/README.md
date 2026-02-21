# How to Create Ansible Roles for Log Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Logging, Rsyslog, Log Management, DevOps

Description: Build an Ansible role for centralized log management with rsyslog, log rotation, and remote log shipping to a central log server.

---

Logs are the bread and butter of troubleshooting. But when your logs are scattered across fifty servers and each one has slightly different rotation settings, finding what you need during an incident is painful. An Ansible role for log management ensures every server has consistent logging configuration, proper rotation, and optionally ships logs to a central location.

This post builds a role around rsyslog (the default syslog daemon on most Linux distributions) with proper log rotation using logrotate. We will also cover setting up remote log shipping for centralized log collection.

## Role Structure

```
roles/log_management/
  defaults/main.yml
  handlers/main.yml
  tasks/
    main.yml
    rsyslog.yml
    logrotate.yml
    remote.yml
    directories.yml
  templates/
    rsyslog.conf.j2
    rsyslog_remote.conf.j2
    logrotate_app.j2
  meta/main.yml
```

## Default Variables

```yaml
# roles/log_management/defaults/main.yml
# Rsyslog settings
log_rsyslog_package: rsyslog
log_rsyslog_service: rsyslog

# Log directory structure
log_base_dir: /var/log
log_app_dirs: []
# Example:
#   - path: /var/log/myapp
#     owner: appuser
#     group: appgroup
#     mode: '0750'

# Rsyslog configuration
log_rsyslog_max_message_size: "8k"
log_rsyslog_work_directory: /var/spool/rsyslog
log_rsyslog_preserve_fqdn: true

# Remote logging (ship logs to central server)
log_remote_enabled: false
log_remote_server: ""
log_remote_port: 514
log_remote_protocol: tcp
log_remote_template: "RSYSLOG_SyslogProtocol23Format"

# TLS for remote logging
log_remote_tls_enabled: false
log_remote_tls_ca_cert: ""
log_remote_tls_cert: ""
log_remote_tls_key: ""

# Act as a log server (receive remote logs)
log_server_enabled: false
log_server_listen_port: 514
log_server_listen_protocol: tcp
log_server_log_dir: /var/log/remote

# Log rotation defaults
log_rotate_frequency: daily
log_rotate_retain: 14
log_rotate_compress: true
log_rotate_delay_compress: true
log_rotate_create_mode: "0640"
log_rotate_create_owner: syslog
log_rotate_create_group: adm

# Application-specific log rotation configs
log_rotate_apps: []
# Example:
#   - name: myapp
#     path: /var/log/myapp/*.log
#     frequency: daily
#     retain: 30
#     compress: true
#     postrotate: "systemctl reload myapp"
#     size: "100M"
```

## Rsyslog Configuration Tasks

```yaml
# roles/log_management/tasks/rsyslog.yml
# Install and configure rsyslog
- name: Install rsyslog
  ansible.builtin.apt:
    name:
      - "{{ log_rsyslog_package }}"
      - rsyslog-gnutls
    state: present
    update_cache: yes

- name: Create rsyslog working directory
  ansible.builtin.file:
    path: "{{ log_rsyslog_work_directory }}"
    state: directory
    owner: syslog
    group: adm
    mode: '0755'

- name: Deploy main rsyslog configuration
  ansible.builtin.template:
    src: rsyslog.conf.j2
    dest: /etc/rsyslog.conf
    owner: root
    group: root
    mode: '0644'
    validate: "rsyslogd -N1 -f %s"
  notify: restart rsyslog

- name: Ensure rsyslog is running
  ansible.builtin.systemd:
    name: "{{ log_rsyslog_service }}"
    state: started
    enabled: yes
```

## Rsyslog Configuration Template

```jinja2
# roles/log_management/templates/rsyslog.conf.j2
# Rsyslog configuration - managed by Ansible
# Do not edit manually

# Global settings
global(
    workDirectory="{{ log_rsyslog_work_directory }}"
    maxMessageSize="{{ log_rsyslog_max_message_size }}"
{% if log_rsyslog_preserve_fqdn %}
    preserveFQDN="on"
{% endif %}
)

# Modules
module(load="imuxsock")
module(load="imklog")
module(load="imjournal" StateFile="imjournal.state")

{% if log_server_enabled %}
# Log server: accept remote logs
{% if log_server_listen_protocol == "tcp" %}
module(load="imtcp")
input(type="imtcp" port="{{ log_server_listen_port }}")
{% else %}
module(load="imudp")
input(type="imudp" port="{{ log_server_listen_port }}")
{% endif %}
{% endif %}

# Default rules
auth,authpriv.*                 /var/log/auth.log
*.*;auth,authpriv.none          -/var/log/syslog
daemon.*                        -/var/log/daemon.log
kern.*                          -/var/log/kern.log
mail.*                          -/var/log/mail.log
user.*                          -/var/log/user.log

# Emergency messages to all users
*.emerg                         :omusrmsg:*

{% if log_server_enabled %}
# Template for remote log storage (organize by hostname and date)
template(name="RemoteLogs" type="string"
    string="{{ log_server_log_dir }}/%HOSTNAME%/%PROGRAMNAME%.log"
)

# Store remote logs using the template
if $fromhost-ip != '127.0.0.1' then {
    action(type="omfile" dynaFile="RemoteLogs")
    stop
}
{% endif %}

# Include additional configuration files
$IncludeConfig /etc/rsyslog.d/*.conf
```

## Remote Log Shipping Tasks

```yaml
# roles/log_management/tasks/remote.yml
# Configure remote log shipping to a central server
- name: Deploy remote logging configuration
  ansible.builtin.template:
    src: rsyslog_remote.conf.j2
    dest: /etc/rsyslog.d/90-remote.conf
    owner: root
    group: root
    mode: '0644'
  notify: restart rsyslog
  when: log_remote_enabled

- name: Remove remote logging if disabled
  ansible.builtin.file:
    path: /etc/rsyslog.d/90-remote.conf
    state: absent
  notify: restart rsyslog
  when: not log_remote_enabled

- name: Deploy TLS certificates for remote logging
  ansible.builtin.copy:
    src: "{{ item.src }}"
    dest: "{{ item.dest }}"
    owner: syslog
    group: adm
    mode: "{{ item.mode }}"
  loop:
    - { src: "{{ log_remote_tls_ca_cert }}", dest: "/etc/rsyslog.d/ca.pem", mode: "0644" }
    - { src: "{{ log_remote_tls_cert }}", dest: "/etc/rsyslog.d/cert.pem", mode: "0644" }
    - { src: "{{ log_remote_tls_key }}", dest: "/etc/rsyslog.d/key.pem", mode: "0600" }
  when:
    - log_remote_enabled
    - log_remote_tls_enabled
  notify: restart rsyslog
```

```jinja2
# roles/log_management/templates/rsyslog_remote.conf.j2
# Remote log shipping configuration - managed by Ansible

{% if log_remote_tls_enabled %}
# TLS configuration
global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/rsyslog.d/ca.pem"
    DefaultNetstreamDriverCertFile="/etc/rsyslog.d/cert.pem"
    DefaultNetstreamDriverKeyFile="/etc/rsyslog.d/key.pem"
)
{% endif %}

# Queue for reliability (buffer messages if remote server is down)
action(
    type="omfwd"
    target="{{ log_remote_server }}"
    port="{{ log_remote_port }}"
    protocol="{{ log_remote_protocol }}"
    template="{{ log_remote_template }}"
{% if log_remote_tls_enabled %}
    StreamDriver="gtls"
    StreamDriverMode="1"
    StreamDriverAuthMode="x509/name"
{% endif %}
    queue.type="LinkedList"
    queue.filename="remote_fwd"
    queue.maxDiskSpace="1g"
    queue.saveOnShutdown="on"
    action.resumeRetryCount="-1"
    action.resumeInterval="30"
)
```

## Log Rotation Tasks

```yaml
# roles/log_management/tasks/logrotate.yml
# Configure log rotation
- name: Install logrotate
  ansible.builtin.apt:
    name: logrotate
    state: present

- name: Deploy application-specific logrotate configurations
  ansible.builtin.template:
    src: logrotate_app.j2
    dest: "/etc/logrotate.d/{{ item.name }}"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ log_rotate_apps }}"
```

```jinja2
# roles/log_management/templates/logrotate_app.j2
# Log rotation for {{ item.name }} - managed by Ansible
{{ item.path }} {
    {{ item.frequency | default(log_rotate_frequency) }}
    rotate {{ item.retain | default(log_rotate_retain) }}
    missingok
    notifempty
{% if item.compress | default(log_rotate_compress) %}
    compress
{% if item.delay_compress | default(log_rotate_delay_compress) %}
    delaycompress
{% endif %}
{% endif %}
{% if item.size is defined %}
    size {{ item.size }}
{% endif %}
    create {{ item.create_mode | default(log_rotate_create_mode) }} {{ item.create_owner | default(log_rotate_create_owner) }} {{ item.create_group | default(log_rotate_create_group) }}
{% if item.postrotate is defined %}
    postrotate
        {{ item.postrotate }}
    endscript
{% endif %}
{% if item.prerotate is defined %}
    prerotate
        {{ item.prerotate }}
    endscript
{% endif %}
}
```

## Directory Setup and Main Tasks

```yaml
# roles/log_management/tasks/directories.yml
# Create application log directories
- name: Create application log directories
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: directory
    owner: "{{ item.owner | default('syslog') }}"
    group: "{{ item.group | default('adm') }}"
    mode: "{{ item.mode | default('0755') }}"
  loop: "{{ log_app_dirs }}"

- name: Create remote log directory
  ansible.builtin.file:
    path: "{{ log_server_log_dir }}"
    state: directory
    owner: syslog
    group: adm
    mode: '0755'
  when: log_server_enabled
```

```yaml
# roles/log_management/tasks/main.yml
- name: Include directory setup
  ansible.builtin.include_tasks: directories.yml

- name: Include rsyslog configuration
  ansible.builtin.include_tasks: rsyslog.yml

- name: Include remote logging configuration
  ansible.builtin.include_tasks: remote.yml

- name: Include log rotation configuration
  ansible.builtin.include_tasks: logrotate.yml
```

```yaml
# roles/log_management/handlers/main.yml
- name: restart rsyslog
  ansible.builtin.systemd:
    name: "{{ log_rsyslog_service }}"
    state: restarted
```

## Complete Usage Examples

For application servers that ship logs to a central server:

```yaml
# setup-logging.yml
- hosts: app_servers
  become: yes
  roles:
    - role: log_management
      vars:
        log_remote_enabled: true
        log_remote_server: logserver.internal.example.com
        log_remote_port: 514
        log_remote_protocol: tcp

        log_app_dirs:
          - path: /var/log/myapp
            owner: appuser
            group: adm
            mode: '0750'

        log_rotate_apps:
          - name: myapp
            path: "/var/log/myapp/*.log"
            frequency: daily
            retain: 30
            compress: true
            size: "100M"
            postrotate: "systemctl reload myapp"
```

For the central log server:

```yaml
# setup-log-server.yml
- hosts: log_servers
  become: yes
  roles:
    - role: log_management
      vars:
        log_server_enabled: true
        log_server_listen_port: 514
        log_server_listen_protocol: tcp
        log_server_log_dir: /var/log/remote

        log_rotate_apps:
          - name: remote-logs
            path: "/var/log/remote/*/*.log"
            frequency: daily
            retain: 90
            compress: true
```

This role gives you consistent logging across all your servers. Logs are rotated on schedule, compressed to save disk space, and optionally shipped to a central location for aggregated analysis. The queue-based remote shipping configuration ensures no logs are lost even if the central server is temporarily unreachable.
