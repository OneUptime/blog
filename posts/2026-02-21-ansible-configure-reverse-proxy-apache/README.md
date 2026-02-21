# How to Use Ansible to Configure Reverse Proxy with Apache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Apache, Reverse Proxy, DevOps, Web Server

Description: Set up Apache as a reverse proxy using Ansible with mod_proxy, WebSocket support, load balancing, and SSL termination.

---

Apache HTTP Server has been a reverse proxy long before the term became trendy. Its mod_proxy family of modules provides robust proxying capabilities including HTTP, WebSocket, AJP, and even FTP proxying. If your infrastructure already runs Apache or your team is more familiar with it, using Apache as a reverse proxy is a solid choice. Ansible makes it easy to configure and maintain across your servers.

This guide covers configuring Apache as a reverse proxy with Ansible, including basic HTTP proxying, WebSocket support, multiple backend routing, and proxy security.

## Prerequisites

- Ansible 2.9+ on your control node
- Ubuntu 22.04 target servers
- Backend applications running on the servers

## Project Structure

```
apache-proxy/
  inventory/
    hosts.yml
  group_vars/
    all.yml
  roles/
    apache_proxy/
      tasks/
        main.yml
      templates/
        vhost-proxy.conf.j2
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
    backend_url: "http://127.0.0.1:3000"
    websocket: false
    preserve_host: true

  - name: api
    server_name: api.example.com
    backend_url: "http://127.0.0.1:8080"
    websocket: true
    preserve_host: true

  - name: legacy
    server_name: legacy.example.com
    backend_url: "http://10.0.1.50:8080"
    websocket: false
    preserve_host: false

proxy_timeout: 300
proxy_max_connections: 100
```

## Role Tasks

```yaml
# roles/apache_proxy/tasks/main.yml
---
- name: Install Apache
  apt:
    name: apache2
    state: present
    update_cache: yes

- name: Enable required Apache proxy modules
  apache2_module:
    name: "{{ item }}"
    state: present
  loop:
    - proxy
    - proxy_http
    - proxy_wstunnel
    - proxy_balancer
    - lbmethod_byrequests
    - rewrite
    - headers
    - ssl
  notify: restart apache

- name: Deploy proxy virtual host for each site
  template:
    src: vhost-proxy.conf.j2
    dest: "/etc/apache2/sites-available/{{ item.name }}-proxy.conf"
    mode: '0644'
  loop: "{{ proxy_sites }}"
  notify: reload apache

- name: Enable each proxy site
  command: "a2ensite {{ item.name }}-proxy"
  args:
    creates: "/etc/apache2/sites-enabled/{{ item.name }}-proxy.conf"
  loop: "{{ proxy_sites }}"
  notify: reload apache

- name: Disable default Apache site
  command: a2dissite 000-default
  args:
    removes: /etc/apache2/sites-enabled/000-default.conf
  notify: reload apache

- name: Configure global proxy settings
  copy:
    content: |
      # Global proxy settings managed by Ansible
      ProxyRequests Off
      ProxyPreserveHost On

      # Timeout for proxy connections
      ProxyTimeout {{ proxy_timeout }}

      # Security: deny forward proxying
      <Proxy *>
          Require all granted
      </Proxy>
    dest: /etc/apache2/conf-available/proxy-global.conf
    mode: '0644'
  notify: reload apache

- name: Enable global proxy configuration
  command: a2enconf proxy-global
  args:
    creates: /etc/apache2/conf-enabled/proxy-global.conf
  notify: reload apache

- name: Test Apache configuration
  command: apache2ctl configtest
  changed_when: false

- name: Ensure Apache is running and enabled
  systemd:
    name: apache2
    enabled: yes
    state: started
```

## Virtual Host Proxy Template

```apache
# roles/apache_proxy/templates/vhost-proxy.conf.j2
<VirtualHost *:80>
    ServerName {{ item.server_name }}
    ServerAdmin webmaster@{{ item.server_name }}

{% if item.preserve_host | default(true) %}
    # Pass the original Host header to the backend
    ProxyPreserveHost On
{% else %}
    ProxyPreserveHost Off
{% endif %}

    # Forward client information to the backend
    RequestHeader set X-Real-IP "%{REMOTE_ADDR}s"
    RequestHeader set X-Forwarded-For "%{REMOTE_ADDR}s"
    RequestHeader set X-Forwarded-Proto "http"

{% if item.websocket | default(false) %}
    # WebSocket proxy configuration
    # Rewrite WebSocket upgrade requests to use ws:// protocol
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/(.*)$ ws://{{ item.backend_url | regex_replace('^https?://', '') }}/$1 [P,L]

    # Socket.IO specific WebSocket path
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteRule ^/socket.io/(.*)$ ws://{{ item.backend_url | regex_replace('^https?://', '') }}/socket.io/$1 [P,L]
{% endif %}

    # Main proxy directive
    ProxyPass / {{ item.backend_url }}/
    ProxyPassReverse / {{ item.backend_url }}/

    # Connection pooling settings
    <Proxy {{ item.backend_url }}>
        ProxySet connectiontimeout=5
        ProxySet timeout={{ proxy_timeout }}
        ProxySet keepalive=On
    </Proxy>

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/{{ item.name }}-proxy-error.log
    CustomLog ${APACHE_LOG_DIR}/{{ item.name }}-proxy-access.log combined
</VirtualHost>
```

## Handlers

```yaml
# roles/apache_proxy/handlers/main.yml
---
- name: restart apache
  systemd:
    name: apache2
    state: restarted

- name: reload apache
  systemd:
    name: apache2
    state: reloaded
```

## Main Playbook

```yaml
# playbook.yml
---
- name: Configure Apache Reverse Proxy
  hosts: all
  become: yes
  roles:
    - apache_proxy
```

## Path-Based Routing

Route different URL paths to different backend services from a single virtual host:

```apache
# Example: Multiple backends on one virtual host
<VirtualHost *:80>
    ServerName app.example.com

    # Route API requests to the API service
    ProxyPass /api http://127.0.0.1:8080/api
    ProxyPassReverse /api http://127.0.0.1:8080/api

    # Route admin requests to the admin service
    ProxyPass /admin http://127.0.0.1:9090/admin
    ProxyPassReverse /admin http://127.0.0.1:9090/admin

    # Route everything else to the frontend
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
</VirtualHost>
```

To handle this in Ansible, define routes in your variables:

```yaml
# Path-based routing variable definition
multi_backend_sites:
  - name: myapp
    server_name: app.example.com
    routes:
      - path: /api
        backend: "http://127.0.0.1:8080"
      - path: /admin
        backend: "http://127.0.0.1:9090"
      - path: /
        backend: "http://127.0.0.1:3000"
```

## Load Balancing with mod_proxy_balancer

Apache can also load balance across multiple backend servers:

```apache
# Load balancing configuration
<Proxy "balancer://myapp">
    BalancerMember http://10.0.1.10:8080 route=node1
    BalancerMember http://10.0.1.11:8080 route=node2
    BalancerMember http://10.0.1.12:8080 route=node3
    ProxySet lbmethod=byrequests
    ProxySet stickysession=ROUTEID
</Proxy>

<VirtualHost *:80>
    ServerName app.example.com
    ProxyPass / balancer://myapp/
    ProxyPassReverse / balancer://myapp/
</VirtualHost>
```

The corresponding Ansible variable:

```yaml
# Load balanced proxy configuration
lb_sites:
  - name: myapp
    server_name: app.example.com
    lb_method: byrequests
    sticky_session: ROUTEID
    members:
      - url: "http://10.0.1.10:8080"
        route: node1
      - url: "http://10.0.1.11:8080"
        route: node2
      - url: "http://10.0.1.12:8080"
        route: node3
```

## Proxy Security

Restrict who can access your proxied services:

```apache
# Restrict proxy access by IP range
<Location /admin>
    ProxyPass http://127.0.0.1:9090/admin
    ProxyPassReverse http://127.0.0.1:9090/admin

    # Only allow access from the office network
    Require ip 10.0.0.0/8
    Require ip 192.168.1.0/24
</Location>
```

## Running the Playbook

```bash
# Deploy Apache reverse proxy
ansible-playbook -i inventory/hosts.yml playbook.yml

# Preview changes
ansible-playbook -i inventory/hosts.yml playbook.yml --check --diff
```

## Verifying the Configuration

```yaml
# Post-deployment verification
- name: Check each proxy site is working
  uri:
    url: "http://{{ item.server_name }}"
    headers:
      Host: "{{ item.server_name }}"
    status_code: [200, 301, 302]
  loop: "{{ proxy_sites }}"
  delegate_to: localhost
  become: no
  ignore_errors: yes
  register: proxy_check

- name: Report proxy status
  debug:
    msg: "{{ item.item.name }}: {{ 'OK' if item.status == 200 else 'FAILED' }}"
  loop: "{{ proxy_check.results }}"
```

## Wrapping Up

Apache as a reverse proxy is a mature, well-tested solution. The mod_proxy family of modules covers HTTP proxying, WebSocket support, AJP for Java applications, and load balancing. This Ansible playbook makes it easy to manage multiple proxy sites with different configurations. The template-driven approach means you define your sites as data and let Ansible generate the correct Apache configuration. Whether you are proxying to a single backend or load balancing across a cluster, Apache and Ansible handle it well.
