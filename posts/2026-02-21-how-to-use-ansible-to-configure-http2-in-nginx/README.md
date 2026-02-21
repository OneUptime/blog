# How to Use Ansible to Configure HTTP/2 in Nginx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Nginx, HTTP/2, Performance, SSL

Description: Automate HTTP/2 configuration in Nginx using Ansible playbooks to improve web application performance with multiplexed connections and header compression.

---

HTTP/2 brings major performance improvements over HTTP/1.1: multiplexed streams over a single connection, header compression, and server push. Enabling HTTP/2 in Nginx is straightforward on a single server, but when you manage a fleet of web servers, Ansible ensures the configuration is consistent and the SSL prerequisites are in place everywhere.

This post covers building an Ansible role that configures Nginx with HTTP/2 support, including SSL certificate management, recommended cipher suites, and performance tuning.

## HTTP/2 Requirements

HTTP/2 in Nginx requires SSL/TLS. While the HTTP/2 specification technically allows unencrypted connections, all major browsers require HTTPS. So before enabling HTTP/2, you need:

1. A valid SSL certificate (we will use Let's Encrypt via certbot).
2. Nginx compiled with the `ngx_http_v2_module` (included in all modern Nginx packages).
3. TLS 1.2 or higher.

```mermaid
flowchart LR
    A[Client Browser] -->|HTTP/2 over TLS 1.2+| B[Nginx]
    B -->|HTTP/1.1| C[Backend Application]
    B -->|Multiplexed streams| A
```

## Project Structure

```
nginx-http2/
  inventory/
    hosts.yml
  roles/
    nginx_http2/
      tasks/
        main.yml
        ssl.yml
      templates/
        http2_site.conf.j2
        ssl_params.conf.j2
      defaults/
        main.yml
      handlers/
        main.yml
  playbook.yml
```

## Default Variables

```yaml
# roles/nginx_http2/defaults/main.yml
# Server configuration
nginx_http2_server_name: "example.com"
nginx_http2_backend: "127.0.0.1:3000"

# SSL settings
nginx_ssl_certificate: "/etc/letsencrypt/live/{{ nginx_http2_server_name }}/fullchain.pem"
nginx_ssl_certificate_key: "/etc/letsencrypt/live/{{ nginx_http2_server_name }}/privkey.pem"
nginx_ssl_protocols: "TLSv1.2 TLSv1.3"
nginx_ssl_ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"
nginx_ssl_prefer_server_ciphers: "on"

# Use certbot for automated SSL certificates
nginx_use_certbot: true
nginx_certbot_email: "admin@example.com"

# HTTP/2 specific tuning
nginx_http2_max_concurrent_streams: 128
nginx_http2_max_field_size: "8k"
nginx_http2_max_header_size: "32k"

# HSTS (HTTP Strict Transport Security)
nginx_hsts_max_age: 31536000
nginx_hsts_include_subdomains: true

# Redirect HTTP to HTTPS
nginx_http_redirect: true
```

## SSL Certificate Tasks

This task file handles SSL certificate provisioning using certbot.

```yaml
# roles/nginx_http2/tasks/ssl.yml
---
- name: Install certbot and Nginx plugin
  ansible.builtin.apt:
    name:
      - certbot
      - python3-certbot-nginx
    state: present
  become: true

- name: Check if certificate already exists
  ansible.builtin.stat:
    path: "{{ nginx_ssl_certificate }}"
  register: cert_file

- name: Obtain SSL certificate from Let's Encrypt
  ansible.builtin.command: >
    certbot certonly --nginx
    --non-interactive
    --agree-tos
    --email {{ nginx_certbot_email }}
    -d {{ nginx_http2_server_name }}
  become: true
  when: not cert_file.stat.exists

- name: Set up certbot auto-renewal cron
  ansible.builtin.cron:
    name: "Renew SSL certificates"
    minute: "30"
    hour: "2"
    job: "certbot renew --quiet --post-hook 'systemctl reload nginx'"
    user: root
  become: true
```

## SSL Parameters Template

This file contains the shared SSL parameters that apply to all server blocks. Keeping these in a separate file means you can include them in multiple virtual hosts.

```nginx
# roles/nginx_http2/templates/ssl_params.conf.j2
# SSL/TLS parameters optimized for HTTP/2

# Only allow TLS 1.2 and 1.3 (HTTP/2 requires at least TLS 1.2)
ssl_protocols {{ nginx_ssl_protocols }};

# Cipher suite compatible with HTTP/2
# HTTP/2 blacklists certain ciphers, so we use only approved ones
ssl_ciphers {{ nginx_ssl_ciphers }};
ssl_prefer_server_ciphers {{ nginx_ssl_prefer_server_ciphers }};

# OCSP stapling for faster TLS handshakes
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# SSL session caching for connection reuse
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# DH parameters for key exchange
# Generate with: openssl dhparam -out /etc/nginx/dhparam.pem 2048
ssl_dhparam /etc/nginx/dhparam.pem;
```

## HTTP/2 Site Configuration Template

This is the main server block with HTTP/2 enabled. Note the `http2` parameter on the `listen` directive.

```nginx
# roles/nginx_http2/templates/http2_site.conf.j2
{% if nginx_http_redirect %}
# Redirect all HTTP traffic to HTTPS
server {
    listen 80;
    server_name {{ nginx_http2_server_name }};
    return 301 https://$host$request_uri;
}
{% endif %}

server {
    # Enable HTTP/2 on the SSL listener
    listen 443 ssl http2;
    server_name {{ nginx_http2_server_name }};

    # SSL certificate paths
    ssl_certificate {{ nginx_ssl_certificate }};
    ssl_certificate_key {{ nginx_ssl_certificate_key }};

    # Include shared SSL parameters
    include /etc/nginx/conf.d/ssl_params.conf;

    # HTTP/2 tuning
    http2_max_concurrent_streams {{ nginx_http2_max_concurrent_streams }};
    http2_max_field_size {{ nginx_http2_max_field_size }};
    http2_max_header_size {{ nginx_http2_max_header_size }};

{% if nginx_hsts_max_age > 0 %}
    # HSTS header to enforce HTTPS
    add_header Strict-Transport-Security "max-age={{ nginx_hsts_max_age }}{% if nginx_hsts_include_subdomains %}; includeSubDomains{% endif %}; preload" always;
{% endif %}

    # Proxy to backend application
    location / {
        proxy_pass http://{{ nginx_http2_backend }};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Enable keepalive to backend
        proxy_set_header Connection "";
    }

    # Static assets with caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://{{ nginx_http2_backend }};
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

## Main Tasks

```yaml
# roles/nginx_http2/tasks/main.yml
---
- name: Install Nginx
  ansible.builtin.apt:
    name: nginx
    state: present
    update_cache: yes
  become: true

- name: Check if Nginx supports HTTP/2
  ansible.builtin.command: nginx -V
  register: nginx_version_output
  changed_when: false

- name: Verify HTTP/2 module is available
  ansible.builtin.assert:
    that:
      - "'http_v2_module' in nginx_version_output.stderr"
    fail_msg: "Nginx does not have HTTP/2 support. Please install a version with ngx_http_v2_module."
    success_msg: "Nginx HTTP/2 module confirmed available."

- name: Generate DH parameters (this takes a few minutes)
  ansible.builtin.command: openssl dhparam -out /etc/nginx/dhparam.pem 2048
  args:
    creates: /etc/nginx/dhparam.pem
  become: true

- name: Include SSL certificate tasks
  ansible.builtin.include_tasks: ssl.yml
  when: nginx_use_certbot

- name: Deploy SSL parameters configuration
  ansible.builtin.template:
    src: ssl_params.conf.j2
    dest: /etc/nginx/conf.d/ssl_params.conf
    owner: root
    group: root
    mode: "0644"
  become: true
  notify: Validate and reload nginx

- name: Deploy HTTP/2 site configuration
  ansible.builtin.template:
    src: http2_site.conf.j2
    dest: /etc/nginx/sites-available/http2_site.conf
    owner: root
    group: root
    mode: "0644"
  become: true
  notify: Validate and reload nginx

- name: Enable HTTP/2 site
  ansible.builtin.file:
    src: /etc/nginx/sites-available/http2_site.conf
    dest: /etc/nginx/sites-enabled/http2_site.conf
    state: link
  become: true
  notify: Validate and reload nginx

- name: Remove default site
  ansible.builtin.file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  become: true
  notify: Validate and reload nginx

- name: Start Nginx
  ansible.builtin.systemd:
    name: nginx
    state: started
    enabled: true
  become: true
```

## Handlers

```yaml
# roles/nginx_http2/handlers/main.yml
---
- name: Validate and reload nginx
  ansible.builtin.command: nginx -t
  become: true
  changed_when: false
  notify: Reload nginx

- name: Reload nginx
  ansible.builtin.systemd:
    name: nginx
    state: reloaded
  become: true
```

## The Playbook

```yaml
# playbook.yml
---
- name: Configure Nginx with HTTP/2
  hosts: webservers
  become: true
  vars:
    nginx_http2_server_name: "myapp.com"
    nginx_http2_backend: "127.0.0.1:3000"
    nginx_certbot_email: "ops@myapp.com"
  roles:
    - nginx_http2
```

## Verifying HTTP/2

After deploying, verify that HTTP/2 is working:

```bash
# Check HTTP/2 support with curl
curl -I --http2 https://myapp.com
# Look for "HTTP/2 200" in the response

# Detailed protocol negotiation check
curl -vso /dev/null --http2 https://myapp.com 2>&1 | grep -i "http/2"

# Check with openssl what protocols are offered
openssl s_client -connect myapp.com:443 -alpn h2 </dev/null 2>/dev/null | grep "ALPN"
# Should show: ALPN protocol: h2
```

## Performance Impact

HTTP/2 provides the biggest improvements when a page loads many resources (CSS, JS, images). The multiplexing feature allows all these resources to be fetched over a single TCP connection, eliminating the head-of-line blocking problem in HTTP/1.1. Header compression (HPACK) also reduces overhead for repeated headers across requests.

For API-heavy applications, the improvement is less dramatic but still noticeable, especially when clients make many concurrent requests.

## Summary

Enabling HTTP/2 in Nginx with Ansible gives your web applications a performance boost with minimal effort. The key requirements are a valid SSL certificate and a modern TLS configuration. The Ansible role in this post handles everything from certificate provisioning to Nginx configuration to verification, ensuring every server in your fleet is configured identically with HTTP/2 support.
