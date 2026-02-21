# How to Use Ansible Vault with no_log for Double Protection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Vault, Security, DevOps, Secrets Management

Description: Learn how to combine Ansible Vault encryption with the no_log directive to protect sensitive data both at rest and during playbook execution output.

---

If you have been working with Ansible for any length of time, you have probably used Ansible Vault to encrypt sensitive variables. That is step one. But there is a second layer of protection that many teams overlook: the `no_log` directive. Without it, your decrypted secrets can show up in plain text in Ansible's output logs, which defeats the purpose of encrypting them in the first place.

This post walks through how to combine both techniques so your secrets stay hidden at every stage of the automation pipeline.

## The Problem: Vault Alone Is Not Enough

Ansible Vault encrypts your variables at rest. When a playbook runs, Ansible decrypts those values in memory and uses them. That part is fine. The issue is that Ansible, by default, logs the results of each task to stdout. If a task uses a vaulted variable, the decrypted value can appear in the task output.

Here is a quick example. Say you have a vaulted variable for a database password:

```yaml
# group_vars/all/vault.yml (encrypted with ansible-vault)
vault_db_password: "SuperSecret123!"
```

And a playbook task that uses it:

```yaml
# playbook.yml - This task will leak the password in output
- name: Configure database connection
  ansible.builtin.template:
    src: db_config.j2
    dest: /etc/app/db.conf
  vars:
    db_password: "{{ vault_db_password }}"
```

When you run this playbook with `-v` or even without verbose mode in some cases, the password can appear in the output. If you are piping Ansible output to a CI/CD log, that secret is now sitting in your build logs for anyone with access to read.

## What no_log Does

The `no_log` directive tells Ansible to suppress the output of a specific task. When set to `true`, Ansible replaces the task output with a censored message instead of showing the actual values.

Here is the same task with `no_log` applied:

```yaml
# playbook.yml - Password is now hidden from output
- name: Configure database connection
  ansible.builtin.template:
    src: db_config.j2
    dest: /etc/app/db.conf
  vars:
    db_password: "{{ vault_db_password }}"
  no_log: true
```

Now the output will show something like:

```
TASK [Configure database connection] *******
ok: [webserver1] => {"censored": "the output has been hidden due to the fact that 'no_log: true' was specified for this result"}
```

## Combining Vault and no_log: A Complete Example

Let me walk through a realistic scenario. You need to deploy an application that requires a database password, an API key, and an SSL certificate passphrase.

First, create the vault file:

```bash
# Create an encrypted vault file for your secrets
ansible-vault create group_vars/all/vault.yml
```

Inside that file, define your secrets:

```yaml
# group_vars/all/vault.yml - encrypted at rest
vault_db_password: "prod-db-xK9#mP2$"
vault_api_key: "sk-live-abc123def456"
vault_ssl_passphrase: "cert-unlock-phrase-2024"
```

Next, create a variables file that references the vault values. This pattern keeps your variable names clean and makes it obvious which values come from the vault:

```yaml
# group_vars/all/vars.yml - references to vault values
db_password: "{{ vault_db_password }}"
api_key: "{{ vault_api_key }}"
ssl_passphrase: "{{ vault_ssl_passphrase }}"
```

Now write the playbook with `no_log` on every task that touches secrets:

```yaml
# deploy-app.yml - every sensitive task has no_log: true
---
- name: Deploy application with secrets
  hosts: app_servers
  become: true

  tasks:
    # This task handles the database config file
    - name: Deploy database configuration
      ansible.builtin.template:
        src: templates/db.conf.j2
        dest: /etc/myapp/db.conf
        owner: myapp
        group: myapp
        mode: "0600"
      no_log: true

    # This task sets the API key as an environment variable
    - name: Set API key in environment file
      ansible.builtin.lineinfile:
        path: /etc/myapp/env
        regexp: "^API_KEY="
        line: "API_KEY={{ api_key }}"
        owner: myapp
        group: myapp
        mode: "0600"
      no_log: true

    # This task deploys the SSL certificate
    - name: Deploy SSL certificate with passphrase
      ansible.builtin.copy:
        content: |
          ssl_passphrase={{ ssl_passphrase }}
        dest: /etc/myapp/ssl.conf
        owner: root
        group: root
        mode: "0600"
      no_log: true

    # This task does NOT need no_log because it has no secrets
    - name: Restart application service
      ansible.builtin.systemd:
        name: myapp
        state: restarted
        enabled: true
```

## Using no_log with a Variable for Flexibility

Hardcoding `no_log: true` everywhere works, but sometimes you want to disable it during debugging. You can use a variable to toggle it:

```yaml
# Toggle no_log on and off for debugging
---
- name: Deploy with toggleable logging
  hosts: app_servers
  vars:
    hide_secrets: true  # Set to false when debugging

  tasks:
    - name: Deploy database configuration
      ansible.builtin.template:
        src: templates/db.conf.j2
        dest: /etc/myapp/db.conf
        mode: "0600"
      no_log: "{{ hide_secrets }}"

    - name: Set API credentials
      ansible.builtin.lineinfile:
        path: /etc/myapp/env
        regexp: "^API_KEY="
        line: "API_KEY={{ api_key }}"
      no_log: "{{ hide_secrets }}"
```

To debug, override the variable at runtime:

```bash
# Run with secrets visible for troubleshooting (only in dev!)
ansible-playbook deploy-app.yml -e "hide_secrets=false" --ask-vault-pass
```

## Applying no_log at the Role Level

If you have an entire role that handles secrets, you can set `no_log` at the block level instead of on every single task:

```yaml
# roles/secrets/tasks/main.yml - block-level no_log
---
- name: Handle all secret operations
  block:
    - name: Write database credentials
      ansible.builtin.template:
        src: db_creds.j2
        dest: /etc/app/db_creds
        mode: "0600"

    - name: Write API tokens
      ansible.builtin.copy:
        content: "{{ vault_api_token }}"
        dest: /etc/app/api_token
        mode: "0600"

    - name: Configure TLS certificates
      ansible.builtin.template:
        src: tls.conf.j2
        dest: /etc/app/tls.conf
        mode: "0600"
  no_log: true
```

This is cleaner than adding `no_log: true` to every task individually. Just be aware that if any task in the block fails, you will not see the error details in the output. For that reason, some teams prefer the variable toggle approach mentioned above.

## Common Pitfalls

**Debug tasks can leak secrets.** If you add a `debug` task to print a variable and forget to remove it, you will expose the secret:

```yaml
# DO NOT do this in production playbooks
- name: Debug database password
  ansible.builtin.debug:
    var: vault_db_password
```

**Registered variables can contain secrets.** If you register the output of a task that uses secrets and then use that registered variable later, the secret can leak through the registered output:

```yaml
# Be careful with register on sensitive tasks
- name: Check database connection
  ansible.builtin.shell: "mysql -u admin -p'{{ vault_db_password }}' -e 'SELECT 1'"
  register: db_check
  no_log: true

# This next task should also use no_log since db_check may contain the password
- name: Verify connection result
  ansible.builtin.debug:
    var: db_check.rc
  # The rc (return code) is safe, but db_check.cmd would show the password
```

**Callback plugins might bypass no_log.** Some third-party callback plugins do not respect the `no_log` flag. If you use a custom callback for logging to external systems, verify that it handles `no_log` properly.

## Setting a Default in ansible.cfg

You can configure Ansible to default to `no_log` for all tasks using the `display_args_to_stdout` setting, though this is a blunt instrument:

```ini
# ansible.cfg - reduce information in default output
[defaults]
display_args_to_stdout = False
no_target_syslog = True
```

This does not replace per-task `no_log`, but it reduces the surface area for accidental exposure.

## Summary

Ansible Vault protects your secrets on disk. The `no_log` directive protects them during execution. Using both together gives you proper defense in depth. The key practices are: always add `no_log: true` to any task that touches a vaulted variable, use a toggle variable for debugging flexibility, apply `no_log` at the block level when an entire set of tasks is sensitive, and watch out for registered variables and debug tasks that can leak decrypted values.
