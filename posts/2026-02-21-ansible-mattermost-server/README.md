# How to Use Ansible to Set Up a Mattermost Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Mattermost, Chat, DevOps, Collaboration

Description: Deploy a self-hosted Mattermost team messaging server with PostgreSQL, Nginx, and TLS using Ansible for secure team communication.

---

Mattermost is an open-source alternative to Slack that you can host on your own infrastructure. This matters when your organization has data residency requirements, needs to comply with regulations that prevent using third-party SaaS tools, or simply wants to avoid per-user subscription costs. The installation involves setting up PostgreSQL, deploying the Mattermost binary, configuring Nginx as a reverse proxy, and setting up TLS. Ansible turns this multi-step process into a single command.

## Role Defaults

```yaml
# roles/mattermost/defaults/main.yml - Mattermost configuration
mattermost_version: "9.3.0"
mattermost_domain: chat.example.com
mattermost_port: 8065
mattermost_data_dir: /opt/mattermost/data
mattermost_user: mattermost

# PostgreSQL settings
mattermost_db_name: mattermost
mattermost_db_user: mmuser
mattermost_db_password: "{{ vault_mattermost_db_password }}"

# SMTP for notifications
mattermost_smtp_server: smtp.example.com
mattermost_smtp_port: 587
mattermost_smtp_user: "mattermost@example.com"
mattermost_smtp_password: "{{ vault_mattermost_smtp_password }}"

# File storage
mattermost_max_file_size: 52428800
```

## Main Tasks

```yaml
# roles/mattermost/tasks/main.yml - Install Mattermost
---
- name: Install required packages
  apt:
    name:
      - postgresql
      - postgresql-contrib
      - python3-psycopg2
      - nginx
      - certbot
      - python3-certbot-nginx
    state: present
    update_cache: yes

- name: Create PostgreSQL database
  become_user: postgres
  postgresql_db:
    name: "{{ mattermost_db_name }}"
    encoding: UTF-8
    state: present

- name: Create PostgreSQL user
  become_user: postgres
  postgresql_user:
    name: "{{ mattermost_db_user }}"
    password: "{{ mattermost_db_password }}"
    db: "{{ mattermost_db_name }}"
    priv: ALL
    state: present

- name: Create mattermost system user
  user:
    name: "{{ mattermost_user }}"
    system: yes
    shell: /bin/bash
    home: /opt/mattermost
    create_home: no

- name: Download Mattermost
  get_url:
    url: "https://releases.mattermost.com/{{ mattermost_version }}/mattermost-{{ mattermost_version }}-linux-amd64.tar.gz"
    dest: /tmp/mattermost.tar.gz

- name: Extract Mattermost
  unarchive:
    src: /tmp/mattermost.tar.gz
    dest: /opt/
    remote_src: yes
    creates: /opt/mattermost/bin/mattermost

- name: Create data directory
  file:
    path: "{{ mattermost_data_dir }}"
    state: directory
    owner: "{{ mattermost_user }}"
    group: "{{ mattermost_user }}"
    mode: '0755'

- name: Set ownership of Mattermost directory
  file:
    path: /opt/mattermost
    owner: "{{ mattermost_user }}"
    group: "{{ mattermost_user }}"
    recurse: yes

- name: Deploy Mattermost configuration
  template:
    src: config.json.j2
    dest: /opt/mattermost/config/config.json
    owner: "{{ mattermost_user }}"
    group: "{{ mattermost_user }}"
    mode: '0600'
  notify: restart mattermost

- name: Create Mattermost systemd service
  copy:
    content: |
      [Unit]
      Description=Mattermost
      After=network.target postgresql.service

      [Service]
      Type=notify
      User={{ mattermost_user }}
      Group={{ mattermost_user }}
      ExecStart=/opt/mattermost/bin/mattermost
      WorkingDirectory=/opt/mattermost
      Restart=always
      RestartSec=10
      LimitNOFILE=49152

      [Install]
      WantedBy=multi-user.target
    dest: /etc/systemd/system/mattermost.service
    mode: '0644'
  notify:
    - reload systemd
    - restart mattermost

- name: Start and enable Mattermost
  systemd:
    name: mattermost
    state: started
    enabled: yes
    daemon_reload: yes

- name: Configure Nginx reverse proxy
  template:
    src: nginx-mattermost.conf.j2
    dest: /etc/nginx/sites-available/mattermost
    mode: '0644'
  notify: restart nginx

- name: Enable Nginx site
  file:
    src: /etc/nginx/sites-available/mattermost
    dest: /etc/nginx/sites-enabled/mattermost
    state: link
  notify: restart nginx

- name: Obtain TLS certificate
  command: >
    certbot --nginx -d {{ mattermost_domain }}
    --non-interactive --agree-tos
    --email admin@{{ mattermost_domain }}
  args:
    creates: "/etc/letsencrypt/live/{{ mattermost_domain }}/fullchain.pem"
```

## Nginx Configuration Template

```nginx
# roles/mattermost/templates/nginx-mattermost.conf.j2
upstream mattermost_backend {
    server 127.0.0.1:{{ mattermost_port }};
    keepalive 32;
}

server {
    listen 80;
    server_name {{ mattermost_domain }};

    location / {
        proxy_pass http://mattermost_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Frame-Options SAMEORIGIN;
        proxy_buffers 256 16k;
        proxy_buffer_size 16k;
        client_max_body_size 50M;

        # WebSocket support for real-time messaging
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Handlers

```yaml
# roles/mattermost/handlers/main.yml
---
- name: restart mattermost
  systemd:
    name: mattermost
    state: restarted

- name: restart nginx
  systemd:
    name: nginx
    state: restarted

- name: reload systemd
  systemd:
    daemon_reload: yes
```

## Backup Tasks

```yaml
# roles/mattermost/tasks/backup.yml - Automated backups
- name: Create backup script
  copy:
    content: |
      #!/bin/bash
      BACKUP_DIR="/opt/mattermost-backups/$(date +%Y%m%d)"
      mkdir -p "$BACKUP_DIR"
      # Database backup
      pg_dump -U {{ mattermost_db_user }} {{ mattermost_db_name }} > "$BACKUP_DIR/db.sql"
      # Data directory backup
      tar czf "$BACKUP_DIR/data.tar.gz" -C /opt/mattermost data/
      # Config backup
      cp /opt/mattermost/config/config.json "$BACKUP_DIR/"
      # Cleanup old backups
      find /opt/mattermost-backups -maxdepth 1 -mtime +7 -type d -exec rm -rf {} +
    dest: /usr/local/bin/mattermost-backup.sh
    mode: '0755'

- name: Schedule daily backups
  cron:
    name: "Mattermost daily backup"
    minute: "0"
    hour: "3"
    job: "/usr/local/bin/mattermost-backup.sh"
    user: root
```

## Running the Playbook

```bash
# Deploy Mattermost
ansible-playbook -i inventory/hosts.ini playbook.yml --ask-vault-pass
```

## Summary

This Ansible playbook deploys a complete Mattermost instance with PostgreSQL for data storage, Nginx for TLS termination and WebSocket support, and automated backups. The entire setup is reproducible, so migrating to new hardware or recovering from failures is straightforward. Your team gets a Slack-like experience with full control over the data and no per-user costs.

## Common Use Cases

Here are several practical scenarios where this module proves essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating this module
- name: Infrastructure provisioning
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install required packages
      ansible.builtin.package:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - jq
        state: present

    - name: Configure system timezone
      ansible.builtin.timezone:
        name: "{{ system_timezone | default('UTC') }}"

    - name: Configure hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}"

    - name: Configure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"

    - name: Enable firewall
      community.general.ufw:
        state: enabled
        policy: deny

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on system specs
  hosts: all
  become: true
  tasks:
    - name: Set monitoring thresholds based on hardware
      ansible.builtin.template:
        src: monitoring_config.yml.j2
        dest: /etc/monitoring/config.yml
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling with this module
- name: Robust task execution
  hosts: all
  tasks:
    - name: Attempt primary operation
      ansible.builtin.command: /opt/app/primary-task.sh
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.builtin.command: /opt/app/fallback-task.sh
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using cron
- name: Configure automated scans
  hosts: all
  become: true
  tasks:
    - name: Create scan script
      ansible.builtin.copy:
        dest: /opt/scripts/compliance_scan.sh
        mode: '0755'
        content: |
          #!/bin/bash
          cd /opt/ansible
          ansible-playbook playbooks/validate.yml -i inventory/ > /var/log/compliance_scan.log 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            curl -X POST https://hooks.example.com/alert \
              -H "Content-Type: application/json" \
              -d "{\"text\":\"Compliance scan failed on $(hostname)\"}"
          fi
          exit $EXIT_CODE

    - name: Schedule weekly compliance scan
      ansible.builtin.cron:
        name: "Weekly compliance scan"
        minute: "0"
        hour: "3"
        weekday: "1"
        job: "/opt/scripts/compliance_scan.sh"
        user: ansible
```

