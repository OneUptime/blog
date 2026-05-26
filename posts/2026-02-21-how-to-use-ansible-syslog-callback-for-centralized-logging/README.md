# How to Use Ansible Syslog Callback for Centralized Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Logging, Syslog, Monitoring

Description: Learn how to configure the Ansible syslog callback plugin to send playbook events to centralized logging systems like rsyslog and ELK.

---

In production environments, Ansible logs scattered across individual servers or CI/CD job outputs are not enough. You need centralized logging where all playbook events, task results, and failures flow into a single system. The `community.general.syslog_json` callback plugin sends playbook events to a syslog server, which can forward them to centralized logging infrastructure like ELK, Splunk, Graylog, or any syslog-compatible system.

## Enabling the Syslog Callback Plugin

The `community.general.syslog_json` callback plugin is included in the `community.general` collection. You need to install the collection if it is not already present and enable the callback.

```ini
# ansible.cfg - Enable the syslog callback

[defaults]
# Add syslog to the list of enabled callbacks
# The 'community.general.syslog_json' sends structured JSON to syslog
callbacks_enabled = community.general.syslog_json

# You might also want the default stdout callback for console output
stdout_callback = default

[callback_syslog_json]
# Send to a local syslog listener. Change this to a central syslog or Logstash host
# if you do not want to relay through local rsyslog.
syslog_server = localhost
syslog_port = 514
syslog_facility = user
```

Install the required collection if you do not have it:

```bash
# Install the community.general collection for syslog_json
ansible-galaxy collection install community.general
```

## How the Syslog Callback Works

When enabled, the callback sends syslog messages for task results such as ok, failed, skipped, unreachable, async failure, and import events. The JSON payload is the serialized Ansible result for each event.

Here is what the flow looks like:

```mermaid
flowchart LR
    A[Ansible Controller] -->|Callback Plugin| B[Local Syslog]
    B -->|rsyslog forward| C[Central Syslog Server]
    C --> D[Elasticsearch]
    C --> E[Splunk]
    C --> F[Graylog]
    D --> G[Kibana Dashboard]
```

## Configuring rsyslog to Forward Ansible Logs

Once Ansible sends events to local syslog, you need rsyslog (or syslog-ng) to forward them to your central logging server.

Create a dedicated rsyslog configuration for Ansible:

```bash
# /etc/rsyslog.d/50-ansible.conf - Forward Ansible logs to central server
# Listen for the UDP syslog messages sent by community.general.syslog_json
module(load="imudp")
input(type="imudp" port="514")

# Filter Ansible callback messages
if $msg contains 'ansible-command' then {
    # Write to local file for debugging
    action(type="omfile" file="/var/log/ansible/syslog-ansible.log")

    # Forward to central syslog server via TCP
    action(type="omfwd"
           target="syslog.example.com"
           port="514"
           protocol="tcp"
           template="RSYSLOG_SyslogProtocol23Format")

    # Stop processing - do not duplicate in /var/log/syslog
    stop
}
```

Restart rsyslog after adding the configuration:

```bash
# Restart rsyslog to pick up new configuration
sudo mkdir -p /var/log/ansible
sudo systemctl restart rsyslog

# Verify rsyslog is running
sudo systemctl status rsyslog

# Check for configuration errors
sudo rsyslogd -N1
```

## Testing the Syslog Callback

Run a simple playbook and check that syslog receives the events:

```yaml
# test-syslog.yml - Simple playbook to verify syslog callback
---
- name: Test syslog callback
  hosts: localhost
  gather_facts: false
  tasks:
    - name: First task - should appear in syslog
      ansible.builtin.debug:
        msg: "This message should appear in syslog"

    - name: Second task - a changed result
      ansible.builtin.command: echo "test"
      changed_when: true

    - name: Third task - deliberate failure
      ansible.builtin.fail:
        msg: "Testing syslog error logging"
      ignore_errors: true
```

After running the playbook, check syslog:

```bash
# Run the test playbook
ansible-playbook test-syslog.yml

# Check local syslog for Ansible entries
sudo grep "ansible-command" /var/log/syslog | tail -20

# Or check the dedicated Ansible syslog file if configured
tail -20 /var/log/ansible/syslog-ansible.log
```

## Structured JSON Logging with syslog_json

The `syslog_json` callback sends a structured JSON result in the syslog message, which is much easier to parse and query in central logging systems.

A typical task result looks like this inside the syslog message:

```json
{
    "msg": "This message should appear in syslog",
    "changed": false,
    "_ansible_verbose_always": true,
    "_ansible_no_log": false
}
```

For failed tasks, additional fields are included:

```json
{
    "failed": true,
    "msg": "Unable to start service myapp: Job for myapp.service failed",
    "changed": false,
    "_ansible_no_log": false
}
```

## Setting Up ELK Stack Integration

To send Ansible syslog data to Elasticsearch via Logstash, configure a Logstash pipeline:

```ruby
# /etc/logstash/conf.d/ansible-syslog.conf - Logstash pipeline for Ansible logs
input {
  syslog {
    port => 5514
    type => "ansible"
  }
}

filter {
  if [type] == "ansible" {
    # Extract the JSON result from the callback message body
    grok {
      match => {
        "message" => "ansible-command: task execution %{WORD:ansible_result}; host: %{DATA:ansible_host}; message: %{GREEDYDATA:ansible_json}"
      }
    }

    if [ansible_json] =~ /^\{/ {
      json {
        source => "ansible_json"
        target => "ansible"
      }
    }

    # Add useful fields for querying
    if [ansible_result] == "FAILED" {
      mutate {
        add_tag => ["ansible_failure"]
      }
    }

    # Remove redundant fields
    mutate {
      remove_field => ["ansible_json"]
    }
  }
}

output {
  if [type] == "ansible" {
    elasticsearch {
      hosts => ["elasticsearch.example.com:9200"]
      index => "ansible-logs-%{+YYYY.MM.dd}"
    }
  }
}
```

Point rsyslog at your Logstash syslog input:

```bash
# /etc/rsyslog.d/50-ansible.conf - Forward to Logstash
if $msg contains 'ansible-command' then {
    action(type="omfwd"
           target="logstash.example.com"
           port="5514"
           protocol="tcp")
    stop
}
```

## Creating a Custom Syslog Callback with Extra Context

The `community.general.syslog_json` callback is good, but you might want additional context like the git commit SHA, the CI job ID, or the deployer's username.

```python
# callback_plugins/custom_syslog.py - Enhanced syslog callback with extra context
import json
import os
import syslog
from datetime import datetime, timezone
from ansible.plugins.callback import CallbackBase

DOCUMENTATION = '''
    name: custom_syslog
    type: notification
    short_description: Enhanced syslog callback with deployment context
    description:
        - Sends structured JSON to syslog with extra deployment metadata
'''

class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'custom_syslog'
    CALLBACK_NEEDS_ENABLED = True

    def __init__(self):
        super().__init__()
        syslog.openlog('ansible', syslog.LOG_PID, syslog.LOG_USER)

        # Capture deployment context from environment
        self.context = {
            'ci_job_id': os.environ.get('CI_JOB_ID', 'manual'),
            'ci_pipeline_id': os.environ.get('CI_PIPELINE_ID', 'none'),
            'deployer': os.environ.get('DEPLOYER', os.environ.get('USER', 'unknown')),
            'git_sha': os.environ.get('GIT_SHA', 'unknown'),
        }

    def _send_syslog(self, data, priority=syslog.LOG_INFO):
        """Send a structured JSON message to syslog."""
        data.update(self.context)
        data['timestamp'] = datetime.now(timezone.utc).isoformat()
        syslog.syslog(priority, json.dumps(data))

    def v2_playbook_on_play_start(self, play):
        self._send_syslog({
            'event': 'play_start',
            'play': play.get_name(),
            'hosts': play.hosts,
        })

    def v2_runner_on_ok(self, result):
        self._send_syslog({
            'event': 'task_ok',
            'host': result._host.get_name(),
            'task': result._task.get_name(),
            'changed': result._result.get('changed', False),
        })

    def v2_runner_on_failed(self, result, ignore_errors=False):
        priority = syslog.LOG_WARNING if ignore_errors else syslog.LOG_ERR
        self._send_syslog({
            'event': 'task_failed',
            'host': result._host.get_name(),
            'task': result._task.get_name(),
            'message': result._result.get('msg', ''),
            'ignored': ignore_errors,
        }, priority)

    def v2_runner_on_unreachable(self, result):
        self._send_syslog({
            'event': 'host_unreachable',
            'host': result._host.get_name(),
            'task': result._task.get_name(),
            'message': result._result.get('msg', ''),
        }, syslog.LOG_ERR)

    def v2_playbook_on_stats(self, stats):
        hosts = sorted(stats.processed.keys())
        summary = {}
        for host in hosts:
            s = stats.summarize(host)
            summary[host] = s
        self._send_syslog({
            'event': 'playbook_stats',
            'summary': summary,
        })
```

Enable it with `callbacks_enabled = custom_syslog` in `ansible.cfg`.

## Querying Ansible Logs in Kibana

Once your logs are in Elasticsearch, you can build dashboards and alerts. Here are useful Kibana queries:

```text
# Find all failed tasks in the last 24 hours
ansible_result: "FAILED" AND @timestamp > now-24h

# Find failures on a specific host
ansible_host: "web3.example.com" AND ansible_result: "FAILED"

# Find changed task results
ansible.changed: true

# Find deployments by a specific user
deployer: "jane.smith" AND event: "play_start"
```

## Summary

The syslog callback plugin bridges Ansible and your centralized logging infrastructure. Enable `community.general.syslog_json` for structured result data, configure rsyslog to forward to your central server, and pipe everything into ELK, Splunk, or Graylog. For extra deployment context, write a custom callback plugin that includes CI/CD metadata. Once you have Ansible events in your logging system, you can build dashboards, set up alerts on failures, and have a complete audit trail of every automation run across your fleet.
