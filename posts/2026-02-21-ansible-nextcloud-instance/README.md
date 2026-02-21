# How to Use Ansible to Set Up a Nextcloud Instance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Nextcloud, Cloud Storage, PHP, Self-Hosted

Description: Deploy a self-hosted Nextcloud file sharing and collaboration platform with MariaDB, Redis, and Nginx using Ansible playbooks.

---

Nextcloud is the leading open-source platform for file sharing and collaboration. It is the self-hosted alternative to Google Drive, Dropbox, and Microsoft OneDrive, giving your organization full control over its data. A proper Nextcloud deployment involves PHP, a database, a web server, Redis for caching, and proper file permissions. Getting all these components configured correctly takes effort, but Ansible makes the process repeatable.

## Role Defaults

```yaml
# roles/nextcloud/defaults/main.yml - Nextcloud configuration
nextcloud_version: "28.0.1"
nextcloud_domain: cloud.example.com
nextcloud_data_dir: /var/www/nextcloud/data
nextcloud_install_dir: /var/www/nextcloud

# Database settings
nextcloud_db_type: mysql
nextcloud_db_name: nextcloud
nextcloud_db_user: nextcloud
nextcloud_db_password: "{{ vault_nextcloud_db_password }}"

# Admin account
nextcloud_admin_user: admin
nextcloud_admin_password: "{{ vault_nextcloud_admin_password }}"

# PHP settings
nextcloud_php_version: "8.2"
nextcloud_php_memory_limit: "512M"
nextcloud_upload_max_size: "10G"

# Redis for caching and file locking
nextcloud_redis_enabled: true
```

## Main Tasks

```yaml
# roles/nextcloud/tasks/main.yml - Install Nextcloud with all dependencies
---
- name: Install prerequisite packages
  apt:
    name:
      - mariadb-server
      - python3-mysqldb
      - redis-server
      - nginx
      - certbot
      - python3-certbot-nginx
      - unzip
      - imagemagick
      - ffmpeg
    state: present
    update_cache: yes

- name: Install PHP and required extensions
  apt:
    name:
      - "php{{ nextcloud_php_version }}-fpm"
      - "php{{ nextcloud_php_version }}-gd"
      - "php{{ nextcloud_php_version }}-mysql"
      - "php{{ nextcloud_php_version }}-curl"
      - "php{{ nextcloud_php_version }}-mbstring"
      - "php{{ nextcloud_php_version }}-intl"
      - "php{{ nextcloud_php_version }}-gmp"
      - "php{{ nextcloud_php_version }}-bcmath"
      - "php{{ nextcloud_php_version }}-xml"
      - "php{{ nextcloud_php_version }}-zip"
      - "php{{ nextcloud_php_version }}-redis"
      - "php{{ nextcloud_php_version }}-apcu"
      - "php{{ nextcloud_php_version }}-imagick"
    state: present

- name: Create MariaDB database
  mysql_db:
    name: "{{ nextcloud_db_name }}"
    state: present
    collation: utf8mb4_general_ci
    encoding: utf8mb4

- name: Create MariaDB user
  mysql_user:
    name: "{{ nextcloud_db_user }}"
    password: "{{ nextcloud_db_password }}"
    priv: "{{ nextcloud_db_name }}.*:ALL"
    state: present

- name: Download Nextcloud
  get_url:
    url: "https://download.nextcloud.com/server/releases/nextcloud-{{ nextcloud_version }}.zip"
    dest: /tmp/nextcloud.zip

- name: Extract Nextcloud
  unarchive:
    src: /tmp/nextcloud.zip
    dest: /var/www/
    remote_src: yes
    creates: "{{ nextcloud_install_dir }}/occ"

- name: Create data directory
  file:
    path: "{{ nextcloud_data_dir }}"
    state: directory
    owner: www-data
    group: www-data
    mode: '0750'

- name: Set Nextcloud directory ownership
  file:
    path: "{{ nextcloud_install_dir }}"
    owner: www-data
    group: www-data
    recurse: yes

- name: Configure PHP for Nextcloud
  template:
    src: php-nextcloud.ini.j2
    dest: "/etc/php/{{ nextcloud_php_version }}/fpm/conf.d/90-nextcloud.ini"
    mode: '0644'
  notify: restart php-fpm

- name: Deploy Nginx configuration
  template:
    src: nginx-nextcloud.conf.j2
    dest: /etc/nginx/sites-available/nextcloud
    mode: '0644'
  notify: restart nginx

- name: Enable Nginx site
  file:
    src: /etc/nginx/sites-available/nextcloud
    dest: /etc/nginx/sites-enabled/nextcloud
    state: link
  notify: restart nginx

- name: Remove default Nginx site
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: restart nginx

- name: Install Nextcloud via occ command
  become_user: www-data
  command: >
    php occ maintenance:install
    --database "{{ nextcloud_db_type }}"
    --database-name "{{ nextcloud_db_name }}"
    --database-user "{{ nextcloud_db_user }}"
    --database-pass "{{ nextcloud_db_password }}"
    --admin-user "{{ nextcloud_admin_user }}"
    --admin-pass "{{ nextcloud_admin_password }}"
    --data-dir "{{ nextcloud_data_dir }}"
  args:
    chdir: "{{ nextcloud_install_dir }}"
    creates: "{{ nextcloud_install_dir }}/config/config.php"

- name: Add trusted domain
  become_user: www-data
  command: "php occ config:system:set trusted_domains 1 --value={{ nextcloud_domain }}"
  args:
    chdir: "{{ nextcloud_install_dir }}"

- name: Configure Redis for caching
  become_user: www-data
  command: "php occ config:system:set {{ item.key }} --value={{ item.value }} --type={{ item.type | default('string') }}"
  args:
    chdir: "{{ nextcloud_install_dir }}"
  loop:
    - { key: "memcache.local", value: '\\OC\\Memcache\\APCu' }
    - { key: "memcache.distributed", value: '\\OC\\Memcache\\Redis' }
    - { key: "memcache.locking", value: '\\OC\\Memcache\\Redis' }
    - { key: "redis host", value: "localhost" }
    - { key: "redis port", value: "6379", type: "integer" }
  when: nextcloud_redis_enabled

- name: Set up Nextcloud cron job
  cron:
    name: "Nextcloud cron"
    minute: "*/5"
    user: www-data
    job: "php -f {{ nextcloud_install_dir }}/cron.php"

- name: Obtain TLS certificate
  command: >
    certbot --nginx -d {{ nextcloud_domain }}
    --non-interactive --agree-tos
    --email admin@{{ nextcloud_domain }}
  args:
    creates: "/etc/letsencrypt/live/{{ nextcloud_domain }}/fullchain.pem"
```

## PHP Configuration Template

```ini
; roles/nextcloud/templates/php-nextcloud.ini.j2
memory_limit = {{ nextcloud_php_memory_limit }}
upload_max_filesize = {{ nextcloud_upload_max_size }}
post_max_size = {{ nextcloud_upload_max_size }}
max_execution_time = 3600
max_input_time = 3600
output_buffering = Off
opcache.enable = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 8
opcache.max_accelerated_files = 10000
opcache.revalidate_freq = 1
opcache.save_comments = 1
```

## Nginx Configuration Template

```nginx
# roles/nextcloud/templates/nginx-nextcloud.conf.j2
upstream php-handler {
    server unix:/run/php/php{{ nextcloud_php_version }}-fpm.sock;
}

server {
    listen 80;
    server_name {{ nextcloud_domain }};
    root {{ nextcloud_install_dir }};

    client_max_body_size {{ nextcloud_upload_max_size }};
    fastcgi_buffers 64 4K;

    add_header Strict-Transport-Security "max-age=15768000; includeSubDomains; preload" always;

    location = /robots.txt { allow all; log_not_found off; access_log off; }
    location = /.well-known/carddav { return 301 /remote.php/dav/; }
    location = /.well-known/caldav { return 301 /remote.php/dav/; }

    location ~ ^\/(?:build|tests|config|lib|3rdparty|templates|data)\/ { deny all; }
    location ~ ^\/(?:\.|autotest|occ|issue|indie|db_|console) { deny all; }

    location ~ ^\/(?:index|remote|public|cron|core\/ajax\/update|status|ocs\/v[12]|updater\/.+|ocs-provider\/.+)\.php(?:$|\/) {
        fastcgi_split_path_info ^(.+?\.php)(\/.*|)$;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        fastcgi_param modHeadersAvailable true;
        fastcgi_pass php-handler;
        fastcgi_intercept_errors on;
        fastcgi_request_buffering off;
    }

    location ~ ^\/(?:updater|ocs-provider)(?:$|\/) { try_files $uri/ =404; index index.php; }
    location ~ \.(?:css|js|woff2?|svg|gif|map)$ { try_files $uri /index.php$request_uri; add_header Cache-Control "public, max-age=15778463"; }
    location ~ \.(?:png|html|ttf|ico|jpg|jpeg|bcmap|mp4|webm)$ { try_files $uri /index.php$request_uri; }
}
```

## Handlers

```yaml
# roles/nextcloud/handlers/main.yml
---
- name: restart php-fpm
  systemd:
    name: "php{{ nextcloud_php_version }}-fpm"
    state: restarted

- name: restart nginx
  systemd:
    name: nginx
    state: restarted
```

## Running the Playbook

```bash
# Deploy Nextcloud
ansible-playbook -i inventory/hosts.ini playbook.yml --ask-vault-pass
```

## Summary

This Ansible playbook automates the complete Nextcloud deployment stack: MariaDB for the database, Redis for caching, PHP-FPM with tuned settings, Nginx as the web server, and Let's Encrypt for TLS. Once deployed, your team has a fully functional file sharing and collaboration platform with desktop and mobile sync clients available. Updates can be managed through the Nextcloud admin panel or by updating the version variable and rerunning the playbook.
