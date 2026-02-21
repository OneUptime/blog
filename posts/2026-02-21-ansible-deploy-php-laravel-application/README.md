# How to Use Ansible to Deploy a PHP Laravel Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Laravel, PHP, Deployment, DevOps

Description: Deploy PHP Laravel applications with Ansible covering PHP-FPM, Composer, Nginx, database migrations, and queue workers.

---

Laravel is the most popular PHP framework, known for its elegant syntax and rich ecosystem. Deploying a Laravel application to production requires PHP-FPM, Composer dependency management, database migrations, queue workers, scheduled tasks, and a properly configured web server. With Ansible, you can automate every step and deploy consistently across any number of servers.

This guide covers building a complete Ansible playbook for production Laravel deployment on Ubuntu servers with Nginx and PHP-FPM.

## What We Will Automate

- PHP 8.2 and required extensions installation
- Composer dependency management
- Nginx and PHP-FPM configuration
- Laravel environment setup
- Database migrations
- Queue worker setup with systemd
- Scheduled task (cron) configuration

## Project Structure

```
laravel-deploy/
  inventory/
    production.yml
  group_vars/
    all/
      vars.yml
      vault.yml
  roles/
    laravel/
      tasks/
        main.yml
      templates/
        nginx.conf.j2
        env.j2
        laravel-worker.service.j2
      handlers/
        main.yml
  deploy.yml
```

## Variables

```yaml
# group_vars/all/vars.yml
app_name: mylaravelapp
app_user: www-data
app_dir: /var/www/mylaravelapp
app_repo: https://github.com/yourorg/mylaravelapp.git
app_branch: main
server_name: mylaravelapp.example.com
php_version: "8.2"
db_connection: mysql
db_host: localhost
db_name: mylaravelapp
db_user: mylaravelapp
queue_connection: redis
redis_host: localhost
```

## Role Tasks

```yaml
# roles/laravel/tasks/main.yml
---
- name: Add PHP repository
  apt_repository:
    repo: ppa:ondrej/php
    state: present

- name: Install PHP and required extensions
  apt:
    name:
      - "php{{ php_version }}-fpm"
      - "php{{ php_version }}-cli"
      - "php{{ php_version }}-mysql"
      - "php{{ php_version }}-pgsql"
      - "php{{ php_version }}-mbstring"
      - "php{{ php_version }}-xml"
      - "php{{ php_version }}-curl"
      - "php{{ php_version }}-zip"
      - "php{{ php_version }}-gd"
      - "php{{ php_version }}-bcmath"
      - "php{{ php_version }}-redis"
      - "php{{ php_version }}-intl"
      - nginx
      - git
      - unzip
      - acl
    state: present
    update_cache: yes

- name: Download and install Composer
  shell: |
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
  args:
    creates: /usr/local/bin/composer

- name: Create application directory
  file:
    path: "{{ app_dir }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: '0755'

- name: Clone or update Laravel application
  git:
    repo: "{{ app_repo }}"
    dest: "{{ app_dir }}"
    version: "{{ app_branch }}"
    force: yes
  become_user: "{{ app_user }}"
  register: git_result
  notify: restart php-fpm

- name: Deploy Laravel environment file
  template:
    src: env.j2
    dest: "{{ app_dir }}/.env"
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: '0600'
  notify: restart php-fpm

- name: Install Composer dependencies (production mode)
  composer:
    command: install
    working_dir: "{{ app_dir }}"
    no_dev: yes
    optimize_autoloader: yes
  become_user: "{{ app_user }}"
  when: git_result.changed
  environment:
    COMPOSER_ALLOW_SUPERUSER: "1"

- name: Set proper permissions on storage directory
  file:
    path: "{{ app_dir }}/storage"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: '0775'
    recurse: yes

- name: Set proper permissions on bootstrap/cache
  file:
    path: "{{ app_dir }}/bootstrap/cache"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: '0775'
    recurse: yes

- name: Generate application key if not set
  shell: php artisan key:generate --force
  args:
    chdir: "{{ app_dir }}"
  become_user: "{{ app_user }}"
  when: git_result.changed

- name: Run database migrations
  shell: php artisan migrate --force
  args:
    chdir: "{{ app_dir }}"
  become_user: "{{ app_user }}"
  when: git_result.changed

- name: Cache Laravel configuration
  shell: php artisan config:cache
  args:
    chdir: "{{ app_dir }}"
  become_user: "{{ app_user }}"
  when: git_result.changed

- name: Cache Laravel routes
  shell: php artisan route:cache
  args:
    chdir: "{{ app_dir }}"
  become_user: "{{ app_user }}"
  when: git_result.changed

- name: Cache Laravel views
  shell: php artisan view:cache
  args:
    chdir: "{{ app_dir }}"
  become_user: "{{ app_user }}"
  when: git_result.changed

- name: Create storage symlink for public files
  shell: php artisan storage:link
  args:
    chdir: "{{ app_dir }}"
    creates: "{{ app_dir }}/public/storage"
  become_user: "{{ app_user }}"

- name: Configure PHP-FPM pool settings
  lineinfile:
    path: "/etc/php/{{ php_version }}/fpm/pool.d/www.conf"
    regexp: "{{ item.regexp }}"
    line: "{{ item.line }}"
  loop:
    - { regexp: '^pm.max_children', line: 'pm.max_children = 50' }
    - { regexp: '^pm.start_servers', line: 'pm.start_servers = 5' }
    - { regexp: '^pm.min_spare_servers', line: 'pm.min_spare_servers = 5' }
    - { regexp: '^pm.max_spare_servers', line: 'pm.max_spare_servers = 35' }
  notify: restart php-fpm

- name: Deploy Nginx configuration
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/{{ app_name }}
    mode: '0644'
  notify: reload nginx

- name: Enable Nginx site
  file:
    src: /etc/nginx/sites-available/{{ app_name }}
    dest: /etc/nginx/sites-enabled/{{ app_name }}
    state: link
  notify: reload nginx

- name: Remove default Nginx site
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: reload nginx

- name: Deploy Laravel queue worker service
  template:
    src: laravel-worker.service.j2
    dest: /etc/systemd/system/{{ app_name }}-worker.service
    mode: '0644'
  notify:
    - reload systemd
    - restart queue worker

- name: Enable and start queue worker
  systemd:
    name: "{{ app_name }}-worker"
    enabled: yes
    state: started

- name: Set up Laravel task scheduler cron job
  cron:
    name: "Laravel scheduler for {{ app_name }}"
    minute: "*"
    hour: "*"
    user: "{{ app_user }}"
    job: "cd {{ app_dir }} && php artisan schedule:run >> /dev/null 2>&1"
```

## Templates

Laravel environment file:

```bash
# roles/laravel/templates/env.j2
APP_NAME={{ app_name }}
APP_ENV=production
APP_KEY={{ vault_app_key }}
APP_DEBUG=false
APP_URL=https://{{ server_name }}

LOG_CHANNEL=daily
LOG_LEVEL=warning

DB_CONNECTION={{ db_connection }}
DB_HOST={{ db_host }}
DB_PORT=3306
DB_DATABASE={{ db_name }}
DB_USERNAME={{ db_user }}
DB_PASSWORD={{ vault_db_password }}

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION={{ queue_connection }}

REDIS_HOST={{ redis_host }}
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST={{ vault_mail_host }}
MAIL_PORT=587
MAIL_USERNAME={{ vault_mail_username }}
MAIL_PASSWORD={{ vault_mail_password }}
MAIL_ENCRYPTION=tls
```

Nginx configuration:

```nginx
# roles/laravel/templates/nginx.conf.j2
server {
    listen 80;
    server_name {{ server_name }};
    root {{ app_dir }}/public;

    index index.php;
    charset utf-8;
    client_max_body_size 20M;

    # Laravel friendly URL rewriting
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Pass PHP requests to PHP-FPM
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php{{ php_version }}-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Block access to hidden files
    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Queue worker systemd service:

```ini
# roles/laravel/templates/laravel-worker.service.j2
[Unit]
Description=Laravel Queue Worker for {{ app_name }}
After=network.target

[Service]
User={{ app_user }}
Group={{ app_user }}
WorkingDirectory={{ app_dir }}
ExecStart=/usr/bin/php artisan queue:work {{ queue_connection }} --sleep=3 --tries=3 --max-time=3600
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Handlers

```yaml
# roles/laravel/handlers/main.yml
---
- name: reload systemd
  systemd:
    daemon_reload: yes

- name: restart php-fpm
  systemd:
    name: "php{{ php_version }}-fpm"
    state: restarted

- name: reload nginx
  systemd:
    name: nginx
    state: reloaded

- name: restart queue worker
  systemd:
    name: "{{ app_name }}-worker"
    state: restarted
```

## Running the Deployment

```bash
# Deploy the Laravel application
ansible-playbook -i inventory/production.yml deploy.yml --ask-vault-pass

# Deploy with extra variables
ansible-playbook -i inventory/production.yml deploy.yml -e "app_branch=release/1.2"
```

## Wrapping Up

This Ansible playbook covers the full Laravel deployment lifecycle: PHP installation, Composer dependencies, database migrations, cache optimization, queue workers, and scheduled tasks. The combination of PHP-FPM and Nginx is the standard production setup for Laravel, and managing queue workers through systemd ensures they stay running and restart automatically on failure. Store your secrets in Ansible Vault and you have a secure, repeatable deployment process.
