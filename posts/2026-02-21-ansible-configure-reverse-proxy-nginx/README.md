# How to Use Ansible to Configure Reverse Proxy with Nginx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Nginx, Reverse Proxy, DevOps, Networking

Description: Set up Nginx as a reverse proxy with Ansible for web applications including WebSocket support, caching, and health checks.

---

A reverse proxy sits between clients and your backend servers, forwarding requests and returning responses. Nginx is the most popular choice for this role because it handles thousands of concurrent connections efficiently, provides caching, SSL termination, and load balancing. Configuring Nginx as a reverse proxy with Ansible means you can reproduce the setup on any number of servers and update configurations across your fleet with a single command.

This guide covers setting up Nginx as a reverse proxy using Ansible, including basic proxying, WebSocket support, caching, custom headers, and health checks.

## When You Need a Reverse Proxy

You need a reverse proxy when your application server (Node.js, Python, Java, etc.) should not be directly exposed to the internet. The reverse proxy handles:

- SSL/TLS termination
- Static file serving
- Request buffering
- Connection pooling
- Rate limiting
- WebSocket upgrades

## Project Structure

```
nginx-proxy/
  inventory/
    hosts.yml
  group_vars/
    all.yml
  roles/
    nginx_proxy/
      tasks/
        main.yml
      templates/
        proxy.conf.j2
        proxy-params.conf.j2
      handlers/
        main.yml
  playbook.yml
```

## Variables

```yaml
# group_vars/all.yml
proxy_sites:
  - name: webapp
    server_name: webapp.example.com
    backend: "http://127.0.0.1:3000"
    websocket: false
    cache_enabled: false

  - name: api
    server_name: api.example.com
    backend: "http://127.0.0.1:8080"
    websocket: true
    cache_enabled: false

  - name: dashboard
    server_name: dashboard.example.com
    backend: "http://127.0.0.1:5000"
    websocket: true
    cache_enabled: true
    cache_duration: "10m"

proxy_connect_timeout: 60
proxy_read_timeout: 300
proxy_send_timeout: 300
client_max_body_size: "50M"
```

## Role Tasks

```yaml
# roles/nginx_proxy/tasks/main.yml
---
- name: Install Nginx
  apt:
    name: nginx
    state: present
    update_cache: yes

- name: Create Nginx cache directory
  file:
    path: /var/cache/nginx
    state: directory
    owner: www-data
    group: www-data
    mode: '0755'

- name: Deploy shared proxy parameters
  template:
    src: proxy-params.conf.j2
    dest: /etc/nginx/conf.d/proxy-params.conf
    mode: '0644'
  notify: reload nginx

- name: Deploy proxy configuration for each site
  template:
    src: proxy.conf.j2
    dest: "/etc/nginx/sites-available/{{ item.name }}"
    mode: '0644'
  loop: "{{ proxy_sites }}"
  notify: reload nginx

- name: Enable each proxy site
  file:
    src: "/etc/nginx/sites-available/{{ item.name }}"
    dest: "/etc/nginx/sites-enabled/{{ item.name }}"
    state: link
  loop: "{{ proxy_sites }}"
  notify: reload nginx

- name: Remove default Nginx site
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: reload nginx

- name: Test Nginx configuration
  command: nginx -t
  changed_when: false

- name: Ensure Nginx is running
  systemd:
    name: nginx
    enabled: yes
    state: started
```

## Shared Proxy Parameters

This configuration file is included by all proxy sites. It sets common proxy headers and timeouts.

```nginx
# roles/nginx_proxy/templates/proxy-params.conf.j2
# Shared proxy parameters used by all reverse proxy configurations

# Pass original client information to backends
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Port $server_port;

# Proxy timeout settings
proxy_connect_timeout {{ proxy_connect_timeout }};
proxy_read_timeout {{ proxy_read_timeout }};
proxy_send_timeout {{ proxy_send_timeout }};

# Buffering settings
proxy_buffering on;
proxy_buffer_size 16k;
proxy_buffers 4 32k;
proxy_busy_buffers_size 64k;

# Do not change the redirect responses from the backend
proxy_redirect off;
```

## Per-Site Proxy Configuration

```nginx
# roles/nginx_proxy/templates/proxy.conf.j2
{% if item.cache_enabled | default(false) %}
# Define cache zone for {{ item.name }}
proxy_cache_path /var/cache/nginx/{{ item.name }}
    levels=1:2
    keys_zone={{ item.name }}_cache:10m
    max_size=1g
    inactive=60m
    use_temp_path=off;
{% endif %}

upstream {{ item.name }}_backend {
    server {{ item.backend | regex_replace('^https?://', '') }};
    keepalive 32;
}

server {
    listen 80;
    server_name {{ item.server_name }};
    client_max_body_size {{ client_max_body_size }};

    # Access logging per site
    access_log /var/log/nginx/{{ item.name }}.access.log;
    error_log /var/log/nginx/{{ item.name }}.error.log;

{% if item.cache_enabled | default(false) %}
    # Caching configuration
    proxy_cache {{ item.name }}_cache;
    proxy_cache_valid 200 {{ item.cache_duration | default('10m') }};
    proxy_cache_valid 404 1m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_lock on;
    add_header X-Cache-Status $upstream_cache_status;
{% endif %}

    # Main proxy location
    location / {
        proxy_pass {{ item.backend }};
        include /etc/nginx/conf.d/proxy-params.conf;

        # HTTP 1.1 for keepalive connections to backend
        proxy_http_version 1.1;
        proxy_set_header Connection "";

{% if item.websocket | default(false) %}
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
{% endif %}
    }

{% if item.websocket | default(false) %}
    # Dedicated WebSocket endpoint (common patterns)
    location /ws {
        proxy_pass {{ item.backend }};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    location /socket.io {
        proxy_pass {{ item.backend }};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
{% endif %}

    # Health check endpoint for monitoring
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## Handlers

```yaml
# roles/nginx_proxy/handlers/main.yml
---
- name: reload nginx
  systemd:
    name: nginx
    state: reloaded
```

## Main Playbook

```yaml
# playbook.yml
---
- name: Configure Nginx Reverse Proxy
  hosts: all
  become: yes
  roles:
    - nginx_proxy
```

## Adding Rate Limiting

Protect your backends from abuse by adding rate limiting:

```nginx
# Add to the http context in nginx.conf or a separate conf.d file
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/s;
```

```yaml
# Task to deploy rate limiting configuration
- name: Deploy rate limiting configuration
  copy:
    content: |
      limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
      limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/s;
    dest: /etc/nginx/conf.d/rate-limiting.conf
    mode: '0644'
  notify: reload nginx
```

Then use it in your proxy location blocks:

```nginx
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://api_backend;
    include /etc/nginx/conf.d/proxy-params.conf;
}
```

## Proxy with Multiple Backends

For microservices, route different paths to different backends:

```yaml
# Variable definition for path-based routing
proxy_routes:
  - path: /api/users
    backend: "http://127.0.0.1:3001"
  - path: /api/orders
    backend: "http://127.0.0.1:3002"
  - path: /api/products
    backend: "http://127.0.0.1:3003"
  - path: /
    backend: "http://127.0.0.1:3000"
```

## Running the Playbook

```bash
# Deploy reverse proxy configuration
ansible-playbook -i inventory/hosts.yml playbook.yml

# Preview changes without applying
ansible-playbook -i inventory/hosts.yml playbook.yml --check --diff
```

## Verifying the Proxy

```yaml
# Post-deployment verification tasks
- name: Verify each proxy site is responding
  uri:
    url: "http://{{ item.server_name }}"
    headers:
      Host: "{{ item.server_name }}"
    status_code: [200, 301, 302]
  loop: "{{ proxy_sites }}"
  delegate_to: localhost
  become: no
```

## Wrapping Up

Nginx as a reverse proxy is a fundamental pattern in web architecture. This Ansible playbook makes it easy to manage proxy configurations for multiple sites with different requirements. The template-driven approach means adding a new proxied site is just a matter of adding an entry to the `proxy_sites` variable. Features like WebSocket support, response caching, and rate limiting are all handled through simple boolean flags. This gives you a flexible, maintainable reverse proxy layer that you can manage entirely through Ansible.
