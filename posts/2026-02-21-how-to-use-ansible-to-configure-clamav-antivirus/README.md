# How to Use Ansible to Configure ClamAV Antivirus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ClamAV, Antivirus, Security, Linux

Description: Automate ClamAV antivirus deployment, configuration, and scheduled scanning across your Linux servers using Ansible playbooks.

---

Running antivirus on Linux servers might seem unnecessary to some, but if you work in regulated industries or your servers handle file uploads, ClamAV is a solid choice. It is open source, well-maintained, and handles the job without the bloat of commercial alternatives. The problem is deploying and maintaining it across dozens or hundreds of servers. That is where Ansible comes in.

In this post, I will walk through setting up ClamAV with Ansible, from installation to scheduled scans to automated signature updates.

## Why ClamAV on Linux?

ClamAV is not just for Windows virus detection. It catches Linux-specific malware, web shells, and malicious scripts. If your server handles file uploads (think email gateways, file sharing services, or web applications), scanning those files before they reach users is essential. Even if you are not processing user files, compliance frameworks like PCI DSS often require antivirus on all systems.

## Installing ClamAV

Let's start with installation. ClamAV has two main components: the scanning engine (`clamav`) and the signature update daemon (`freshclam`).

This playbook installs ClamAV and its update daemon on both Debian and RHEL systems:

```yaml
# install_clamav.yml - Install ClamAV antivirus
---
- name: Install ClamAV
  hosts: all
  become: true

  tasks:
    - name: Install ClamAV on Debian/Ubuntu
      ansible.builtin.apt:
        name:
          - clamav
          - clamav-daemon
          - clamav-freshclam
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Install ClamAV on RHEL/CentOS
      ansible.builtin.yum:
        name:
          - clamav
          - clamav-update
          - clamd
        state: present
      when: ansible_os_family == "RedHat"

    - name: Create ClamAV directories
      ansible.builtin.file:
        path: "{{ item }}"
        state: directory
        owner: clamav
        group: clamav
        mode: '0755'
      loop:
        - /var/lib/clamav
        - /var/log/clamav
        - /var/run/clamav
```

## Configuring freshclam (Signature Updates)

The freshclam daemon keeps virus definitions up to date. Without current signatures, your antivirus is useless.

This playbook configures freshclam to update signatures automatically:

```yaml
# configure_freshclam.yml - Configure ClamAV signature updates
---
- name: Configure freshclam
  hosts: all
  become: true

  vars:
    freshclam_checks_per_day: 12   # Check every 2 hours
    freshclam_database_mirror: "database.clamav.net"
    freshclam_log_file: /var/log/clamav/freshclam.log
    freshclam_log_rotate: true

  tasks:
    - name: Deploy freshclam configuration
      ansible.builtin.template:
        src: freshclam.conf.j2
        dest: /etc/clamav/freshclam.conf
        owner: root
        group: root
        mode: '0644'
      notify: restart freshclam

    - name: Stop freshclam before initial update
      ansible.builtin.service:
        name: clamav-freshclam
        state: stopped
      failed_when: false

    - name: Run initial signature update
      ansible.builtin.command: freshclam
      register: freshclam_result
      changed_when: "'updated' in freshclam_result.stdout"
      failed_when: false

    - name: Start and enable freshclam
      ansible.builtin.service:
        name: clamav-freshclam
        state: started
        enabled: true

  handlers:
    - name: restart freshclam
      ansible.builtin.service:
        name: clamav-freshclam
        state: restarted
```

The freshclam configuration template:

```ini
# templates/freshclam.conf.j2 - ClamAV signature update configuration
# Managed by Ansible

DatabaseOwner clamav
UpdateLogFile {{ freshclam_log_file }}
LogVerbose false
LogSyslog false
LogFacility LOG_LOCAL6
LogFileMaxSize 2M
{% if freshclam_log_rotate %}
LogRotate true
{% endif %}
LogTime true
DatabaseDirectory /var/lib/clamav
DatabaseMirror {{ freshclam_database_mirror }}
MaxAttempts 5
ScriptedUpdates yes
CompressLocalDatabase no
Checks {{ freshclam_checks_per_day }}
ConnectTimeout 30
ReceiveTimeout 30
```

## Configuring clamd (Scanning Daemon)

The clamd daemon runs in the background and provides on-demand scanning through a socket.

This playbook configures the ClamAV scanning daemon:

```yaml
# configure_clamd.yml - Configure ClamAV scanning daemon
---
- name: Configure clamd
  hosts: all
  become: true

  vars:
    clamd_max_filesize: "25M"
    clamd_max_scansize: "100M"
    clamd_max_recursion: 16
    clamd_max_files: 10000
    clamd_scan_pe: true           # Scan Windows executables
    clamd_scan_elf: true          # Scan Linux executables
    clamd_scan_ole2: true         # Scan Office documents
    clamd_scan_pdf: true          # Scan PDF files
    clamd_scan_html: true         # Scan HTML files
    clamd_scan_archive: true      # Scan compressed archives
    clamd_alert_exceeds_max: true # Alert on files that exceed limits

  tasks:
    - name: Deploy clamd configuration
      ansible.builtin.template:
        src: clamd.conf.j2
        dest: /etc/clamav/clamd.conf
        owner: root
        group: root
        mode: '0644'
      notify: restart clamd

    - name: Enable and start clamd
      ansible.builtin.service:
        name: clamav-daemon
        state: started
        enabled: true

  handlers:
    - name: restart clamd
      ansible.builtin.service:
        name: clamav-daemon
        state: restarted
```

The clamd configuration template:

```ini
# templates/clamd.conf.j2 - ClamAV daemon configuration
# Managed by Ansible

LocalSocket /var/run/clamav/clamd.ctl
FixStaleSocket true
LocalSocketGroup clamav
LocalSocketMode 666
User clamav
ReadTimeout 180
MaxThreads 12
MaxConnectionQueueLength 15
LogSyslog false
LogFacility LOG_LOCAL6
LogClean false
LogVerbose false
LogFile /var/log/clamav/clamav.log
LogFileUnlock false
LogFileMaxSize 2M
LogRotate true
LogTime true
PreludeEnable no
DatabaseDirectory /var/lib/clamav
OfficialDatabaseOnly false
SelfCheck 3600
Foreground false
MaxDirectoryRecursion {{ clamd_max_recursion }}
MaxFiles {{ clamd_max_files }}
MaxFileSize {{ clamd_max_filesize }}
MaxScanSize {{ clamd_max_scansize }}
ScanPE {{ 'true' if clamd_scan_pe else 'false' }}
ScanELF {{ 'true' if clamd_scan_elf else 'false' }}
ScanOLE2 {{ 'true' if clamd_scan_ole2 else 'false' }}
ScanPDF {{ 'true' if clamd_scan_pdf else 'false' }}
ScanHTML {{ 'true' if clamd_scan_html else 'false' }}
ScanArchive {{ 'true' if clamd_scan_archive else 'false' }}
AlertExceedsMax {{ 'true' if clamd_alert_exceeds_max else 'false' }}
```

## Setting Up Scheduled Scans

Regular full scans catch anything that might have slipped through. This sets up a cron-based scanning schedule.

This playbook deploys a scanning script and schedules it via cron:

```yaml
# schedule_scans.yml - Set up scheduled ClamAV scans
---
- name: Configure scheduled ClamAV scans
  hosts: all
  become: true

  vars:
    scan_directories:
      - /home
      - /tmp
      - /var/tmp
      - /var/www
      - /opt
    scan_hour: 2
    scan_minute: 0
    scan_day_of_week: "*"  # Every day. Use "0" for Sunday only
    alert_email: security@example.com
    quarantine_dir: /var/lib/clamav/quarantine

  tasks:
    - name: Create quarantine directory
      ansible.builtin.file:
        path: "{{ quarantine_dir }}"
        state: directory
        owner: clamav
        group: clamav
        mode: '0700'

    - name: Deploy scan script
      ansible.builtin.copy:
        content: |
          #!/bin/bash
          # ClamAV scheduled scan script - Managed by Ansible
          SCAN_LOG="/var/log/clamav/scan-$(date +%Y%m%d-%H%M%S).log"
          QUARANTINE="{{ quarantine_dir }}"
          SCAN_DIRS="{{ scan_directories | join(' ') }}"

          echo "ClamAV scan started: $(date)" > "$SCAN_LOG"
          echo "Directories: $SCAN_DIRS" >> "$SCAN_LOG"
          echo "---" >> "$SCAN_LOG"

          clamscan \
              --recursive \
              --infected \
              --move="$QUARANTINE" \
              --log="$SCAN_LOG" \
              --max-filesize=25M \
              --max-scansize=100M \
              $SCAN_DIRS

          SCAN_EXIT=$?

          echo "---" >> "$SCAN_LOG"
          echo "Scan completed: $(date)" >> "$SCAN_LOG"
          echo "Exit code: $SCAN_EXIT" >> "$SCAN_LOG"

          # Send alert if infections found
          if [ $SCAN_EXIT -eq 1 ]; then
              INFECTED=$(grep "FOUND" "$SCAN_LOG" | wc -l)
              echo "ClamAV found $INFECTED infected file(s) on $(hostname)" | \
                  mail -s "ClamAV Alert: Infections on $(hostname)" \
                  {{ alert_email }} < "$SCAN_LOG"
          fi

          # Clean up old scan logs (keep 30 days)
          find /var/log/clamav/ -name "scan-*.log" -mtime +30 -delete
        dest: /usr/local/bin/clamav-scan.sh
        owner: root
        group: root
        mode: '0700'

    - name: Schedule scan via cron
      ansible.builtin.cron:
        name: "ClamAV scheduled scan"
        hour: "{{ scan_hour }}"
        minute: "{{ scan_minute }}"
        weekday: "{{ scan_day_of_week }}"
        job: "/usr/local/bin/clamav-scan.sh"
        user: root
```

## On-Access Scanning

For servers handling file uploads, on-access scanning checks files as they are created or modified.

This playbook configures on-access scanning for specific directories:

```yaml
# on_access_scanning.yml - Configure real-time file scanning
---
- name: Configure on-access scanning
  hosts: file_servers
  become: true

  vars:
    on_access_dirs:
      - /var/www/uploads
      - /srv/shared

  tasks:
    - name: Add on-access configuration to clamd
      ansible.builtin.blockinfile:
        path: /etc/clamav/clamd.conf
        block: |
          # On-access scanning configuration
          OnAccessMountPath {{ on_access_dirs | join('\nOnAccessMountPath ') }}
          OnAccessPrevention false
          OnAccessExtraScanning true
          OnAccessExcludeUname clamav
        marker: "# {mark} ANSIBLE MANAGED - ON ACCESS SCANNING"
      notify: restart clamd

    - name: Enable clamonacc service
      ansible.builtin.systemd:
        name: clamav-clamonacc
        state: started
        enabled: true
      failed_when: false

  handlers:
    - name: restart clamd
      ansible.builtin.service:
        name: clamav-daemon
        state: restarted
```

## Monitoring ClamAV Health

Make sure ClamAV is running and signatures are current:

```yaml
# monitor_clamav.yml - Check ClamAV health
---
- name: Monitor ClamAV health
  hosts: all
  become: true

  vars:
    max_signature_age_days: 2

  tasks:
    - name: Check clamd service status
      ansible.builtin.service_facts:

    - name: Verify clamd is running
      ansible.builtin.assert:
        that:
          - "'clamav-daemon.service' in ansible_facts.services"
          - "ansible_facts.services['clamav-daemon.service'].state == 'running'"
        fail_msg: "ClamAV daemon is not running on {{ inventory_hostname }}"

    - name: Check signature database age
      ansible.builtin.stat:
        path: /var/lib/clamav/daily.cvd
      register: sig_file

    - name: Calculate signature age in days
      ansible.builtin.set_fact:
        sig_age_days: "{{ ((ansible_date_time.epoch | int) - (sig_file.stat.mtime | int)) / 86400 }}"

    - name: Alert if signatures are stale
      ansible.builtin.debug:
        msg: "WARNING: ClamAV signatures on {{ inventory_hostname }} are {{ sig_age_days | round(1) }} days old"
      when: sig_age_days | float > max_signature_age_days
```

## Practical Advice

Running ClamAV across a fleet has taught me a few things:

1. **Do not use clamscan for scheduled scans on busy servers.** Use `clamdscan` instead, which connects to the running daemon and uses far less memory than spawning a new scan process.
2. **Monitor freshclam failures.** If your firewall blocks the update servers, your signatures go stale silently.
3. **Tune file size limits.** Scanning very large files wastes resources. Set limits appropriate for your use case.
4. **Use quarantine, not delete.** Automatically deleting detected files can break applications. Quarantine and review.
5. **Watch memory usage.** clamd keeps the signature database in memory (around 1GB). Make sure your servers have enough RAM.

ClamAV with Ansible gives you fleet-wide antivirus management that is consistent, auditable, and maintainable. The initial setup takes some effort, but once the playbooks are in place, you can deploy and manage antivirus across your entire infrastructure with a single command.
