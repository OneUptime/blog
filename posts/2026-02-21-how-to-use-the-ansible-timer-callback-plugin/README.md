# How to Use the Ansible timer Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Performance, Monitoring

Description: Use the Ansible timer callback plugin to track total playbook execution time and integrate timing data into your automation workflows.

---

The `timer` callback plugin is one of the simplest but most useful profiling tools in Ansible. It does exactly one thing: reports the total wall clock time of a playbook run. While it does not provide per-task granularity like `profile_tasks`, it gives you a quick and reliable way to track overall playbook performance. This post covers how to set it up, use it effectively, and integrate it into automated workflows.

## Enabling the Timer Callback

There are three ways to enable the timer callback.

In `ansible.cfg`:

```ini
# Enable the timer callback plugin
[defaults]
callbacks_enabled = timer
```

Via environment variable:

```bash
# Enable timer for a single run
ANSIBLE_CALLBACKS_ENABLED=timer ansible-playbook site.yml
```

Via command line (Ansible 2.11+):

```bash
# Enable via environment variable for one-off use
export ANSIBLE_CALLBACKS_ENABLED=timer
ansible-playbook site.yml
```

## What the Timer Shows

When the timer callback is active, it adds a single line at the end of playbook output:

```
PLAY RECAP *********************************************************************
web-01 : ok=12   changed=3    unreachable=0    failed=0    skipped=2    rescued=0    ignored=0
web-02 : ok=12   changed=3    unreachable=0    failed=0    skipped=2    rescued=0    ignored=0
db-01  : ok=8    changed=1    unreachable=0    failed=0    skipped=4    rescued=0    ignored=0

Playbook run took 0 days, 0 hours, 3 minutes, 45 seconds
```

The format is always `Playbook run took X days, X hours, X minutes, X seconds`. It measures the time from when the playbook starts executing to when it finishes, including all plays and tasks.

## Combining with Other Callbacks

The timer callback works alongside other callback plugins. The most common combination is timer plus profile_tasks:

```ini
# Enable both timer and profile_tasks
[defaults]
callbacks_enabled = timer, profile_tasks
```

This gives you both the big picture (total time) and the details (per-task time). The timer line appears after the profile_tasks summary:

```
===============================================================================
Install packages ----------------------------------------- 45.12s
Run database migration ----------------------------------- 32.45s
Copy configuration --------------------------------------- 12.34s
Gathering Facts ------------------------------------------- 3.21s

Playbook run took 0 days, 0 hours, 1 minutes, 33 seconds
```

You can also add `profile_roles` for a three-level view:

```ini
# Full profiling stack
[defaults]
callbacks_enabled = timer, profile_tasks, profile_roles
```

## Parsing Timer Output Programmatically

The timer output has a consistent format, making it easy to parse in scripts:

```bash
#!/bin/bash
# parse-timer.sh - Extract execution time from Ansible output

OUTPUT=$(ANSIBLE_CALLBACKS_ENABLED=timer ansible-playbook "$1" 2>&1)
echo "$OUTPUT"

# Extract the timer line
TIMER_LINE=$(echo "$OUTPUT" | grep "Playbook run took")

# Parse into seconds
DAYS=$(echo "$TIMER_LINE" | grep -oP '\d+ days' | grep -oP '\d+')
HOURS=$(echo "$TIMER_LINE" | grep -oP '\d+ hours' | grep -oP '\d+')
MINUTES=$(echo "$TIMER_LINE" | grep -oP '\d+ minutes' | grep -oP '\d+')
SECONDS=$(echo "$TIMER_LINE" | grep -oP '\d+ seconds' | grep -oP '\d+')

TOTAL_SECONDS=$(( ${DAYS:-0}*86400 + ${HOURS:-0}*3600 + ${MINUTES:-0}*60 + ${SECONDS:-0} ))
echo "Total execution time: ${TOTAL_SECONDS} seconds"
```

## Tracking Performance Over Time

Use the timer callback to build a performance history:

```bash
#!/bin/bash
# track-timings.sh - Record playbook execution times to a CSV log

PLAYBOOK="$1"
LOG_FILE="/var/log/ansible/timing-history.csv"

# Create log file with header if it does not exist
if [ ! -f "$LOG_FILE" ]; then
    echo "date,playbook,seconds,status" > "$LOG_FILE"
fi

# Run the playbook and capture output
OUTPUT=$(ANSIBLE_CALLBACKS_ENABLED=timer ansible-playbook "$PLAYBOOK" 2>&1)
EXIT_CODE=$?

# Extract timing
TIMER_LINE=$(echo "$OUTPUT" | grep "Playbook run took")
DAYS=$(echo "$TIMER_LINE" | grep -oP '\d+ days' | grep -oP '\d+')
HOURS=$(echo "$TIMER_LINE" | grep -oP '\d+ hours' | grep -oP '\d+')
MINUTES=$(echo "$TIMER_LINE" | grep -oP '\d+ minutes' | grep -oP '\d+')
SECS=$(echo "$TIMER_LINE" | grep -oP '\d+ seconds' | grep -oP '\d+')
TOTAL=$(( ${DAYS:-0}*86400 + ${HOURS:-0}*3600 + ${MINUTES:-0}*60 + ${SECS:-0} ))

# Determine status
if [ $EXIT_CODE -eq 0 ]; then
    STATUS="success"
else
    STATUS="failure"
fi

# Append to log
echo "$(date -Iseconds),$PLAYBOOK,$TOTAL,$STATUS" >> "$LOG_FILE"
echo "Logged: $PLAYBOOK completed in ${TOTAL}s with status $STATUS"
```

After collecting data over time, you can visualize trends:

```bash
# Quick analysis of timing history
echo "=== Recent runs ==="
tail -10 /var/log/ansible/timing-history.csv

echo ""
echo "=== Average execution time ==="
awk -F',' 'NR>1 {sum+=$3; count++} END {printf "%.1f seconds\n", sum/count}' /var/log/ansible/timing-history.csv

echo ""
echo "=== Slowest runs ==="
sort -t',' -k3 -rn /var/log/ansible/timing-history.csv | head -5
```

## Setting Performance Thresholds

Use the timer output to enforce performance gates in CI/CD:

```bash
#!/bin/bash
# enforce-timing.sh - Fail if playbook exceeds time threshold

PLAYBOOK="$1"
MAX_SECONDS="${2:-300}"  # Default 5 minute threshold

OUTPUT=$(ANSIBLE_CALLBACKS_ENABLED=timer ansible-playbook "$PLAYBOOK" 2>&1)
ANSIBLE_EXIT=$?
echo "$OUTPUT"

# If Ansible itself failed, report that
if [ $ANSIBLE_EXIT -ne 0 ]; then
    echo "ERROR: Playbook failed with exit code $ANSIBLE_EXIT"
    exit $ANSIBLE_EXIT
fi

# Check timing
TIMER_LINE=$(echo "$OUTPUT" | grep "Playbook run took")
MINUTES=$(echo "$TIMER_LINE" | grep -oP '\d+ minutes' | grep -oP '\d+')
SECS=$(echo "$TIMER_LINE" | grep -oP '\d+ seconds' | grep -oP '\d+')
TOTAL=$(( ${MINUTES:-0}*60 + ${SECS:-0} ))

if [ "$TOTAL" -gt "$MAX_SECONDS" ]; then
    echo "PERFORMANCE WARNING: Playbook took ${TOTAL}s (threshold: ${MAX_SECONDS}s)"
    exit 2
fi

echo "Playbook completed in ${TOTAL}s (within ${MAX_SECONDS}s threshold)"
```

Use it in your pipeline:

```bash
# Deploy with a 5-minute time limit
./enforce-timing.sh deploy.yml 300

# Run tests with a 10-minute time limit
./enforce-timing.sh integration-tests.yml 600
```

## Integration with Monitoring Systems

Send timer data to your monitoring stack:

```bash
#!/bin/bash
# report-to-monitoring.sh - Send Ansible timing to Prometheus pushgateway

PLAYBOOK="$1"
PUSHGATEWAY="http://prometheus-push.internal:9091"

OUTPUT=$(ANSIBLE_CALLBACKS_ENABLED=timer ansible-playbook "$PLAYBOOK" 2>&1)

# Parse timing
TIMER_LINE=$(echo "$OUTPUT" | grep "Playbook run took")
MINUTES=$(echo "$TIMER_LINE" | grep -oP '\d+ minutes' | grep -oP '\d+')
SECS=$(echo "$TIMER_LINE" | grep -oP '\d+ seconds' | grep -oP '\d+')
TOTAL=$(( ${MINUTES:-0}*60 + ${SECS:-0} ))

# Push metric to Prometheus
cat <<METRIC | curl --data-binary @- "$PUSHGATEWAY/metrics/job/ansible/playbook/$(basename $PLAYBOOK .yml)"
# HELP ansible_playbook_duration_seconds Duration of Ansible playbook execution
# TYPE ansible_playbook_duration_seconds gauge
ansible_playbook_duration_seconds $TOTAL
METRIC

echo "Reported ${TOTAL}s to Prometheus pushgateway"
```

For Datadog or similar:

```bash
# Send timing to Datadog
TOTAL_SECONDS=195
curl -X POST "https://api.datadoghq.com/api/v1/series" \
    -H "Content-Type: application/json" \
    -H "DD-API-KEY: ${DATADOG_API_KEY}" \
    -d "{
        \"series\": [{
            \"metric\": \"ansible.playbook.duration\",
            \"points\": [[ $(date +%s), $TOTAL_SECONDS ]],
            \"type\": \"gauge\",
            \"tags\": [\"playbook:deploy\", \"env:production\"]
        }]
    }"
```

## Custom Timer Callback

If you need more control than the built-in timer provides, you can write a custom callback plugin:

```python
# callback_plugins/custom_timer.py
from datetime import datetime
from ansible.plugins.callback import CallbackBase


class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'aggregate'
    CALLBACK_NAME = 'custom_timer'

    def __init__(self):
        super(CallbackModule, self).__init__()
        self.start_time = None

    def v2_playbook_on_start(self, playbook):
        self.start_time = datetime.now()

    def v2_playbook_on_stats(self, stats):
        end_time = datetime.now()
        duration = end_time - self.start_time
        total_seconds = int(duration.total_seconds())

        self._display.banner("TIMING REPORT")
        self._display.display("Start:    %s" % self.start_time.strftime("%Y-%m-%d %H:%M:%S"))
        self._display.display("End:      %s" % end_time.strftime("%Y-%m-%d %H:%M:%S"))
        self._display.display("Duration: %d seconds (%dm %ds)" % (
            total_seconds,
            total_seconds // 60,
            total_seconds % 60
        ))
```

Place this in a `callback_plugins/` directory next to your playbook, and enable it:

```ini
[defaults]
callbacks_enabled = custom_timer
```

## Practical Recommendations

The timer callback is lightweight enough to leave enabled permanently. There is zero performance overhead since it only records timestamps at playbook start and end. I recommend:

1. Enable timer globally in your `ansible.cfg`
2. Add `profile_tasks` when actively investigating performance issues
3. Pipe timer output to a log file for every production run
4. Set up alerts when playbook duration exceeds historical norms

The timer callback is a small tool that serves a big purpose. It takes five seconds to set up and gives you immediate visibility into how long your automation takes. Combined with a simple logging script, it becomes the foundation for performance monitoring across your entire Ansible workflow.
