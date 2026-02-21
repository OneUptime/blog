# How to Use the Ansible fetch Module to Download Files from Remote

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Remote Operations, DevOps

Description: Learn how to use the Ansible fetch module to download files from remote hosts to your local control node for backups, auditing, and log collection.

---

The Ansible `copy` module pushes files from the control node to remote hosts. The `fetch` module does the opposite: it pulls files from remote hosts back to the control node. This is essential for collecting log files, downloading backups, gathering configuration files for auditing, retrieving generated certificates, and pulling reports from remote systems.

This post covers how to use `fetch` effectively, including its directory structure behavior, flat mode, and practical patterns for common use cases.

## Basic File Fetch

The simplest usage pulls a single file from a remote host:

```yaml
# Fetch a file from a remote host to the control node
- name: Download application log
  ansible.builtin.fetch:
    src: /var/log/myapp/app.log
    dest: /tmp/collected-logs/
```

Here is the important part: `fetch` creates a directory structure based on the hostname. If you run this against a host called `webserver1`, the file ends up at:

```
/tmp/collected-logs/webserver1/var/log/myapp/app.log
```

This automatic directory structure prevents file name collisions when fetching the same file from multiple hosts.

## Using flat Mode

If you do not want the hostname directory structure, use `flat: true`:

```yaml
# Fetch a file without the hostname directory structure
- name: Download SSL certificate
  ansible.builtin.fetch:
    src: /etc/ssl/certs/myapp.crt
    dest: /tmp/myapp-cert.crt
    flat: true
```

With `flat: true`, the file is saved exactly at the `dest` path. Be careful when running against multiple hosts with `flat: true` because each host will overwrite the same destination file. To handle that, include the hostname in the destination path:

```yaml
# Fetch from multiple hosts without collisions using flat mode
- name: Download config from each host
  ansible.builtin.fetch:
    src: /etc/myapp/app.conf
    dest: "/tmp/configs/{{ inventory_hostname }}-app.conf"
    flat: true
```

## Fetching Log Files for Analysis

Collecting logs from multiple servers is one of the most common use cases:

```yaml
# collect-logs.yml - gather logs from all application servers
---
- name: Collect application logs
  hosts: app_servers
  become: true

  tasks:
    - name: Fetch current application log
      ansible.builtin.fetch:
        src: /var/log/myapp/app.log
        dest: "logs/{{ ansible_date_time.date }}/"

    - name: Fetch error log
      ansible.builtin.fetch:
        src: /var/log/myapp/error.log
        dest: "logs/{{ ansible_date_time.date }}/"

    - name: Fetch access log
      ansible.builtin.fetch:
        src: /var/log/nginx/access.log
        dest: "logs/{{ ansible_date_time.date }}/"
```

After running this against three web servers, you get:

```
logs/2024-06-15/
  web1.example.com/
    var/log/myapp/app.log
    var/log/myapp/error.log
    var/log/nginx/access.log
  web2.example.com/
    var/log/myapp/app.log
    var/log/myapp/error.log
    var/log/nginx/access.log
  web3.example.com/
    var/log/myapp/app.log
    var/log/myapp/error.log
    var/log/nginx/access.log
```

## Fetching Configuration Files for Auditing

Pull configuration files from all servers to compare them:

```yaml
# audit-configs.yml - collect configs for comparison
---
- name: Audit server configurations
  hosts: all
  become: true

  tasks:
    - name: Fetch SSH daemon config
      ansible.builtin.fetch:
        src: /etc/ssh/sshd_config
        dest: "audit/sshd/"

    - name: Fetch PAM configuration
      ansible.builtin.fetch:
        src: /etc/pam.d/sshd
        dest: "audit/pam/"

    - name: Fetch sudoers file
      ansible.builtin.fetch:
        src: /etc/sudoers
        dest: "audit/sudoers/"

    - name: Fetch system limits
      ansible.builtin.fetch:
        src: /etc/security/limits.conf
        dest: "audit/limits/"
```

After collecting, you can diff the files locally to find servers with inconsistent configurations:

```bash
# Compare SSH configs between two servers after fetching
diff audit/sshd/web1.example.com/etc/ssh/sshd_config \
     audit/sshd/web2.example.com/etc/ssh/sshd_config
```

## Fetching with Conditional Logic

Only fetch files that exist or meet certain criteria:

```yaml
# Fetch a file only if it exists on the remote host
- name: Check if crash dump exists
  ansible.builtin.stat:
    path: /var/crash/myapp-core.dump
  register: crash_dump

- name: Fetch crash dump for analysis
  ansible.builtin.fetch:
    src: /var/crash/myapp-core.dump
    dest: "crash-dumps/{{ inventory_hostname }}-core.dump"
    flat: true
  when: crash_dump.stat.exists
```

## Fetching Database Backups

Download database backups from the database server:

```yaml
# fetch-backup.yml - download the latest database backup
---
- name: Fetch database backup
  hosts: db_servers
  become: true
  become_user: postgres

  tasks:
    # First, create a fresh backup
    - name: Create database backup
      ansible.builtin.command:
        cmd: pg_dump -Fc myapp_db -f /var/backups/postgresql/myapp_db.dump
      changed_when: true

    - name: Compress the backup
      ansible.builtin.command:
        cmd: gzip -f /var/backups/postgresql/myapp_db.dump
      changed_when: true

    # Then fetch it to the control node
    - name: Download database backup
      ansible.builtin.fetch:
        src: /var/backups/postgresql/myapp_db.dump.gz
        dest: "backups/db/{{ ansible_date_time.date }}/{{ inventory_hostname }}-myapp_db.dump.gz"
        flat: true
```

## Fetching Generated Certificates

When certificates are generated on a remote host, fetch them for distribution:

```yaml
# fetch-certs.yml - collect generated certificates
---
- name: Fetch generated certificates
  hosts: ca_server
  become: true

  tasks:
    - name: Generate new SSL certificate
      ansible.builtin.command:
        cmd: >
          openssl req -x509 -nodes -days 365
          -newkey rsa:2048
          -keyout /etc/ssl/private/myapp.key
          -out /etc/ssl/certs/myapp.crt
          -subj "/CN=myapp.example.com"
      args:
        creates: /etc/ssl/certs/myapp.crt

    - name: Fetch the SSL certificate
      ansible.builtin.fetch:
        src: /etc/ssl/certs/myapp.crt
        dest: "certs/myapp.crt"
        flat: true

    - name: Fetch the SSL private key
      ansible.builtin.fetch:
        src: /etc/ssl/private/myapp.key
        dest: "certs/myapp.key"
        flat: true
```

## Handling Large Files

The `fetch` module transfers files through the Ansible connection (usually SSH). For very large files, this can be slow. There is no built-in compression option, but you can compress before fetching:

```yaml
# Compress a large file before fetching it
- name: Compress large log file
  ansible.builtin.archive:
    path: /var/log/myapp/app.log
    dest: /tmp/app-log-archive.tar.gz
    format: gz

- name: Fetch compressed log
  ansible.builtin.fetch:
    src: /tmp/app-log-archive.tar.gz
    dest: "logs/{{ inventory_hostname }}-app-log.tar.gz"
    flat: true

- name: Clean up compressed file on remote
  ansible.builtin.file:
    path: /tmp/app-log-archive.tar.gz
    state: absent
```

## Fetching Multiple Files with a Loop

To fetch several files, use a loop:

```yaml
# Fetch multiple configuration files
- name: Fetch application configuration files
  ansible.builtin.fetch:
    src: "/etc/myapp/{{ item }}"
    dest: "collected/{{ inventory_hostname }}/"
    flat: true
  loop:
    - app.conf
    - db.conf
    - cache.conf
    - logging.conf
```

However, `fetch` cannot use glob patterns. To fetch files matching a pattern, combine `find` with `fetch`:

```yaml
# Fetch all .conf files from a directory
- name: Find all config files
  ansible.builtin.find:
    paths: /etc/myapp/conf.d
    patterns: "*.conf"
  register: config_files

- name: Fetch each config file
  ansible.builtin.fetch:
    src: "{{ item.path }}"
    dest: "collected-configs/"
  loop: "{{ config_files.files }}"
  loop_control:
    label: "{{ item.path }}"
```

## Fetch vs Synchronize

For simple file pulls, `fetch` is the right choice. For syncing large directory trees or when you need rsync features like delta transfers, use the `synchronize` module with `mode: pull`:

```yaml
# For a single file or a few files, use fetch
- name: Fetch a single report
  ansible.builtin.fetch:
    src: /opt/reports/daily.pdf
    dest: reports/
    flat: true

# For large directory trees, synchronize with pull mode is more efficient
- name: Sync entire log directory
  ansible.posix.synchronize:
    src: /var/log/myapp/
    dest: /tmp/log-archive/{{ inventory_hostname }}/
    mode: pull
```

## Complete Example: Incident Response Log Collection

Here is a playbook designed for incident response, collecting all relevant data from affected servers:

```yaml
# incident-collect.yml - gather evidence during an incident
---
- name: Incident response data collection
  hosts: "{{ affected_hosts }}"
  become: true
  vars:
    incident_id: "INC-{{ ansible_date_time.epoch }}"
    collect_dir: "incidents/{{ incident_id }}"

  tasks:
    - name: Collect application logs
      ansible.builtin.fetch:
        src: "{{ item }}"
        dest: "{{ collect_dir }}/"
      loop:
        - /var/log/myapp/app.log
        - /var/log/myapp/error.log
        - /var/log/syslog
        - /var/log/auth.log
      ignore_errors: true

    - name: Collect running process snapshot
      ansible.builtin.shell:
        cmd: ps auxf > /tmp/process-snapshot.txt
      changed_when: true

    - name: Fetch process snapshot
      ansible.builtin.fetch:
        src: /tmp/process-snapshot.txt
        dest: "{{ collect_dir }}/"

    - name: Collect network connections
      ansible.builtin.shell:
        cmd: ss -tunap > /tmp/network-snapshot.txt
      changed_when: true

    - name: Fetch network snapshot
      ansible.builtin.fetch:
        src: /tmp/network-snapshot.txt
        dest: "{{ collect_dir }}/"

    - name: Clean up temporary files
      ansible.builtin.file:
        path: "{{ item }}"
        state: absent
      loop:
        - /tmp/process-snapshot.txt
        - /tmp/network-snapshot.txt
```

## Summary

The Ansible `fetch` module is the counterpart to `copy`, pulling files from remote hosts to the control node. By default it creates a hostname-based directory structure to prevent collisions, but `flat: true` gives you direct control over the destination path. Common use cases include log collection, configuration auditing, backup retrieval, and incident response. For large directory syncs, consider `synchronize` with `mode: pull` instead. Always check that files exist before fetching them, and compress large files on the remote host before transfer to save bandwidth.
