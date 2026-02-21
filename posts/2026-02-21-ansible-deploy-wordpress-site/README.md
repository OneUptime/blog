# How to Use Ansible to Deploy a WordPress Site

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, WordPress, PHP, MySQL, Deployment

Description: Automate WordPress deployment with Ansible including MySQL setup, PHP-FPM, Nginx, wp-cli, and security hardening.

---

WordPress powers over 40% of all websites on the internet. While one-click installers exist on shared hosting, serious WordPress deployments need proper automation. You want repeatable server configuration, consistent PHP settings, secure file permissions, and automated database setup. Ansible delivers all of this.

This guide walks through deploying a WordPress site from scratch on Ubuntu with Nginx, PHP-FPM, and MySQL.

## What We Will Set Up

- MySQL database server and WordPress database
- PHP 8.2 with required WordPress extensions
- Nginx with WordPress-optimized configuration
- WordPress core installation using WP-CLI
- Proper file permissions and security hardening

## Project Structure

```
wordpress-deploy/
  inventory/
    hosts.yml
  group_vars/
    all/
      vars.yml
      vault.yml
  roles/
    wordpress/
      tasks/
        main.yml
        mysql.yml
        php.yml
        wordpress.yml
        nginx.yml
      templates/
        nginx.conf.j2
        wp-config.php.j2
      handlers/
        main.yml
  site.yml
```

## Variables

```yaml
# group_vars/all/vars.yml
wp_site_title: "My WordPress Site"
wp_domain: wordpress.example.com
wp_dir: /var/www/wordpress
wp_user: www-data
wp_group: www-data
php_version: "8.2"
wp_db_name: wordpress
wp_db_user: wordpress
wp_admin_user: admin
wp_admin_email: admin@example.com
wp_locale: en_US
```

```yaml
# group_vars/all/vault.yml (encrypted)
vault_wp_db_password: "strong-db-password-here"
vault_wp_admin_password: "strong-admin-password-here"
vault_mysql_root_password: "strong-root-password-here"
```

## MySQL Tasks

```yaml
# roles/wordpress/tasks/mysql.yml
---
- name: Install MySQL server
  apt:
    name:
      - mysql-server
      - python3-mysqldb
    state: present
    update_cache: yes

- name: Start and enable MySQL service
  systemd:
    name: mysql
    enabled: yes
    state: started

- name: Set MySQL root password
  mysql_user:
    name: root
    password: "{{ vault_mysql_root_password }}"
    login_unix_socket: /var/run/mysqld/mysqld.sock
    host: localhost
    state: present

- name: Create WordPress database
  mysql_db:
    name: "{{ wp_db_name }}"
    state: present
    login_user: root
    login_password: "{{ vault_mysql_root_password }}"
    encoding: utf8mb4
    collation: utf8mb4_unicode_ci

- name: Create WordPress database user with specific privileges
  mysql_user:
    name: "{{ wp_db_user }}"
    password: "{{ vault_wp_db_password }}"
    priv: "{{ wp_db_name }}.*:ALL"
    state: present
    login_user: root
    login_password: "{{ vault_mysql_root_password }}"

- name: Remove anonymous MySQL users
  mysql_user:
    name: ""
    host_all: yes
    state: absent
    login_user: root
    login_password: "{{ vault_mysql_root_password }}"

- name: Remove MySQL test database
  mysql_db:
    name: test
    state: absent
    login_user: root
    login_password: "{{ vault_mysql_root_password }}"
```

## PHP Tasks

```yaml
# roles/wordpress/tasks/php.yml
---
- name: Add PHP PPA repository
  apt_repository:
    repo: ppa:ondrej/php
    state: present

- name: Install PHP and WordPress required extensions
  apt:
    name:
      - "php{{ php_version }}-fpm"
      - "php{{ php_version }}-mysql"
      - "php{{ php_version }}-curl"
      - "php{{ php_version }}-gd"
      - "php{{ php_version }}-mbstring"
      - "php{{ php_version }}-xml"
      - "php{{ php_version }}-zip"
      - "php{{ php_version }}-intl"
      - "php{{ php_version }}-imagick"
      - "php{{ php_version }}-bcmath"
    state: present

- name: Configure PHP-FPM upload limits
  lineinfile:
    path: "/etc/php/{{ php_version }}/fpm/php.ini"
    regexp: "{{ item.regexp }}"
    line: "{{ item.line }}"
  loop:
    - { regexp: '^upload_max_filesize', line: 'upload_max_filesize = 64M' }
    - { regexp: '^post_max_size', line: 'post_max_size = 64M' }
    - { regexp: '^memory_limit', line: 'memory_limit = 256M' }
    - { regexp: '^max_execution_time', line: 'max_execution_time = 300' }
    - { regexp: '^max_input_vars', line: 'max_input_vars = 3000' }
  notify: restart php-fpm
```

## WordPress Installation Tasks

```yaml
# roles/wordpress/tasks/wordpress.yml
---
- name: Install WP-CLI for WordPress management
  get_url:
    url: https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
    dest: /usr/local/bin/wp
    mode: '0755'

- name: Create WordPress directory
  file:
    path: "{{ wp_dir }}"
    state: directory
    owner: "{{ wp_user }}"
    group: "{{ wp_group }}"
    mode: '0755'

- name: Check if WordPress is already installed
  stat:
    path: "{{ wp_dir }}/wp-config.php"
  register: wp_installed

- name: Download WordPress core files
  command: >
    wp core download
    --path={{ wp_dir }}
    --locale={{ wp_locale }}
  become_user: "{{ wp_user }}"
  when: not wp_installed.stat.exists

- name: Deploy wp-config.php from template
  template:
    src: wp-config.php.j2
    dest: "{{ wp_dir }}/wp-config.php"
    owner: "{{ wp_user }}"
    group: "{{ wp_group }}"
    mode: '0640'

- name: Install WordPress using WP-CLI
  command: >
    wp core install
    --url=https://{{ wp_domain }}
    --title="{{ wp_site_title }}"
    --admin_user={{ wp_admin_user }}
    --admin_password={{ vault_wp_admin_password }}
    --admin_email={{ wp_admin_email }}
    --path={{ wp_dir }}
  become_user: "{{ wp_user }}"
  when: not wp_installed.stat.exists

- name: Set secure file permissions for WordPress files
  file:
    path: "{{ wp_dir }}"
    owner: "{{ wp_user }}"
    group: "{{ wp_group }}"
    mode: '0755'
    recurse: yes

- name: Set strict permissions on wp-config.php
  file:
    path: "{{ wp_dir }}/wp-config.php"
    owner: "{{ wp_user }}"
    group: "{{ wp_group }}"
    mode: '0640'

- name: Ensure uploads directory exists with correct permissions
  file:
    path: "{{ wp_dir }}/wp-content/uploads"
    state: directory
    owner: "{{ wp_user }}"
    group: "{{ wp_group }}"
    mode: '0775'

- name: Disable file editing from WordPress admin
  lineinfile:
    path: "{{ wp_dir }}/wp-config.php"
    line: "define('DISALLOW_FILE_EDIT', true);"
    insertbefore: "^/\\* That's all"
```

## WordPress Config Template

```php
<?php
// roles/wordpress/templates/wp-config.php.j2
// Database settings
define( 'DB_NAME', '{{ wp_db_name }}' );
define( 'DB_USER', '{{ wp_db_user }}' );
define( 'DB_PASSWORD', '{{ vault_wp_db_password }}' );
define( 'DB_HOST', 'localhost' );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );

// Authentication unique keys and salts
define( 'AUTH_KEY',         '{{ vault_auth_key }}' );
define( 'SECURE_AUTH_KEY',  '{{ vault_secure_auth_key }}' );
define( 'LOGGED_IN_KEY',    '{{ vault_logged_in_key }}' );
define( 'NONCE_KEY',        '{{ vault_nonce_key }}' );
define( 'AUTH_SALT',        '{{ vault_auth_salt }}' );
define( 'SECURE_AUTH_SALT', '{{ vault_secure_auth_salt }}' );
define( 'LOGGED_IN_SALT',   '{{ vault_logged_in_salt }}' );
define( 'NONCE_SALT',       '{{ vault_nonce_salt }}' );

$table_prefix = 'wp_';

define( 'WP_DEBUG', false );
define( 'WP_DEBUG_LOG', false );
define( 'WP_DEBUG_DISPLAY', false );

// Force HTTPS for admin and logins
define( 'FORCE_SSL_ADMIN', true );

// Limit post revisions to save database space
define( 'WP_POST_REVISIONS', 5 );

// Auto-save interval in seconds
define( 'AUTOSAVE_INTERVAL', 120 );

if ( ! defined( 'ABSPATH' ) ) {
    define( 'ABSPATH', __DIR__ . '/' );
}

require_once ABSPATH . 'wp-settings.php';
```

## Nginx Configuration

```nginx
# roles/wordpress/templates/nginx.conf.j2
server {
    listen 80;
    server_name {{ wp_domain }};
    root {{ wp_dir }};
    index index.php index.html;

    client_max_body_size 64M;

    # WordPress pretty permalinks
    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    # PHP processing via PHP-FPM
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/var/run/php/php{{ php_version }}-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_intercept_errors on;
    }

    # Block access to sensitive files
    location ~ /\.(htaccess|htpasswd|git) {
        deny all;
    }

    # Block access to wp-config.php
    location = /wp-config.php {
        deny all;
    }

    # Block xmlrpc.php to prevent brute force attacks
    location = /xmlrpc.php {
        deny all;
        return 403;
    }

    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

## Nginx Tasks

```yaml
# roles/wordpress/tasks/nginx.yml
---
- name: Install Nginx
  apt:
    name: nginx
    state: present

- name: Deploy Nginx WordPress configuration
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/{{ wp_domain }}
    mode: '0644'
  notify: reload nginx

- name: Enable Nginx site
  file:
    src: /etc/nginx/sites-available/{{ wp_domain }}
    dest: /etc/nginx/sites-enabled/{{ wp_domain }}
    state: link
  notify: reload nginx

- name: Remove default Nginx site
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: reload nginx
```

## Handlers and Main Entry

```yaml
# roles/wordpress/handlers/main.yml
---
- name: restart php-fpm
  systemd:
    name: "php{{ php_version }}-fpm"
    state: restarted

- name: reload nginx
  systemd:
    name: nginx
    state: reloaded
```

```yaml
# roles/wordpress/tasks/main.yml
---
- include_tasks: mysql.yml
- include_tasks: php.yml
- include_tasks: wordpress.yml
- include_tasks: nginx.yml
```

## Running the Deployment

```bash
# Deploy WordPress
ansible-playbook -i inventory/hosts.yml site.yml --ask-vault-pass
```

## Wrapping Up

This Ansible playbook provides a production-ready WordPress deployment that goes beyond just installing WordPress. It handles MySQL hardening, PHP tuning, Nginx optimization, file permission security, and blocks common attack vectors like xmlrpc.php. By using WP-CLI for the installation, you avoid the web-based installer entirely, which is cleaner for automated deployments. From here, you can add SSL with Let's Encrypt, Redis object caching, or automated backup tasks.
