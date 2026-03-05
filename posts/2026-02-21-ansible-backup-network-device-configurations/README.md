# How to Use Ansible to Backup Network Device Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Backup, Network Automation, Disaster Recovery

Description: Build automated network configuration backup workflows with Ansible that capture, store, and version-control device configs across your infrastructure.

---

Backing up network device configurations is non-negotiable. Hardware fails, engineers make mistakes, and sometimes you just need to know what the configuration looked like last Tuesday. Many teams still rely on manual backups or commercial RANCID-style tools, but Ansible gives you a flexible, scriptable backup solution that integrates with your existing automation workflow.

In this post, I will show you how to build a robust configuration backup system using Ansible, from basic single-device backups to automated multi-platform backup pipelines with git versioning.

## Simple Configuration Backup

The fastest way to backup a device config is with the `ios_config` module and its `backup` parameter.

```yaml
# simple_backup.yml - One-liner backup for Cisco IOS devices
---
- name: Backup network device configurations
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Backup running configuration
      cisco.ios.ios_config:
        backup: true
        backup_options:
          dir_path: "backups/{{ inventory_hostname }}"
          filename: "{{ inventory_hostname }}_{{ lookup('pipe', 'date +%Y%m%d_%H%M%S') }}.cfg"
```

This creates a file like `backups/router01/router01_20260221_143025.cfg` with the full running configuration.

## Structured Backup with Custom Naming

For better organization, create a structured backup directory and use timestamps consistently.

```yaml
# structured_backup.yml - Organized backup with metadata and directory structure
---
- name: Structured configuration backup
  hosts: all_network
  gather_facts: false
  connection: network_cli

  vars:
    backup_root: "/opt/network-backups"
    backup_date: "{{ lookup('pipe', 'date +%Y-%m-%d') }}"
    backup_time: "{{ lookup('pipe', 'date +%H%M%S') }}"

  tasks:
    # Create backup directory structure
    - name: Ensure backup directory exists
      ansible.builtin.file:
        path: "{{ backup_root }}/{{ backup_date }}/{{ inventory_hostname }}"
        state: directory
        mode: '0755'
      delegate_to: localhost

    # Get the running configuration
    - name: Capture running configuration
      cisco.ios.ios_command:
        commands:
          - show running-config
      register: running_config

    # Save the configuration to a file
    - name: Save running config to file
      ansible.builtin.copy:
        content: "{{ running_config.stdout[0] }}"
        dest: "{{ backup_root }}/{{ backup_date }}/{{ inventory_hostname }}/running-config.cfg"
      delegate_to: localhost

    # Also grab the startup config for comparison
    - name: Capture startup configuration
      cisco.ios.ios_command:
        commands:
          - show startup-config
      register: startup_config

    - name: Save startup config to file
      ansible.builtin.copy:
        content: "{{ startup_config.stdout[0] }}"
        dest: "{{ backup_root }}/{{ backup_date }}/{{ inventory_hostname }}/startup-config.cfg"
      delegate_to: localhost

    # Capture device version info for context
    - name: Capture device version
      cisco.ios.ios_command:
        commands:
          - show version
      register: version_info

    - name: Save version info
      ansible.builtin.copy:
        content: "{{ version_info.stdout[0] }}"
        dest: "{{ backup_root }}/{{ backup_date }}/{{ inventory_hostname }}/version.txt"
      delegate_to: localhost
```

## Multi-Platform Backup

Most networks have devices from multiple vendors. Here is how to handle that.

```yaml
# multi_platform_backup.yml - Backup configs from Cisco IOS, NX-OS, and Arista
---
- name: Backup Cisco IOS devices
  hosts: ios_devices
  gather_facts: false
  connection: network_cli
  vars:
    backup_root: "/opt/network-backups"
    backup_date: "{{ lookup('pipe', 'date +%Y-%m-%d') }}"

  tasks:
    - name: Backup IOS config
      cisco.ios.ios_config:
        backup: true
        backup_options:
          dir_path: "{{ backup_root }}/{{ backup_date }}"
          filename: "{{ inventory_hostname }}.cfg"

- name: Backup Cisco NX-OS devices
  hosts: nxos_devices
  gather_facts: false
  connection: network_cli
  vars:
    backup_root: "/opt/network-backups"
    backup_date: "{{ lookup('pipe', 'date +%Y-%m-%d') }}"

  tasks:
    - name: Backup NX-OS config
      cisco.nxos.nxos_config:
        backup: true
        backup_options:
          dir_path: "{{ backup_root }}/{{ backup_date }}"
          filename: "{{ inventory_hostname }}.cfg"

- name: Backup Arista EOS devices
  hosts: eos_devices
  gather_facts: false
  connection: network_cli
  vars:
    backup_root: "/opt/network-backups"
    backup_date: "{{ lookup('pipe', 'date +%Y-%m-%d') }}"

  tasks:
    - name: Backup EOS config
      arista.eos.eos_config:
        backup: true
        backup_options:
          dir_path: "{{ backup_root }}/{{ backup_date }}"
          filename: "{{ inventory_hostname }}.cfg"
```

## Git-Versioned Backups

Storing backups in git gives you a complete history of every change, with diffs showing exactly what changed between versions.

```yaml
# git_backup.yml - Backup configs to a git repository
---
- name: Backup configs to git repository
  hosts: all_network
  gather_facts: false
  connection: network_cli

  vars:
    git_repo_path: "/opt/network-config-repo"

  tasks:
    # Get the running configuration
    - name: Capture running configuration
      cisco.ios.ios_command:
        commands:
          - show running-config
      register: running_config
      when: ansible_network_os == 'cisco.ios.ios'

    # Save config to the git repo directory
    - name: Save config to git repo
      ansible.builtin.copy:
        content: "{{ running_config.stdout[0] }}"
        dest: "{{ git_repo_path }}/configs/{{ inventory_hostname }}.cfg"
      delegate_to: localhost
      register: config_file

- name: Commit changes to git
  hosts: localhost
  gather_facts: false

  vars:
    git_repo_path: "/opt/network-config-repo"

  tasks:
    - name: Check for changes in git
      ansible.builtin.command:
        cmd: git status --porcelain
        chdir: "{{ git_repo_path }}"
      register: git_status
      changed_when: false

    - name: Stage changed configs
      ansible.builtin.command:
        cmd: git add -A
        chdir: "{{ git_repo_path }}"
      when: git_status.stdout | length > 0

    - name: Commit changes with timestamp
      ansible.builtin.command:
        cmd: "git commit -m 'Config backup {{ lookup('pipe', 'date +%Y-%m-%d_%H:%M:%S') }}'"
        chdir: "{{ git_repo_path }}"
      when: git_status.stdout | length > 0

    - name: Push to remote repository
      ansible.builtin.command:
        cmd: git push origin main
        chdir: "{{ git_repo_path }}"
      when: git_status.stdout | length > 0
```

## Config Diff Detection

After taking a backup, compare it against the previous version to detect changes.

```yaml
# backup_with_diff.yml - Backup and report config changes
---
- name: Backup with change detection
  hosts: all_network
  gather_facts: false
  connection: network_cli

  vars:
    backup_root: "/opt/network-backups"
    current_dir: "{{ backup_root }}/current"
    previous_dir: "{{ backup_root }}/previous"

  tasks:
    - name: Get running configuration
      cisco.ios.ios_command:
        commands:
          - show running-config
      register: running_config

    # Check if a previous backup exists
    - name: Check for existing backup
      ansible.builtin.stat:
        path: "{{ current_dir }}/{{ inventory_hostname }}.cfg"
      register: existing_backup
      delegate_to: localhost

    # Move current to previous before saving new
    - name: Archive previous backup
      ansible.builtin.copy:
        src: "{{ current_dir }}/{{ inventory_hostname }}.cfg"
        dest: "{{ previous_dir }}/{{ inventory_hostname }}.cfg"
        remote_src: true
      delegate_to: localhost
      when: existing_backup.stat.exists

    # Save new backup
    - name: Save current configuration
      ansible.builtin.copy:
        content: "{{ running_config.stdout[0] }}"
        dest: "{{ current_dir }}/{{ inventory_hostname }}.cfg"
      delegate_to: localhost

    # Compare current vs previous
    - name: Detect configuration changes
      ansible.builtin.command:
        cmd: "diff {{ previous_dir }}/{{ inventory_hostname }}.cfg {{ current_dir }}/{{ inventory_hostname }}.cfg"
      delegate_to: localhost
      register: config_diff
      changed_when: config_diff.rc != 0
      failed_when: config_diff.rc > 1
      when: existing_backup.stat.exists

    - name: Report changes
      ansible.builtin.debug:
        msg: |
          Configuration changed on {{ inventory_hostname }}:
          {{ config_diff.stdout }}
      when:
        - existing_backup.stat.exists
        - config_diff.rc != 0
```

## Running vs Startup Config Check

A common compliance check is ensuring the running config matches the startup config (meaning all changes have been saved).

```yaml
# check_unsaved.yml - Detect unsaved configuration changes
---
- name: Check for unsaved configuration changes
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Get running config
      cisco.ios.ios_command:
        commands:
          - show running-config
      register: running

    - name: Get startup config
      cisco.ios.ios_command:
        commands:
          - show startup-config
      register: startup

    # Simple length comparison as a quick check
    - name: Compare config lengths
      ansible.builtin.debug:
        msg: "WARNING: Running config ({{ running.stdout[0] | length }} chars) differs from startup config ({{ startup.stdout[0] | length }} chars) on {{ inventory_hostname }}"
      when: running.stdout[0] | length != startup.stdout[0] | length
```

## Scheduled Backup with Cron

Set up a cron job to run backups automatically.

```yaml
# schedule_backup.yml - Set up automated daily backups via cron
---
- name: Schedule daily configuration backups
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Create backup cron job
      ansible.builtin.cron:
        name: "Network config backup"
        minute: "0"
        hour: "2"
        job: "cd /opt/ansible && ansible-playbook git_backup.yml >> /var/log/network-backup.log 2>&1"
        user: ansible
```

Automated configuration backups are your safety net. When a change goes wrong at 3 AM, you want to be able to pull up the last known good config and restore it in minutes, not hours. Build your backup pipeline with Ansible, version it with git, and schedule it to run daily. You will thank yourself the first time you need to recover from a bad change.
