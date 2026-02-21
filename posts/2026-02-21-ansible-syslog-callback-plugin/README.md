# How to Use the Ansible syslog Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Syslog, Logging, Monitoring

Description: Configure the Ansible syslog callback plugin to send playbook events to syslog for centralized logging and integration with log management systems.

---

The `syslog` callback plugin sends Ansible playbook events to the system's syslog facility. Every task execution, success, failure, and play recap gets written as syslog messages. This integrates Ansible with your existing centralized logging infrastructure, whether that is rsyslog, syslog-ng, Splunk, ELK, or any system that consumes syslog data.

## Why Syslog?

Syslog is the universal logging interface on Unix systems. By sending Ansible events to syslog, you get:

- Centralized logging alongside OS and application logs
- Integration with existing log management (Splunk, ELK, Graylog)
- Persistent log storage with standard rotation
- Correlation of Ansible events with system events
- No additional infrastructure needed

## Enabling the Syslog Callback

Add it to your callback whitelist:

```ini
# ansible.cfg - Enable syslog logging
[defaults]
callback_whitelist = community.general.syslog
```

Or via environment variable:

```bash
# Enable syslog for this run
ANSIBLE_CALLBACK_WHITELIST=community.general.syslog ansible-playbook site.yml
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
callback_whitelist = community.general.syslog

[callback_syslog]
# Syslog facility (default: LOG_USER)
facility = LOG_USER
# Log messages at this priority for successes
# Options: LOG_EMERG, LOG_ALERT, LOG_CRIT, LOG_ERR, LOG_WARNING, LOG_NOTICE, LOG_INFO, LOG_DEBUG
```

## What Gets Logged

The syslog callback logs events at different syslog priorities:

- Task success: `LOG_INFO`
- Task changed: `LOG_INFO`
- Task failure: `LOG_ERR`
- Host unreachable: `LOG_ERR`
- Playbook start/end: `LOG_INFO`

Check your syslog after running a playbook:

```bash
# View Ansible syslog messages on Linux
grep ansible /var/log/syslog

# Or with journalctl on systemd systems
journalctl -t ansible --since "1 hour ago"
```

Sample syslog output:

```
Feb 21 10:15:23 control-node ansible: playbook start: /opt/ansible/deploy.yml
Feb 21 10:15:25 control-node ansible: task start: Gathering Facts
Feb 21 10:15:30 control-node ansible: task ok: [web-01] Gathering Facts
Feb 21 10:15:31 control-node ansible: task ok: [web-02] Gathering Facts
Feb 21 10:15:32 control-node ansible: task start: Install nginx
Feb 21 10:15:45 control-node ansible: task ok: [web-01] Install nginx
Feb 21 10:15:48 control-node ansible: task changed: [web-02] Install nginx
Feb 21 10:15:49 control-node ansible: task start: Deploy config
Feb 21 10:15:52 control-node ansible: task failed: [web-03] Deploy config - msg: file not found
Feb 21 10:15:55 control-node ansible: playbook complete: /opt/ansible/deploy.yml
```

## Forwarding to a Central Syslog Server

Most production setups forward syslog messages to a central server. Configure your syslog daemon to forward Ansible messages:

rsyslog configuration:

```bash
# /etc/rsyslog.d/50-ansible.conf - Forward Ansible logs to central server
# Match ansible tag and forward to central syslog
if $programname == 'ansible' then {
    action(type="omfwd"
           target="syslog.example.com"
           port="514"
           protocol="tcp"
           template="RSYSLOG_SyslogProtocol23Format")
}
```

syslog-ng configuration:

```
# /etc/syslog-ng/conf.d/ansible.conf
filter f_ansible { program("ansible"); };
destination d_central { tcp("syslog.example.com" port(514)); };
log { source(s_src); filter(f_ansible); destination(d_central); };
```

## Integration with ELK Stack

Send Ansible syslog data to Elasticsearch through Logstash:

```
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
        "message" => "task %{WORD:task_status}: \[%{HOSTNAME:target_host}\] %{GREEDYDATA:task_name}"
      }
    }
    if [task_status] == "failed" {
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
whitelist = ansible
```

Create a Splunk saved search for Ansible failures:

```
index=ansible "task failed" | stats count by target_host, task_name | sort -count
```

## Syslog Callback with Local Log Files

If you want Ansible events in a dedicated local log file without a central server:

```bash
# /etc/rsyslog.d/50-ansible-local.conf
# Write Ansible messages to a dedicated file
if $programname == 'ansible' then /var/log/ansible/ansible-syslog.log
& stop
```

```bash
# Create the log file and set up rotation
sudo mkdir -p /var/log/ansible
sudo touch /var/log/ansible/ansible-syslog.log
sudo systemctl restart rsyslog
```

Add log rotation:

```
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
callback_whitelist = community.general.syslog, timer, profile_tasks, junit

[callback_junit]
output_dir = ./junit-results
```

You get YAML output on the terminal, syslog integration for centralized logging, timing information, and JUnit XML for CI/CD.

## Alerting on Syslog Messages

Set up alerts for Ansible failures using syslog-based alerting:

```bash
# /etc/rsyslog.d/51-ansible-alerts.conf
# Send Ansible failures to an alert script
if $programname == 'ansible' and $msg contains 'task failed' then {
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
    host=$(echo "$line" | grep -oP '\[\K[^\]]+')
    task=$(echo "$line" | sed 's/.*task failed: //')

    # Send alert via webhook
    curl -s -X POST "https://alerts.example.com/api/alert" \
        -H "Content-Type: application/json" \
        -d "{\"source\":\"ansible\",\"host\":\"$host\",\"message\":\"$task\"}"
done
```

## Verifying Syslog Output

After enabling the callback, verify messages are being written:

```bash
# Run a test playbook
ANSIBLE_CALLBACK_WHITELIST=community.general.syslog ansible localhost -m ping

# Check syslog immediately
tail -5 /var/log/syslog | grep ansible

# Or on RHEL/CentOS
tail -5 /var/log/messages | grep ansible
```

The syslog callback is one of the most operationally valuable callbacks available. It plugs Ansible into whatever logging and monitoring infrastructure you already have, with zero additional tools needed beyond the syslog daemon that is already running on your system.
