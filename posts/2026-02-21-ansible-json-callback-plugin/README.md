# How to Use the Ansible json Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, JSON, CI/CD, Automation

Description: Use the Ansible json callback plugin to produce machine-readable JSON output from playbook runs for integration with CI/CD systems and dashboards.

---

The `json` callback plugin transforms Ansible's entire playbook output into a single JSON document. Instead of the human-readable text that scrolls by during a run, you get a structured JSON blob at the end that contains every play, every task, and every host result. This is exactly what you need when Ansible runs inside a pipeline and you want to programmatically process the results.

## Enabling the JSON Callback

Set it in your configuration:

```ini
# ansible.cfg - Enable JSON stdout callback
[defaults]
stdout_callback = json
```

Or for a one-off run:

```bash
# Single run with JSON output
ANSIBLE_STDOUT_CALLBACK=json ansible-playbook site.yml
```

Important: the JSON callback suppresses all output during the run. You see nothing on screen until the playbook finishes, then the entire JSON document is printed at once. This is by design since it produces valid JSON rather than streaming text.

## Output Structure

The JSON callback outputs a document with this structure:

```json
{
  "custom_stats": {},
  "global_custom_stats": {},
  "plays": [
    {
      "play": {
        "id": "abc123",
        "name": "Configure web servers",
        "duration": {
          "start": "2026-02-21T10:00:00.000000",
          "end": "2026-02-21T10:02:30.000000"
        }
      },
      "tasks": [
        {
          "task": {
            "id": "def456",
            "name": "Install nginx",
            "duration": {
              "start": "2026-02-21T10:00:05.000000",
              "end": "2026-02-21T10:00:45.000000"
            }
          },
          "hosts": {
            "web-01": {
              "changed": false,
              "msg": "package already installed",
              "_ansible_no_log": false,
              "action": "apt"
            },
            "web-02": {
              "changed": true,
              "msg": "installed nginx 1.24.0",
              "_ansible_no_log": false,
              "action": "apt"
            }
          }
        }
      ]
    }
  ],
  "stats": {
    "web-01": {
      "changed": 0,
      "failures": 0,
      "ignored": 0,
      "ok": 5,
      "rescued": 0,
      "skipped": 1,
      "unreachable": 0
    },
    "web-02": {
      "changed": 2,
      "failures": 0,
      "ignored": 0,
      "ok": 5,
      "rescued": 0,
      "skipped": 1,
      "unreachable": 0
    }
  }
}
```

The top-level keys are:

- `plays` - array of play objects, each containing their tasks and host results
- `stats` - the play recap data per host
- `custom_stats` - any stats set with `set_stats` module
- `global_custom_stats` - global custom statistics

## Capturing and Processing JSON Output

Redirect the output to a file and process it with `jq`:

```bash
# Capture JSON output to a file
ANSIBLE_STDOUT_CALLBACK=json ansible-playbook deploy.yml > results.json 2>errors.log

# Extract just the stats (play recap)
jq '.stats' results.json

# Get all failed hosts
jq '.stats | to_entries | map(select(.value.failures > 0)) | map(.key)' results.json

# Get all changed tasks with their hosts
jq '.plays[].tasks[] | select(.hosts | to_entries | map(.value.changed) | any) | .task.name' results.json

# Calculate total execution time
jq '.plays[] | .play.duration' results.json
```

## Integration with CI/CD Systems

The JSON callback is ideal for CI/CD because you can make decisions based on structured data:

```bash
#!/bin/bash
# ci-deploy.sh - Deploy and process results
ANSIBLE_STDOUT_CALLBACK=json ansible-playbook deploy.yml > /tmp/deploy-results.json 2>&1

# Check if any hosts failed
failed_count=$(jq '[.stats | to_entries[] | select(.value.failures > 0)] | length' /tmp/deploy-results.json)

if [ "$failed_count" -gt 0 ]; then
    # Extract failure details
    echo "Deployment had failures on $failed_count hosts:"
    jq -r '.stats | to_entries[] | select(.value.failures > 0) | .key' /tmp/deploy-results.json

    # Get the actual error messages
    jq -r '.plays[].tasks[].hosts | to_entries[] | select(.value.failed == true) | "\(.key): \(.value.msg)"' /tmp/deploy-results.json

    exit 1
fi

echo "Deployment successful on all hosts"
# Extract changed count for reporting
changed=$(jq '[.stats | to_entries[] | .value.changed] | add' /tmp/deploy-results.json)
echo "Total changes applied: $changed"
```

## Building Dashboards from JSON Output

You can feed the JSON output into monitoring systems. Here is a Python script that sends results to a webhook:

```python
#!/usr/bin/env python3
# process_results.py - Send Ansible results to a monitoring webhook
import json
import sys
import requests
from datetime import datetime

# Load the Ansible JSON output
with open(sys.argv[1]) as f:
    data = json.load(f)

# Build a summary
summary = {
    "timestamp": datetime.now().isoformat(),
    "hosts": {},
    "total_plays": len(data.get("plays", [])),
    "total_tasks": sum(len(p.get("tasks", [])) for p in data.get("plays", [])),
}

# Process per-host stats
for host, stats in data.get("stats", {}).items():
    summary["hosts"][host] = {
        "ok": stats["ok"],
        "changed": stats["changed"],
        "failed": stats["failures"],
        "unreachable": stats["unreachable"],
    }

# Calculate overall status
total_failures = sum(h["failed"] for h in summary["hosts"].values())
total_unreachable = sum(h["unreachable"] for h in summary["hosts"].values())
summary["status"] = "success" if (total_failures + total_unreachable) == 0 else "failure"

# Send to webhook
requests.post(
    "https://hooks.example.com/ansible-results",
    json=summary,
    headers={"Content-Type": "application/json"},
)

print(json.dumps(summary, indent=2))
```

## JSON Callback in Jenkins

For Jenkins pipelines, the JSON output integrates with build result analysis:

```groovy
// Jenkinsfile - Use JSON callback for structured results
pipeline {
    agent any
    stages {
        stage('Deploy') {
            steps {
                script {
                    sh '''
                        export ANSIBLE_STDOUT_CALLBACK=json
                        ansible-playbook deploy.yml > ansible-results.json 2>&1 || true
                    '''
                    def results = readJSON file: 'ansible-results.json'
                    def failedHosts = results.stats.findAll { host, stats -> stats.failures > 0 }
                    if (failedHosts) {
                        error "Deployment failed on: ${failedHosts.keySet().join(', ')}"
                    }
                }
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'ansible-results.json'
        }
    }
}
```

## Handling Large Output

The JSON callback holds everything in memory until the playbook finishes. For very large playbooks (hundreds of hosts, dozens of tasks), the JSON output can be large. Some tips:

```bash
# Compress the output immediately
ANSIBLE_STDOUT_CALLBACK=json ansible-playbook site.yml | gzip > results.json.gz

# Process with streaming jq for large files
ANSIBLE_STDOUT_CALLBACK=json ansible-playbook site.yml | jq -c '.stats' > stats-only.json

# Limit what gets returned by tasks using no_log on verbose tasks
```

In your playbooks, use `no_log: true` on tasks that return large data to keep the JSON output manageable:

```yaml
# Prevent large outputs from bloating JSON
- name: Fetch database dump
  command: pg_dump mydb
  register: db_dump
  no_log: true  # Prevents the full dump from appearing in JSON output
```

## Combining JSON with Other Callbacks

You can use the JSON callback as the stdout callback while also enabling notification callbacks:

```ini
# ansible.cfg - JSON stdout with additional notification callbacks
[defaults]
stdout_callback = json
callback_whitelist = timer, profile_tasks, mail
```

The JSON callback only replaces the stdout output. The other callbacks (timer, mail, etc.) still function normally because they are notification-type callbacks, not stdout callbacks.

The JSON callback is the right choice when Ansible is a component in a larger automated workflow. It gives you structured data that scripts, dashboards, and CI systems can consume without fragile text parsing. The tradeoff is that you lose real-time feedback during the run, so it is not great for interactive use.
