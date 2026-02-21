# How to Use Ansible to Configure Rate Limiting in Nginx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Nginx, Rate Limiting, DevOps, Security

Description: Learn how to automate Nginx rate limiting configuration using Ansible playbooks to protect your web applications from abuse and DDoS attacks.

---

Rate limiting is one of the most effective ways to protect your web applications from brute-force attacks, DDoS attempts, and general API abuse. When you are running Nginx across multiple servers, configuring rate limiting by hand on each one is tedious and error-prone. Ansible makes this process repeatable, consistent, and fast.

In this post, I will walk through building an Ansible playbook that configures rate limiting in Nginx with different strategies for different endpoints.

## Understanding Nginx Rate Limiting

Nginx uses the `ngx_http_limit_req_module` to control the rate of incoming requests. The two main directives are:

- `limit_req_zone`: Defines a shared memory zone that tracks request rates per key (usually the client IP).
- `limit_req`: Applies the rate limit to a specific location block.

The rate is expressed in requests per second (r/s) or requests per minute (r/m). Nginx uses a leaky bucket algorithm, which means requests exceeding the rate are either delayed or rejected.

## Project Structure

Here is how I organize the Ansible project for this task:

```
nginx-rate-limit/
  inventory/
    hosts.yml
  roles/
    nginx_rate_limit/
      tasks/
        main.yml
      templates/
        rate_limit.conf.j2
        nginx_site.conf.j2
      defaults/
        main.yml
  playbook.yml
```

## Defining Variables

First, let us set up default variables for the role. These control the rate limit zones and burst settings.

```yaml
# roles/nginx_rate_limit/defaults/main.yml
# Rate limiting configuration defaults
nginx_rate_limit_zones:
  - name: general
    key: "$binary_remote_addr"
    size: "10m"
    rate: "10r/s"
  - name: login
    key: "$binary_remote_addr"
    size: "5m"
    rate: "1r/s"
  - name: api
    key: "$binary_remote_addr"
    size: "10m"
    rate: "30r/s"

nginx_rate_limit_status_code: 429

nginx_rate_limit_locations:
  - path: "/"
    zone: general
    burst: 20
    nodelay: true
  - path: "/login"
    zone: login
    burst: 5
    nodelay: false
  - path: "/api/"
    zone: api
    burst: 50
    nodelay: true

nginx_upstream_backend: "127.0.0.1:8080"
```

I am defining three separate zones here: a general zone for normal pages, a stricter zone for the login page (to prevent brute-force attacks), and a more permissive zone for API endpoints. You can adjust these values depending on your application's traffic patterns.

## Creating the Rate Limit Configuration Template

This Jinja2 template generates the Nginx rate limit zone definitions.

```nginx
# roles/nginx_rate_limit/templates/rate_limit.conf.j2
# Rate limiting zone definitions
# Each zone tracks request rates per client IP in shared memory

{% for zone in nginx_rate_limit_zones %}
limit_req_zone {{ zone.key }} zone={{ zone.name }}:{{ zone.size }} rate={{ zone.rate }};
{% endfor %}

# Set the status code returned when rate limit is exceeded
limit_req_status {{ nginx_rate_limit_status_code }};

# Log format for rate-limited requests
log_format rate_limit '$remote_addr - $remote_user [$time_local] '
                      '"$request" $status $body_bytes_sent '
                      '"rate_limit_zone=$limit_req_status"';
```

## Creating the Site Configuration Template

This template generates the full Nginx server block with rate limiting applied to each location.

```nginx
# roles/nginx_rate_limit/templates/nginx_site.conf.j2
# Server block with rate limiting applied per location

server {
    listen 80;
    server_name {{ nginx_server_name | default('_') }};

    access_log /var/log/nginx/access.log rate_limit;
    error_log /var/log/nginx/error.log warn;

    # Custom error page for rate-limited requests
    error_page 429 /429.html;
    location = /429.html {
        root /usr/share/nginx/html;
        internal;
    }

{% for loc in nginx_rate_limit_locations %}
    location {{ loc.path }} {
        limit_req zone={{ loc.zone }} burst={{ loc.burst }}{% if loc.nodelay %} nodelay{% endif %};

        proxy_pass http://{{ nginx_upstream_backend }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

{% endfor %}
}
```

## Writing the Tasks

Now let us put the tasks together. The role installs Nginx, deploys the configuration files, and validates the config before reloading.

```yaml
# roles/nginx_rate_limit/tasks/main.yml
---
- name: Install Nginx
  ansible.builtin.apt:
    name: nginx
    state: present
    update_cache: yes
  become: true

- name: Create custom 429 error page
  ansible.builtin.copy:
    dest: /usr/share/nginx/html/429.html
    content: |
      <!DOCTYPE html>
      <html>
      <head><title>429 Too Many Requests</title></head>
      <body>
        <h1>Too Many Requests</h1>
        <p>You have sent too many requests. Please try again later.</p>
      </body>
      </html>
    owner: www-data
    group: www-data
    mode: "0644"
  become: true

- name: Deploy rate limiting zone configuration
  ansible.builtin.template:
    src: rate_limit.conf.j2
    dest: /etc/nginx/conf.d/rate_limit.conf
    owner: root
    group: root
    mode: "0644"
  become: true
  notify: Validate and reload nginx

- name: Remove default site configuration
  ansible.builtin.file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  become: true
  notify: Validate and reload nginx

- name: Deploy site configuration with rate limiting
  ansible.builtin.template:
    src: nginx_site.conf.j2
    dest: /etc/nginx/sites-available/rate_limited_site.conf
    owner: root
    group: root
    mode: "0644"
  become: true
  notify: Validate and reload nginx

- name: Enable site configuration
  ansible.builtin.file:
    src: /etc/nginx/sites-available/rate_limited_site.conf
    dest: /etc/nginx/sites-enabled/rate_limited_site.conf
    state: link
  become: true
  notify: Validate and reload nginx

- name: Ensure Nginx is running and enabled
  ansible.builtin.systemd:
    name: nginx
    state: started
    enabled: true
  become: true
```

You will also need a handler to validate the Nginx configuration before reloading, so you do not accidentally break a running server.

```yaml
# roles/nginx_rate_limit/handlers/main.yml
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

Here is the main playbook that ties everything together.

```yaml
# playbook.yml
---
- name: Configure Nginx rate limiting
  hosts: webservers
  become: true
  vars:
    nginx_server_name: "example.com"
    nginx_upstream_backend: "127.0.0.1:3000"
    # Override default rate limits for production
    nginx_rate_limit_zones:
      - name: general
        key: "$binary_remote_addr"
        size: "10m"
        rate: "20r/s"
      - name: login
        key: "$binary_remote_addr"
        size: "5m"
        rate: "2r/m"
      - name: api
        key: "$binary_remote_addr"
        size: "20m"
        rate: "60r/s"
  roles:
    - nginx_rate_limit
```

## The Inventory File

```yaml
# inventory/hosts.yml
all:
  children:
    webservers:
      hosts:
        web1:
          ansible_host: 192.168.1.10
        web2:
          ansible_host: 192.168.1.11
```

## Running the Playbook

Execute the playbook against your inventory:

```bash
# Run the playbook with verbose output
ansible-playbook -i inventory/hosts.yml playbook.yml -v
```

## Testing Rate Limits

After deployment, you can verify rate limiting is working with a quick load test using `ab` (Apache Benchmark):

```bash
# Send 100 requests with 10 concurrent connections to the login endpoint
ab -n 100 -c 10 http://example.com/login

# Check Nginx logs for rate-limited requests
tail -f /var/log/nginx/error.log | grep "limiting"
```

You should see entries like `limiting requests, excess: 1.234 by zone "login"` in the error log, confirming that rate limiting is active.

## Allowlisting Trusted IPs

Sometimes you need to exempt certain IPs from rate limiting (monitoring systems, internal services, etc.). You can add a geo block to the rate limit configuration:

```nginx
# Add to rate_limit.conf.j2 to allowlist specific IPs
geo $rate_limit_bypass {
    default 0;
    10.0.0.0/8 1;
    172.16.0.0/12 1;
}

map $rate_limit_bypass $rate_limit_key {
    0 $binary_remote_addr;
    1 "";
}
```

Then change the zone key from `$binary_remote_addr` to `$rate_limit_key`. When the key is an empty string, Nginx skips rate limiting for that request entirely.

## Monitoring Rate Limit Events

In production, you want visibility into how often rate limits are being triggered. Add a status endpoint to your Nginx config:

```nginx
location /nginx_status {
    stub_status on;
    allow 10.0.0.0/8;
    deny all;
}
```

Then scrape this endpoint with Prometheus or your monitoring tool of choice to track connection counts and request rates over time.

## Summary

Automating Nginx rate limiting with Ansible gives you a consistent, version-controlled way to protect your web applications. The approach in this post uses separate rate limit zones for different endpoints, which lets you tune the limits based on the sensitivity and expected traffic of each part of your application. The handler chain ensures that Nginx configuration is always validated before reloading, preventing accidental downtime from a syntax error.
