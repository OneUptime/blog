# How to Use Ansible to Configure SSL/TLS with Nginx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSL, TLS, Nginx, Security

Description: Configure SSL/TLS certificates with Nginx using Ansible including certificate deployment, security hardening, and HTTPS redirection.

---

Running your web applications over HTTPS is not optional anymore. Browsers flag HTTP sites as insecure, search engines penalize them, and modern web features like service workers require a secure context. Configuring SSL/TLS correctly involves more than just dropping a certificate on the server. You need strong cipher suites, proper protocol versions, HSTS headers, OCSP stapling, and HTTP to HTTPS redirection. Ansible lets you codify all of this and apply it consistently across your infrastructure.

This guide covers configuring Nginx with SSL/TLS using Ansible, with both commercial certificates and self-signed certificates for development.

## Prerequisites

- Ansible 2.9+ on your control node
- Ubuntu 22.04 target servers
- SSL certificate and private key (or we will generate self-signed ones)
- Nginx installed on target servers

## Project Structure

```
ssl-nginx/
  inventory/
    hosts.yml
  group_vars/
    all.yml
  roles/
    nginx_ssl/
      tasks/
        main.yml
      templates/
        nginx-ssl.conf.j2
        ssl-params.conf.j2
      files/
        dhparam.pem
      handlers/
        main.yml
  playbook.yml
```

## Variables

```yaml
# group_vars/all.yml
server_name: www.example.com
ssl_cert_path: /etc/ssl/certs/example.com.crt
ssl_key_path: /etc/ssl/private/example.com.key
ssl_chain_path: /etc/ssl/certs/example.com-chain.crt
ssl_dhparam_path: /etc/ssl/certs/dhparam.pem
app_backend: "http://127.0.0.1:8000"
enable_hsts: true
hsts_max_age: 31536000
```

## Generating DH Parameters

DH parameters strengthen the Diffie-Hellman key exchange. Generate them once on your control node:

```bash
# Generate a 2048-bit DH parameter file (takes a few minutes)
openssl dhparam -out files/dhparam.pem 2048
```

## Role Tasks

```yaml
# roles/nginx_ssl/tasks/main.yml
---
- name: Install Nginx
  apt:
    name: nginx
    state: present
    update_cache: yes

- name: Create SSL directory for certificates
  file:
    path: /etc/ssl/private
    state: directory
    owner: root
    group: root
    mode: '0700'

- name: Copy SSL certificate to the server
  copy:
    src: "{{ ssl_cert_local_path }}"
    dest: "{{ ssl_cert_path }}"
    owner: root
    group: root
    mode: '0644'
  notify: reload nginx

- name: Copy SSL private key to the server
  copy:
    src: "{{ ssl_key_local_path }}"
    dest: "{{ ssl_key_path }}"
    owner: root
    group: root
    mode: '0600'
  notify: reload nginx

- name: Copy SSL certificate chain
  copy:
    src: "{{ ssl_chain_local_path }}"
    dest: "{{ ssl_chain_path }}"
    owner: root
    group: root
    mode: '0644'
  when: ssl_chain_local_path is defined
  notify: reload nginx

- name: Deploy DH parameters file
  copy:
    src: dhparam.pem
    dest: "{{ ssl_dhparam_path }}"
    owner: root
    group: root
    mode: '0644'

- name: Deploy shared SSL parameters configuration
  template:
    src: ssl-params.conf.j2
    dest: /etc/nginx/snippets/ssl-params.conf
    mode: '0644'
  notify: reload nginx

- name: Deploy Nginx SSL site configuration
  template:
    src: nginx-ssl.conf.j2
    dest: /etc/nginx/sites-available/{{ server_name }}
    mode: '0644'
  notify: reload nginx

- name: Enable Nginx SSL site
  file:
    src: /etc/nginx/sites-available/{{ server_name }}
    dest: /etc/nginx/sites-enabled/{{ server_name }}
    state: link
  notify: reload nginx

- name: Remove default Nginx site
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: reload nginx

- name: Test Nginx configuration before reloading
  command: nginx -t
  changed_when: false
```

## SSL Parameters Template

This shared snippet contains all the SSL hardening settings. It gets included by any Nginx server block that needs SSL.

```nginx
# roles/nginx_ssl/templates/ssl-params.conf.j2
# SSL protocol configuration - only allow TLS 1.2 and 1.3
ssl_protocols TLSv1.2 TLSv1.3;

# Prefer server cipher suites over client preferences
ssl_prefer_server_ciphers on;

# Strong cipher suite list
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;

# DH parameters for DHE cipher suites
ssl_dhparam {{ ssl_dhparam_path }};

# SSL session settings for performance
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;

# OCSP stapling for faster certificate validation
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

{% if enable_hsts %}
# HSTS header tells browsers to always use HTTPS
add_header Strict-Transport-Security "max-age={{ hsts_max_age }}; includeSubDomains; preload" always;
{% endif %}

# Additional security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

## Nginx SSL Site Configuration

```nginx
# roles/nginx_ssl/templates/nginx-ssl.conf.j2
# Redirect all HTTP traffic to HTTPS
server {
    listen 80;
    server_name {{ server_name }};
    return 301 https://$host$request_uri;
}

# HTTPS server block
server {
    listen 443 ssl http2;
    server_name {{ server_name }};

    # SSL certificate paths
    ssl_certificate {{ ssl_cert_path }};
    ssl_certificate_key {{ ssl_key_path }};
{% if ssl_chain_path is defined %}
    ssl_trusted_certificate {{ ssl_chain_path }};
{% endif %}

    # Include shared SSL hardening parameters
    include /etc/nginx/snippets/ssl-params.conf;

    # Access and error logs
    access_log /var/log/nginx/{{ server_name }}.access.log;
    error_log /var/log/nginx/{{ server_name }}.error.log;

    # Proxy to backend application
    location / {
        proxy_pass {{ app_backend }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Handlers

```yaml
# roles/nginx_ssl/handlers/main.yml
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
- name: Configure SSL/TLS with Nginx
  hosts: all
  become: yes
  roles:
    - nginx_ssl
```

## Self-Signed Certificates for Development

For development or internal services, generate self-signed certificates with Ansible:

```yaml
# Task to generate a self-signed certificate on the server
- name: Generate self-signed SSL certificate
  command: >
    openssl req -x509 -nodes -days 365
    -newkey rsa:2048
    -keyout {{ ssl_key_path }}
    -out {{ ssl_cert_path }}
    -subj "/CN={{ server_name }}/O=MyOrg/C=US"
  args:
    creates: "{{ ssl_cert_path }}"
  notify: reload nginx

- name: Set correct permissions on private key
  file:
    path: "{{ ssl_key_path }}"
    owner: root
    group: root
    mode: '0600'
```

## Testing Your SSL Configuration

After deploying, verify the configuration:

```yaml
# Post-deployment SSL verification tasks
- name: Check that HTTPS is responding
  uri:
    url: "https://{{ server_name }}"
    validate_certs: yes
    status_code: 200
  delegate_to: localhost
  become: no

- name: Verify HTTP redirects to HTTPS
  uri:
    url: "http://{{ server_name }}"
    follow_redirects: none
    status_code: 301
  delegate_to: localhost
  become: no
  register: redirect_check

- name: Confirm redirect goes to HTTPS
  assert:
    that:
      - "'https://' in redirect_check.location"
    fail_msg: "HTTP is not redirecting to HTTPS"
```

## Certificate Renewal Monitoring

Add a task to check certificate expiration and alert before it expires:

```yaml
# Check if the SSL certificate expires within 30 days
- name: Check SSL certificate expiration
  shell: |
    openssl x509 -enddate -noout -in {{ ssl_cert_path }} | cut -d= -f2
  register: cert_expiry
  changed_when: false

- name: Parse certificate expiry date
  set_fact:
    cert_expiry_epoch: "{{ (cert_expiry.stdout | to_datetime('%b %d %H:%M:%S %Y %Z')).strftime('%s') }}"

- name: Warn if certificate expires within 30 days
  debug:
    msg: "WARNING: SSL certificate for {{ server_name }} expires on {{ cert_expiry.stdout }}"
  when: (cert_expiry_epoch | int - ansible_date_time.epoch | int) < 2592000
```

## Running the Playbook

```bash
# Deploy SSL configuration
ansible-playbook -i inventory/hosts.yml playbook.yml

# Test with a dry run first
ansible-playbook -i inventory/hosts.yml playbook.yml --check --diff
```

## Wrapping Up

Configuring SSL/TLS properly is about more than just installing a certificate. This Ansible playbook handles the full picture: certificate deployment, strong cipher configuration, DH parameters, OCSP stapling, HSTS, HTTP to HTTPS redirection, and security headers. By codifying these settings, you ensure every server in your infrastructure has the same strong SSL configuration. Combine this with Let's Encrypt for automated certificate management and you have a fully automated HTTPS setup.
