# How to Use the Ansible oneline Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Output, Monitoring

Description: Configure the Ansible oneline callback plugin to display each task result on a single line for concise and scannable playbook output.

---

The `oneline` callback plugin in Ansible compresses each task result into a single line. Instead of spreading results across multiple lines with formatted dictionaries, you get one line per host per task showing the status and a brief summary. This makes it easy to scan through large playbook runs quickly.

## Enabling oneline

Set it in your `ansible.cfg`:

```ini
# ansible.cfg - Enable the oneline callback
[defaults]
stdout_callback = oneline
```

Or as an environment variable:

```bash
# Enable oneline callback for a single run
ANSIBLE_STDOUT_CALLBACK=oneline ansible-playbook site.yml
```

## Output Format

The oneline callback produces output like this:

```
web-01 | SUCCESS => {"changed": false, "ping": "pong"}
web-02 | SUCCESS => {"changed": false, "ping": "pong"}
web-03 | FAILED! => {"changed": false, "msg": "Connection refused"}
db-01 | SUCCESS => {"changed": false, "ping": "pong"}
```

Each line follows the pattern: `hostname | STATUS => {result_json}`

For changed tasks:

```
web-01 | CHANGED => {"changed": true, "dest": "/etc/nginx/nginx.conf", "md5sum": "a1b2c3..."}
```

For failures:

```
web-03 | FAILED! => {"changed": false, "msg": "No package matching 'nginx' found"}
```

For unreachable hosts:

```
web-04 | UNREACHABLE! => {"changed": false, "msg": "Failed to connect to the host", "unreachable": true}
```

## Comparing oneline with Other Callbacks

Here is the same playbook run shown with three different callbacks:

Default callback output:

```
TASK [Install nginx] *********************************************************
ok: [web-01]
changed: [web-02]
failed: [web-03] => {"changed": false, "msg": "Package not found"}

TASK [Start service] *********************************************************
ok: [web-01]
ok: [web-02]
```

Minimal callback output:

```
web-01 | SUCCESS => {"changed": false}
web-02 | CHANGED => {"changed": true}
web-03 | FAILED! => {"changed": false, "msg": "Package not found"}
web-01 | SUCCESS => {"changed": false}
web-02 | SUCCESS => {"changed": false}
```

Oneline callback output:

```
web-01 | SUCCESS => {"changed": false}
web-02 | CHANGED => {"changed": true}
web-03 | FAILED! => {"changed": false, "msg": "Package not found"}
web-01 | SUCCESS => {"changed": false}
web-02 | SUCCESS => {"changed": false}
```

The oneline and minimal callbacks produce similar output. The main difference is subtle: oneline guarantees everything stays on one line even with verbose mode, while minimal can wrap across lines. In practice, the output is nearly identical at the default verbosity level.

## Using oneline for Monitoring Scripts

The oneline callback is particularly useful when you feed Ansible output into monitoring or alerting scripts. Each line is self-contained and easy to parse:

```bash
#!/bin/bash
# health-check.sh - Run health checks and alert on failures
export ANSIBLE_STDOUT_CALLBACK=oneline

# Run the health check playbook and capture output
output=$(ansible-playbook health-check.yml 2>&1)

# Count failures
failures=$(echo "$output" | grep -c "FAILED!")
unreachable=$(echo "$output" | grep -c "UNREACHABLE!")

if [ "$failures" -gt 0 ] || [ "$unreachable" -gt 0 ]; then
    echo "ALERT: $failures failed, $unreachable unreachable"
    echo "$output" | grep -E "FAILED!|UNREACHABLE!" | mail -s "Ansible Health Check Alert" ops@example.com
fi
```

## Parsing oneline Output

Since every result is on one line, you can use standard text processing tools:

```bash
# Extract only changed hosts
ANSIBLE_STDOUT_CALLBACK=oneline ansible-playbook deploy.yml | grep "CHANGED"

# Count successes per host
ANSIBLE_STDOUT_CALLBACK=oneline ansible-playbook site.yml | \
  grep "SUCCESS" | \
  awk -F'|' '{print $1}' | \
  sort | uniq -c | sort -rn

# Get all failed hosts as a list
ANSIBLE_STDOUT_CALLBACK=oneline ansible-playbook site.yml | \
  grep "FAILED!" | \
  awk -F'|' '{print $1}' | \
  tr -d ' '
```

## oneline with Ad-Hoc Commands

The oneline callback works well with ad-hoc commands for quick checks across your fleet:

```bash
# Check disk space across all servers, one line per host
ANSIBLE_STDOUT_CALLBACK=oneline ansible all -m shell -a "df -h / | tail -1"
```

Output:

```
web-01 | CHANGED => {"changed": true, "stdout": "/dev/sda1  50G  23G  25G  48% /"}
web-02 | CHANGED => {"changed": true, "stdout": "/dev/sda1  50G  45G  3.2G  94% /"}
db-01 | CHANGED => {"changed": true, "stdout": "/dev/sda1  100G  34G  62G  36% /"}
```

You can immediately spot the problem: web-02 is at 94% disk usage.

```bash
# Check service status across servers
ANSIBLE_STDOUT_CALLBACK=oneline ansible webservers -m service_facts | \
  grep -o '"nginx.service":{[^}]*}'
```

## Using oneline in CI/CD Pipelines

The oneline callback keeps CI logs compact. Here is an example with GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Ansible deployment
        env:
          ANSIBLE_STDOUT_CALLBACK: oneline
          ANSIBLE_HOST_KEY_CHECKING: "False"
        run: |
          ansible-playbook -i inventory/production deploy.yml

      - name: Check for failures
        if: failure()
        run: |
          echo "Deployment failed. Re-running with verbose output."
          ANSIBLE_STDOUT_CALLBACK=default ansible-playbook -i inventory/production deploy.yml -vv
```

## Limitations

The oneline callback has clear limitations:

1. No task names in the output. You cannot tell which task produced which result without correlating line positions.
2. No play recap. You do not get the summary counts at the end showing total ok/changed/failed per host.
3. Complex return values get truncated or hard to read when squeezed onto one line.
4. Debugging is harder because you lose the context that task names provide.

For debugging, switch back to the default callback:

```bash
# Quick toggle for debugging
ANSIBLE_STDOUT_CALLBACK=default ansible-playbook troubleshoot.yml -vv
```

## Creating an Enhanced oneline Callback

If you want oneline output with task names, create a custom version:

```python
# callback_plugins/oneline_plus.py - oneline with task names
from ansible.plugins.callback.oneline import CallbackModule as OnelineCallback

class CallbackModule(OnelineCallback):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'stdout'
    CALLBACK_NAME = 'oneline_plus'

    def __init__(self):
        super().__init__()
        self._current_task = None

    def v2_playbook_on_task_start(self, task, is_conditional):
        self._current_task = task.get_name().strip()

    def _get_prefix(self):
        if self._current_task:
            return f"[{self._current_task}] "
        return ""

    def v2_runner_on_ok(self, result):
        prefix = self._get_prefix()
        host = result._host.get_name()
        if result._result.get('changed', False):
            self._display.display(f"{prefix}{host} | CHANGED", color='yellow')
        else:
            self._display.display(f"{prefix}{host} | SUCCESS", color='green')

    def v2_runner_on_failed(self, result, ignore_errors=False):
        prefix = self._get_prefix()
        host = result._host.get_name()
        msg = result._result.get('msg', '')
        self._display.display(f"{prefix}{host} | FAILED! => {msg}", color='red')
```

The oneline callback fills a specific niche: when you need compact, parseable output and do not care about task-level context. It works best for monitoring scripts, large fleet operations, and CI pipelines where you just need to know if things passed or failed.
