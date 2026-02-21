# How to Use the Ansible timer Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Performance, Timer

Description: Enable the Ansible timer callback plugin to display total playbook execution time and identify slow runs that need optimization.

---

The `timer` callback plugin adds one simple but useful piece of information to your Ansible runs: the total elapsed time. After the play recap, it prints how long the entire playbook took to run. This sounds trivial, but when you are optimizing playbooks or tracking deployment times, having the wall-clock time right there in the output is genuinely helpful.

## Enabling the Timer Callback

The timer is a notification callback, so it adds to your existing output rather than replacing it:

```ini
# ansible.cfg - Enable the timer callback
[defaults]
callback_whitelist = timer
```

Or with an environment variable:

```bash
# Enable timer for a single run
ANSIBLE_CALLBACK_WHITELIST=timer ansible-playbook site.yml
```

## What the Output Looks Like

With the timer callback enabled, your playbook output gains a line at the very end:

```
PLAY RECAP *******************************************************************
web-01  : ok=5  changed=2  unreachable=0  failed=0
web-02  : ok=5  changed=2  unreachable=0  failed=0
db-01   : ok=3  changed=1  unreachable=0  failed=0

Playbook run took 0 days, 0 hours, 3 minutes, 47 seconds
```

That is it. The timer callback does exactly one thing, and it does it well.

## Why You Want This

Without the timer callback, you have to either time your commands manually or scroll up to compare start timestamps. Neither is convenient. With the timer:

- You know immediately if a playbook is getting slower over time
- You can compare deployment times between environments
- You can set expectations for how long a deployment window needs to be
- You can track the impact of playbook optimizations

## Timer with Other Callbacks

The timer works alongside any other callback. A common combination is timer with profile_tasks, which gives you both the total time and per-task timing:

```ini
# ansible.cfg - Timer with task profiling
[defaults]
callback_whitelist = timer, profile_tasks
stdout_callback = yaml
```

Output:

```
PLAY RECAP *******************************************************************
web-01  : ok=5  changed=2  unreachable=0  failed=0

Thursday 21 February 2026  10:15:23 +0000 (0:00:02.345)       0:03:47.123 ****
===============================================================================
Install packages ---------------------------------------------------- 120.45s
Deploy configuration ------------------------------------------------- 45.23s
Gathering Facts ------------------------------------------------------ 12.67s
Restart services ----------------------------------------------------- 8.34s
Verify health -------------------------------------------------------- 2.35s

Playbook run took 0 days, 0 hours, 3 minutes, 47 seconds
```

The timer gives you the total at the bottom, while profile_tasks breaks it down per task above.

## Using Timer for Performance Tracking

Track playbook execution times over multiple runs:

```bash
#!/bin/bash
# track-timing.sh - Log playbook execution times
LOG_FILE="/var/log/ansible/timing.log"

output=$(ANSIBLE_CALLBACK_WHITELIST=timer ansible-playbook -i inventory deploy.yml 2>&1)
exit_code=$?

# Extract the timing line
timing=$(echo "$output" | grep "Playbook run took")

# Log it with timestamp and playbook name
echo "$(date -Iseconds) | deploy.yml | exit=$exit_code | $timing" >> "$LOG_FILE"

echo "$output"
exit $exit_code
```

Over time, your timing log builds a history:

```
2026-02-18T10:15:00+00:00 | deploy.yml | exit=0 | Playbook run took 0 days, 0 hours, 3 minutes, 47 seconds
2026-02-19T10:15:00+00:00 | deploy.yml | exit=0 | Playbook run took 0 days, 0 hours, 3 minutes, 52 seconds
2026-02-20T10:15:00+00:00 | deploy.yml | exit=0 | Playbook run took 0 days, 0 hours, 5 minutes, 23 seconds
2026-02-21T10:15:00+00:00 | deploy.yml | exit=0 | Playbook run took 0 days, 0 hours, 5 minutes, 18 seconds
```

You can spot when things got slower (February 20th) and investigate what changed.

## Timer in CI/CD Pipelines

In CI/CD, the timer output helps you monitor deployment duration trends:

```yaml
# .gitlab-ci.yml - Track deployment time
deploy:
  stage: deploy
  variables:
    ANSIBLE_CALLBACK_WHITELIST: "timer"
  script:
    - ansible-playbook -i inventory/production deploy.yml 2>&1 | tee deploy.log
    # Extract and report timing
    - grep "Playbook run took" deploy.log
  after_script:
    # Send timing to metrics system
    - |
      SECONDS=$(grep "Playbook run took" deploy.log | \
        awk '{print ($8*3600) + ($10*60) + $12}')
      curl -X POST "https://metrics.example.com/api/v1/series" \
        -d "{\"metric\":\"ansible.deploy.duration\",\"value\":$SECONDS}"
```

## Comparing Runs with Timer

Use the timer to measure the impact of optimizations. For example, before and after enabling pipelining:

```bash
# Before pipelining
ANSIBLE_CALLBACK_WHITELIST=timer ansible-playbook site.yml
# Playbook run took 0 days, 0 hours, 8 minutes, 15 seconds

# Enable pipelining
export ANSIBLE_PIPELINING=True
ANSIBLE_CALLBACK_WHITELIST=timer ansible-playbook site.yml
# Playbook run took 0 days, 0 hours, 5 minutes, 42 seconds
```

That tells you pipelining saved about 2.5 minutes on this particular playbook.

Similarly, measuring the impact of increasing forks:

```bash
# Default forks (5)
ANSIBLE_CALLBACK_WHITELIST=timer ansible-playbook -f 5 site.yml
# Playbook run took 0 days, 0 hours, 12 minutes, 30 seconds

# Increased forks
ANSIBLE_CALLBACK_WHITELIST=timer ansible-playbook -f 20 site.yml
# Playbook run took 0 days, 0 hours, 4 minutes, 10 seconds
```

## Alerting on Slow Runs

Set up alerts when playbooks take longer than expected:

```bash
#!/bin/bash
# deploy-with-alert.sh - Alert if deployment takes too long
MAX_SECONDS=600  # 10 minutes

START=$(date +%s)
ANSIBLE_CALLBACK_WHITELIST=timer ansible-playbook deploy.yml
END=$(date +%s)

DURATION=$((END - START))

if [ "$DURATION" -gt "$MAX_SECONDS" ]; then
    echo "WARNING: Deployment took ${DURATION}s (threshold: ${MAX_SECONDS}s)"
    # Send alert
    curl -X POST "https://hooks.slack.com/services/YOUR/WEBHOOK" \
        -d "{\"text\": \"Ansible deployment took ${DURATION}s, exceeding the ${MAX_SECONDS}s threshold\"}"
fi
```

## Timer Callback Internals

The timer callback is one of the simplest callback plugins in Ansible. It records the start time when the playbook begins and calculates the difference when it finishes. The entire implementation is about 20 lines of Python, making it a good reference if you want to write your own callback.

You can look at the source:

```bash
# Find the timer callback source
python3 -c "import ansible.plugins.callback.timer; print(ansible.plugins.callback.timer.__file__)"
```

The simplicity is the point. It does one thing, adds no overhead, and provides genuinely useful information on every run. Enable it in your `ansible.cfg` and leave it there.
