# How to Use the Ansible blockinfile Module to Add Text Blocks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration Management, File Editing, DevOps

Description: Learn how to use the Ansible blockinfile module to insert, update, and manage multi-line text blocks in configuration files on remote hosts.

---

While `lineinfile` handles individual lines, many configuration changes involve multiple related lines that should be treated as a unit. Adding a server block to Nginx, a mount entry to fstab, a set of environment variables, or a firewall rule section all involve groups of lines. The Ansible `blockinfile` module inserts a block of text into a file, wrapped in marker comments that identify it. On subsequent runs, Ansible updates the block content between those markers without affecting the rest of the file.

This post covers how `blockinfile` works, its marker system, placement options, and practical examples.

## Basic Block Insertion

The simplest use inserts a block of text at the end of a file:

```yaml
# Add a block of text to the end of a file
- name: Add custom DNS settings
  ansible.builtin.blockinfile:
    path: /etc/resolv.conf
    block: |
      nameserver 10.0.0.2
      nameserver 10.0.0.3
      search internal.example.com
```

After running this, the file will contain:

```
# (existing content...)
# BEGIN ANSIBLE MANAGED BLOCK
nameserver 10.0.0.2
nameserver 10.0.0.3
search internal.example.com
# END ANSIBLE MANAGED BLOCK
```

The `BEGIN` and `END` marker comments are added automatically. On the next run, if you change the `block` content, Ansible replaces everything between the markers. If the content is the same, it reports "ok".

## How Idempotency Works

The key to `blockinfile` is the marker system. Ansible uses the markers to find the existing block and update it. This means:

1. First run: The block is inserted with its markers
2. Second run (same content): No changes, reports "ok"
3. Third run (different content): Only the content between markers is updated

```yaml
# First run adds the block, second run with same content does nothing
- name: Add monitoring configuration
  ansible.builtin.blockinfile:
    path: /etc/myapp/app.conf
    block: |
      # Monitoring settings
      metrics_enabled=true
      metrics_port=9090
      metrics_path=/metrics
```

## Controlling Placement with insertafter and insertbefore

By default, the block is appended at the end of the file. You can control where it goes:

```yaml
# Insert the block after a specific line
- name: Add proxy settings after the server block opens
  ansible.builtin.blockinfile:
    path: /etc/nginx/sites-available/myapp
    insertafter: "location / \\{"
    block: |
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

```yaml
# Insert before a specific line
- name: Add headers before the closing brace
  ansible.builtin.blockinfile:
    path: /etc/nginx/sites-available/myapp
    insertbefore: "^\\}"
    block: |
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options "nosniff";
```

You can also use `BOF` and `EOF` for beginning and end of file:

```yaml
# Add a header at the very beginning of the file
- name: Add file header
  ansible.builtin.blockinfile:
    path: /etc/myapp/app.conf
    insertbefore: BOF
    block: |
      # Application Configuration
      # Managed by Ansible - do not edit manually
      # Last updated: {{ ansible_date_time.date }}
```

## Using the block Parameter with Variables

You can include Jinja2 variables and expressions in the block:

```yaml
# Generate a block with dynamic content
- name: Add application environment block
  ansible.builtin.blockinfile:
    path: /etc/myapp/.env
    block: |
      APP_NAME={{ app_name }}
      APP_ENV={{ app_environment }}
      APP_PORT={{ app_port }}
      DB_HOST={{ db_host }}
      DB_PORT={{ db_port }}
      DB_NAME={{ db_name }}
    create: true
    owner: myapp
    group: myapp
    mode: "0600"
```

## Managing Multiple Blocks in the Same File

If you need to insert multiple separate blocks into the same file, use the `marker` parameter with unique identifiers (covered in more detail in the custom markers post). Here is a quick preview:

```yaml
# Add two separate blocks to the same file
- name: Add database settings block
  ansible.builtin.blockinfile:
    path: /etc/myapp/app.conf
    marker: "# {mark} DATABASE SETTINGS"
    block: |
      db_host=localhost
      db_port=5432
      db_name=myapp

- name: Add cache settings block
  ansible.builtin.blockinfile:
    path: /etc/myapp/app.conf
    marker: "# {mark} CACHE SETTINGS"
    block: |
      cache_backend=redis
      cache_host=localhost
      cache_port=6379
```

This produces:

```
# BEGIN DATABASE SETTINGS
db_host=localhost
db_port=5432
db_name=myapp
# END DATABASE SETTINGS
# BEGIN CACHE SETTINGS
cache_backend=redis
cache_host=localhost
cache_port=6379
# END CACHE SETTINGS
```

## Removing a Block

Set `state: absent` to remove a block:

```yaml
# Remove a previously added block
- name: Remove deprecated configuration block
  ansible.builtin.blockinfile:
    path: /etc/myapp/app.conf
    marker: "# {mark} DEPRECATED SETTINGS"
    state: absent
```

This removes the markers and everything between them.

## Creating Files with blockinfile

Use `create: true` to create the file if it does not exist:

```yaml
# Create a new configuration file with a block of content
- name: Create monitoring configuration
  ansible.builtin.blockinfile:
    path: /etc/prometheus/alerting_rules.yml
    create: true
    owner: prometheus
    group: prometheus
    mode: "0644"
    block: |
      groups:
        - name: application
          rules:
            - alert: HighErrorRate
              expr: rate(http_errors_total[5m]) > 0.1
              for: 5m
              labels:
                severity: critical
```

## Backup Before Modification

Like other file-editing modules, `blockinfile` supports the `backup` parameter:

```yaml
# Add block with backup of original file
- name: Add firewall rules block
  ansible.builtin.blockinfile:
    path: /etc/iptables/rules.v4
    backup: true
    insertbefore: "^-A INPUT -j DROP"
    block: |
      -A INPUT -p tcp --dport 8080 -j ACCEPT
      -A INPUT -p tcp --dport 8443 -j ACCEPT
      -A INPUT -p tcp --dport 9090 -j ACCEPT
```

## Practical Examples

### Adding SSH Authorized Keys

```yaml
# Add a block of SSH keys for a team
- name: Add DevOps team SSH keys
  ansible.builtin.blockinfile:
    path: /home/deploy/.ssh/authorized_keys
    create: true
    owner: deploy
    group: deploy
    mode: "0600"
    marker: "# {mark} DEVOPS TEAM KEYS"
    block: |
      ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBxx... alice@devops
      ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICyy... bob@devops
      ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDzz... carol@devops
```

### Adding Cron Jobs

```yaml
# Add a block of cron jobs
- name: Add application cron jobs
  ansible.builtin.blockinfile:
    path: /etc/cron.d/myapp
    create: true
    owner: root
    group: root
    mode: "0644"
    block: |
      # Run cleanup every hour
      0 * * * * myapp /opt/myapp/bin/cleanup.sh >> /var/log/myapp/cleanup.log 2>&1
      # Run backup every day at 2am
      0 2 * * * myapp /opt/myapp/bin/backup.sh >> /var/log/myapp/backup.log 2>&1
      # Run health check every 5 minutes
      */5 * * * * myapp /opt/myapp/bin/healthcheck.sh >> /var/log/myapp/health.log 2>&1
```

### Adding Environment Variables to Shell Profile

```yaml
# Add application environment to system profile
- name: Set application environment variables
  ansible.builtin.blockinfile:
    path: /etc/profile.d/myapp.sh
    create: true
    mode: "0644"
    block: |
      export MYAPP_HOME=/opt/myapp/current
      export MYAPP_CONF=/etc/myapp
      export MYAPP_LOG=/var/log/myapp
      export PATH="$MYAPP_HOME/bin:$PATH"
```

### Adding HAProxy Backend Servers

```yaml
# Add backend servers to HAProxy configuration
- name: Configure HAProxy backend servers
  ansible.builtin.blockinfile:
    path: /etc/haproxy/haproxy.cfg
    insertafter: "^backend app_servers"
    marker: "# {mark} APP SERVER LIST"
    block: |
      server app1 10.0.1.10:8080 check
      server app2 10.0.1.11:8080 check
      server app3 10.0.1.12:8080 check
  notify: Reload HAProxy
```

## Complete Example: Full Application Configuration

```yaml
# configure-app.yml - comprehensive configuration using blockinfile
---
- name: Configure application
  hosts: app_servers
  become: true

  tasks:
    - name: Add system tuning parameters
      ansible.builtin.blockinfile:
        path: /etc/sysctl.d/99-myapp.conf
        create: true
        mode: "0644"
        block: |
          net.core.somaxconn = 65535
          net.ipv4.tcp_max_syn_backlog = 65535
          net.core.netdev_max_backlog = 65535
          net.ipv4.tcp_tw_reuse = 1
          vm.swappiness = 10
      notify: Apply sysctl

    - name: Add system limits for app user
      ansible.builtin.blockinfile:
        path: /etc/security/limits.d/myapp.conf
        create: true
        mode: "0644"
        block: |
          myapp soft nofile 65535
          myapp hard nofile 65535
          myapp soft nproc 32768
          myapp hard nproc 32768

    - name: Add logrotate configuration
      ansible.builtin.blockinfile:
        path: /etc/logrotate.d/myapp
        create: true
        mode: "0644"
        block: |
          /var/log/myapp/*.log {
              daily
              rotate 14
              compress
              delaycompress
              missingok
              notifempty
              create 0644 myapp myapp
              postrotate
                  systemctl reload myapp
              endscript
          }

  handlers:
    - name: Apply sysctl
      ansible.builtin.command:
        cmd: sysctl --system
      changed_when: true
```

## Summary

The Ansible `blockinfile` module fills the gap between `lineinfile` (single lines) and `template` (entire files). It manages multi-line blocks of text within files using marker comments for identification. Use `insertafter` and `insertbefore` to control placement, unique `marker` values to manage multiple blocks in the same file, `create: true` to handle files that might not exist, and `state: absent` to remove blocks. The marker-based approach ensures that repeated runs update the block content without duplicating it, giving you the idempotency you expect from Ansible.
