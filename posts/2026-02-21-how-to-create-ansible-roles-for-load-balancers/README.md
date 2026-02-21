# How to Create Ansible Roles for Load Balancers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, HAProxy, Load Balancing, Roles, DevOps

Description: Build a production-grade Ansible role for HAProxy load balancer configuration with health checks, SSL termination, and multiple backend support.

---

Load balancers sit at the critical path of every request hitting your infrastructure. Getting the configuration wrong means downtime. Getting it right means you need consistency across environments, which is exactly what an Ansible role gives you. This post covers building an HAProxy role from scratch that handles frontend/backend configuration, health checks, SSL termination, rate limiting, and monitoring endpoints.

## Role Structure

```
roles/haproxy/
  defaults/main.yml
  handlers/main.yml
  tasks/
    main.yml
    install.yml
    configure.yml
    ssl.yml
  templates/
    haproxy.cfg.j2
  meta/main.yml
```

## Default Variables

```yaml
# roles/haproxy/defaults/main.yml
# HAProxy version and package
haproxy_package: haproxy
haproxy_version: "2.8"

# Global settings
haproxy_global_maxconn: 50000
haproxy_global_log: "/dev/log local0"
haproxy_global_chroot: /var/lib/haproxy
haproxy_global_user: haproxy
haproxy_global_group: haproxy
haproxy_nbthread: "{{ ansible_processor_vcpus }}"

# SSL settings
haproxy_ssl_default_bind_ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256"
haproxy_ssl_default_bind_options: "ssl-min-ver TLSv1.2 no-tls-tickets"

# Default settings for frontends and backends
haproxy_defaults_mode: http
haproxy_defaults_timeout_connect: "5s"
haproxy_defaults_timeout_client: "30s"
haproxy_defaults_timeout_server: "30s"
haproxy_defaults_timeout_http_request: "10s"
haproxy_defaults_timeout_http_keep_alive: "10s"
haproxy_defaults_maxconn: 10000
haproxy_defaults_retries: 3

# Stats page
haproxy_stats_enabled: true
haproxy_stats_port: 8404
haproxy_stats_uri: /stats
haproxy_stats_auth_user: admin
haproxy_stats_auth_password: "changeme"

# Frontends
haproxy_frontends: []
# Example:
#   - name: http_front
#     bind: "*:80"
#     default_backend: app_servers
#     acls: []

# Backends
haproxy_backends: []
# Example:
#   - name: app_servers
#     balance: roundrobin
#     servers:
#       - name: app1
#         address: 10.0.1.10:8080
#         options: check
#       - name: app2
#         address: 10.0.1.11:8080
#         options: check

# Health check defaults
haproxy_health_check_interval: "3s"
haproxy_health_check_fall: 3
haproxy_health_check_rise: 2

# Rate limiting
haproxy_rate_limiting_enabled: false
haproxy_rate_limit_requests: 100
haproxy_rate_limit_period: "10s"

# Logging
haproxy_log_format: "%ci:%cp [%t] %ft %b/%s %Tq/%Tw/%Tc/%Tr/%Tt %ST %B %CC %CS %tsc %ac/%fc/%bc/%sc/%rc %sq/%bq %hr %hs %{+Q}r"
```

## Installation Tasks

```yaml
# roles/haproxy/tasks/install.yml
# Install HAProxy from the official PPA for the latest stable version
- name: Install software-properties-common
  ansible.builtin.apt:
    name: software-properties-common
    state: present

- name: Add HAProxy PPA
  ansible.builtin.apt_repository:
    repo: "ppa:vbernat/haproxy-{{ haproxy_version }}"
    state: present

- name: Install HAProxy
  ansible.builtin.apt:
    name: "{{ haproxy_package }}"
    state: present
    update_cache: yes

- name: Ensure HAProxy is started and enabled
  ansible.builtin.systemd:
    name: haproxy
    state: started
    enabled: yes

- name: Create SSL certificate directory
  ansible.builtin.file:
    path: /etc/haproxy/certs
    state: directory
    owner: haproxy
    group: haproxy
    mode: '0700'
```

## HAProxy Configuration Template

```jinja2
# roles/haproxy/templates/haproxy.cfg.j2
# HAProxy configuration - managed by Ansible
# Do not edit manually

global
    log {{ haproxy_global_log }}
    chroot {{ haproxy_global_chroot }}
    user {{ haproxy_global_user }}
    group {{ haproxy_global_group }}
    maxconn {{ haproxy_global_maxconn }}
    nbthread {{ haproxy_nbthread }}
    daemon

    # SSL tuning
    ssl-default-bind-ciphers {{ haproxy_ssl_default_bind_ciphers }}
    ssl-default-bind-options {{ haproxy_ssl_default_bind_options }}
    tune.ssl.default-dh-param 2048

defaults
    log     global
    mode    {{ haproxy_defaults_mode }}
    option  httplog
    option  dontlognull
    option  forwardfor
    option  http-server-close
    timeout connect {{ haproxy_defaults_timeout_connect }}
    timeout client  {{ haproxy_defaults_timeout_client }}
    timeout server  {{ haproxy_defaults_timeout_server }}
    timeout http-request {{ haproxy_defaults_timeout_http_request }}
    timeout http-keep-alive {{ haproxy_defaults_timeout_http_keep_alive }}
    maxconn {{ haproxy_defaults_maxconn }}
    retries {{ haproxy_defaults_retries }}
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

{% if haproxy_rate_limiting_enabled %}
# Rate limiting stick table
frontend rate_limiter
    bind *:0
    stick-table type ip size 100k expire {{ haproxy_rate_limit_period }} store http_req_rate({{ haproxy_rate_limit_period }})
{% endif %}

{% if haproxy_stats_enabled %}
# Stats page
frontend stats
    bind *:{{ haproxy_stats_port }}
    mode http
    stats enable
    stats uri {{ haproxy_stats_uri }}
    stats refresh 10s
    stats auth {{ haproxy_stats_auth_user }}:{{ haproxy_stats_auth_password }}
    stats admin if TRUE
{% endif %}

{% for frontend in haproxy_frontends %}
# Frontend: {{ frontend.name }}
frontend {{ frontend.name }}
    bind {{ frontend.bind }}
{% if frontend.mode is defined %}
    mode {{ frontend.mode }}
{% endif %}
{% if frontend.options is defined %}
{% for option in frontend.options %}
    option {{ option }}
{% endfor %}
{% endif %}
{% if frontend.http_request_rules is defined %}
{% for rule in frontend.http_request_rules %}
    http-request {{ rule }}
{% endfor %}
{% endif %}
{% if haproxy_rate_limiting_enabled %}
    # Rate limiting
    http-request track-sc0 src table rate_limiter
    http-request deny deny_status 429 if { sc_http_req_rate(0) gt {{ haproxy_rate_limit_requests }} }
{% endif %}
{% if frontend.acls is defined %}
{% for acl in frontend.acls %}
    acl {{ acl.name }} {{ acl.condition }}
    use_backend {{ acl.backend }} if {{ acl.name }}
{% endfor %}
{% endif %}
{% if frontend.default_backend is defined %}
    default_backend {{ frontend.default_backend }}
{% endif %}

{% endfor %}

{% for backend in haproxy_backends %}
# Backend: {{ backend.name }}
backend {{ backend.name }}
    balance {{ backend.balance | default('roundrobin') }}
{% if backend.mode is defined %}
    mode {{ backend.mode }}
{% endif %}
{% if backend.options is defined %}
{% for option in backend.options %}
    option {{ option }}
{% endfor %}
{% endif %}
{% if backend.http_check is defined %}
    option httpchk
    http-check send meth GET uri {{ backend.http_check.uri | default('/health') }} ver HTTP/1.1 hdr Host {{ backend.http_check.host | default('localhost') }}
    http-check expect status {{ backend.http_check.expect_status | default('200') }}
{% endif %}
{% if backend.cookie is defined %}
    cookie {{ backend.cookie.name }} {{ backend.cookie.options | default('insert indirect nocache') }}
{% endif %}
{% for server in backend.servers %}
    server {{ server.name }} {{ server.address }} {{ server.options | default('check') }} inter {{ haproxy_health_check_interval }} fall {{ haproxy_health_check_fall }} rise {{ haproxy_health_check_rise }}{% if backend.cookie is defined %} cookie {{ server.name }}{% endif %}

{% endfor %}

{% endfor %}
```

## Configuration and Main Tasks

```yaml
# roles/haproxy/tasks/configure.yml
- name: Deploy HAProxy configuration
  ansible.builtin.template:
    src: haproxy.cfg.j2
    dest: /etc/haproxy/haproxy.cfg
    owner: root
    group: root
    mode: '0644'
    validate: "haproxy -c -f %s"
  notify: reload haproxy

- name: Enable HAProxy in /etc/default/haproxy
  ansible.builtin.lineinfile:
    path: /etc/default/haproxy
    regexp: '^ENABLED='
    line: 'ENABLED=1'
  notify: restart haproxy
```

```yaml
# roles/haproxy/tasks/main.yml
- name: Include installation tasks
  ansible.builtin.include_tasks: install.yml

- name: Include configuration tasks
  ansible.builtin.include_tasks: configure.yml

- name: Include SSL tasks
  ansible.builtin.include_tasks: ssl.yml
  when: haproxy_frontends | selectattr('bind', 'search', 'ssl') | list | length > 0
```

```yaml
# roles/haproxy/tasks/ssl.yml
# Deploy SSL certificates for HTTPS frontends
- name: Deploy SSL certificates
  ansible.builtin.copy:
    content: "{{ item.ssl_cert_content }}"
    dest: "/etc/haproxy/certs/{{ item.ssl_cert_name }}"
    owner: haproxy
    group: haproxy
    mode: '0600'
  loop: "{{ haproxy_ssl_certificates | default([]) }}"
  no_log: true
  notify: reload haproxy
```

```yaml
# roles/haproxy/handlers/main.yml
- name: reload haproxy
  ansible.builtin.systemd:
    name: haproxy
    state: reloaded

- name: restart haproxy
  ansible.builtin.systemd:
    name: haproxy
    state: restarted
```

## Complete Playbook Example

```yaml
# setup-loadbalancer.yml
- hosts: loadbalancers
  become: yes
  roles:
    - role: haproxy
      vars:
        haproxy_global_maxconn: 100000
        haproxy_stats_auth_password: "{{ vault_haproxy_stats_password }}"
        haproxy_rate_limiting_enabled: true
        haproxy_rate_limit_requests: 200

        haproxy_frontends:
          - name: http_front
            bind: "*:80"
            http_request_rules:
              - "redirect scheme https unless { ssl_fc }"

          - name: https_front
            bind: "*:443 ssl crt /etc/haproxy/certs/"
            options:
              - forwardfor
            acls:
              - name: is_api
                condition: "path_beg /api"
                backend: api_servers
              - name: is_static
                condition: "path_beg /static"
                backend: static_servers
            default_backend: web_servers

        haproxy_backends:
          - name: web_servers
            balance: leastconn
            http_check:
              uri: /health
              expect_status: 200
            cookie:
              name: SERVERID
            servers:
              - name: web1
                address: "10.0.1.10:8080"
              - name: web2
                address: "10.0.1.11:8080"
              - name: web3
                address: "10.0.1.12:8080"

          - name: api_servers
            balance: roundrobin
            http_check:
              uri: /api/health
              expect_status: 200
            servers:
              - name: api1
                address: "10.0.2.10:3000"
              - name: api2
                address: "10.0.2.11:3000"

          - name: static_servers
            balance: roundrobin
            servers:
              - name: static1
                address: "10.0.3.10:80"
              - name: static2
                address: "10.0.3.11:80"
```

This role handles everything from basic round-robin balancing to advanced ACL-based routing with health checks and session persistence. The template-driven approach means you can add new frontends and backends without changing any task logic. Just update the variables.
