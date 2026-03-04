# How to Set Up Disk Space Alerts with RHEL System Roles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, System Roles, Ansible, Storage, Monitoring, Alerts, Linux

Description: Learn how to use RHEL System Roles with Ansible to set up automated disk space monitoring and alerts across your infrastructure.

---

Running out of disk space is one of the most common causes of application failures and system instability. RHEL System Roles provide an Ansible-based approach to configure storage monitoring and alerting consistently across your entire fleet of servers.

## What Are RHEL System Roles

RHEL System Roles are a collection of Ansible roles that Red Hat maintains for consistent system configuration. They cover networking, storage, time synchronization, logging, and more. Using these roles ensures your configuration follows Red Hat best practices and is reproducible across systems.

## Installing Prerequisites

On your Ansible control node:

```bash
sudo dnf install rhel-system-roles ansible-core
```

The system roles are installed to `/usr/share/ansible/roles/`.

## Understanding the Storage Role

The `rhel-system-roles.storage` role manages disks, partitions, LVM, and file systems. While it focuses on provisioning, you can combine it with the metrics role for monitoring.

List available system roles:

```bash
ls /usr/share/ansible/roles/ | grep rhel
```

## Setting Up Metrics Collection with the Metrics Role

The `rhel-system-roles.metrics` role configures Performance Co-Pilot (PCP) for system metrics collection, including disk space monitoring:

```yaml
# playbook-metrics.yml
---
- name: Configure disk space monitoring
  hosts: all
  become: true
  vars:
    metrics_retention_days: 14
    metrics_monitored_hosts: []
  roles:
    - rhel-system-roles.metrics
```

Run the playbook:

```bash
ansible-playbook -i inventory playbook-metrics.yml
```

This installs and configures PCP to collect metrics including disk usage.

## Creating Custom Disk Space Alert Scripts

While system roles handle metrics collection, you can deploy alert scripts using Ansible:

```yaml
# playbook-disk-alerts.yml
---
- name: Deploy disk space alerts
  hosts: all
  become: true
  tasks:
    - name: Create disk monitoring script
      copy:
        dest: /usr/local/bin/check_disk_space.sh
        mode: '0755'
        content: |
          #!/bin/bash
          THRESHOLD=85
          CRITICAL=95
          MAILTO="admin@example.com"

          df -Ph | grep -vE '^Filesystem|tmpfs|cdrom' | while read line; do
            USAGE=$(echo "$line" | awk '{print $5}' | tr -d '%')
            PARTITION=$(echo "$line" | awk '{print $6}')
            DEVICE=$(echo "$line" | awk '{print $1}')
            HOSTNAME=$(hostname)

            if [ "$USAGE" -ge "$CRITICAL" ]; then
              logger -p local0.crit "CRITICAL: $PARTITION ($DEVICE) is ${USAGE}% full on $HOSTNAME"
            elif [ "$USAGE" -ge "$THRESHOLD" ]; then
              logger -p local0.warning "WARNING: $PARTITION ($DEVICE) is ${USAGE}% full on $HOSTNAME"
            fi
          done

    - name: Create systemd timer for disk monitoring
      copy:
        dest: /etc/systemd/system/check-disk-space.timer
        content: |
          [Unit]
          Description=Check disk space every 15 minutes

          [Timer]
          OnBootSec=5min
          OnUnitActiveSec=15min

          [Install]
          WantedBy=timers.target

    - name: Create systemd service for disk monitoring
      copy:
        dest: /etc/systemd/system/check-disk-space.service
        content: |
          [Unit]
          Description=Check disk space usage

          [Service]
          Type=oneshot
          ExecStart=/usr/local/bin/check_disk_space.sh

    - name: Enable disk space check timer
      systemd:
        name: check-disk-space.timer
        enabled: yes
        state: started
        daemon_reload: yes
```

## Using the Storage Role for Provisioning

The storage role ensures partitions are properly sized from the start:

```yaml
# playbook-storage.yml
---
- name: Configure storage with proper sizing
  hosts: all
  become: true
  vars:
    storage_pools:
      - name: data_vg
        disks:
          - /dev/sdb
        volumes:
          - name: app_data
            size: "80%FREE"
            mount_point: /data
            fs_type: xfs
          - name: app_logs
            size: "20%FREE"
            mount_point: /var/log/app
            fs_type: xfs
  roles:
    - rhel-system-roles.storage
```

## Configuring PCP Disk Alerts

After the metrics role sets up PCP, configure disk space alerts using pmie (Performance Metrics Inference Engine):

```yaml
- name: Configure PCP disk space alerts
  hosts: all
  become: true
  tasks:
    - name: Create pmie disk alert rules
      copy:
        dest: /etc/pcp/pmie/config.d/disk_space.pmie
        content: |
          // Alert when any filesystem is above 85% full
          filesys.full $1 > 85 ->
            syslog "Disk space warning: %i is %v%% full";

          // Critical alert when any filesystem is above 95% full
          filesys.full $1 > 95 ->
            syslog "CRITICAL: Disk space critical: %i is %v%% full";

    - name: Restart pmie service
      systemd:
        name: pmie
        state: restarted
```

## Monitoring with pmrep

After PCP is configured, query disk metrics:

```bash
# Current disk utilization
pmrep disk.dev.read disk.dev.write -t 5

# File system usage
pmrep filesys.full -t 5
```

## Integrating with systemd Journal

Configure alerts to go to the systemd journal for centralized logging:

```bash
journalctl -p warning -t check_disk_space
```

## Creating an Ansible Inventory for Monitoring

```ini
# inventory
[webservers]
web1.example.com
web2.example.com

[dbservers]
db1.example.com
db2.example.com

[all:vars]
ansible_user=admin
```

## Summary

RHEL System Roles provide a consistent, Ansible-based approach to storage configuration and monitoring. The metrics role sets up PCP for comprehensive data collection, while custom playbooks deploy disk space alert scripts across your infrastructure. Combining the storage role for proper provisioning with automated monitoring ensures you catch disk space issues before they cause outages.
