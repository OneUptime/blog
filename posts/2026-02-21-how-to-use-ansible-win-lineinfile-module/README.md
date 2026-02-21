# How to Use Ansible win_lineinfile Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, Configuration Management, Automation

Description: Learn how to use the Ansible win_lineinfile module to manage lines in text files on Windows hosts with practical examples.

---

If you have ever needed to update a configuration file on a Windows server, say adding a DNS entry to the hosts file, toggling a setting in an INI file, or commenting out a line in a config, then you know how tedious it can be to do this manually across multiple machines. The Ansible `win_lineinfile` module solves this problem by letting you manage individual lines in text files on Windows hosts in a declarative, repeatable way.

This module is the Windows counterpart to the Linux `lineinfile` module. It works with WinRM-connected Windows hosts and can insert, replace, or remove lines based on regex patterns or exact matches.

## Prerequisites

Before diving in, make sure you have:

- Ansible installed on your control node (Linux or macOS)
- WinRM configured on your Windows target hosts
- A working inventory with Windows hosts defined

Here is a minimal inventory file for reference:

```ini
# inventory/hosts.ini
[windows]
win-server-01 ansible_host=192.168.1.100

[windows:vars]
ansible_user=admin
ansible_password=SecurePass123
ansible_connection=winrm
ansible_winrm_transport=ntlm
ansible_port=5986
ansible_winrm_server_cert_validation=ignore
```

## Basic Usage: Adding a Line to a File

The simplest use case is ensuring a specific line exists in a file. Let's start with adding an entry to the Windows hosts file.

```yaml
# playbook-add-host-entry.yml
# Adds a static DNS entry to the Windows hosts file
- name: Manage hosts file entries
  hosts: windows
  tasks:
    - name: Add custom DNS entry to hosts file
      ansible.windows.win_lineinfile:
        path: C:\Windows\System32\drivers\etc\hosts
        line: "192.168.1.50    app-server.internal.local"
        state: present
```

Running this playbook will append the line to the hosts file if it does not already exist. If the line is already present, Ansible will report "ok" and make no changes. This is the idempotent behavior you want from a configuration management tool.

## Replacing Lines with Regex

One of the most powerful features of `win_lineinfile` is regex-based line replacement. You can match a pattern and replace the entire matching line with new content.

```yaml
# playbook-replace-line.yml
# Updates a setting in a custom application config file
- name: Update application config
  hosts: windows
  tasks:
    - name: Set max connections to 200
      ansible.windows.win_lineinfile:
        path: C:\AppConfig\settings.conf
        regexp: '^max_connections\s*='
        line: "max_connections = 200"
        state: present
```

In this example, Ansible searches for any line starting with `max_connections` followed by optional whitespace and an equals sign. If found, it replaces the entire line. If not found, the new line gets appended to the end of the file.

## Controlling Line Placement with insertafter and insertbefore

Sometimes you need a line to appear at a specific position in the file, not just at the end. The `insertafter` and `insertbefore` parameters give you that control.

```yaml
# playbook-insert-after.yml
# Inserts a log directory setting right after the [logging] section header
- name: Configure logging section
  hosts: windows
  tasks:
    - name: Add log directory under logging section
      ansible.windows.win_lineinfile:
        path: C:\AppConfig\app.ini
        insertafter: '^\[logging\]'
        line: "log_directory = C:\\Logs\\MyApp"
        state: present
```

You can also use `insertbefore` to place the line before a matching pattern:

```yaml
# playbook-insert-before.yml
# Adds a comment line before the database connection string
- name: Add comment before DB config
  hosts: windows
  tasks:
    - name: Insert comment before connection string
      ansible.windows.win_lineinfile:
        path: C:\AppConfig\database.conf
        insertbefore: '^connection_string\s*='
        line: "# Updated by Ansible on {{ ansible_date_time.date }}"
        state: present
```

Two special values are also available: `BOF` (beginning of file) for `insertbefore` and `EOF` (end of file) for `insertafter`. The default is `EOF`.

## Removing Lines from Files

To remove a line, set `state: absent` and provide a regex pattern. Every line that matches will be removed.

```yaml
# playbook-remove-line.yml
# Removes all commented-out lines from a config file
- name: Clean up old entries
  hosts: windows
  tasks:
    - name: Remove deprecated DNS entry
      ansible.windows.win_lineinfile:
        path: C:\Windows\System32\drivers\etc\hosts
        regexp: '.*deprecated-server\.old\.local'
        state: absent
```

Be careful with broad regex patterns. If your regex matches more lines than you intend, they will all be removed. Always test with `--check --diff` first.

## Working with Encoding

Windows files sometimes use different encodings. The `encoding` parameter lets you specify the file encoding explicitly.

```yaml
# playbook-encoding.yml
# Writes to a UTF-8 encoded config file
- name: Manage UTF-8 config file
  hosts: windows
  tasks:
    - name: Ensure setting exists in UTF-8 file
      ansible.windows.win_lineinfile:
        path: C:\AppConfig\unicode-settings.txt
        line: "locale = en_US.UTF-8"
        encoding: utf-8
        state: present
```

Supported encoding values include `auto`, `utf-8`, `utf-8-bom`, `utf-16`, `utf-16-be`, and `utf-16-le`. The default is `auto`, which usually does the right thing, but I have hit edge cases with legacy applications that require an explicit encoding.

## Backup Before Modifying

It is always a good practice to create a backup of the file before making changes. The `backup` parameter handles this for you.

```yaml
# playbook-with-backup.yml
# Modifies a critical config file with automatic backup
- name: Update IIS config with backup
  hosts: windows
  tasks:
    - name: Update binding configuration
      ansible.windows.win_lineinfile:
        path: C:\inetpub\wwwroot\web.config
        regexp: '<add key="ApiEndpoint"'
        line: '    <add key="ApiEndpoint" value="https://api.production.local" />'
        backup: yes
      register: lineinfile_result

    - name: Show backup file path
      ansible.builtin.debug:
        msg: "Backup created at {{ lineinfile_result.backup_file }}"
      when: lineinfile_result.backup_file is defined
```

The backup file gets stored alongside the original file with a timestamp suffix, so you can always roll back if something goes wrong.

## Practical Example: Managing Windows Firewall Config

Here is a more complete playbook that ties several concepts together. This one manages a custom firewall rules configuration file.

```yaml
# playbook-firewall-config.yml
# Manages a custom firewall rules config across all Windows servers
- name: Manage firewall configuration
  hosts: windows
  vars:
    allowed_ports:
      - { port: 443, desc: "HTTPS traffic" }
      - { port: 8080, desc: "Application server" }
      - { port: 5986, desc: "WinRM HTTPS" }

  tasks:
    - name: Ensure config file exists
      ansible.windows.win_file:
        path: C:\FirewallConfig\rules.conf
        state: touch

    - name: Add header comment if missing
      ansible.windows.win_lineinfile:
        path: C:\FirewallConfig\rules.conf
        insertbefore: BOF
        line: "# Firewall rules managed by Ansible - do not edit manually"
        state: present

    - name: Add allowed port entries
      ansible.windows.win_lineinfile:
        path: C:\FirewallConfig\rules.conf
        regexp: "^allow_port\\s*=\\s*{{ item.port }}"
        line: "allow_port = {{ item.port }}  # {{ item.desc }}"
        state: present
      loop: "{{ allowed_ports }}"

    - name: Remove any blocked legacy ports
      ansible.windows.win_lineinfile:
        path: C:\FirewallConfig\rules.conf
        regexp: '^allow_port\s*=\s*(23|21|25)\b'
        state: absent
```

## Common Pitfalls

**Backslash escaping**: Windows paths use backslashes. In YAML, you often need to double them (`C:\\Users\\`) or use single quotes to avoid escaping issues.

**Line endings**: Windows uses CRLF (`\r\n`) line endings. The `win_lineinfile` module handles this automatically, but if you are testing on Linux or comparing output, keep this in mind.

**Regex greediness**: If your regex is too broad, you might match lines you did not intend to. Always be as specific as possible with your patterns.

**File locking**: If another process has the file locked (common with IIS config files), the module will fail. You may need to stop the service first, make the change, and restart.

## Running with Check Mode

Before applying changes to production, always do a dry run:

```bash
# Preview changes without actually modifying anything
ansible-playbook -i inventory/hosts.ini playbook-add-host-entry.yml --check --diff
```

The `--diff` flag shows you exactly what lines will change, which is extremely helpful for auditing changes before they go live.

## Wrapping Up

The `win_lineinfile` module is a workhorse for Windows configuration management. Whether you are updating hosts files, tweaking application configs, or managing INI files, it gives you fine-grained control over individual lines in text files. Combine it with `--check --diff` for safe deployments, use `backup: yes` for peace of mind, and keep your regex patterns tight to avoid surprises. For managing entire blocks of text rather than single lines, check out the `win_blockinfile` module instead.
