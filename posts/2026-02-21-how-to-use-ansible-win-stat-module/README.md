# How to Use Ansible win_stat Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, File Management, Automation

Description: Master the Ansible win_stat module to gather file and directory information on Windows hosts for conditional automation tasks.

---

When you are automating Windows infrastructure with Ansible, you frequently need to check whether a file exists, how large it is, when it was last modified, or what permissions it has before taking action. The `win_stat` module is the tool for this job. It gathers detailed information about files and directories on Windows hosts and returns it as structured data you can use in subsequent tasks.

Think of `win_stat` as the Windows version of `stat` on Linux. You call it, it inspects a path, and it gives you back a dictionary of facts about that path. From there, you can build conditional logic around those facts.

## Prerequisites

You will need:

- Ansible control node with `ansible.windows` collection installed
- WinRM connectivity to your Windows hosts
- Appropriate permissions on the target files and directories

Install the collection if you have not already:

```bash
# Install the ansible.windows collection from Ansible Galaxy
ansible-galaxy collection install ansible.windows
```

## Basic Usage: Check if a File Exists

The most common use case is simply checking whether a file or directory exists before performing an action.

```yaml
# playbook-check-file.yml
# Checks if a log file exists before attempting to archive it
- name: Check file existence
  hosts: windows
  tasks:
    - name: Get stats for the application log
      ansible.windows.win_stat:
        path: C:\Logs\application.log
      register: log_file

    - name: Archive log if it exists
      ansible.windows.win_copy:
        src: C:\Logs\application.log
        dest: C:\Archive\application-{{ ansible_date_time.date }}.log
        remote_src: yes
      when: log_file.stat.exists
```

The `register` keyword captures the module output into a variable. You then access `log_file.stat.exists` which is a boolean telling you whether the path exists.

## Understanding the Return Data

The `win_stat` module returns a rich set of attributes. Here is a task that dumps all of them so you can see what is available:

```yaml
# playbook-dump-stats.yml
# Displays all file metadata returned by win_stat
- name: Inspect file metadata
  hosts: windows
  tasks:
    - name: Get detailed file info
      ansible.windows.win_stat:
        path: C:\Windows\System32\notepad.exe
      register: file_info

    - name: Display all stats
      ansible.builtin.debug:
        var: file_info.stat
```

Running this will output something like:

```json
{
    "exists": true,
    "isdir": false,
    "islink": false,
    "size": 201216,
    "filename": "notepad.exe",
    "extension": ".exe",
    "attributes": "Archive",
    "creationtime": 1623456789.0,
    "lastwritetime": 1623456789.0,
    "lastaccesstime": 1623456789.0,
    "isreadonly": false,
    "ishidden": false,
    "isarchive": true,
    "issystem": false,
    "owner": "NT SERVICE\\TrustedInstaller",
    "path": "C:\\Windows\\System32\\notepad.exe"
}
```

Key properties you will use most often:

| Property | Type | Description |
|----------|------|-------------|
| `exists` | bool | Whether the path exists |
| `isdir` | bool | Whether the path is a directory |
| `size` | int | File size in bytes |
| `lastwritetime` | float | Last modification time (epoch) |
| `owner` | string | File owner |
| `isreadonly` | bool | Whether read-only flag is set |
| `checksum` | string | File checksum (when requested) |

## Getting File Checksums

By default, `win_stat` does not compute checksums because it adds overhead. You can enable it with the `checksum_algorithm` parameter.

```yaml
# playbook-checksum.yml
# Compares checksums of two files to verify they match
- name: Verify file integrity
  hosts: windows
  tasks:
    - name: Get checksum of deployed binary
      ansible.windows.win_stat:
        path: C:\App\myservice.exe
        checksum_algorithm: sha256
      register: deployed_binary

    - name: Get checksum of reference binary
      ansible.windows.win_stat:
        path: C:\Staging\myservice.exe
        checksum_algorithm: sha256
      register: reference_binary

    - name: Fail if checksums do not match
      ansible.builtin.fail:
        msg: "Binary mismatch! Deployed: {{ deployed_binary.stat.checksum }} vs Reference: {{ reference_binary.stat.checksum }}"
      when:
        - deployed_binary.stat.exists
        - reference_binary.stat.exists
        - deployed_binary.stat.checksum != reference_binary.stat.checksum
```

Supported checksum algorithms include `md5`, `sha1`, `sha256`, `sha384`, and `sha512`. For security verification purposes, use `sha256` or higher.

## Checking Directory Properties

The module works for directories too. You can check whether a path is a directory and take action accordingly.

```yaml
# playbook-check-directory.yml
# Ensures a required directory structure exists
- name: Validate directory structure
  hosts: windows
  vars:
    required_dirs:
      - C:\App\config
      - C:\App\logs
      - C:\App\data
      - C:\App\temp

  tasks:
    - name: Check each required directory
      ansible.windows.win_stat:
        path: "{{ item }}"
      register: dir_checks
      loop: "{{ required_dirs }}"

    - name: Create missing directories
      ansible.windows.win_file:
        path: "{{ item.item }}"
        state: directory
      loop: "{{ dir_checks.results }}"
      when: not item.stat.exists
      loop_control:
        label: "{{ item.item }}"
```

## Conditional Logic Based on File Age

A practical scenario is rotating log files based on their age or size. You can use `lastwritetime` to determine file age.

```yaml
# playbook-rotate-logs.yml
# Rotates log files that are older than 7 days or larger than 100MB
- name: Rotate old and large log files
  hosts: windows
  tasks:
    - name: Check main log file
      ansible.windows.win_stat:
        path: C:\Logs\service.log
      register: service_log

    - name: Calculate file age in days
      ansible.builtin.set_fact:
        log_age_days: "{{ ((ansible_date_time.epoch | int) - (service_log.stat.lastwritetime | int)) / 86400 }}"
      when: service_log.stat.exists

    - name: Rotate if older than 7 days
      ansible.windows.win_shell: |
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        Move-Item -Path "C:\Logs\service.log" -Destination "C:\Logs\Archive\service-$timestamp.log"
      when:
        - service_log.stat.exists
        - (log_age_days | float) > 7

    - name: Rotate if larger than 100MB
      ansible.windows.win_shell: |
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        Move-Item -Path "C:\Logs\service.log" -Destination "C:\Logs\Archive\service-$timestamp.log"
      when:
        - service_log.stat.exists
        - service_log.stat.size > 104857600
```

## Pre-deployment Validation Example

Here is a more comprehensive playbook that validates a deployment target before pushing new code. This is the kind of thing I run in CI/CD pipelines before deploying to Windows servers.

```yaml
# playbook-pre-deploy-check.yml
# Validates that the target server is ready for deployment
- name: Pre-deployment validation
  hosts: windows
  vars:
    app_dir: C:\WebApp
    backup_dir: C:\WebApp-Backups
    required_free_space_mb: 500

  tasks:
    - name: Check application directory
      ansible.windows.win_stat:
        path: "{{ app_dir }}"
      register: app_dir_stat

    - name: Check backup directory
      ansible.windows.win_stat:
        path: "{{ backup_dir }}"
      register: backup_dir_stat

    - name: Check current config file
      ansible.windows.win_stat:
        path: "{{ app_dir }}\\appsettings.json"
        checksum_algorithm: sha256
      register: config_stat

    - name: Verify application directory exists
      ansible.builtin.assert:
        that:
          - app_dir_stat.stat.exists
          - app_dir_stat.stat.isdir
        fail_msg: "Application directory {{ app_dir }} does not exist or is not a directory"

    - name: Create backup directory if missing
      ansible.windows.win_file:
        path: "{{ backup_dir }}"
        state: directory
      when: not backup_dir_stat.stat.exists

    - name: Save current config checksum for rollback reference
      ansible.builtin.set_fact:
        pre_deploy_config_checksum: "{{ config_stat.stat.checksum }}"
      when: config_stat.stat.exists

    - name: Log validation results
      ansible.builtin.debug:
        msg: |
          Deployment target validated:
          - App directory exists: {{ app_dir_stat.stat.exists }}
          - Config checksum: {{ config_stat.stat.checksum | default('N/A') }}
          - Ready for deployment: YES
```

## Checking Symbolic Links

If you work with symbolic links on Windows (introduced in newer Windows versions), `win_stat` can detect them:

```yaml
# playbook-check-link.yml
# Detects if a path is a symbolic link and resolves the target
- name: Check for symbolic links
  hosts: windows
  tasks:
    - name: Inspect potentially linked path
      ansible.windows.win_stat:
        path: C:\App\current
      register: link_check

    - name: Show link info
      ansible.builtin.debug:
        msg: "Path is a symlink pointing to {{ link_check.stat.lnk_target }}"
      when:
        - link_check.stat.exists
        - link_check.stat.islink
```

## Tips for Production Use

**Always register the output.** The whole point of `win_stat` is to feed its results into conditional logic. Without `register`, the data goes nowhere.

**Handle the non-existent case.** If a file does not exist, most `stat` properties will not be present. Always check `stat.exists` before accessing other properties, or use the `default` filter: `file_info.stat.size | default(0)`.

**Use checksums sparingly on large files.** Computing a SHA-256 checksum on a multi-gigabyte file takes time. Only request checksums when you actually need them.

**Combine with loops for batch operations.** When checking multiple files, use a loop with `register` to collect all results at once, then process them in a second loop.

The `win_stat` module might not be flashy, but it is fundamental to writing robust Windows automation. Almost every serious playbook I write for Windows uses it somewhere, whether for pre-flight checks, conditional deployments, or file integrity verification. Once you get comfortable with it, you will find yourself reaching for it constantly.
