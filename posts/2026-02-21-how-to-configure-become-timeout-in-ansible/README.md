# How to Configure become Timeout in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Privilege Escalation, Configuration, DevOps

Description: Learn how to configure and tune the become timeout in Ansible to handle slow privilege escalation scenarios and prevent playbook failures.

---

If you have ever run a playbook that sits there for ages waiting on a sudo password prompt before finally dying with a timeout error, you know how frustrating become timeouts can be. The default timeout is often too short for environments where authentication backends (LDAP, Kerberos, or even slow PAM modules) take their sweet time. In this post, I will walk you through every way to configure the become timeout in Ansible so your playbooks stop failing for no good reason.

## What Is the become Timeout?

When Ansible uses `become` to escalate privileges (typically via sudo), it waits for a certain amount of time for the privilege escalation command to complete. If the sudo prompt takes longer than the configured timeout, the task fails. The default timeout is 10 seconds in most Ansible versions.

This timeout is separate from the SSH connection timeout. It specifically controls how long Ansible waits for the become method (sudo, su, pbrun, etc.) to respond.

## Setting the Timeout in ansible.cfg

The most straightforward approach is to set the timeout in your `ansible.cfg` file.

Here is the relevant configuration under the `[defaults]` section:

```ini
# ansible.cfg - Set become timeout to 30 seconds
[defaults]
timeout = 30

[privilege_escalation]
become = true
become_method = sudo
become_user = root
become_ask_pass = false
```

Note that the `timeout` setting under `[defaults]` controls the overall connection timeout, which also affects become operations. For more granular control, you can use environment variables.

## Using Environment Variables

Ansible respects several environment variables that let you override configuration without touching files. This is handy for CI/CD pipelines or one-off runs.

Set the general timeout via environment variable:

```bash
# Set the connection timeout (affects become as well)
export ANSIBLE_TIMEOUT=60

# Run your playbook with the extended timeout
ansible-playbook -i inventory.yml deploy.yml
```

You can also combine this with other become-related environment variables:

```bash
# Configure become settings via environment variables
export ANSIBLE_BECOME=true
export ANSIBLE_BECOME_METHOD=sudo
export ANSIBLE_BECOME_USER=root
export ANSIBLE_TIMEOUT=45

ansible-playbook -i inventory.yml site.yml
```

## Setting Timeout at the Play Level

Sometimes you only need a longer timeout for specific plays rather than globally. You can set connection-level parameters directly in your playbook.

This playbook sets a longer timeout for a play that targets servers with slow LDAP-based sudo:

```yaml
---
# playbook.yml - Play-level timeout configuration
- name: Deploy to servers with slow sudo
  hosts: ldap_servers
  become: true
  become_method: sudo
  become_user: root
  vars:
    ansible_timeout: 60
  tasks:
    - name: Install required packages
      ansible.builtin.yum:
        name:
          - httpd
          - mod_ssl
        state: present

    - name: Start the web server
      ansible.builtin.systemd:
        name: httpd
        state: started
        enabled: true
```

## Task-Level Timeout Configuration

For truly granular control, you can set the timeout on individual tasks. This is useful when most tasks are fine with the default but one specific task consistently needs more time.

Here is how to apply a custom timeout on a single task:

```yaml
---
# playbook.yml - Task-level timeout using vars
- name: Mixed timeout requirements
  hosts: all
  become: true
  tasks:
    - name: Quick task with default timeout
      ansible.builtin.command: whoami

    - name: Slow task that needs a longer timeout
      ansible.builtin.shell: |
        /usr/local/bin/heavy-migration-script.sh
      vars:
        ansible_timeout: 120

    - name: Another quick task
      ansible.builtin.file:
        path: /tmp/deploy-marker
        state: touch
```

## Host-Level Configuration in Inventory

If certain hosts consistently have slow privilege escalation (for example, servers authenticating against a remote LDAP directory), you can set the timeout per host or per group in your inventory.

Here is an inventory file with group-specific timeout values:

```yaml
# inventory.yml - Per-group timeout settings
all:
  children:
    fast_servers:
      hosts:
        web01:
        web02:
      vars:
        ansible_timeout: 10
    slow_servers:
      hosts:
        legacy01:
        legacy02:
      vars:
        ansible_timeout: 60
        ansible_become_method: su
```

## Configuring Timeout for Different become Methods

Different become methods may have very different performance characteristics. For example, `su` typically prompts for a password interactively, while `sudo` can be configured for passwordless access. `pbrun` and `dzdo` may call out to external authorization servers.

Here is a playbook that handles multiple become methods with appropriate timeouts:

```yaml
---
# playbook.yml - Different become methods with tuned timeouts
- name: Configure servers using sudo
  hosts: sudo_hosts
  become: true
  become_method: sudo
  vars:
    ansible_timeout: 15
  tasks:
    - name: Ensure NTP is installed
      ansible.builtin.package:
        name: chrony
        state: present

- name: Configure servers using pbrun
  hosts: pbrun_hosts
  become: true
  become_method: pbrun
  vars:
    ansible_timeout: 90
  tasks:
    - name: Ensure NTP is installed
      ansible.builtin.package:
        name: chrony
        state: present
```

## Debugging Timeout Issues

When you are not sure whether the timeout is the actual problem, increase verbosity and the timeout together to see what is going on.

Run your playbook with verbose output to diagnose timeout problems:

```bash
# Run with maximum verbosity and an extended timeout
ANSIBLE_TIMEOUT=120 ansible-playbook -i inventory.yml site.yml -vvvv
```

The `-vvvv` output will show you exactly what Ansible is sending to the remote host, including the become command. Look for lines that mention "privilege escalation" or "timeout" in the output.

You can also create a small test playbook to isolate timeout behavior:

```yaml
---
# test-become-timeout.yml - Simple timeout test
- name: Test become timeout
  hosts: problematic_host
  become: true
  gather_facts: false
  vars:
    ansible_timeout: 5
  tasks:
    - name: Simple whoami to test become
      ansible.builtin.command: whoami
      register: result

    - name: Show the result
      ansible.builtin.debug:
        msg: "Running as: {{ result.stdout }}"
```

Run this test with a very short timeout first, then gradually increase it to find the sweet spot:

```bash
# Test with 5 seconds
ANSIBLE_TIMEOUT=5 ansible-playbook -i inventory.yml test-become-timeout.yml -v

# If that fails, try 15 seconds
ANSIBLE_TIMEOUT=15 ansible-playbook -i inventory.yml test-become-timeout.yml -v

# If that also fails, try 30 seconds
ANSIBLE_TIMEOUT=30 ansible-playbook -i inventory.yml test-become-timeout.yml -v
```

## Practical Recommendations

Based on my experience managing fleets of servers across different environments, here are some guidelines for setting become timeouts:

- **Local sudo with NOPASSWD**: 10 seconds (the default) is usually plenty.
- **Sudo with password prompt**: 15 to 20 seconds gives enough buffer for password delivery via `become_pass`.
- **LDAP/AD-backed sudo**: 30 to 60 seconds, depending on network latency to the directory server.
- **PowerBroker or Centrify**: 60 to 120 seconds, since these often call external authorization services.
- **CI/CD pipelines**: Always set an explicit timeout rather than relying on defaults. 30 seconds is a safe starting point.

## Configuration Precedence

Ansible evaluates timeout settings in a specific order of precedence. Understanding this order helps you avoid confusion when settings seem to be ignored.

The precedence from highest to lowest is:

1. Task-level `vars` (highest priority)
2. Play-level `vars`
3. Host/group variables in inventory
4. Environment variables (`ANSIBLE_TIMEOUT`)
5. `ansible.cfg` settings (lowest priority)

This means a task-level `ansible_timeout: 120` will always override a global `ANSIBLE_TIMEOUT=30` environment variable.

## Wrapping Up

Become timeout issues are one of those problems that only show up in production, never in your local test environment with three VMs. Setting the right timeout is a balance between waiting long enough for legitimate delays and failing fast enough to catch real problems. Start with the defaults, monitor your playbook runs, and adjust per-host or per-group when you identify slow spots. And always remember to check whether the real problem is a misconfigured sudoers file or a down LDAP server before just cranking up the timeout.
