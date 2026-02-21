# How to Use Ansible to Configure SSL/TLS with Apache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSL, TLS, Apache, Security

Description: Configure SSL/TLS on Apache HTTP Server using Ansible with certificate management, cipher hardening, and HTTPS redirection.

---

Apache HTTP Server remains one of the most widely deployed web servers. If you run Apache in production, securing it with SSL/TLS is essential. Configuring SSL on Apache involves enabling modules, deploying certificates, setting cipher suites, and configuring virtual hosts for both HTTP and HTTPS. Doing this manually across multiple servers is slow and inconsistent. Ansible automates the entire process.

This guide shows you how to configure SSL/TLS on Apache using Ansible, including certificate deployment, security hardening, and HTTP to HTTPS redirection.

## Prerequisites

- Ansible 2.9+ on your control node
- Ubuntu 22.04 target servers
- SSL certificate and private key files
- Apache installed (or we will install it)

## Project Structure

```
ssl-apache/
  inventory/
    hosts.yml
  group_vars/
    all.yml
  roles/
    apache_ssl/
      tasks/
        main.yml
      templates/
        ssl-vhost.conf.j2
        ssl-hardening.conf.j2
      handlers/
        main.yml
  playbook.yml
```

## Variables

```yaml
# group_vars/all.yml
server_name: www.example.com
server_admin: admin@example.com
document_root: /var/www/html
ssl_cert_path: /etc/ssl/certs/example.com.crt
ssl_key_path: /etc/ssl/private/example.com.key
ssl_chain_path: /etc/ssl/certs/example.com-chain.crt
enable_hsts: true
hsts_max_age: 31536000
app_backend_port: 8000
use_proxy: true
```

## Role Tasks

```yaml
# roles/apache_ssl/tasks/main.yml
---
- name: Install Apache and required packages
  apt:
    name:
      - apache2
      - openssl
    state: present
    update_cache: yes

- name: Enable Apache SSL module
  apache2_module:
    name: ssl
    state: present
  notify: restart apache

- name: Enable Apache rewrite module
  apache2_module:
    name: rewrite
    state: present
  notify: restart apache

- name: Enable Apache headers module
  apache2_module:
    name: headers
    state: present
  notify: restart apache

- name: Enable Apache proxy modules for reverse proxy
  apache2_module:
    name: "{{ item }}"
    state: present
  loop:
    - proxy
    - proxy_http
  when: use_proxy | default(false)
  notify: restart apache

- name: Create SSL certificate directory
  file:
    path: /etc/ssl/private
    state: directory
    owner: root
    group: root
    mode: '0700'

- name: Deploy SSL certificate
  copy:
    src: "{{ ssl_cert_local }}"
    dest: "{{ ssl_cert_path }}"
    owner: root
    group: root
    mode: '0644'
  notify: restart apache

- name: Deploy SSL private key
  copy:
    src: "{{ ssl_key_local }}"
    dest: "{{ ssl_key_path }}"
    owner: root
    group: root
    mode: '0600'
  notify: restart apache

- name: Deploy SSL certificate chain
  copy:
    src: "{{ ssl_chain_local }}"
    dest: "{{ ssl_chain_path }}"
    owner: root
    group: root
    mode: '0644'
  when: ssl_chain_local is defined
  notify: restart apache

- name: Deploy SSL hardening configuration
  template:
    src: ssl-hardening.conf.j2
    dest: /etc/apache2/conf-available/ssl-hardening.conf
    mode: '0644'
  notify: restart apache

- name: Enable SSL hardening configuration
  command: a2enconf ssl-hardening
  args:
    creates: /etc/apache2/conf-enabled/ssl-hardening.conf
  notify: restart apache

- name: Deploy SSL virtual host configuration
  template:
    src: ssl-vhost.conf.j2
    dest: /etc/apache2/sites-available/{{ server_name }}-ssl.conf
    mode: '0644'
  notify: restart apache

- name: Enable the SSL virtual host
  command: a2ensite {{ server_name }}-ssl
  args:
    creates: /etc/apache2/sites-enabled/{{ server_name }}-ssl.conf
  notify: restart apache

- name: Disable the default site
  command: a2dissite 000-default
  args:
    removes: /etc/apache2/sites-enabled/000-default.conf
  notify: restart apache

- name: Test Apache configuration
  command: apache2ctl configtest
  changed_when: false
```

## SSL Hardening Template

This configuration file contains global SSL settings that apply to all virtual hosts.

```apache
# roles/apache_ssl/templates/ssl-hardening.conf.j2
# Only allow TLS 1.2 and 1.3
SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1

# Use strong cipher suites
SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384

# Prefer server cipher order
SSLHonorCipherOrder on

# Enable OCSP stapling for certificate validation
SSLUseStapling on
SSLStaplingCache "shmcb:logs/ssl_stapling(128000)"
SSLStaplingResponderTimeout 5
SSLStaplingReturnResponderErrors off

# Disable SSL compression to prevent CRIME attack
SSLCompression off

# Disable SSL session tickets for better forward secrecy
SSLSessionTickets off
```

## SSL Virtual Host Template

```apache
# roles/apache_ssl/templates/ssl-vhost.conf.j2
# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName {{ server_name }}
    ServerAdmin {{ server_admin }}

    # Permanent redirect all traffic to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>

# HTTPS virtual host
<VirtualHost *:443>
    ServerName {{ server_name }}
    ServerAdmin {{ server_admin }}
    DocumentRoot {{ document_root }}

    # SSL certificate configuration
    SSLEngine on
    SSLCertificateFile {{ ssl_cert_path }}
    SSLCertificateKeyFile {{ ssl_key_path }}
{% if ssl_chain_path is defined %}
    SSLCertificateChainFile {{ ssl_chain_path }}
{% endif %}

{% if enable_hsts %}
    # HTTP Strict Transport Security header
    Header always set Strict-Transport-Security "max-age={{ hsts_max_age }}; includeSubDomains; preload"
{% endif %}

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

{% if use_proxy %}
    # Reverse proxy to backend application
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:{{ app_backend_port }}/
    ProxyPassReverse / http://127.0.0.1:{{ app_backend_port }}/

    # Forward the original protocol to the backend
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
{% else %}
    # Serve static files from document root
    <Directory {{ document_root }}>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
{% endif %}

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/{{ server_name }}-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/{{ server_name }}-ssl-access.log combined
</VirtualHost>
```

## Handlers

```yaml
# roles/apache_ssl/handlers/main.yml
---
- name: restart apache
  systemd:
    name: apache2
    state: restarted
```

## Main Playbook

```yaml
# playbook.yml
---
- name: Configure SSL/TLS with Apache
  hosts: all
  become: yes
  roles:
    - apache_ssl
```

## Generating Self-Signed Certificates

For development environments, generate self-signed certificates directly on the server:

```yaml
# Generate a self-signed certificate for development
- name: Generate self-signed SSL certificate for development
  command: >
    openssl req -x509 -nodes -days 365
    -newkey rsa:2048
    -keyout {{ ssl_key_path }}
    -out {{ ssl_cert_path }}
    -subj "/CN={{ server_name }}/O=Development/C=US"
  args:
    creates: "{{ ssl_cert_path }}"
  when: use_self_signed | default(false)
  notify: restart apache
```

## Verifying the Configuration

Add post-deployment checks to confirm SSL is working:

```yaml
# Verify SSL is properly configured
- name: Check HTTPS endpoint
  uri:
    url: "https://{{ server_name }}"
    validate_certs: "{{ not (use_self_signed | default(false)) }}"
    status_code: 200
  delegate_to: localhost
  become: no

- name: Verify HTTP to HTTPS redirect
  uri:
    url: "http://{{ server_name }}"
    follow_redirects: none
    status_code: 301
  delegate_to: localhost
  become: no
```

## Running the Playbook

```bash
# Deploy SSL configuration to all servers
ansible-playbook -i inventory/hosts.yml playbook.yml

# Deploy with self-signed certificates for development
ansible-playbook -i inventory/hosts.yml playbook.yml -e "use_self_signed=true"
```

## Disabling Weak TLS Versions

If you inherit servers that might have old TLS configurations, add a cleanup task:

```yaml
# Ensure old SSL configuration is removed
- name: Remove any legacy SSL configuration
  file:
    path: /etc/apache2/mods-available/ssl.conf.bak
    state: absent

- name: Verify no weak protocols are enabled
  command: apache2ctl -M
  register: apache_modules
  changed_when: false

- name: Display loaded SSL module
  debug:
    msg: "SSL module is loaded and configured"
  when: "'ssl_module' in apache_modules.stdout"
```

## Wrapping Up

This Ansible playbook provides a solid SSL/TLS configuration for Apache that follows current security best practices. It disables outdated protocols (SSLv3, TLS 1.0, TLS 1.1), uses strong cipher suites, enables OCSP stapling, adds HSTS headers, and redirects all HTTP traffic to HTTPS. The modular approach with separate hardening and virtual host configurations makes it easy to add more sites without duplicating SSL settings. Whether you use commercial certificates or self-signed ones for development, the playbook handles both scenarios cleanly.
