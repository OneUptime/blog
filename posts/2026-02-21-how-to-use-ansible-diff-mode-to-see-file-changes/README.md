# How to Use Ansible --diff Mode to See File Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Diff Mode, Configuration Management, Auditing

Description: Learn how to use Ansible diff mode to see exactly what changes will be or were made to files on your managed hosts.

---

When Ansible reports that a task "changed" a file, the natural follow-up question is: what exactly changed? The `--diff` flag shows you unified diff output for file modifications, so you can see line-by-line what was added, removed, or modified. This is incredibly useful for auditing changes, reviewing template deployments, and catching unintended modifications before or after they happen.

## Basic Usage

Add `--diff` to any `ansible-playbook` command:

```bash
# Show diffs for all file changes
ansible-playbook configure.yml --diff

# Combine with check mode for a dry run with diffs
ansible-playbook configure.yml --check --diff

# Limit to specific hosts
ansible-playbook configure.yml --diff --limit web-01
```

## What Diff Output Looks Like

When a template or file task changes a file, the diff output shows exactly what changed:

```yaml
# This task deploys a configuration template
- name: Deploy nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: Reload nginx
```

With `--diff`, the output includes:

```
TASK [Deploy nginx configuration] *********************************************
--- before: /etc/nginx/nginx.conf
+++ after: /home/deploy/.ansible/tmp/ansible-local-12345/tmpabc123
@@ -10,7 +10,7 @@
     server {
         listen 80;
-        server_name old.example.com;
+        server_name new.example.com;

         location / {
-            proxy_pass http://localhost:3000;
+            proxy_pass http://localhost:8080;
         }
```

Lines starting with `-` show what was removed, and lines starting with `+` show what was added. This is the standard unified diff format.

## Modules That Support Diff Mode

Not all Ansible modules produce diff output. The following modules support it:

- `template` - shows template rendering differences
- `copy` - shows content differences
- `lineinfile` - shows the line change
- `blockinfile` - shows the block change
- `replace` - shows the replacement
- `file` - shows permission and ownership changes
- `ini_file` - shows the ini file change

Modules like `command`, `shell`, `apt`, and `service` do not produce diff output since they do not modify files in a way that can be diffed.

## Controlling Diff at the Task Level

You can enable or disable diff on individual tasks using the `diff` keyword:

```yaml
---
- name: Configure application
  hosts: webservers
  become: true

  tasks:
    # Show diff for this task
    - name: Deploy application config
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/app/app.conf
      diff: true

    # Suppress diff for this task (useful for sensitive data)
    - name: Deploy database credentials
      ansible.builtin.template:
        src: db-credentials.j2
        dest: /etc/app/db.conf
        mode: "0600"
      diff: false
      no_log: true

    # Show diff for this task
    - name: Deploy logging config
      ansible.builtin.template:
        src: logging.conf.j2
        dest: /etc/app/logging.conf
      diff: true
```

## Suppressing Diffs for Sensitive Content

When deploying files that contain secrets (passwords, API keys, certificates), you should suppress the diff to prevent secrets from appearing in logs:

```yaml
# IMPORTANT: Suppress diff for files with secrets
- name: Deploy secrets file
  ansible.builtin.template:
    src: secrets.env.j2
    dest: /etc/app/secrets.env
    owner: appuser
    mode: "0600"
  diff: false
  no_log: true

# Safe to show diff for non-sensitive configuration
- name: Deploy feature flags
  ansible.builtin.template:
    src: features.yml.j2
    dest: /etc/app/features.yml
  diff: true
```

## Diff Mode in ansible.cfg

You can enable diff mode by default in your Ansible configuration:

```ini
# ansible.cfg
[defaults]
# Always show diffs
diff = True
```

Or set it via environment variable:

```bash
export ANSIBLE_DIFF_ALWAYS=True
ansible-playbook configure.yml
```

## Combining Diff with Check Mode

The most powerful combination is `--check --diff`. This shows you what would change without actually making any changes:

```bash
# See what would change without changing anything
ansible-playbook configure.yml --check --diff
```

This is the go-to command for reviewing changes before applying them:

```
TASK [Deploy nginx configuration] *********************************************
--- before: /etc/nginx/nginx.conf
+++ after: /home/deploy/.ansible/tmp/ansible-local-12345/tmpdef456
@@ -15,6 +15,10 @@
         proxy_pass http://localhost:8080;
     }

+    location /api {
+        proxy_pass http://localhost:3000;
+        proxy_set_header Host $host;
+    }
+
 }

changed: [web-01]
```

You can see that four lines would be added to the nginx configuration. If this looks correct, run without `--check` to apply.

## Diff with the copy Module

The `copy` module shows diffs when using the `content` parameter:

```yaml
# Deploy a hosts file with inline content
- name: Configure /etc/hosts entries
  ansible.builtin.copy:
    content: |
      127.0.0.1 localhost
      {{ ansible_default_ipv4.address }} {{ ansible_fqdn }} {{ ansible_hostname }}
      10.0.1.10 db-primary.internal
      10.0.1.11 db-replica.internal
      10.0.1.20 cache-01.internal
    dest: /etc/hosts.app
```

The diff shows the exact content differences:

```
--- before: /etc/hosts.app
+++ after: /home/deploy/.ansible/tmp/ansible-local-12345/source
@@ -3,3 +3,4 @@
 10.0.1.50 web-01.example.com web-01
 10.0.1.10 db-primary.internal
 10.0.1.11 db-replica.internal
+10.0.1.20 cache-01.internal
```

## Diff with lineinfile and blockinfile

These modules also produce useful diffs:

```yaml
# lineinfile shows the specific line change
- name: Set max open files limit
  ansible.builtin.lineinfile:
    path: /etc/security/limits.conf
    regexp: '^appuser.*nofile'
    line: 'appuser  soft  nofile  65536'
```

Diff output:

```
--- before: /etc/security/limits.conf
+++ after: /etc/security/limits.conf
@@ -52,7 +52,7 @@
 # End of file
-appuser  soft  nofile  4096
+appuser  soft  nofile  65536
```

## Practical Example: Configuration Audit Playbook

Here is a playbook designed specifically for auditing configuration changes before applying them:

```yaml
---
- name: Audit and apply configuration changes
  hosts: webservers
  become: true
  diff: true  # Enable diff for the entire play

  vars:
    nginx_worker_connections: 2048
    app_max_memory: 512m
    log_level: info

  tasks:
    - name: Update nginx worker connections
      ansible.builtin.lineinfile:
        path: /etc/nginx/nginx.conf
        regexp: 'worker_connections'
        line: "    worker_connections {{ nginx_worker_connections }};"

    - name: Deploy application environment
      ansible.builtin.template:
        src: app.env.j2
        dest: /etc/app/environment
        owner: appuser
        mode: "0640"

    - name: Update systemd service limits
      ansible.builtin.template:
        src: app.service.j2
        dest: /etc/systemd/system/app.service
      notify:
        - Reload systemd
        - Restart app

    - name: Deploy log rotation config
      ansible.builtin.template:
        src: logrotate.j2
        dest: /etc/logrotate.d/app

    # Secrets file - suppress diff
    - name: Deploy API keys
      ansible.builtin.copy:
        content: "{{ vault_api_keys }}"
        dest: /etc/app/api-keys.json
        mode: "0600"
      diff: false
      no_log: true

  handlers:
    - name: Reload systemd
      ansible.builtin.systemd:
        daemon_reload: true

    - name: Restart app
      ansible.builtin.service:
        name: app
        state: restarted
```

Run the audit:

```bash
# First, review all changes
ansible-playbook audit-config.yml --check --diff

# If everything looks good, apply
ansible-playbook audit-config.yml --diff
```

## Using Diff Output in Callbacks

If you want to capture diff output programmatically, you can use callback plugins. The JSON callback plugin includes diff data in its output:

```bash
# Get machine-readable diff output
ANSIBLE_STDOUT_CALLBACK=json ansible-playbook configure.yml --diff > output.json
```

The JSON output includes a `diff` key for each task that produced a diff:

```json
{
  "task": "Deploy nginx configuration",
  "host": "web-01",
  "result": {
    "changed": true,
    "diff": [
      {
        "before": "worker_connections 1024;\n",
        "after": "worker_connections 2048;\n",
        "before_header": "/etc/nginx/nginx.conf",
        "after_header": "/tmp/ansible-tmp-123/source"
      }
    ]
  }
}
```

## Diff for New Files

When a file is being created for the first time, the diff shows the entire content as additions:

```
--- before
+++ after: /home/deploy/.ansible/tmp/ansible-local-12345/source
@@ -0,0 +1,15 @@
+server {
+    listen 80;
+    server_name example.com;
+
+    location / {
+        proxy_pass http://localhost:8080;
+    }
+}
```

## Diff for Deleted Files

When using `state: absent`, you see the entire content as removals:

```yaml
- name: Remove old configuration
  ansible.builtin.file:
    path: /etc/nginx/sites-enabled/old-site.conf
    state: absent
```

## Summary

The `--diff` flag transforms Ansible from a "trust me, I changed something" tool into a transparent, auditable configuration management system. Always use `--check --diff` before applying changes to production. Use `diff: false` on tasks that handle sensitive data. Enable diff by default in development environments through ansible.cfg, and use the JSON callback when you need to process diff output programmatically. Getting into the habit of reviewing diffs before applying them will save you from many "oops" moments.
