# How to Create Ansible Roles for Web Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Nginx, Web Server, Roles, DevOps

Description: Build a complete Ansible role for Nginx web server provisioning with virtual hosts, SSL configuration, and security hardening.

---

Web servers are probably the most common thing you will automate with Ansible. Every project needs one, and the configuration requirements are similar enough that a well-built role can serve dozens of projects with just variable changes. This post walks through building an Nginx role that handles installation, virtual host configuration, SSL termination, security headers, and performance tuning.

## Role Structure

```
roles/nginx/
  defaults/main.yml
  handlers/main.yml
  tasks/
    main.yml
    install.yml
    configure.yml
    vhosts.yml
    ssl.yml
    security.yml
  templates/
    nginx.conf.j2
    vhost.conf.j2
    ssl_params.conf.j2
    security_headers.conf.j2
  files/
    dhparam.pem
```

## Default Variables

```yaml
# roles/nginx/defaults/main.yml
# Nginx package settings
nginx_package: nginx
nginx_service: nginx

# Core configuration
nginx_worker_processes: auto
nginx_worker_connections: 1024
nginx_multi_accept: "on"
nginx_keepalive_timeout: 65
nginx_keepalive_requests: 100
nginx_server_tokens: "off"
nginx_client_max_body_size: "64m"

# Gzip compression
nginx_gzip: "on"
nginx_gzip_vary: "on"
nginx_gzip_min_length: 1024
nginx_gzip_comp_level: 5
nginx_gzip_types:
  - text/plain
  - text/css
  - application/json
  - application/javascript
  - text/xml
  - application/xml
  - image/svg+xml

# Logging
nginx_access_log: /var/log/nginx/access.log
nginx_error_log: /var/log/nginx/error.log
nginx_log_format: >-
  '$remote_addr - $remote_user [$time_local] "$request" '
  '$status $body_bytes_sent "$http_referer" '
  '"$http_user_agent" "$http_x_forwarded_for" '
  'rt=$request_time'

# SSL defaults
nginx_ssl_protocols: "TLSv1.2 TLSv1.3"
nginx_ssl_ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"
nginx_ssl_session_timeout: "1d"
nginx_ssl_session_cache: "shared:SSL:50m"
nginx_ssl_stapling: "on"

# Virtual hosts
nginx_vhosts: []
# Example:
#   - server_name: example.com
#     root: /var/www/example.com/public
#     ssl_cert: /etc/ssl/certs/example.com.crt
#     ssl_key: /etc/ssl/private/example.com.key
#     upstream_port: 8080

# Security headers
nginx_security_headers: true
nginx_hsts_max_age: 63072000
nginx_content_security_policy: "default-src 'self'"

# Remove default site
nginx_remove_default_site: true
```

## Installation Tasks

```yaml
# roles/nginx/tasks/install.yml
# Install Nginx from the official repository for latest stable version
- name: Install prerequisites
  ansible.builtin.apt:
    name:
      - curl
      - gnupg2
      - ca-certificates
      - lsb-release
    state: present

- name: Add Nginx signing key
  ansible.builtin.apt_key:
    url: https://nginx.org/keys/nginx_signing.key
    state: present

- name: Add Nginx repository
  ansible.builtin.apt_repository:
    repo: "deb http://nginx.org/packages/ubuntu {{ ansible_distribution_release }} nginx"
    state: present
    filename: nginx

- name: Install Nginx
  ansible.builtin.apt:
    name: "{{ nginx_package }}"
    state: present
    update_cache: yes

- name: Ensure Nginx is started and enabled
  ansible.builtin.systemd:
    name: "{{ nginx_service }}"
    state: started
    enabled: yes
```

## Main Configuration Template

```jinja2
# roles/nginx/templates/nginx.conf.j2
# Nginx configuration - managed by Ansible
user www-data;
worker_processes {{ nginx_worker_processes }};
pid /run/nginx.pid;
error_log {{ nginx_error_log }};

events {
    worker_connections {{ nginx_worker_connections }};
    multi_accept {{ nginx_multi_accept }};
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout {{ nginx_keepalive_timeout }};
    keepalive_requests {{ nginx_keepalive_requests }};
    types_hash_max_size 2048;
    server_tokens {{ nginx_server_tokens }};
    client_max_body_size {{ nginx_client_max_body_size }};

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main {{ nginx_log_format }};
    access_log {{ nginx_access_log }} main;

    # Gzip compression
{% if nginx_gzip == "on" %}
    gzip {{ nginx_gzip }};
    gzip_vary {{ nginx_gzip_vary }};
    gzip_min_length {{ nginx_gzip_min_length }};
    gzip_comp_level {{ nginx_gzip_comp_level }};
    gzip_types {{ nginx_gzip_types | join(' ') }};
{% endif %}

    # SSL shared settings
    ssl_protocols {{ nginx_ssl_protocols }};
    ssl_ciphers {{ nginx_ssl_ciphers }};
    ssl_prefer_server_ciphers off;
    ssl_session_timeout {{ nginx_ssl_session_timeout }};
    ssl_session_cache {{ nginx_ssl_session_cache }};
    ssl_stapling {{ nginx_ssl_stapling }};
    ssl_stapling_verify on;

    # Virtual hosts
    include /etc/nginx/conf.d/*.conf;
}
```

## Virtual Host Template

```jinja2
# roles/nginx/templates/vhost.conf.j2
# Virtual host for {{ item.server_name }} - managed by Ansible

{% if item.upstream_port is defined %}
upstream {{ item.server_name | replace('.', '_') }}_backend {
    server 127.0.0.1:{{ item.upstream_port }};
}
{% endif %}

# Redirect HTTP to HTTPS
{% if item.ssl_cert is defined %}
server {
    listen 80;
    listen [::]:80;
    server_name {{ item.server_name }}{% if item.server_aliases is defined %} {{ item.server_aliases | join(' ') }}{% endif %};
    return 301 https://$server_name$request_uri;
}
{% endif %}

server {
{% if item.ssl_cert is defined %}
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    ssl_certificate {{ item.ssl_cert }};
    ssl_certificate_key {{ item.ssl_key }};
{% else %}
    listen 80;
    listen [::]:80;
{% endif %}

    server_name {{ item.server_name }}{% if item.server_aliases is defined %} {{ item.server_aliases | join(' ') }}{% endif %};

{% if item.root is defined %}
    root {{ item.root }};
    index index.html index.htm;
{% endif %}

{% if nginx_security_headers %}
    include /etc/nginx/conf.d/security_headers.inc;
{% endif %}

    # Logging
    access_log /var/log/nginx/{{ item.server_name }}_access.log main;
    error_log /var/log/nginx/{{ item.server_name }}_error.log;

{% if item.upstream_port is defined %}
    location / {
        proxy_pass http://{{ item.server_name | replace('.', '_') }}_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout {{ item.proxy_timeout | default(60) }};
        proxy_send_timeout {{ item.proxy_timeout | default(60) }};
    }
{% elif item.root is defined %}
    location / {
        try_files $uri $uri/ =404;
    }
{% endif %}

    # Static assets caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2|woff|ttf)$ {
        expires {{ item.static_cache_duration | default('30d') }};
        add_header Cache-Control "public, immutable";
    }

{% if item.extra_config is defined %}
    {{ item.extra_config | indent(4) }}
{% endif %}
}
```

## Virtual Host and Security Tasks

```yaml
# roles/nginx/tasks/vhosts.yml
# Deploy virtual host configurations
- name: Create web root directories
  ansible.builtin.file:
    path: "{{ item.root }}"
    state: directory
    owner: www-data
    group: www-data
    mode: '0755'
  loop: "{{ nginx_vhosts }}"
  when: item.root is defined

- name: Deploy virtual host configurations
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: "/etc/nginx/conf.d/{{ item.server_name }}.conf"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ nginx_vhosts }}"
  notify: reload nginx

- name: Remove default site if requested
  ansible.builtin.file:
    path: /etc/nginx/conf.d/default.conf
    state: absent
  when: nginx_remove_default_site
  notify: reload nginx
```

```yaml
# roles/nginx/tasks/security.yml
# Deploy security headers include file
- name: Deploy security headers configuration
  ansible.builtin.template:
    src: security_headers.conf.j2
    dest: /etc/nginx/conf.d/security_headers.inc
    owner: root
    group: root
    mode: '0644'
  when: nginx_security_headers
  notify: reload nginx
```

```jinja2
# roles/nginx/templates/security_headers.conf.j2
# Security headers - managed by Ansible
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "{{ nginx_content_security_policy }}" always;
{% if nginx_hsts_max_age > 0 %}
add_header Strict-Transport-Security "max-age={{ nginx_hsts_max_age }}; includeSubDomains; preload" always;
{% endif %}
```

## Handlers and Main Task File

```yaml
# roles/nginx/handlers/main.yml
- name: reload nginx
  ansible.builtin.systemd:
    name: "{{ nginx_service }}"
    state: reloaded

- name: restart nginx
  ansible.builtin.systemd:
    name: "{{ nginx_service }}"
    state: restarted

- name: validate nginx
  ansible.builtin.command: nginx -t
  changed_when: false
```

```yaml
# roles/nginx/tasks/main.yml
- name: Include installation tasks
  ansible.builtin.include_tasks: install.yml

- name: Include configuration tasks
  ansible.builtin.include_tasks: configure.yml

- name: Include security tasks
  ansible.builtin.include_tasks: security.yml

- name: Include virtual host tasks
  ansible.builtin.include_tasks: vhosts.yml
  when: nginx_vhosts | length > 0
```

```yaml
# roles/nginx/tasks/configure.yml
# Deploy the main nginx.conf
- name: Deploy main nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: '0644'
    validate: "nginx -t -c %s"
  notify: restart nginx
```

## Complete Playbook Example

```yaml
# deploy-webservers.yml
- hosts: webservers
  become: yes
  roles:
    - role: nginx
      vars:
        nginx_worker_connections: 4096
        nginx_client_max_body_size: "100m"

        nginx_vhosts:
          - server_name: api.example.com
            ssl_cert: /etc/letsencrypt/live/api.example.com/fullchain.pem
            ssl_key: /etc/letsencrypt/live/api.example.com/privkey.pem
            upstream_port: 3000
            proxy_timeout: 120

          - server_name: www.example.com
            server_aliases:
              - example.com
            ssl_cert: /etc/letsencrypt/live/www.example.com/fullchain.pem
            ssl_key: /etc/letsencrypt/live/www.example.com/privkey.pem
            root: /var/www/example.com/public
            static_cache_duration: "7d"

        nginx_security_headers: true
        nginx_hsts_max_age: 63072000
```

This role gives you a solid foundation for web server automation. The virtual host template handles both static sites and reverse proxy configurations. Add new sites by appending to the `nginx_vhosts` list. The security headers and SSL configuration follow current best practices, and everything is overridable through the defaults.
