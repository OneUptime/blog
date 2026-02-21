# How to Use the Ansible dense Callback Plugin for Compact Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Output Formatting, DevOps

Description: Learn how to use the Ansible dense callback plugin to get compact, one-line-per-task output that works well for large inventories and CI/CD pipelines.

---

When you run an Ansible playbook against dozens or hundreds of hosts, the default output quickly becomes overwhelming. Each task produces multiple lines per host, and scrolling through thousands of lines to find the one failure is painful. The `dense` callback plugin condenses Ansible output to one line per task with a compact status summary, making it much easier to monitor large playbook runs.

## What the dense Plugin Does

The dense callback plugin replaces the default multi-line output with a single-line-per-task format. Instead of seeing every host result individually, you see a compact summary of how many hosts succeeded, changed, failed, or were skipped.

## Enabling the dense Callback

### Via ansible.cfg

```ini
# ansible.cfg
[defaults]
stdout_callback = dense
```

### Via Environment Variable

```bash
# For a single run
ANSIBLE_STDOUT_CALLBACK=dense ansible-playbook deploy.yml

# For the current shell session
export ANSIBLE_STDOUT_CALLBACK=dense
ansible-playbook deploy.yml
```

## Comparing Output: Default vs Dense

Here is a playbook running against 5 hosts:

```yaml
---
- name: Configure web servers
  hosts: webservers
  become: true

  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present

    - name: Deploy configuration
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf

    - name: Start nginx
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true
```

### Default Output (verbose, multi-line)

```
PLAY [Configure web servers] **************************************************

TASK [Gathering Facts] ********************************************************
ok: [web-01]
ok: [web-02]
ok: [web-03]
ok: [web-04]
ok: [web-05]

TASK [Install nginx] **********************************************************
ok: [web-01]
changed: [web-02]
ok: [web-03]
changed: [web-04]
ok: [web-05]

TASK [Deploy configuration] ***************************************************
changed: [web-01]
changed: [web-02]
changed: [web-03]
changed: [web-04]
changed: [web-05]

TASK [Start nginx] ************************************************************
ok: [web-01]
changed: [web-02]
ok: [web-03]
changed: [web-04]
ok: [web-05]

PLAY RECAP ********************************************************************
web-01  : ok=4    changed=1    unreachable=0    failed=0    skipped=0
web-02  : ok=4    changed=3    unreachable=0    failed=0    skipped=0
web-03  : ok=4    changed=1    unreachable=0    failed=0    skipped=0
web-04  : ok=4    changed=3    unreachable=0    failed=0    skipped=0
web-05  : ok=4    changed=1    unreachable=0    failed=0    skipped=0
```

That is 30+ lines for just 3 tasks on 5 hosts. Imagine 50 tasks on 100 hosts.

### Dense Output (compact, one-line)

```
PLAY [Configure web servers] **************************************************
TASK [Gathering Facts]       ok=5    changed=0    unreachable=0    failed=0
TASK [Install nginx]         ok=3    changed=2    unreachable=0    failed=0
TASK [Deploy configuration]  ok=0    changed=5    unreachable=0    failed=0
TASK [Start nginx]           ok=3    changed=2    unreachable=0    failed=0

PLAY RECAP ********************************************************************
web-01  : ok=4    changed=1    unreachable=0    failed=0    skipped=0
web-02  : ok=4    changed=3    unreachable=0    failed=0    skipped=0
web-03  : ok=4    changed=1    unreachable=0    failed=0    skipped=0
web-04  : ok=4    changed=3    unreachable=0    failed=0    skipped=0
web-05  : ok=4    changed=1    unreachable=0    failed=0    skipped=0
```

The task section is now just 4 lines instead of 20. At scale, this difference is enormous.

## How Dense Handles Failures

When a task fails on some hosts, the dense output highlights it clearly:

```
TASK [Deploy configuration]  ok=3    changed=0    unreachable=0    failed=2
  FAILED: web-03 - msg: "Could not find template 'nginx.conf.j2'"
  FAILED: web-04 - msg: "Could not find template 'nginx.conf.j2'"
```

Failed hosts get their own lines with the error message, so you can immediately see which hosts failed and why, without scrolling through successful hosts.

## When to Use dense

The dense callback is ideal for:

**Large Inventories**: When you are managing 50+ hosts, the per-host output from the default callback is unmanageable. Dense gives you a clear overview.

**CI/CD Pipelines**: Pipeline logs have limited screen space. Dense output fits more information in less space, and most CI systems show the last N lines of output when a job fails.

**Monitoring Dashboards**: If you are tailing Ansible output on a monitoring screen, dense keeps the display clean.

**Routine Maintenance Runs**: When you are running well-tested playbooks and just need to verify they completed successfully.

## When Not to Use dense

Dense is not the best choice when:

- You are developing or debugging a playbook (use `yaml` or `debug` callback instead)
- You need to see per-host variable values or task results
- You are troubleshooting a specific host issue
- You need the full JSON/YAML output for programmatic processing

## Combining dense with Other Settings

You can fine-tune the dense output with other Ansible settings:

```ini
# ansible.cfg
[defaults]
stdout_callback = dense

# Hide skipped hosts for even cleaner output
display_skipped_hosts = false

# Enable additional (non-stdout) callback plugins alongside dense
callbacks_enabled = timer, profile_tasks
```

With `timer` and `profile_tasks` enabled alongside dense, you get timing information at the end:

```
PLAY [Configure web servers] **************************************************
TASK [Gathering Facts]       ok=5    changed=0    unreachable=0    failed=0
TASK [Install nginx]         ok=3    changed=2    unreachable=0    failed=0
TASK [Deploy configuration]  ok=0    changed=5    unreachable=0    failed=0
TASK [Start nginx]           ok=3    changed=2    unreachable=0    failed=0

PLAY RECAP ********************************************************************
web-01  : ok=4    changed=1    unreachable=0    failed=0    skipped=0
web-02  : ok=4    changed=3    unreachable=0    failed=0    skipped=0
web-03  : ok=4    changed=1    unreachable=0    failed=0    skipped=0
web-04  : ok=4    changed=3    unreachable=0    failed=0    skipped=0
web-05  : ok=4    changed=1    unreachable=0    failed=0    skipped=0

Wednesday 21 February 2026  10:15:00 +0000 (0:00:01.234) 0:02:34.567 *********
===============================================================================
Install nginx --------------------------------------------------------- 45.23s
Deploy configuration -------------------------------------------------- 12.34s
Start nginx ------------------------------------------------------------ 5.67s
Gathering Facts -------------------------------------------------------- 3.45s

Playbook run took 0 days, 0 hours, 1 minutes, 6 seconds
```

## Using dense for Specific Runs

If you normally use the `yaml` callback but want dense for a specific large-scale run:

```bash
# Override the default callback for this run only
ANSIBLE_STDOUT_CALLBACK=dense ansible-playbook patch-all-servers.yml
```

This lets you keep the more detailed `yaml` output as your default while using dense when you need it.

## Practical Example: Patching 100 Servers

Here is where dense really shines. Consider a patching playbook:

```yaml
---
- name: Patch all servers
  hosts: all
  become: true
  serial: 20

  tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600

    - name: Upgrade all packages
      ansible.builtin.apt:
        upgrade: safe
      register: upgrade_result

    - name: Check if reboot is needed
      ansible.builtin.stat:
        path: /var/run/reboot-required
      register: reboot_file

    - name: Reboot if required
      ansible.builtin.reboot:
        msg: "Reboot for kernel updates"
        reboot_timeout: 300
      when: reboot_file.stat.exists

    - name: Verify system is healthy
      ansible.builtin.command:
        cmd: systemctl is-system-running
      register: system_health
      changed_when: false
      failed_when: system_health.stdout not in ['running', 'degraded']
```

With 100 servers and `serial: 20`, the default callback would produce thousands of lines. With dense, you get a clean summary for each batch:

```
PLAY [Patch all servers] ******************************************************

Batch 1/5:
TASK [Update apt cache]           ok=20   changed=0    unreachable=0    failed=0
TASK [Upgrade all packages]       ok=3    changed=17   unreachable=0    failed=0
TASK [Check if reboot is needed]  ok=20   changed=0    unreachable=0    failed=0
TASK [Reboot if required]         ok=0    changed=8    unreachable=0    failed=0    skipped=12
TASK [Verify system is healthy]   ok=20   changed=0    unreachable=0    failed=0

Batch 2/5:
TASK [Update apt cache]           ok=20   changed=0    unreachable=0    failed=0
TASK [Upgrade all packages]       ok=5    changed=15   unreachable=0    failed=0
...
```

At a glance you can see that 17 out of 20 servers in the first batch had packages to upgrade, and 8 needed a reboot. All 20 came back healthy after.

## Alternative: The minimal Callback

If you want even less output than dense, the `minimal` callback shows only the host and status:

```bash
ANSIBLE_STDOUT_CALLBACK=minimal ansible-playbook deploy.yml
```

Output:

```
web-01 | CHANGED
web-02 | CHANGED
web-03 | FAILED! => {"msg": "..."}
```

Minimal is too sparse for most use cases, but it can be useful for simple one-off commands.

## Switching Between Callbacks

A pattern I use is setting up shell aliases for different output modes:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias ansible-playbook-dense='ANSIBLE_STDOUT_CALLBACK=dense ansible-playbook'
alias ansible-playbook-yaml='ANSIBLE_STDOUT_CALLBACK=yaml ansible-playbook'
alias ansible-playbook-json='ANSIBLE_STDOUT_CALLBACK=json ansible-playbook'
```

Then use them based on the situation:

```bash
# Development and debugging
ansible-playbook-yaml deploy.yml

# Large-scale operations
ansible-playbook-dense patch-all.yml

# CI/CD pipeline results
ansible-playbook-json deploy.yml > results.json
```

## Summary

The dense callback plugin is the right choice for large-scale Ansible operations where per-host output becomes unmanageable. It gives you one line per task with aggregate counts for ok, changed, unreachable, and failed, while still showing individual error details when something goes wrong. Pair it with `timer` and `profile_tasks` for a complete operational view. Keep your detailed callback (yaml or debug) as the default for development, and switch to dense when running against large inventories.
