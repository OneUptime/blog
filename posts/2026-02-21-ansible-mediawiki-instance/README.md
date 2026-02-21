# How to Use Ansible to Set Up a MediaWiki Instance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, MediaWiki, Wiki, PHP, Documentation

Description: Deploy a MediaWiki instance with MariaDB, PHP-FPM, extensions, and visual editor using Ansible for internal documentation and knowledge bases.

---

MediaWiki is the software that powers Wikipedia, and it works just as well for internal company wikis and knowledge bases. It handles large volumes of content, supports rich editing, has a robust permission system, and runs on standard PHP infrastructure. Setting up MediaWiki involves configuring PHP, a database, a web server, and potentially dozens of extensions. Ansible makes this entire process automated and reproducible.

## Role Defaults

```yaml
# roles/mediawiki/defaults/main.yml - MediaWiki configuration
mediawiki_version: "1.41"
mediawiki_minor: "1.41.0"
mediawiki_domain: wiki.example.com
mediawiki_name: "Company Wiki"
mediawiki_install_dir: /var/www/mediawiki

# Database
mediawiki_db_type: mysql
mediawiki_db_name: mediawiki
mediawiki_db_user: wikiuser
mediawiki_db_password: "{{ vault_mediawiki_db_password }}"

# Admin account
mediawiki_admin_user: WikiAdmin
mediawiki_admin_password: "{{ vault_mediawiki_admin_password }}"

# PHP version
mediawiki_php_version: "8.2"

# Extensions to install
mediawiki_extensions:
  - VisualEditor
  - Cite
  - ParserFunctions
  - SyntaxHighlight_GeSHi
  - CodeEditor
```

## Main Tasks

```yaml
# roles/mediawiki/tasks/main.yml - Install MediaWiki
---
- name: Install required packages
  apt:
    name:
      - mariadb-server
      - python3-mysqldb
      - nginx
      - "php{{ mediawiki_php_version }}-fpm"
      - "php{{ mediawiki_php_version }}-mysql"
      - "php{{ mediawiki_php_version }}-xml"
      - "php{{ mediawiki_php_version }}-mbstring"
      - "php{{ mediawiki_php_version }}-intl"
      - "php{{ mediawiki_php_version }}-curl"
      - "php{{ mediawiki_php_version }}-gd"
      - "php{{ mediawiki_php_version }}-apcu"
      - imagemagick
      - certbot
      - python3-certbot-nginx
    state: present
    update_cache: yes

- name: Create MariaDB database for MediaWiki
  mysql_db:
    name: "{{ mediawiki_db_name }}"
    state: present
    collation: utf8mb4_general_ci

- name: Create MariaDB user
  mysql_user:
    name: "{{ mediawiki_db_user }}"
    password: "{{ mediawiki_db_password }}"
    priv: "{{ mediawiki_db_name }}.*:ALL"
    state: present

- name: Download MediaWiki
  get_url:
    url: "https://releases.wikimedia.org/mediawiki/{{ mediawiki_version }}/mediawiki-{{ mediawiki_minor }}.tar.gz"
    dest: /tmp/mediawiki.tar.gz

- name: Create install directory
  file:
    path: "{{ mediawiki_install_dir }}"
    state: directory
    owner: www-data
    group: www-data

- name: Extract MediaWiki
  unarchive:
    src: /tmp/mediawiki.tar.gz
    dest: "{{ mediawiki_install_dir }}"
    remote_src: yes
    extra_opts: ["--strip-components=1"]
    creates: "{{ mediawiki_install_dir }}/index.php"

- name: Set MediaWiki ownership
  file:
    path: "{{ mediawiki_install_dir }}"
    owner: www-data
    group: www-data
    recurse: yes

- name: Run MediaWiki installer
  become_user: www-data
  command: >
    php maintenance/install.php
    --dbtype {{ mediawiki_db_type }}
    --dbname {{ mediawiki_db_name }}
    --dbuser {{ mediawiki_db_user }}
    --dbpass {{ mediawiki_db_password }}
    --dbserver localhost
    --pass {{ mediawiki_admin_password }}
    --scriptpath ""
    --server "https://{{ mediawiki_domain }}"
    "{{ mediawiki_name }}" "{{ mediawiki_admin_user }}"
  args:
    chdir: "{{ mediawiki_install_dir }}"
    creates: "{{ mediawiki_install_dir }}/LocalSettings.php"

- name: Add additional settings to LocalSettings.php
  blockinfile:
    path: "{{ mediawiki_install_dir }}/LocalSettings.php"
    block: |
      # Performance: enable object caching
      $wgMainCacheType = CACHE_ACCEL;
      $wgSessionCacheType = CACHE_DB;

      # File uploads
      $wgEnableUploads = true;
      $wgMaxUploadSize = 1024 * 1024 * 50;

      # Security
      $wgGroupPermissions['*']['edit'] = false;
      $wgGroupPermissions['*']['createaccount'] = false;

      # Extensions
      {% for ext in mediawiki_extensions %}
      wfLoadExtension( '{{ ext }}' );
      {% endfor %}
    marker: "# {mark} ANSIBLE MANAGED SETTINGS"
  notify: restart php-fpm

- name: Deploy Nginx configuration
  template:
    src: nginx-mediawiki.conf.j2
    dest: /etc/nginx/sites-available/mediawiki
    mode: '0644'
  notify: restart nginx

- name: Enable Nginx site
  file:
    src: /etc/nginx/sites-available/mediawiki
    dest: /etc/nginx/sites-enabled/mediawiki
    state: link
  notify: restart nginx

- name: Obtain TLS certificate
  command: >
    certbot --nginx -d {{ mediawiki_domain }}
    --non-interactive --agree-tos
    --email admin@{{ mediawiki_domain }}
  args:
    creates: "/etc/letsencrypt/live/{{ mediawiki_domain }}/fullchain.pem"
```

## Nginx Configuration

```nginx
# roles/mediawiki/templates/nginx-mediawiki.conf.j2
server {
    listen 80;
    server_name {{ mediawiki_domain }};
    root {{ mediawiki_install_dir }};
    index index.php;

    client_max_body_size 50M;

    location / {
        try_files $uri $uri/ @rewrite;
    }

    location @rewrite {
        rewrite ^/(.*)$ /index.php?title=$1&$args;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass unix:/run/php/php{{ mediawiki_php_version }}-fpm.sock;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        try_files $uri /index.php;
        expires max;
        log_not_found off;
    }

    location = /_.gif { expires max; empty_gif; }
    location ^~ /cache/ { deny all; }
    location /dumps { root {{ mediawiki_install_dir }}/local; autoindex on; }
}
```

## Handlers

```yaml
# roles/mediawiki/handlers/main.yml
---
- name: restart php-fpm
  systemd:
    name: "php{{ mediawiki_php_version }}-fpm"
    state: restarted

- name: restart nginx
  systemd:
    name: nginx
    state: restarted
```

## Backup Tasks

```yaml
# roles/mediawiki/tasks/backup.yml - MediaWiki backup automation
- name: Create backup script
  copy:
    content: |
      #!/bin/bash
      BACKUP_DIR="/opt/mediawiki-backups/$(date +%Y%m%d)"
      mkdir -p "$BACKUP_DIR"
      mysqldump {{ mediawiki_db_name }} > "$BACKUP_DIR/database.sql"
      tar czf "$BACKUP_DIR/images.tar.gz" -C {{ mediawiki_install_dir }} images/
      cp {{ mediawiki_install_dir }}/LocalSettings.php "$BACKUP_DIR/"
      find /opt/mediawiki-backups -maxdepth 1 -mtime +14 -type d -exec rm -rf {} +
    dest: /usr/local/bin/mediawiki-backup.sh
    mode: '0755'

- name: Schedule daily backup
  cron:
    name: "MediaWiki backup"
    minute: "0"
    hour: "2"
    job: "/usr/local/bin/mediawiki-backup.sh"
```

## Running the Playbook

```bash
# Deploy MediaWiki
ansible-playbook -i inventory/hosts.ini playbook.yml --ask-vault-pass
```

## Summary

This playbook deploys a complete MediaWiki instance ready for your team to start documenting knowledge. It handles the database, PHP configuration, web server, TLS, and extensions. The security defaults restrict editing and account creation to authenticated users, which is what you want for an internal wiki. Adding new extensions is as simple as appending to the `mediawiki_extensions` list and rerunning the playbook.

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

