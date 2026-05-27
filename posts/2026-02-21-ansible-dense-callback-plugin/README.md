# How to Use the Ansible dense Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Dense, Output Formatting

Description: Use the Ansible dense callback plugin to get compact playbook output that fits more information on screen for large-scale deployments.

---

The `dense` callback plugin compresses Ansible output into a compact format that shows progress in real time without overwhelming your terminal. Unlike the default callback, which prints a line for every host on every task, the dense callback rewrites the current task line with the hosts that have reported a result. It is built for running playbooks against large inventories where the default output would produce thousands of lines.

## Enabling the Dense Callback

The `dense` callback is part of the `community.general` collection. If your installation does not already include it, install the collection first:

```bash
# Install the collection that provides the dense callback
ansible-galaxy collection install community.general
```

Add it to `ansible.cfg`:

```ini
# ansible.cfg - Enable dense output

[defaults]
stdout_callback = community.general.dense
```

Or set it for a single run:

```bash
# Use dense callback for this run
ANSIBLE_STDOUT_CALLBACK=community.general.dense ansible-playbook site.yml
```

## What Dense Output Looks Like

Here is the default callback against 5 hosts:

```text
TASK [Install packages] ******************************************************
ok: [web-01]
ok: [web-02]
changed: [web-03]
ok: [web-04]
ok: [web-05]
```

The same task with dense is shown on a single progress line while the task is running:

```text
task 3: web-01 web-02 web-03 web-04 web-05
```

Dense uses terminal control sequences to rewrite the line as hosts finish. In a real terminal, host names are color-coded by result state, so an `ok`, `changed`, `failed`, `unreachable`, or `skipped` result is visible without printing a separate line for every host.

## Dense Output for a Full Playbook

A complete playbook run with dense looks like this simplified representation:

```text
PLAY 1: CONFIGURE WEB SERVERS
task 1: web-01 web-02 web-03 web-04 web-05
task 2: web-01 web-02 web-03 web-04 web-05
changed: web-03: {"changed": true}
task 3: web-01 web-02 web-03 web-04 web-05

PLAY 2: CONFIGURE DATABASE SERVERS
task 1: db-01 db-02
task 2: db-01 db-02
```

The dense callback keeps normal output compact by not printing the standard `PLAY RECAP` in normal verbosity. If you need the per-host summary at the end, run with verbosity enabled.

## Real-Time Progress

One feature that sets dense apart from the minimal and oneline callbacks is real-time progress. During task execution, the dense callback updates the current task line in place. You see hosts appear as they complete:

```text
task 2: web-01 web-02 web-03 web-04
```

This line updates as each host finishes. When all hosts complete, the next task begins below it. This gives you a live view of progress without scrolling through one result line per host.

## When Dense is the Right Choice

Dense is ideal for:

- Inventories with 50+ hosts where default output is overwhelming
- Quick visual confirmation that a playbook is progressing
- Running in a dashboard or monitoring screen where screen space is limited
- Production deployments where you want to see progress without scrolling

Dense is not great for:

- Debugging, because normal verbosity intentionally hides most individual result details
- Small inventories where the default output is fine
- Situations where you need a standard recap or full result data from every host

## Combining Dense with Verbose Mode

Even with the dense callback, verbose flags add more detail:

```bash
# Dense with some verbosity
ANSIBLE_STDOUT_CALLBACK=community.general.dense ansible-playbook site.yml -v
```

At `-v`, the dense callback prints additional result details for non-`ok` results while keeping routine `ok` hosts compact. At `-vv` and higher, it falls back to the default callback behavior, which is better for troubleshooting.

## Dense Callback Configuration

The dense callback uses the standard stdout callback configuration path:

```ini
# ansible.cfg - Dense callback settings
[defaults]
stdout_callback = community.general.dense

# Common callback options documented by Ansible
display_skipped_hosts = false
display_ok_hosts = false
```

These options are configured under `[defaults]`, not under a separate `[callback_dense]` section. They are most relevant when dense is using default-style output at higher verbosity.

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
      community.docker.docker_image:
        name: myapp
        tag: v2.5.1
        source: pull

    - name: Stop current container
      community.docker.docker_container:
        name: myapp
        state: stopped

    - name: Start new container
      community.docker.docker_container:
        name: myapp
        image: myapp:v2.5.1
        state: started
        ports:
          - "8080:8080"

    - name: Wait for health check
      ansible.builtin.uri:
        url: "http://localhost:8080/health"
        status_code: 200
      retries: 10
      delay: 5
      register: health
      until: health.status == 200
```

Dense output during a serial batch is a live host-status line for each task:

```text
PLAY 1: DEPLOY APPLICATION V2.5.1
task 1: web-001 web-002 web-003 web-004 web-005 ... web-025
task 2: web-001 web-002 web-003 web-004 web-005 ... web-025
changed: web-005: {"changed": true}
task 3: web-001 web-002 web-003 web-004 web-005 ... web-025
task 4: web-001 web-002 web-003 web-004 web-005 ... web-025
task 5: web-001 web-002 web-003 web-004 web-005 ... web-025
```

You can watch the deployment progress as hosts report back, while changed or failed results remain visible for follow-up.

## Dense vs Other Compact Callbacks

Comparison of compact callbacks:

- **dense**: One live progress line per task with host names color-coded by result state. Best for large interactive runs.
- **minimal**: Minimal screen output and the default callback for the `ansible` ad hoc command. Best when you want less playbook-style formatting.
- **oneline**: The callback used by the `-o`/`--one-line` option. Best when you want one-line result output.

Dense gives you useful task progress while using very little screen space. Unlike minimal and oneline, it rewrites the current task line as hosts complete.

## Using Dense in Production Operations

For production operations rooms or deployment dashboards, the dense callback provides just enough information:

```bash
#!/bin/bash
# production-deploy.sh - Deploy with dense output for the operations screen
export ANSIBLE_STDOUT_CALLBACK=community.general.dense
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

The dense callback is the sweet spot between too much information (default) and too little (minimal) when you want live progress on a terminal. If you regularly run playbooks against more than a handful of hosts, give it a try. The compact, real-time progress view is genuinely useful during large deployments.
