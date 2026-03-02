# How to Set Up StackStorm for Event-Driven Automation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Automation, DevOps, StackStorm

Description: Install and configure StackStorm on Ubuntu to build event-driven automation workflows that respond to infrastructure events, alerts, and webhooks automatically.

---

StackStorm is an event-driven automation platform that connects systems and responds to events with automated actions. Where cron jobs and Rundeck are good for scheduled or manually triggered tasks, StackStorm excels at "if this happens, then do that" automation - restart a service when a health check fails, provision resources when a queue depth threshold is crossed, or page on-call when disk fills up.

## Core Concepts

Before installation, understanding StackStorm's building blocks helps:

- **Sensors** - listen for events (poll an API, watch a log file, subscribe to a message queue)
- **Triggers** - events that sensors emit
- **Actions** - things StackStorm does in response (run a script, call an API, execute a workflow)
- **Rules** - connect triggers to actions (if trigger X fires with condition Y, run action Z)
- **Workflows** - chains of actions that run in sequence or parallel
- **Packs** - bundles of sensors, triggers, actions, and rules for a specific integration

## System Requirements

StackStorm requires at minimum 2GB RAM and 2 CPU cores. Ubuntu 20.04 or 22.04 is supported.

```bash
# Check system resources
free -h
nproc
df -h /
```

## Installing StackStorm

The one-line installer handles all dependencies including MongoDB, RabbitMQ, and Redis.

```bash
# Download and run the StackStorm installer
curl -sSL https://stackstorm.com/packages/install.sh | bash -s -- --user=st2admin --password=your_password

# This installs:
# - StackStorm (st2) core
# - MongoDB (state store)
# - RabbitMQ (message bus)
# - Redis (coordination)
# - Nginx (web frontend)

# Check installation status
sudo st2ctl status
```

## Verifying the Installation

```bash
# Check all services are running
sudo systemctl status st2api st2auth st2stream st2rulesengine \
    st2sensorcontainer st2actionrunner st2scheduler

# Access the web UI
# Navigate to: https://your-server-ip/
# Login with: st2admin / your_password

# Use the CLI
st2 --version

# Authenticate and store token
export ST2_AUTH_TOKEN=$(st2 auth st2admin -p your_password -t)

# Test the CLI
st2 action list
```

## Installing Packs

Packs extend StackStorm with integrations for external services.

```bash
# Install commonly used packs
st2 pack install core      # Core actions (execute shell commands, HTTP requests)
st2 pack install linux     # Linux system actions
st2 pack install slack     # Slack notifications
st2 pack install pagerduty # PagerDuty alerting
st2 pack install ansible   # Run Ansible playbooks

# Search for available packs
st2 pack search monitoring

# List installed packs
st2 pack list
```

## Running Your First Action

Actions are callable units that do something. The `core` pack has many built-in ones.

```bash
# Run a shell command
st2 run core.local cmd='echo Hello from StackStorm'

# Run a command on a remote host (requires SSH access configured)
st2 run core.remote hosts=web01 cmd='df -h'

# Make an HTTP request
st2 run core.http url=https://httpbin.org/get method=GET

# Check action output
st2 execution list | head -5
st2 execution get <execution_id>
```

## Creating a Custom Action

Create a simple Python action that checks disk usage.

```bash
# Create a pack directory
mkdir -p /opt/stackstorm/packs/myops/actions
mkdir -p /opt/stackstorm/packs/myops/rules

# Create the pack metadata
cat > /opt/stackstorm/packs/myops/pack.yaml << 'EOF'
name: myops
description: Custom operations actions
version: 1.0.0
author: sysadmin
email: ops@example.com
EOF

# Create the action metadata
cat > /opt/stackstorm/packs/myops/actions/check_disk.yaml << 'EOF'
name: check_disk
pack: myops
description: Check disk usage on a path and return usage percentage
runner_type: python-script
entry_point: check_disk.py
parameters:
  path:
    type: string
    description: Filesystem path to check
    default: /
    required: false
  threshold:
    type: integer
    description: Warning threshold percentage
    default: 80
EOF

# Create the Python script
cat > /opt/stackstorm/packs/myops/actions/check_disk.py << 'EOF'
import shutil
from st2common.runners.base_action import Action

class CheckDiskAction(Action):
    def run(self, path='/', threshold=80):
        total, used, free = shutil.disk_usage(path)

        usage_pct = (used / total) * 100
        free_gb = free / (1024 ** 3)
        total_gb = total / (1024 ** 3)

        result = {
            'path': path,
            'usage_percent': round(usage_pct, 1),
            'free_gb': round(free_gb, 2),
            'total_gb': round(total_gb, 2),
            'is_critical': usage_pct >= threshold
        }

        self.logger.info(f"Disk {path}: {usage_pct:.1f}% used ({free_gb:.1f}GB free)")

        return (not result['is_critical'], result)
EOF

# Register the pack
sudo st2ctl reload --register-actions
sudo st2 action list --pack myops

# Run it
st2 run myops.check_disk path=/ threshold=80
```

## Creating a Rule

Rules connect triggers to actions. Here is a rule that runs a script when a webhook is received.

```bash
# Create a rule for handling disk alerts from a monitoring tool
cat > /opt/stackstorm/packs/myops/rules/disk_alert.yaml << 'EOF'
name: disk_alert_handler
description: Handle disk space alerts and notify Slack
enabled: true

# Trigger to listen for
trigger:
  type: core.st2.webhook
  parameters:
    url: disk-alert

# Optional condition
criteria:
  trigger.body.severity:
    type: equals
    pattern: critical

# Action to run when trigger fires
action:
  ref: slack.post_message
  parameters:
    channel: "#alerts"
    message: "DISK ALERT: {{ trigger.body.host }} - {{ trigger.body.message }}"
EOF

# Register the rule
sudo st2ctl reload --register-rules
st2 rule list --pack myops
```

Test the webhook:

```bash
# Trigger the rule via the webhook endpoint
curl -X POST \
    -H "Content-Type: application/json" \
    -d '{"host": "web01", "message": "Disk at 95% on /", "severity": "critical"}' \
    https://localhost/api/v1/webhooks/disk-alert \
    -k -H "St2-Api-Key: $(st2 apikey create -k)"
```

## Creating a Workflow

Workflows chain multiple actions together. StackStorm uses Orquesta (YAML-based).

```yaml
# /opt/stackstorm/packs/myops/actions/remediate_disk.yaml
name: remediate_disk
description: Automatically clean up disk space and notify
runner_type: orquesta
entry_point: workflows/remediate_disk.yaml
parameters:
  host:
    type: string
    required: true
  path:
    type: string
    default: /
```

```yaml
# /opt/stackstorm/packs/myops/actions/workflows/remediate_disk.yaml
version: 1.0

input:
  - host
  - path

tasks:
  check_current_usage:
    action: myops.check_disk
    input:
      path: <% ctx(path) %>
    next:
      - when: <% succeeded() and result().output.is_critical %>
        do: clean_logs
      - when: <% succeeded() and not result().output.is_critical %>
        do: notify_ok

  clean_logs:
    action: core.remote
    input:
      hosts: <% ctx(host) %>
      cmd: "find /var/log -name '*.log' -mtime +7 -delete && journalctl --vacuum-time=7d"
    next:
      - do: notify_remediated

  notify_remediated:
    action: slack.post_message
    input:
      channel: "#alerts"
      message: "Disk cleanup completed on <% ctx(host) %>"

  notify_ok:
    action: slack.post_message
    input:
      channel: "#alerts"
      message: "Disk alert on <% ctx(host) %> resolved - usage below threshold"
```

## Monitoring and Audit Trail

```bash
# View recent rule executions
st2 rule-enforcement list --limit 20

# View execution history
st2 execution list --limit 10

# Get details of a specific execution
st2 execution get <id>

# View live output of a running execution
st2 execution tail <id>

# Check rule matching statistics
st2 rule-enforcement list --rule myops.disk_alert_handler
```

StackStorm's real value shows when you have many systems generating events and a need to respond consistently and automatically. The rule engine handles the logic and the audit trail means you always know what happened and why.
