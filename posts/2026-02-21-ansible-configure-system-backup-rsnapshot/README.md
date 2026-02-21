# How to Use Ansible to Configure System Backup (rsnapshot)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Backup, rsnapshot, Linux

Description: Configure automated rsnapshot backups across your Linux servers using Ansible for space-efficient incremental system backups.

---

rsnapshot is a filesystem snapshot utility built on top of rsync. It creates space-efficient incremental backups using hard links, so unchanged files between snapshots only take up disk space once. This makes it surprisingly storage-friendly for maintaining many backup retention points. I have used rsnapshot on everything from small VPS instances to large bare-metal servers, and it consistently delivers reliable backups with minimal overhead.

This guide covers deploying and configuring rsnapshot across your server fleet using Ansible.

## How rsnapshot Works

Before diving into the Ansible code, understanding the backup mechanism helps:

```mermaid
flowchart LR
    A[Source Files] -->|rsync| B[hourly.0]
    B -->|rotate| C[hourly.1]
    C -->|rotate| D[hourly.2]
    D -->|rotate| E[daily.0]
    E -->|rotate| F[daily.1]
    F -->|rotate| G[weekly.0]

    style B fill:#2d5,color:#fff
    style C fill:#58a,color:#fff
    style D fill:#58a,color:#fff
    style E fill:#a85,color:#fff
    style F fill:#a85,color:#fff
    style G fill:#a58,color:#fff
```

Each rotation level shifts snapshots to the next slot. Hard links between snapshots mean unchanged files share disk blocks. A 100GB server might only use 110GB for a week of daily backups if most files do not change.

## Installing rsnapshot

```yaml
# install-rsnapshot.yml - Install rsnapshot on all servers
---
- name: Install rsnapshot
  hosts: backup_clients
  become: true

  tasks:
    # Install rsnapshot and rsync (rsnapshot depends on rsync)
    - name: Install rsnapshot (RedHat)
      ansible.builtin.yum:
        name:
          - rsnapshot
          - rsync
        state: present
      when: ansible_os_family == "RedHat"

    - name: Install rsnapshot (Debian)
      ansible.builtin.apt:
        name:
          - rsnapshot
          - rsync
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    # Create the backup storage directory
    - name: Create backup root directory
      ansible.builtin.file:
        path: /backup/snapshots
        state: directory
        owner: root
        group: root
        mode: '0700'
```

## Configuring rsnapshot

The configuration file is tab-delimited, which is a common source of frustration. Make sure your template uses actual tabs, not spaces.

```yaml
# configure-rsnapshot.yml - Deploy rsnapshot configuration
---
- name: Configure rsnapshot
  hosts: backup_clients
  become: true

  vars:
    rsnapshot_root: /backup/snapshots/
    rsnapshot_log: /var/log/rsnapshot.log
    rsnapshot_lockfile: /var/run/rsnapshot.pid

    # Retention policy
    rsnapshot_retain:
      - level: hourly
        count: 6
      - level: daily
        count: 7
      - level: weekly
        count: 4
      - level: monthly
        count: 6

    # Directories to back up from local system
    rsnapshot_backup_points:
      - source: /etc/
        dest: localhost/
      - source: /home/
        dest: localhost/
      - source: /var/log/
        dest: localhost/
      - source: /var/www/
        dest: localhost/
      - source: /opt/
        dest: localhost/

    # Directories to exclude from backups
    rsnapshot_excludes:
      - /var/log/journal/
      - "*.tmp"
      - ".cache/"
      - /var/cache/
      - /tmp/

  tasks:
    # Deploy the rsnapshot configuration file
    - name: Deploy rsnapshot.conf
      ansible.builtin.template:
        src: rsnapshot.conf.j2
        dest: /etc/rsnapshot.conf
        owner: root
        group: root
        mode: '0644'
        validate: "rsnapshot configtest"

    # Create exclude file
    - name: Deploy exclude list
      ansible.builtin.template:
        src: rsnapshot-exclude.j2
        dest: /etc/rsnapshot-exclude.conf
        owner: root
        group: root
        mode: '0644'

    # Test the configuration
    - name: Verify rsnapshot configuration
      ansible.builtin.command:
        cmd: rsnapshot configtest
      register: config_test
      changed_when: false

    - name: Display config test result
      ansible.builtin.debug:
        var: config_test.stdout
```

The rsnapshot.conf template (note: the spacing between config keys and values MUST be tabs):

```jinja2
# rsnapshot.conf - Managed by Ansible
# WARNING: This file uses TAB-separated values. Do not use spaces.

config_version	1.2

snapshot_root	{{ rsnapshot_root }}

cmd_cp	/bin/cp
cmd_rm	/bin/rm
cmd_rsync	/usr/bin/rsync
cmd_ssh	/usr/bin/ssh
cmd_logger	/usr/bin/logger
cmd_du	/usr/bin/du

# Retain settings
{% for retain in rsnapshot_retain %}
retain	{{ retain.level }}	{{ retain.count }}
{% endfor %}

verbose	2
loglevel	3
logfile	{{ rsnapshot_log }}
lockfile	{{ rsnapshot_lockfile }}

# Use lazy deletes to speed up rotations
link_dest	1

# Exclude file
exclude_file	/etc/rsnapshot-exclude.conf

# Backup points
{% for bp in rsnapshot_backup_points %}
backup	{{ bp.source }}	{{ bp.dest }}
{% endfor %}
```

The exclude file template:

```jinja2
# rsnapshot exclude patterns - Managed by Ansible
{% for exclude in rsnapshot_excludes %}
{{ exclude }}
{% endfor %}
```

## Setting Up Cron Schedules

rsnapshot does not run as a daemon. It relies on cron to trigger each retention level at the right interval:

```yaml
# schedule-rsnapshot.yml - Configure cron jobs for rsnapshot backup schedules
---
- name: Schedule rsnapshot backups
  hosts: backup_clients
  become: true

  tasks:
    # Hourly snapshots every 4 hours
    - name: Schedule hourly rsnapshot
      ansible.builtin.cron:
        name: "rsnapshot hourly"
        minute: "0"
        hour: "*/4"
        job: "/usr/bin/rsnapshot hourly >> /var/log/rsnapshot-cron.log 2>&1"
        user: root

    # Daily snapshot at 11:30 PM
    - name: Schedule daily rsnapshot
      ansible.builtin.cron:
        name: "rsnapshot daily"
        minute: "30"
        hour: "23"
        job: "/usr/bin/rsnapshot daily >> /var/log/rsnapshot-cron.log 2>&1"
        user: root

    # Weekly snapshot on Sunday at 11:00 PM
    - name: Schedule weekly rsnapshot
      ansible.builtin.cron:
        name: "rsnapshot weekly"
        minute: "0"
        hour: "23"
        weekday: "0"
        job: "/usr/bin/rsnapshot weekly >> /var/log/rsnapshot-cron.log 2>&1"
        user: root

    # Monthly snapshot on the 1st at 10:30 PM
    - name: Schedule monthly rsnapshot
      ansible.builtin.cron:
        name: "rsnapshot monthly"
        minute: "30"
        hour: "22"
        day: "1"
        job: "/usr/bin/rsnapshot monthly >> /var/log/rsnapshot-cron.log 2>&1"
        user: root
```

## Remote Backups with rsnapshot

rsnapshot can also pull backups from remote servers over SSH. This is great for centralizing backups:

```yaml
# remote-rsnapshot.yml - Configure rsnapshot to pull backups from remote hosts
---
- name: Configure remote backup pulling
  hosts: backup_server
  become: true

  vars:
    remote_backup_targets:
      - host: web-01
        ip: 10.0.2.10
        paths:
          - /etc/
          - /var/www/
          - /home/
      - host: db-01
        ip: 10.0.2.20
        paths:
          - /etc/
          - /var/lib/mysql/
      - host: app-01
        ip: 10.0.2.30
        paths:
          - /etc/
          - /opt/app/
          - /var/log/app/

  tasks:
    # Generate SSH key for backup user if needed
    - name: Generate backup SSH key
      ansible.builtin.user:
        name: root
        generate_ssh_key: true
        ssh_key_type: ed25519
        ssh_key_file: /root/.ssh/rsnapshot_key
        ssh_key_comment: "rsnapshot backup key"

    # Read the public key for distribution
    - name: Read backup public key
      ansible.builtin.slurp:
        src: /root/.ssh/rsnapshot_key.pub
      register: backup_pubkey

    # Deploy the public key to all remote targets
    - name: Deploy backup key to remote hosts
      ansible.posix.authorized_key:
        user: root
        key: "{{ backup_pubkey.content | b64decode }}"
        key_options: 'command="/usr/bin/rsync --server --sender -vlHogDtprze.iLsfxCIvu . /",no-port-forwarding,no-X11-forwarding,no-pty'
      delegate_to: "{{ item.ip }}"
      loop: "{{ remote_backup_targets }}"

    # Add remote backup points to rsnapshot config
    - name: Add remote backup entries to rsnapshot.conf
      ansible.builtin.blockinfile:
        path: /etc/rsnapshot.conf
        marker: "# {mark} REMOTE BACKUPS - ANSIBLE MANAGED"
        block: |
          {% for target in remote_backup_targets %}
          {% for path in target.paths %}
          backup	root@{{ target.ip }}:{{ path }}	{{ target.host }}/
          {% endfor %}
          {% endfor %}

    # Test the configuration after adding remote entries
    - name: Validate updated configuration
      ansible.builtin.command:
        cmd: rsnapshot configtest
      register: config_result
      changed_when: false

    - name: Show configuration test result
      ansible.builtin.debug:
        var: config_result.stdout
```

## Monitoring Backup Status

You need to know if backups are running successfully. Here is a monitoring playbook:

```yaml
# monitor-rsnapshot.yml - Check rsnapshot backup health
---
- name: Monitor rsnapshot backup status
  hosts: backup_clients
  become: true

  tasks:
    # Check when the last backup ran
    - name: Get last backup timestamp
      ansible.builtin.stat:
        path: "/backup/snapshots/hourly.0"
      register: last_backup

    # Calculate backup age in hours
    - name: Calculate backup age
      ansible.builtin.set_fact:
        backup_age_hours: "{{ ((ansible_date_time.epoch | int) - (last_backup.stat.mtime | default(0) | int)) / 3600 }}"
      when: last_backup.stat.exists | default(false)

    # Alert if backup is too old
    - name: Alert on stale backups
      ansible.builtin.debug:
        msg: "WARNING: Last backup on {{ inventory_hostname }} is {{ backup_age_hours | round(1) }} hours old!"
      when:
        - backup_age_hours is defined
        - backup_age_hours | float > 8

    # Check backup disk usage
    - name: Check backup storage usage
      ansible.builtin.command:
        cmd: du -sh /backup/snapshots/
      register: backup_usage
      changed_when: false

    - name: Display backup usage
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: {{ backup_usage.stdout }}"

    # Check for errors in the rsnapshot log
    - name: Check for recent errors
      ansible.builtin.shell:
        cmd: "tail -100 /var/log/rsnapshot.log | grep -i 'error\\|warning\\|failed' || echo 'No errors found'"
      register: backup_errors
      changed_when: false

    - name: Display any errors
      ansible.builtin.debug:
        var: backup_errors.stdout_lines

    # List available snapshots
    - name: List available snapshots
      ansible.builtin.command:
        cmd: ls -la /backup/snapshots/
      register: snapshot_list
      changed_when: false

    - name: Display snapshots
      ansible.builtin.debug:
        var: snapshot_list.stdout_lines
```

## Restoring from rsnapshot

Restoration is simple because rsnapshot backups are just directories. But here is a playbook to make it more structured:

```yaml
# restore-rsnapshot.yml - Restore files from rsnapshot backup
---
- name: Restore from rsnapshot backup
  hosts: "{{ target_host }}"
  become: true

  vars:
    snapshot: daily.1
    restore_source: /backup/snapshots/{{ snapshot }}/localhost/etc/
    restore_dest: /tmp/restore/etc/

  tasks:
    # Create the restore directory
    - name: Create restore target directory
      ansible.builtin.file:
        path: "{{ restore_dest }}"
        state: directory
        mode: '0700'

    # Restore files using rsync (preserves permissions and attributes)
    - name: Restore files from snapshot
      ansible.builtin.command:
        cmd: "rsync -avH {{ restore_source }} {{ restore_dest }}"
      register: restore_result

    - name: Display restore summary
      ansible.builtin.debug:
        var: restore_result.stdout_lines
```

## Production Tips

From running rsnapshot across hundreds of servers:

1. Schedule retention levels at staggered times. If hourly runs at the top of the hour and daily runs at the same time, they will conflict because rsnapshot uses a lockfile. I schedule daily at XX:30, weekly on Sunday at XX:00, and monthly on the 1st at an earlier hour.

2. Watch your disk space. rsnapshot is efficient with hard links, but if you have files that change frequently (like database files), each snapshot will contain a full copy. Monitor `/backup/snapshots` usage and adjust retention counts accordingly.

3. The `configtest` command is your friend. Always validate the config before deploying. The tab vs. space issue in rsnapshot.conf has tripped up every sysadmin I know at least once.

4. For database servers, dump the database to a file first, then let rsnapshot back up the dump. Backing up live database files with rsnapshot will give you corrupt backups.

5. When doing remote backups, restrict the SSH key to rsync commands only using the `command=` option in authorized_keys. This limits what a compromised backup server can do on your production hosts.

rsnapshot is not flashy, but it is dependable. Combined with Ansible, it gives you a fleet-wide backup solution that costs nothing, works reliably, and can be restored by anyone who understands filesystem directories.
