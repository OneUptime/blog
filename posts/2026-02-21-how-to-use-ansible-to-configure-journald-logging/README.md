# How to Use Ansible to Configure journald Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, journald, Logging, systemd, Linux

Description: Learn how to configure systemd-journald with Ansible to manage log storage, retention, forwarding, and disk usage across your Linux infrastructure.

---

systemd-journald is the logging service that comes with systemd. It collects logs from the kernel, system services, and applications into a structured, indexed binary format. Unlike traditional syslog, journal entries include metadata like the service name, priority, PID, and cgroup information, making filtering and querying much more powerful.

Getting journald configured correctly across your fleet is important. Too much retention fills up disks. Too little loses valuable debugging information. In this guide, I will show how to configure all the important journald settings with Ansible.

## The journald Configuration File

The main configuration file is `/etc/systemd/journald.conf`. It follows the standard systemd configuration format with sections and key-value pairs.

Deploy a complete journald configuration:

```yaml
---
- name: Configure journald logging
  hosts: all
  become: yes
  tasks:
    - name: Deploy journald configuration
      ansible.builtin.template:
        src: journald.conf.j2
        dest: /etc/systemd/journald.conf
        owner: root
        group: root
        mode: '0644'
      notify: Restart journald

  handlers:
    - name: Restart journald
      ansible.builtin.systemd:
        name: systemd-journald
        state: restarted
```

## The Configuration Template

Here is a comprehensive Jinja2 template with all the important settings.

Complete journald configuration template:

```ini
# /etc/systemd/journald.conf
# Managed by Ansible - do not edit manually
[Journal]

#-- Storage Settings --#
# Where to store journal data: volatile (RAM), persistent (disk), auto, none
Storage={{ journald_storage | default('persistent') }}

# Compress journal files above this threshold
Compress={{ journald_compress | default('yes') }}

# Seal journal files with Forward Secure Sealing
Seal={{ journald_seal | default('yes') }}

#-- Disk Usage Limits --#
# Maximum disk space for persistent journals
SystemMaxUse={{ journald_system_max_use | default('2G') }}

# Keep at least this much free disk space
SystemKeepFree={{ journald_system_keep_free | default('4G') }}

# Maximum size of individual journal files
SystemMaxFileSize={{ journald_system_max_file_size | default('128M') }}

# Maximum disk space for runtime (volatile) journals
RuntimeMaxUse={{ journald_runtime_max_use | default('256M') }}

# Keep at least this much free for runtime
RuntimeKeepFree={{ journald_runtime_keep_free | default('1G') }}

# Maximum size of runtime journal files
RuntimeMaxFileSize={{ journald_runtime_max_file_size | default('64M') }}

#-- Retention Settings --#
# Maximum time to keep journal entries
MaxRetentionSec={{ journald_max_retention_sec | default('1month') }}

# Maximum number of journal files to keep
MaxFileSec={{ journald_max_file_sec | default('1week') }}

#-- Forwarding --#
# Forward messages to syslog
ForwardToSyslog={{ journald_forward_to_syslog | default('no') }}

# Forward to kernel log buffer
ForwardToKMsg={{ journald_forward_to_kmsg | default('no') }}

# Forward to the system console
ForwardToConsole={{ journald_forward_to_console | default('no') }}

# Forward to a wall message for emergency-level messages
ForwardToWall={{ journald_forward_to_wall | default('yes') }}

{% if journald_forward_to_console == 'yes' %}
# TTY to write console messages to
TTYPath={{ journald_tty_path | default('/dev/console') }}
{% endif %}

#-- Rate Limiting --#
# Maximum log entries from a single service per interval
RateLimitIntervalSec={{ journald_rate_limit_interval | default('30s') }}
RateLimitBurst={{ journald_rate_limit_burst | default(10000) }}

#-- Misc --#
# Split journals per user (yes) or keep one system journal (no)
SplitMode={{ journald_split_mode | default('uid') }}

# Maximum level to store (0=emerg to 7=debug)
MaxLevelStore={{ journald_max_level_store | default('debug') }}

# Maximum level to forward to syslog
MaxLevelSyslog={{ journald_max_level_syslog | default('debug') }}

# Maximum level for wall messages
MaxLevelWall={{ journald_max_level_wall | default('emerg') }}

# Audit log integration
Audit={{ journald_audit | default('yes') }}
```

## Environment-Specific Configuration

Different environments need different settings.

Group variables for different environments:

```yaml
# group_vars/production.yml
journald_storage: persistent
journald_system_max_use: "4G"
journald_system_keep_free: "8G"
journald_max_retention_sec: "3months"
journald_rate_limit_burst: 20000
journald_forward_to_syslog: "yes"  # Forward to centralized syslog
journald_max_level_store: "info"   # Do not store debug in production

# group_vars/staging.yml
journald_storage: persistent
journald_system_max_use: "2G"
journald_max_retention_sec: "1month"
journald_rate_limit_burst: 10000
journald_max_level_store: "debug"

# group_vars/development.yml
journald_storage: volatile
journald_runtime_max_use: "512M"
journald_max_retention_sec: "1week"
journald_rate_limit_burst: 50000
journald_max_level_store: "debug"
```

## Setting Up Persistent Storage

By default on some distributions, journal storage is volatile (stored in RAM and lost on reboot). To persist logs across reboots, you need to create the storage directory.

Ensure persistent journal storage is configured:

```yaml
- name: Create persistent journal directory
  ansible.builtin.file:
    path: /var/log/journal
    state: directory
    owner: root
    group: systemd-journal
    mode: '2755'

- name: Set correct ACL on journal directory
  ansible.builtin.command: systemd-tmpfiles --create --prefix /var/log/journal
  changed_when: false

- name: Configure journald for persistent storage
  ansible.builtin.template:
    src: journald.conf.j2
    dest: /etc/systemd/journald.conf
  vars:
    journald_storage: persistent
  notify: Restart journald
```

## Querying Journals with Ansible

Use the `command` module to query journal data for monitoring and reporting.

Query journal entries with journalctl:

```yaml
- name: Get recent errors from all services
  ansible.builtin.command: >
    journalctl --priority=err --since "1 hour ago" --no-pager -o json
  register: recent_errors
  changed_when: false

- name: Count error entries
  ansible.builtin.debug:
    msg: "Found {{ recent_errors.stdout_lines | length }} error entries in the last hour"

- name: Get logs for a specific service
  ansible.builtin.command: >
    journalctl -u nginx --since "24 hours ago" --no-pager --lines=50
  register: nginx_logs
  changed_when: false

- name: Get disk usage of journals
  ansible.builtin.command: journalctl --disk-usage
  register: disk_usage
  changed_when: false

- name: Show journal disk usage
  ansible.builtin.debug:
    var: disk_usage.stdout
```

## Managing Journal Disk Space

Clean up old journals to reclaim disk space.

Vacuum old journal entries:

```yaml
# Remove journals older than 2 weeks
- name: Vacuum journals by time
  ansible.builtin.command: journalctl --vacuum-time=2weeks
  register: vacuum_result
  changed_when: "'Vacuuming done' in vacuum_result.stdout"

# Limit journal to 1GB
- name: Vacuum journals by size
  ansible.builtin.command: journalctl --vacuum-size=1G
  register: vacuum_result
  changed_when: "'Vacuuming done' in vacuum_result.stdout"

# Keep only the last 5 journal files
- name: Vacuum journals by file count
  ansible.builtin.command: journalctl --vacuum-files=5
  register: vacuum_result
  changed_when: "'Vacuuming done' in vacuum_result.stdout"
```

Schedule periodic cleanup:

```yaml
- name: Schedule weekly journal cleanup
  ansible.builtin.cron:
    name: "Journal cleanup"
    special_time: weekly
    job: "journalctl --vacuum-time=1month --vacuum-size={{ journald_system_max_use | default('2G') }} > /dev/null 2>&1"
    user: root
```

## Forwarding to Centralized Logging

In production, you typically want to forward logs to a centralized system like Elasticsearch, Splunk, or Graylog.

Configure journal forwarding to syslog for centralized collection:

```yaml
- name: Configure journald to forward to syslog
  ansible.builtin.template:
    src: journald.conf.j2
    dest: /etc/systemd/journald.conf
  vars:
    journald_forward_to_syslog: "yes"
    journald_max_level_syslog: "info"
  notify: Restart journald

- name: Install rsyslog for forwarding
  ansible.builtin.apt:
    name: rsyslog
    state: present

- name: Configure rsyslog to forward to central server
  ansible.builtin.copy:
    dest: /etc/rsyslog.d/50-forward.conf
    content: |
      # Forward all logs to central syslog server
      *.* @{{ syslog_server }}:514
    mode: '0644'
  notify: Restart rsyslog
```

For direct journal forwarding with systemd-journal-remote:

```yaml
- name: Install journal remote tools
  ansible.builtin.apt:
    name: systemd-journal-remote
    state: present

- name: Configure journal upload to central server
  ansible.builtin.template:
    src: journal-upload.conf.j2
    dest: /etc/systemd/journal-upload.conf
    mode: '0644'
  notify: Restart journal-upload

- name: Enable journal-upload service
  ansible.builtin.systemd:
    name: systemd-journal-upload
    enabled: yes
    state: started
```

## Rate Limiting Configuration

Rate limiting prevents a misbehaving service from flooding the journal.

Configure rate limiting:

```yaml
- name: Deploy journald config with rate limiting
  ansible.builtin.template:
    src: journald.conf.j2
    dest: /etc/systemd/journald.conf
  vars:
    # Allow 10000 messages per 30-second interval per service
    journald_rate_limit_interval: "30s"
    journald_rate_limit_burst: 10000
  notify: Restart journald
```

To disable rate limiting for specific services (useful for high-volume loggers):

```yaml
- name: Create drop-in directory for high-volume service
  ansible.builtin.file:
    path: /etc/systemd/system/myapp.service.d
    state: directory
    mode: '0755'

- name: Disable rate limiting for myapp
  ansible.builtin.copy:
    dest: /etc/systemd/system/myapp.service.d/logging.conf
    content: |
      [Service]
      LogRateLimitIntervalSec=0
      LogRateLimitBurst=0
    mode: '0644'
  notify: Reload systemd
```

## Verifying Journal Health

Check that journald is working properly after configuration changes.

Verify journal health and configuration:

```yaml
- name: Check journald status
  ansible.builtin.command: systemctl status systemd-journald --no-pager
  register: journald_status
  changed_when: false

- name: Verify journal integrity
  ansible.builtin.command: journalctl --verify
  register: journal_verify
  changed_when: false
  failed_when: false

- name: Show journal file info
  ansible.builtin.command: journalctl --header
  register: journal_header
  changed_when: false

- name: Display journal statistics
  ansible.builtin.debug:
    msg: |
      Journald Status: {{ journald_status.stdout_lines[0] }}
      Disk Usage: {{ disk_usage.stdout }}
      Verification: {{ 'OK' if journal_verify.rc == 0 else 'Issues found' }}
```

## Filtering by Service and Priority

Configure services to log at specific levels:

```yaml
# Configure a service to only log warnings and above to journal
- name: Set service log level via drop-in
  ansible.builtin.copy:
    dest: /etc/systemd/system/chatty-service.service.d/logging.conf
    content: |
      [Service]
      # Only store warnings and above for this noisy service
      LogLevelMax=warning
    mode: '0644'
  notify: Reload systemd
```

## Summary

journald is a powerful structured logging system that benefits from proper configuration through Ansible. The key settings to tune are storage type (persistent vs volatile), disk space limits (`SystemMaxUse`, `SystemKeepFree`), retention policy (`MaxRetentionSec`), rate limiting to prevent log floods, and forwarding for centralized logging. Use templates with environment-specific variables so production gets more retention and stricter filtering while development gets verbose debug logging. Regular vacuuming through cron or systemd timers keeps disk usage under control, and journal verification ensures your logs are intact when you need them.
