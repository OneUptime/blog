# How to Use the Ansible syslog Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Syslog, Logging, Monitoring

Description: Configure the Ansible syslog callback plugin to send playbook events to syslog for centralized logging and integration with log management systems.

---

The `syslog_json` callback plugin sends Ansible run events to a syslog server. Task results, failures, skipped tasks, unreachable hosts, and import events get written as syslog messages, with result data serialized in JSON. This integrates Ansible with your existing centralized logging infrastructure, whether that is rsyslog, syslog-ng, Splunk, ELK, or any system that consumes syslog data.

## Why Syslog?

Syslog is the universal logging interface on Unix systems. By sending Ansible events to syslog, you get:

- Centralized logging alongside OS and application logs
- Integration with existing log management (Splunk, ELK, Graylog)
- Persistent log storage with standard rotation
- Correlation of Ansible events with system events
- No additional infrastructure needed

## Enabling the Syslog Callback

Add it to your enabled callbacks:

```ini
# ansible.cfg - Enable syslog logging

[defaults]
callbacks_enabled = community.general.syslog_json
# Also load callbacks for ad hoc "ansible" commands
bin_ansible_callbacks = True
```

Or via environment variable:

```bash
# Enable syslog for this run
ANSIBLE_CALLBACKS_ENABLED=community.general.syslog_json ansible-playbook site.yml
```

Install the required collection:

```bash
# Install community.general if not already present
ansible-galaxy collection install community.general
```

## Configuration Options

```ini
# ansible.cfg - Configure syslog callback
[defaults]
callbacks_enabled = community.general.syslog_json

[callback_syslog_json]
# Syslog server and UDP port (defaults: localhost and 514)
syslog_server = localhost
syslog_port = 514
# Syslog facility (default: user)
syslog_facility = user
# Include setup/gather_facts task results (default: true)
syslog_setup = true
```

## What Gets Logged

The syslog callback logs events at different syslog priorities:

- Task success, changed, skipped, and import events: `INFO`
- Task failure and host unreachable events: `ERROR`
- Changed status and module output are included in the JSON result payload

Check your syslog after running a playbook:

```bash
# View Ansible syslog messages on Linux
grep ansible-command /var/log/syslog

# Or with journalctl on systemd systems
journalctl --since "1 hour ago" | grep ansible-command
```

Sample syslog output:

```text
Feb 21 10:15:30 control-node ansible-playbook[1234]: control-node ansible-command: task execution OK; host: web-01; message: {"changed": false, "ping": "pong"}
Feb 21 10:15:48 control-node ansible-playbook[1234]: control-node ansible-command: task execution OK; host: web-02; message: {"changed": true, "name": "nginx", "state": "present"}
Feb 21 10:15:52 control-node ansible-playbook[1234]: control-node ansible-command: task execution FAILED; host: web-03; message: {"changed": false, "msg": "file not found"}
```

## Forwarding to a Central Syslog Server

Most production setups forward syslog messages to a central server. You can also set `syslog_server` and `syslog_port` directly in the callback configuration. If you receive the callback locally and then relay it, configure your syslog daemon to forward Ansible messages:

rsyslog configuration:

```bash
# /etc/rsyslog.d/50-ansible.conf - Forward Ansible logs to central server
# Receive callback messages sent to localhost:514 over UDP
module(load="imudp")
input(type="imudp" port="514")

# Match Ansible callback messages and forward to central syslog
if $msg contains 'ansible-command' then {
    action(type="omfwd"
           target="syslog.example.com"
           port="514"
           protocol="udp"
           template="RSYSLOG_SyslogProtocol23Format")
}
```

syslog-ng configuration:

```text
# /etc/syslog-ng/conf.d/ansible.conf
source s_ansible_udp { network(ip("127.0.0.1") port(514) transport("udp")); };
filter f_ansible { message("ansible-command"); };
destination d_central { network("syslog.example.com" port(514) transport("udp")); };
log { source(s_ansible_udp); filter(f_ansible); destination(d_central); };
```

## Integration with ELK Stack

Send Ansible syslog data to Elasticsearch through Logstash:

```text
# /etc/logstash/conf.d/ansible-syslog.conf
input {
  syslog {
    port => 5514
    type => "ansible"
  }
}

filter {
  if [type] == "ansible" {
    grok {
      match => {
        "message" => "%{HOSTNAME:controller_host} ansible-command: task execution %{WORD:task_status}; host: %{DATA:target_host}; message: %{GREEDYDATA:ansible_result_json}"
      }
    }
    json {
      source => "ansible_result_json"
      target => "ansible_result"
      skip_on_invalid_json => true
    }
    if [task_status] == "FAILED" {
      mutate { add_tag => ["ansible_failure"] }
    }
  }
}

output {
  if [type] == "ansible" {
    elasticsearch {
      hosts => ["elasticsearch:9200"]
      index => "ansible-logs-%{+YYYY.MM.dd}"
    }
  }
}
```

## Integration with Splunk

Forward syslog to Splunk using a Splunk Universal Forwarder:

```ini
# /opt/splunkforwarder/etc/apps/ansible/local/inputs.conf
[monitor:///var/log/syslog]
sourcetype = syslog
index = ansible
whitelist = ansible-command
```

Create a Splunk saved search for Ansible failures:

```text
index=ansible "task execution FAILED" | stats count by target_host | sort -count
```

## Syslog Callback with Local Log Files

If you want Ansible events in a dedicated local log file without a central server:

```bash
# /etc/rsyslog.d/50-ansible-local.conf
# Receive callback messages sent to localhost:514 over UDP
module(load="imudp")
input(type="imudp" port="514")

# Write Ansible messages to a dedicated file
if $msg contains 'ansible-command' then /var/log/ansible/ansible-syslog.log
& stop
```

```bash
# Create the log file and set up rotation
sudo mkdir -p /var/log/ansible
sudo touch /var/log/ansible/ansible-syslog.log
sudo systemctl restart rsyslog
```

Add log rotation:

```text
# /etc/logrotate.d/ansible-syslog
/var/log/ansible/ansible-syslog.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 syslog adm
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
```

## Combining Syslog with Other Callbacks

The syslog callback is a notification type, so it works with any other callbacks:

```ini
# ansible.cfg - Syslog with other useful callbacks
[defaults]
stdout_callback = yaml
callbacks_enabled = community.general.syslog_json, timer, profile_tasks, junit

[callback_junit]
output_dir = ./junit-results
```

You get YAML output on the terminal, syslog integration for centralized logging, timing information, and JUnit XML for CI/CD.

## Alerting on Syslog Messages

Set up alerts for Ansible failures using syslog-based alerting:

```bash
# /etc/rsyslog.d/51-ansible-alerts.conf
# Send Ansible failures to an alert script
if $msg contains 'ansible-command' and $msg contains 'task execution FAILED' then {
    action(type="omprog"
           binary="/opt/scripts/ansible-alert.sh")
}
```

The alert script:

```bash
#!/bin/bash
# /opt/scripts/ansible-alert.sh - Alert on Ansible failures from syslog
while read -r line; do
    # Extract host and task from the message
    host=$(echo "$line" | sed -n 's/.*host: \([^;]*\);.*/\1/p')
    result=$(echo "$line" | sed 's/.*message: //')

    # Send alert via webhook
    curl -s -X POST "https://alerts.example.com/api/alert" \
        -H "Content-Type: application/json" \
        -d "{\"source\":\"ansible\",\"host\":\"$host\",\"message\":$result}"
done
```

## Verifying Syslog Output

After enabling the callback, verify messages are being written:

```bash
# Run a test playbook
ANSIBLE_CALLBACKS_ENABLED=community.general.syslog_json ANSIBLE_LOAD_CALLBACK_PLUGINS=1 ansible localhost -m ping

# Check syslog immediately
tail -5 /var/log/syslog | grep ansible-command

# Or on RHEL/CentOS
tail -5 /var/log/messages | grep ansible-command
```

The syslog callback is one of the most operationally valuable callbacks available. It plugs Ansible into whatever logging and monitoring infrastructure you already have, with zero additional tools needed beyond the syslog daemon that is already running on your system.
