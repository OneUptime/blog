# How to Use Ansible to Set Up a Log Server (rsyslog)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, rsyslog, Logging, Linux, Monitoring

Description: Deploy a centralized rsyslog server with TLS encryption, log rotation, and client configuration using Ansible for unified log collection.

---

Centralized logging is one of those things you don't appreciate until you're troubleshooting a production incident at 2 AM and need to correlate events across a dozen servers. Having logs scattered across individual machines makes debugging painfully slow. A centralized rsyslog server collects logs from all your systems into one place, making search, analysis, and compliance auditing straightforward.

rsyslog comes pre-installed on most Linux distributions, which means you don't need to install agents. You just configure the remote logging on clients, set up a receiver on the server, and you have centralized logging. Ansible makes it easy to roll out this configuration across your entire fleet.

## Role Defaults

```yaml
# roles/rsyslog_server/defaults/main.yml - Centralized log server configuration
rsyslog_listen_port_tcp: 514
rsyslog_listen_port_udp: 514
rsyslog_tls_port: 6514
rsyslog_log_base_dir: /var/log/remote
rsyslog_tls_enabled: true
rsyslog_tls_ca_file: /etc/rsyslog.d/certs/ca.pem
rsyslog_tls_cert_file: /etc/rsyslog.d/certs/server-cert.pem
rsyslog_tls_key_file: /etc/rsyslog.d/certs/server-key.pem

# Log retention in days
rsyslog_retention_days: 90

# Organize logs by hostname and facility
rsyslog_log_template: "/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log"

# Allowed source networks
rsyslog_allowed_sources:
  - 10.0.0.0/8
  - 172.16.0.0/12
```

## Server Tasks

```yaml
# roles/rsyslog_server/tasks/main.yml - Configure rsyslog as a centralized receiver
---
- name: Install rsyslog and TLS support
  apt:
    name:
      - rsyslog
      - rsyslog-gnutls
      - logrotate
    state: present
    update_cache: yes

- name: Create remote log base directory
  file:
    path: "{{ rsyslog_log_base_dir }}"
    state: directory
    owner: syslog
    group: adm
    mode: '0755'

- name: Create TLS certificates directory
  file:
    path: /etc/rsyslog.d/certs
    state: directory
    owner: root
    group: root
    mode: '0700'
  when: rsyslog_tls_enabled

- name: Deploy TLS certificates for rsyslog
  copy:
    src: "{{ item.src }}"
    dest: "{{ item.dest }}"
    owner: root
    group: root
    mode: '0600'
  loop:
    - { src: "files/certs/ca.pem", dest: "{{ rsyslog_tls_ca_file }}" }
    - { src: "files/certs/server-cert.pem", dest: "{{ rsyslog_tls_cert_file }}" }
    - { src: "files/certs/server-key.pem", dest: "{{ rsyslog_tls_key_file }}" }
  when: rsyslog_tls_enabled
  notify: restart rsyslog

- name: Deploy rsyslog server configuration
  template:
    src: rsyslog-server.conf.j2
    dest: /etc/rsyslog.d/10-remote-logging.conf
    owner: root
    group: root
    mode: '0644'
  notify: restart rsyslog

- name: Configure log rotation for remote logs
  template:
    src: logrotate-remote.conf.j2
    dest: /etc/logrotate.d/remote-logs
    mode: '0644'

- name: Ensure rsyslog is started and enabled
  systemd:
    name: rsyslog
    state: started
    enabled: yes

- name: Allow rsyslog ports through firewall
  ufw:
    rule: allow
    port: "{{ item.port }}"
    proto: "{{ item.proto }}"
    src: "{{ item.src }}"
  loop: "{{ rsyslog_allowed_sources | product([
    {'port': rsyslog_listen_port_tcp | string, 'proto': 'tcp'},
    {'port': rsyslog_listen_port_udp | string, 'proto': 'udp'},
    {'port': rsyslog_tls_port | string, 'proto': 'tcp'}
  ]) | map('combine') | list }}"
  when: false  # Simplified below

- name: Allow syslog TCP port
  ufw:
    rule: allow
    port: "{{ rsyslog_listen_port_tcp }}"
    proto: tcp

- name: Allow syslog UDP port
  ufw:
    rule: allow
    port: "{{ rsyslog_listen_port_udp }}"
    proto: udp

- name: Allow syslog TLS port
  ufw:
    rule: allow
    port: "{{ rsyslog_tls_port }}"
    proto: tcp
  when: rsyslog_tls_enabled
```

## Server Configuration Template

```
# roles/rsyslog_server/templates/rsyslog-server.conf.j2 - rsyslog receiver config

# Load required modules
module(load="imtcp")  # TCP syslog receiver
module(load="imudp")  # UDP syslog receiver

{% if rsyslog_tls_enabled %}
# TLS configuration
global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="{{ rsyslog_tls_ca_file }}"
    DefaultNetstreamDriverCertFile="{{ rsyslog_tls_cert_file }}"
    DefaultNetstreamDriverKeyFile="{{ rsyslog_tls_key_file }}"
)

# Listen on TLS port
input(type="imtcp" port="{{ rsyslog_tls_port }}"
      StreamDriver.Name="gtls"
      StreamDriver.Mode="1"
      StreamDriver.AuthMode="x509/fingerprint")
{% endif %}

# Listen on standard TCP port
input(type="imtcp" port="{{ rsyslog_listen_port_tcp }}")

# Listen on standard UDP port
input(type="imudp" port="{{ rsyslog_listen_port_udp }}")

# Template for organizing logs by hostname and program
template(name="RemoteLogTemplate" type="string"
    string="{{ rsyslog_log_template }}")

# Create per-host directories automatically
template(name="RemoteHostDir" type="string"
    string="{{ rsyslog_log_base_dir }}/%HOSTNAME%/")

# Store remote logs using the template
if $fromhost-ip != '127.0.0.1' then {
    action(type="omfile" dynaFile="RemoteLogTemplate"
           dirCreateMode="0755" FileCreateMode="0644"
           dirOwner="syslog" dirGroup="adm"
           fileOwner="syslog" fileGroup="adm")
    stop
}
```

## Log Rotation Template

```
# roles/rsyslog_server/templates/logrotate-remote.conf.j2
{{ rsyslog_log_base_dir }}/*/*.log {
    daily
    rotate {{ rsyslog_retention_days }}
    compress
    delaycompress
    missingok
    notifempty
    create 0644 syslog adm
    sharedscripts
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}
```

## Client Configuration Role

```yaml
# roles/rsyslog_client/tasks/main.yml - Configure servers to send logs
---
- name: Install rsyslog TLS support on clients
  apt:
    name: rsyslog-gnutls
    state: present
  when: rsyslog_tls_enabled

- name: Deploy CA certificate to client
  copy:
    src: files/certs/ca.pem
    dest: /etc/rsyslog.d/certs/ca.pem
    owner: root
    group: root
    mode: '0644'
  when: rsyslog_tls_enabled

- name: Configure rsyslog client to forward logs
  template:
    src: rsyslog-client.conf.j2
    dest: /etc/rsyslog.d/10-forward.conf
    mode: '0644'
  notify: restart rsyslog
```

## Client Configuration Template

```
# roles/rsyslog_client/templates/rsyslog-client.conf.j2
{% if rsyslog_tls_enabled %}
# TLS configuration for secure log forwarding
global(DefaultNetstreamDriverCAFile="/etc/rsyslog.d/certs/ca.pem")

# Forward all logs to central server via TLS
action(type="omfwd"
    target="{{ rsyslog_server_address }}"
    port="{{ rsyslog_tls_port }}"
    protocol="tcp"
    StreamDriver="gtls"
    StreamDriverMode="1"
    StreamDriverAuthMode="x509/fingerprint"
    queue.type="LinkedList"
    queue.size="10000"
    queue.filename="fwd_tls"
    queue.saveonshutdown="on"
    action.resumeRetryCount="-1"
    action.resumeInterval="30")
{% else %}
# Forward all logs to central server via TCP
*.* action(type="omfwd"
    target="{{ rsyslog_server_address }}"
    port="{{ rsyslog_listen_port_tcp }}"
    protocol="tcp"
    queue.type="LinkedList"
    queue.size="10000"
    queue.filename="fwd_plain"
    queue.saveonshutdown="on"
    action.resumeRetryCount="-1")
{% endif %}
```

## Main Playbook

```yaml
# playbook.yml - Deploy centralized logging
---
- hosts: log_server
  become: yes
  roles:
    - rsyslog_server

- hosts: all:!log_server
  become: yes
  roles:
    - rsyslog_client
```

## Running the Playbook

```bash
# Deploy log server and configure all clients
ansible-playbook -i inventory/hosts.ini playbook.yml
```

## Testing

```bash
# Send a test message from any client
logger -t test "This is a test log message from $(hostname)"

# Check on the log server
ls /var/log/remote/
cat /var/log/remote/<client-hostname>/test.log
```

## Summary

Centralized logging with rsyslog and Ansible gives you a reliable, scalable log collection system without the overhead of heavyweight logging platforms. The rsyslog disk-assisted queue ensures logs are not lost during network issues, and TLS encryption keeps log data secure in transit. When you need to add new servers to your fleet, the client role automatically configures them to forward logs to your central server.
