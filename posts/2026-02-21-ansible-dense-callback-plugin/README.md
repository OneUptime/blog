# How to Use the Ansible dense Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Dense, Output Formatting

Description: Use the Ansible dense callback plugin to get compact playbook output that fits more information on screen for large-scale deployments.

---

The `dense` callback plugin compresses Ansible output into a compact format that shows progress in real time without overwhelming your terminal. Unlike the default callback, which prints a line for every host on every task, the dense callback updates a single status line per task. It is built for running playbooks against large inventories where the default output would produce thousands of lines.

## Enabling the Dense Callback

Add it to `ansible.cfg`:

```ini
# ansible.cfg - Enable dense output
[defaults]
stdout_callback = dense
```

Or set it for a single run:

```bash
# Use dense callback for this run
ANSIBLE_STDOUT_CALLBACK=dense ansible-playbook site.yml
```

## What Dense Output Looks Like

Here is the default callback against 5 hosts:

```
TASK [Install packages] ******************************************************
ok: [web-01]
ok: [web-02]
changed: [web-03]
ok: [web-04]
ok: [web-05]
```

The same task with dense:

```
TASK 003 Install packages                    ok=4    changed=1    unreachable=0    failed=0
```

Each task gets a single summary line instead of one line per host. The task number, name, and aggregated counts are all on one line. You can see at a glance how many hosts succeeded, changed, or failed without scrolling through individual results.

## Dense Output for a Full Playbook

A complete playbook run with dense looks like:

```
PLAY 001 Configure web servers
  TASK 001 Gathering Facts                   ok=50   changed=0    unreachable=0    failed=0
  TASK 002 Install nginx                     ok=45   changed=5    unreachable=0    failed=0
  TASK 003 Deploy config                     ok=30   changed=20   unreachable=0    failed=0
  TASK 004 Start service                     ok=50   changed=0    unreachable=0    failed=0
  TASK 005 Verify health                     ok=50   changed=0    unreachable=0    failed=0

PLAY 002 Configure database servers
  TASK 001 Gathering Facts                   ok=10   changed=0    unreachable=0    failed=0
  TASK 002 Install postgresql                ok=8    changed=2    unreachable=0    failed=0

PLAY RECAP
  web-01                  ok=5    changed=1    unreachable=0    failed=0
  web-02                  ok=5    changed=2    unreachable=0    failed=0
  ...
```

The dense callback still shows the play recap at the end, so you get the per-host summary when the run finishes.

## Real-Time Progress

One feature that sets dense apart from the minimal and oneline callbacks is real-time progress. During task execution, the dense callback updates the current task line in place. You see the counters incrementing as hosts complete:

```
  TASK 002 Install nginx                     ok=23   changed=5    unreachable=0    failed=0
```

This counter updates as each host finishes. When all hosts complete, the line gets its final values and the next task begins below it. This gives you a live view of progress without scrolling.

## When Dense is the Right Choice

Dense is ideal for:

- Inventories with 50+ hosts where default output is overwhelming
- Quick visual confirmation that a playbook is progressing
- Running in a dashboard or monitoring screen where screen space is limited
- Production deployments where you want to see progress without scrolling

Dense is not great for:

- Debugging, because you cannot see individual host results
- Small inventories where the default output is fine
- Situations where you need to see which specific hosts changed or failed

## Combining Dense with Verbose Mode

Even with the dense callback, verbose flags add more detail:

```bash
# Dense with some verbosity
ANSIBLE_STDOUT_CALLBACK=dense ansible-playbook site.yml -v
```

At `-v`, the dense callback shows individual host results for failed and changed tasks while still keeping ok hosts aggregated. This is a good middle ground.

## Dense Callback Configuration

The dense callback has a few configuration options:

```ini
# ansible.cfg - Dense callback settings
[defaults]
stdout_callback = dense

[callback_dense]
# Display skipped hosts
display_skipped_hosts = false
# Display ok hosts
display_ok_hosts = false
```

## Practical Example: Large Deployment

Here is a realistic deployment playbook output with the dense callback across 100 hosts:

```yaml
# deploy.yml - Deploy application to web fleet
---
- name: Deploy application v2.5.1
  hosts: webservers
  serial: 25
  become: true

  tasks:
    - name: Pull latest Docker image
      docker_image:
        name: myapp
        tag: v2.5.1
        source: pull

    - name: Stop current container
      docker_container:
        name: myapp
        state: stopped

    - name: Start new container
      docker_container:
        name: myapp
        image: myapp:v2.5.1
        state: started
        ports:
          - "8080:8080"

    - name: Wait for health check
      uri:
        url: "http://localhost:8080/health"
        status_code: 200
      retries: 10
      delay: 5
      register: health
      until: health.status == 200
```

Dense output during the first batch:

```
PLAY 001 Deploy application v2.5.1 (batch 1/4)
  TASK 001 Gathering Facts                   ok=25   changed=0    unreachable=0    failed=0
  TASK 002 Pull latest Docker image          ok=20   changed=5    unreachable=0    failed=0
  TASK 003 Stop current container            ok=0    changed=25   unreachable=0    failed=0
  TASK 004 Start new container               ok=0    changed=25   unreachable=0    failed=0
  TASK 005 Wait for health check             ok=25   changed=0    unreachable=0    failed=0

PLAY 001 Deploy application v2.5.1 (batch 2/4)
  TASK 001 Gathering Facts                   ok=25   changed=0    unreachable=0    failed=0
  ...
```

You can watch the deployment progress batch by batch, seeing each task complete across the group.

## Dense vs Other Compact Callbacks

Comparison of compact callbacks:

- **dense**: One summary line per task with aggregated counts. Best for large inventories.
- **minimal**: One line per host per task, no task names. Best for scripting.
- **oneline**: Similar to minimal, one line per result. Best for parsing.

Dense gives you the most context of the three while using the least screen space. It is the only compact callback that shows task names alongside results.

## Using Dense in Production Operations

For production operations rooms or deployment dashboards, the dense callback provides just enough information:

```bash
#!/bin/bash
# production-deploy.sh - Deploy with dense output for the operations screen
export ANSIBLE_STDOUT_CALLBACK=dense
export ANSIBLE_FORCE_COLOR=true

echo "=== Production Deployment Started: $(date) ==="
ansible-playbook -i inventory/production deploy.yml
exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo ""
    echo "=== DEPLOYMENT FAILED - Running diagnostics ==="
    export ANSIBLE_STDOUT_CALLBACK=default
    ansible-playbook -i inventory/production diagnose.yml -v
fi

exit $exit_code
```

The dense callback is the sweet spot between too much information (default) and too little (minimal). If you regularly run playbooks against more than a handful of hosts, give it a try. The compact, real-time progress view is genuinely useful during large deployments.
