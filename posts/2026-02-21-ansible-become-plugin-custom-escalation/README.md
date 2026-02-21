# How to Create a Become Plugin for Custom Privilege Escalation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Security, Privilege Escalation, Python

Description: Build Ansible become plugins that integrate with enterprise privilege access management tools like CyberArk, BeyondTrust, and custom PAM wrappers.

---

Enterprise environments often use specialized privilege access management (PAM) tools instead of plain sudo. Tools like CyberArk, BeyondTrust, Thycotic, and custom PAM wrappers add audit logging, just-in-time credentials, and approval workflows around privilege escalation. A custom become plugin lets Ansible work with these systems natively.

This guide builds become plugins for two common scenarios: a custom PAM wrapper and integration with a just-in-time credential vault.

## Custom PAM Wrapper Plugin

Many organizations deploy a wrapper script around sudo that adds audit logging and policy checks. Let us call it `pamsudo`, which works like this:

```bash
pamsudo --user root --ticket JIRA-1234 --ttl 3600 -- <command>
```

Create `become_plugins/pamsudo.py`:

```python
# pamsudo.py - Become plugin for PAM-wrapped sudo
from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = """
    name: pamsudo
    short_description: PAM-wrapped sudo privilege escalation
    description:
        - Uses the organization's pamsudo wrapper for privilege escalation.
        - Supports audit ticket tracking and time-limited sessions.
    options:
      become_user:
        description: User to escalate to.
        default: root
        vars:
          - name: ansible_become_user
        env:
          - name: ANSIBLE_BECOME_USER
      become_pass:
        description: Password for authentication.
        vars:
          - name: ansible_become_password
      become_flags:
        description: Additional flags for pamsudo.
        default: ''
        vars:
          - name: ansible_become_flags
      ticket:
        description: Change ticket number for audit trail.
        type: str
        default: ''
        vars:
          - name: ansible_pamsudo_ticket
        env:
          - name: ANSIBLE_PAMSUDO_TICKET
      ttl:
        description: Session time-to-live in seconds.
        type: int
        default: 3600
        vars:
          - name: ansible_pamsudo_ttl
        env:
          - name: ANSIBLE_PAMSUDO_TTL
      binary_path:
        description: Path to the pamsudo binary.
        type: str
        default: /usr/local/bin/pamsudo
        vars:
          - name: ansible_pamsudo_path
        env:
          - name: ANSIBLE_PAMSUDO_PATH
"""

from ansible.plugins.become import BecomeBase
from ansible.module_utils.six.moves import shlex_quote


class BecomeModule(BecomeBase):
    name = 'pamsudo'

    # Prompt pattern pamsudo displays when asking for a password
    prompt = 'pamsudo password for'
    # Patterns that indicate authentication failure
    fail = (
        'pamsudo: authentication failed',
        'pamsudo: policy denied',
        'pamsudo: ticket required',
        'pamsudo: session expired',
    )
    success = ('pamsudo: session established',)

    def build_become_command(self, cmd, shell):
        super(BecomeModule, self).build_become_command(cmd, shell)

        if not cmd:
            return cmd

        become_user = self.get_option('become_user') or 'root'
        flags = self.get_option('become_flags') or ''
        ticket = self.get_option('ticket')
        ttl = self.get_option('ttl')
        binary = self.get_option('binary_path')

        # Build the pamsudo command
        become_cmd = shlex_quote(binary)
        become_cmd += ' --user %s' % shlex_quote(become_user)

        if ticket:
            become_cmd += ' --ticket %s' % shlex_quote(ticket)

        become_cmd += ' --ttl %d' % ttl

        if flags:
            become_cmd += ' %s' % flags

        # Password handling: -S reads from stdin
        if self.get_option('become_pass'):
            become_cmd += ' -S'

        become_cmd += ' -- %s' % cmd

        return become_cmd
```

## Just-in-Time Credential Plugin

This plugin integrates with a credential vault that issues temporary passwords. The flow is: request a temporary credential from the vault, then use sudo with that credential.

Create `become_plugins/jit_sudo.py`:

```python
# jit_sudo.py - Become plugin with just-in-time credential retrieval
from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = """
    name: jit_sudo
    short_description: JIT credential sudo privilege escalation
    description:
        - Retrieves a temporary password from a credential vault
          and uses it with sudo for privilege escalation.
        - Credentials are checked out for the duration of the play
          and checked back in when done.
    options:
      become_user:
        description: User to escalate to.
        default: root
        vars:
          - name: ansible_become_user
      vault_url:
        description: Credential vault API URL.
        type: str
        required: true
        vars:
          - name: ansible_jit_vault_url
        env:
          - name: JIT_VAULT_URL
      vault_token:
        description: Authentication token for the vault.
        type: str
        required: true
        vars:
          - name: ansible_jit_vault_token
        env:
          - name: JIT_VAULT_TOKEN
        no_log: true
      account_id:
        description: Vault account ID to check out credentials for.
        type: str
        vars:
          - name: ansible_jit_account_id
        env:
          - name: JIT_ACCOUNT_ID
      checkout_duration:
        description: How long to check out the credential (minutes).
        type: int
        default: 60
        vars:
          - name: ansible_jit_checkout_duration
"""

import json
from ansible.plugins.become import BecomeBase
from ansible.module_utils.six.moves import shlex_quote
from ansible.module_utils.urls import open_url
from ansible.utils.display import Display
from ansible.errors import AnsibleError

display = Display()


class BecomeModule(BecomeBase):
    name = 'jit_sudo'

    prompt = '[sudo] password for'
    fail = ('Sorry, try again', 'sudo: 3 incorrect password attempts')
    success = ()

    _jit_password = None
    _checkout_id = None

    def build_become_command(self, cmd, shell):
        super(BecomeModule, self).build_become_command(cmd, shell)

        if not cmd:
            return cmd

        # Retrieve the JIT credential if we have not already
        if self._jit_password is None:
            self._checkout_credential()

        become_user = self.get_option('become_user') or 'root'

        # Standard sudo command, password will be supplied by Ansible
        become_cmd = 'sudo -H -S -n'
        become_cmd += ' -u %s' % shlex_quote(become_user)
        become_cmd += ' %s' % cmd

        return become_cmd

    def _checkout_credential(self):
        """Check out a temporary credential from the vault."""
        vault_url = self.get_option('vault_url')
        vault_token = self.get_option('vault_token')
        account_id = self.get_option('account_id')
        duration = self.get_option('checkout_duration')

        if not vault_url or not vault_token:
            raise AnsibleError(
                "jit_sudo: vault_url and vault_token are required. "
                "Set JIT_VAULT_URL and JIT_VAULT_TOKEN environment variables."
            )

        display.vv("jit_sudo: checking out credential from %s" % vault_url)

        url = '%s/api/v1/credentials/checkout' % vault_url.rstrip('/')
        headers = {
            'Authorization': 'Bearer %s' % vault_token,
            'Content-Type': 'application/json',
        }
        payload = json.dumps({
            'account_id': account_id,
            'duration_minutes': duration,
            'reason': 'ansible-automation',
        })

        try:
            response = open_url(
                url, data=payload, headers=headers,
                method='POST', timeout=30,
            )
            result = json.loads(response.read())
            self._jit_password = result['password']
            self._checkout_id = result.get('checkout_id')
            display.vv("jit_sudo: credential checked out (checkout_id: %s)" % self._checkout_id)
        except Exception as e:
            raise AnsibleError(
                "jit_sudo: failed to check out credential: %s" % str(e)
            )

    def get_option(self, option):
        """Override to intercept become_pass and supply JIT password."""
        if option == 'become_pass' and self._jit_password:
            return self._jit_password
        return super(BecomeModule, self).get_option(option)
```

## Usage Examples

### Using pamsudo

```yaml
---
# deploy_with_pamsudo.yml
- name: Deploy with PAM-audited privilege escalation
  hosts: production_servers
  become: true
  become_method: pamsudo

  vars:
    ansible_pamsudo_ticket: "DEPLOY-2025-0142"
    ansible_pamsudo_ttl: 7200

  tasks:
    - name: Stop application
      ansible.builtin.systemd:
        name: myapp
        state: stopped

    - name: Deploy new version
      ansible.builtin.unarchive:
        src: /releases/myapp-2.5.tar.gz
        dest: /opt/myapp/
        remote_src: true

    - name: Start application
      ansible.builtin.systemd:
        name: myapp
        state: started
```

### Per-host Configuration

```yaml
# inventory/group_vars/production.yml
ansible_become: true
ansible_become_method: pamsudo
ansible_pamsudo_ticket: "{{ lookup('env', 'CHANGE_TICKET') }}"
ansible_become_password: "{{ vault_pamsudo_password }}"
```

### Using JIT credentials

```yaml
---
# secure_maintenance.yml
- name: Perform maintenance with JIT credentials
  hosts: secure_servers
  become: true
  become_method: jit_sudo

  vars:
    ansible_jit_vault_url: "https://vault.myorg.com"
    ansible_jit_vault_token: "{{ lookup('env', 'JIT_VAULT_TOKEN') }}"
    ansible_jit_account_id: "linux-root-{{ inventory_hostname }}"
    ansible_jit_checkout_duration: 30

  tasks:
    - name: Apply security patches
      ansible.builtin.yum:
        name: '*'
        state: latest
        security: true

    - name: Reboot if needed
      ansible.builtin.reboot:
      when: yum_result.changed
```

## Error Handling Patterns

The `fail` tuple in your become plugin defines patterns that indicate authentication failure. Ansible watches the command output for these strings:

```python
# Comprehensive failure detection
fail = (
    'authentication failed',
    'policy denied',
    'ticket expired',
    'session limit exceeded',
    'account locked',
    'insufficient privileges',
)
```

When Ansible detects a failure pattern, it reports a clear authentication failure instead of a generic error.

## Summary

Custom become plugins let Ansible integrate with enterprise PAM tools, credential vaults, and any privilege escalation system. The plugin interface is straightforward: override `build_become_command()` to construct the escalation command, set `prompt`/`fail`/`success` patterns for interactive authentication, and use plugin options for configuration. Whether you need audit trails with change ticket tracking, just-in-time credentials from a vault, or integration with commercial PAM products, the become plugin system handles it cleanly.
