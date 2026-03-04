# How to Create a Custom Ansible Become Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Security, Privilege Escalation, Python

Description: Learn how to write a custom Ansible become plugin for privilege escalation methods beyond sudo, su, and the built-in options.

---

Ansible's become system handles privilege escalation on remote hosts. Out of the box you get `sudo`, `su`, `pbrun`, `pfexec`, `doas`, `dzdo`, and a few others. But what if your organization uses a custom privilege escalation tool, or you need to integrate with a PAM-based system that has its own CLI wrapper? That is where custom become plugins come in.

A become plugin tells Ansible how to wrap commands so they run with elevated privileges on the target host. This guide walks through building one from scratch.

## How Become Plugins Work

When Ansible needs to run a command as a different user, it wraps that command using the become plugin. The plugin generates a command string that includes the escalation tool, the target user, and any required flags. For example, the built-in `sudo` become plugin transforms `whoami` into something like `sudo -H -S -n -u root whoami`.

The plugin also handles password prompts. If the escalation tool asks for a password, the plugin defines what prompt pattern to look for so Ansible can supply the become password automatically.

## The Base Class

All become plugins inherit from `BecomeBase` in `ansible.plugins.become`. The key method you override is `build_become_command(cmd, shell)`, which takes the original command and returns the wrapped version.

## Building a Custom Become Plugin

Let us build a become plugin for a hypothetical tool called `privrun`. This is a tool that wraps commands with `privrun --user <user> --reason <reason> -- <command>`.

Create `become_plugins/privrun.py`:

```python
# privrun.py - Custom become plugin for the privrun privilege escalation tool
from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = """
    name: privrun
    short_description: Privilege escalation using privrun
    description:
        - This become plugin allows Ansible to use privrun for
          privilege escalation on remote hosts.
    author: Your Name
    options:
      become_user:
        description: User to escalate to
        default: root
        ini:
          - section: privilege_escalation
            key: become_user
        vars:
          - name: ansible_become_user
        env:
          - name: ANSIBLE_BECOME_USER
      become_pass:
        description: Password for privrun authentication
        vars:
          - name: ansible_become_password
          - name: ansible_become_pass
      become_flags:
        description: Additional flags to pass to privrun
        default: ''
        ini:
          - section: privilege_escalation
            key: become_flags
        vars:
          - name: ansible_become_flags
        env:
          - name: ANSIBLE_BECOME_FLAGS
      reason:
        description: Reason for privilege escalation (audit trail)
        default: 'ansible-automation'
        vars:
          - name: ansible_privrun_reason
        env:
          - name: ANSIBLE_PRIVRUN_REASON
        ini:
          - section: privrun
            key: reason
"""

from ansible.plugins.become import BecomeBase
from ansible.module_utils.six.moves import shlex_quote


class BecomeModule(BecomeBase):
    """Become plugin for privrun privilege escalation."""

    name = 'privrun'

    # The prompt that privrun displays when asking for a password
    prompt = 'privrun password:'
    # Pattern to detect authentication failure
    fail = ('Authentication failed', 'Permission denied', 'privrun: error')
    # Pattern to detect successful escalation
    success = ('privrun: authenticated',)

    def build_become_command(self, cmd, shell):
        """Build the privrun command wrapper."""
        super(BecomeModule, self).build_become_command(cmd, shell)

        # If no command provided, nothing to wrap
        if not cmd:
            return cmd

        # Get configuration options
        become_user = self.get_option('become_user') or 'root'
        flags = self.get_option('become_flags') or ''
        reason = self.get_option('reason') or 'ansible-automation'

        # Build the privrun command
        # privrun --user root --reason "ansible-automation" -- /bin/sh -c "actual command"
        become_cmd = 'privrun'
        become_cmd += ' --user %s' % shlex_quote(become_user)
        become_cmd += ' --reason %s' % shlex_quote(reason)

        if flags:
            become_cmd += ' %s' % flags

        # The -- separates privrun flags from the command to execute
        become_cmd += ' -- %s' % cmd

        return become_cmd
```

## Using the Custom Become Plugin

First, make sure your `ansible.cfg` knows where to find the plugin:

```ini
# ansible.cfg
[defaults]
become_plugins = ./become_plugins

[privilege_escalation]
become = true
become_method = privrun
become_user = root
```

Now use it in a playbook:

```yaml
---
# escalate_with_privrun.yml - Use privrun for privilege escalation
- name: Run tasks with privrun escalation
  hosts: secure_servers
  become: true
  become_method: privrun

  vars:
    ansible_privrun_reason: "patch-deployment-2024"

  tasks:
    - name: Install security updates
      ansible.builtin.yum:
        name: '*'
        state: latest
        security: true

    - name: Restart httpd service
      ansible.builtin.systemd:
        name: httpd
        state: restarted
```

You can also set the become method per task:

```yaml
  tasks:
    - name: Regular task with sudo
      ansible.builtin.command: whoami
      become: true
      become_method: sudo

    - name: Sensitive task with privrun
      ansible.builtin.command: cat /etc/shadow
      become: true
      become_method: privrun
      vars:
        ansible_privrun_reason: "security-audit"
```

## Handling Password Prompts

The `prompt` attribute in your become plugin tells Ansible what to look for when the escalation tool asks for a password. Ansible watches the command output for this string and sends the become password when it sees it.

If your tool has a more complex prompt, you can use a regular expression:

```python
class BecomeModule(BecomeBase):
    name = 'privrun'

    # Use a regex pattern for the prompt
    prompt = r'privrun password for \w+:'
    fail = ('Authentication failed', 'Permission denied')
    success = ('privrun: authenticated',)
```

To pass the password, set it in your inventory or at runtime:

```yaml
# group_vars/secure_servers.yml
ansible_become_password: "{{ vault_privrun_password }}"
```

Or prompt at runtime:

```bash
ansible-playbook playbooks/escalate_with_privrun.yml --ask-become-pass
```

## A Real-World Example: CyberArk PSM Become Plugin

Here is a more realistic example that integrates with a password vault for just-in-time credentials:

```python
# cyberark_become.py - Become plugin that fetches credentials from a vault
from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = """
    name: cyberark_become
    short_description: Privilege escalation with CyberArk credential retrieval
    description:
        - Fetches temporary sudo credentials from CyberArk before escalating.
    options:
      become_user:
        description: User to escalate to
        default: root
        vars:
          - name: ansible_become_user
      vault_url:
        description: CyberArk vault API endpoint
        vars:
          - name: ansible_cyberark_vault_url
        env:
          - name: CYBERARK_VAULT_URL
      vault_app_id:
        description: Application ID for CyberArk authentication
        vars:
          - name: ansible_cyberark_app_id
        env:
          - name: CYBERARK_APP_ID
"""

import json
from ansible.plugins.become import BecomeBase
from ansible.module_utils.six.moves import shlex_quote
from ansible.module_utils.urls import open_url


class BecomeModule(BecomeBase):
    name = 'cyberark_become'
    prompt = '[sudo] password for'
    fail = ('Sorry, try again', 'sudo: 3 incorrect password attempts')

    def build_become_command(self, cmd, shell):
        super(BecomeModule, self).build_become_command(cmd, shell)

        if not cmd:
            return cmd

        become_user = self.get_option('become_user') or 'root'

        # Standard sudo wrapping (credentials are fetched separately)
        become_cmd = 'sudo -H -S -n'
        become_cmd += ' -u %s' % shlex_quote(become_user)
        become_cmd += ' %s' % cmd

        return become_cmd
```

## Testing Your Become Plugin

You can test the command generation without running it on a real host:

```python
# test_privrun_become.py - Test the become plugin command generation
import sys
sys.path.insert(0, './become_plugins')

from privrun import BecomeModule

# Create an instance and test build_become_command
plugin = BecomeModule()

# Mock the options
plugin._options = {
    'become_user': 'root',
    'become_flags': '',
    'reason': 'test-run',
}

# Override get_option for testing
original_get_option = plugin.get_option
plugin.get_option = lambda key: plugin._options.get(key, '')

cmd = plugin.build_become_command('/bin/whoami', None)
print(f"Generated command: {cmd}")
assert 'privrun' in cmd
assert '--user' in cmd
assert '--reason' in cmd
print("Tests passed")
```

## Plugin Discovery

For Ansible to find your become plugin, it needs to be in one of these locations:

1. A directory specified in `become_plugins` in `ansible.cfg`
2. The `~/.ansible/plugins/become/` directory
3. Inside a collection at `plugins/become/`
4. Specified via the `ANSIBLE_BECOME_PLUGINS` environment variable

## Summary

Custom become plugins let you integrate Ansible with any privilege escalation system your organization uses. The plugin interface is clean: override `build_become_command` to wrap commands, set `prompt`/`fail`/`success` patterns for password handling, and define your options in the `DOCUMENTATION` string. Whether you are integrating with PAM wrappers, commercial IAM tools, or homegrown solutions, the become plugin system gives you full control over how Ansible escalates privileges.
