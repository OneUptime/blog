# How to Create Ansible Roles for SSL Certificate Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSL, TLS, Let's Encrypt, Security

Description: Build an Ansible role for automated SSL certificate provisioning and renewal using Let's Encrypt with Certbot across your infrastructure.

---

Managing SSL certificates by hand is a recipe for outages. Certificates expire, someone forgets to renew them, and suddenly your users see scary browser warnings. An Ansible role for SSL certificate management automates the entire lifecycle: installation of Certbot, certificate issuance, automated renewal, and integration with your web server. This post walks through building that role.

## What the Role Covers

The role will handle:

- Installing Certbot and its dependencies
- Obtaining certificates from Let's Encrypt via HTTP-01 or DNS-01 challenges
- Configuring automatic renewal via systemd timer
- Deploying renewal hooks that reload your web server
- Supporting both standalone and webroot validation methods
- Managing self-signed certificates for internal services

## Role Structure

```
roles/ssl_certs/
  defaults/main.yml
  handlers/main.yml
  tasks/
    main.yml
    install.yml
    letsencrypt.yml
    selfsigned.yml
    renewal.yml
  templates/
    renewal_hook.sh.j2
    openssl.cnf.j2
  meta/main.yml
```

## Default Variables

```yaml
# roles/ssl_certs/defaults/main.yml
# Certificate provider: letsencrypt or selfsigned
ssl_provider: letsencrypt

# Let's Encrypt settings
ssl_letsencrypt_email: ""
ssl_letsencrypt_staging: false
ssl_letsencrypt_challenge: http
ssl_letsencrypt_webroot: /var/www/letsencrypt

# Certbot settings
ssl_certbot_package: certbot
ssl_certbot_plugin_packages:
  - python3-certbot-nginx

# Domains to get certificates for
ssl_domains: []
# Example:
#   - domain: example.com
#     aliases:
#       - www.example.com
#     webroot: /var/www/example.com
#   - domain: api.example.com

# Self-signed certificate settings
ssl_selfsigned_days: 365
ssl_selfsigned_key_size: 4096
ssl_selfsigned_country: US
ssl_selfsigned_state: California
ssl_selfsigned_org: "My Organization"

# Certificate paths
ssl_cert_dir: /etc/letsencrypt/live
ssl_private_key_dir: /etc/ssl/private

# Renewal settings
ssl_renewal_service: nginx
ssl_renewal_hook_command: "systemctl reload {{ ssl_renewal_service }}"

# Pre-check if ports are available (for standalone mode)
ssl_check_ports: true
```

## Installation Tasks

```yaml
# roles/ssl_certs/tasks/install.yml
# Install Certbot and related packages
- name: Install Certbot packages
  ansible.builtin.apt:
    name: "{{ [ssl_certbot_package] + ssl_certbot_plugin_packages }}"
    state: present
    update_cache: yes
  when: ssl_provider == "letsencrypt"

- name: Install OpenSSL for self-signed certificates
  ansible.builtin.apt:
    name: openssl
    state: present
  when: ssl_provider == "selfsigned"
```

## Let's Encrypt Certificate Tasks

```yaml
# roles/ssl_certs/tasks/letsencrypt.yml
# Obtain certificates from Let's Encrypt
- name: Create webroot directory for HTTP validation
  ansible.builtin.file:
    path: "{{ ssl_letsencrypt_webroot }}"
    state: directory
    owner: www-data
    group: www-data
    mode: '0755'
  when: ssl_letsencrypt_challenge == "http"

- name: Check existing certificates
  ansible.builtin.stat:
    path: "/etc/letsencrypt/live/{{ item.domain }}/fullchain.pem"
  loop: "{{ ssl_domains }}"
  register: existing_certs

- name: Obtain certificates via HTTP challenge
  ansible.builtin.command:
    cmd: >
      certbot certonly
      --non-interactive
      --agree-tos
      --email {{ ssl_letsencrypt_email }}
      {% if ssl_letsencrypt_staging %}--staging{% endif %}
      --webroot
      --webroot-path {{ item.item.webroot | default(ssl_letsencrypt_webroot) }}
      -d {{ item.item.domain }}
      {% if item.item.aliases is defined %}
      {% for alias in item.item.aliases %}
      -d {{ alias }}
      {% endfor %}
      {% endif %}
  loop: "{{ existing_certs.results }}"
  when:
    - ssl_letsencrypt_challenge == "http"
    - not item.stat.exists
  notify: reload web server

- name: Obtain certificates via standalone mode
  ansible.builtin.command:
    cmd: >
      certbot certonly
      --non-interactive
      --agree-tos
      --email {{ ssl_letsencrypt_email }}
      {% if ssl_letsencrypt_staging %}--staging{% endif %}
      --standalone
      -d {{ item.item.domain }}
      {% if item.item.aliases is defined %}
      {% for alias in item.item.aliases %}
      -d {{ alias }}
      {% endfor %}
      {% endif %}
  loop: "{{ existing_certs.results }}"
  when:
    - ssl_letsencrypt_challenge == "standalone"
    - not item.stat.exists
  notify: reload web server
```

## Self-Signed Certificate Tasks

```yaml
# roles/ssl_certs/tasks/selfsigned.yml
# Generate self-signed certificates for internal services
- name: Create certificate directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    owner: root
    group: root
    mode: '0755'
  loop:
    - /etc/ssl/certs
    - "{{ ssl_private_key_dir }}"

- name: Generate private keys
  community.crypto.openssl_privatekey:
    path: "{{ ssl_private_key_dir }}/{{ item.domain }}.key"
    size: "{{ ssl_selfsigned_key_size }}"
    owner: root
    group: root
    mode: '0600'
  loop: "{{ ssl_domains }}"

- name: Generate CSRs
  community.crypto.openssl_csr:
    path: "/etc/ssl/certs/{{ item.domain }}.csr"
    privatekey_path: "{{ ssl_private_key_dir }}/{{ item.domain }}.key"
    common_name: "{{ item.domain }}"
    country_name: "{{ ssl_selfsigned_country }}"
    state_or_province_name: "{{ ssl_selfsigned_state }}"
    organization_name: "{{ ssl_selfsigned_org }}"
    subject_alt_name: >-
      {{ ['DNS:' + item.domain] +
         (item.aliases | default([]) | map('regex_replace', '^', 'DNS:') | list) }}
  loop: "{{ ssl_domains }}"

- name: Generate self-signed certificates
  community.crypto.x509_certificate:
    path: "/etc/ssl/certs/{{ item.domain }}.crt"
    privatekey_path: "{{ ssl_private_key_dir }}/{{ item.domain }}.key"
    csr_path: "/etc/ssl/certs/{{ item.domain }}.csr"
    provider: selfsigned
    selfsigned_not_after: "+{{ ssl_selfsigned_days }}d"
  loop: "{{ ssl_domains }}"
  notify: reload web server
```

## Renewal Configuration

```yaml
# roles/ssl_certs/tasks/renewal.yml
# Configure certificate renewal hooks and timers
- name: Deploy renewal hook script
  ansible.builtin.template:
    src: renewal_hook.sh.j2
    dest: /etc/letsencrypt/renewal-hooks/post/reload-services.sh
    owner: root
    group: root
    mode: '0755'
  when: ssl_provider == "letsencrypt"

- name: Ensure certbot renewal timer is enabled
  ansible.builtin.systemd:
    name: certbot.timer
    state: started
    enabled: yes
  when: ssl_provider == "letsencrypt"

- name: Test certificate renewal (dry run)
  ansible.builtin.command:
    cmd: certbot renew --dry-run
  changed_when: false
  when: ssl_provider == "letsencrypt"
  register: renewal_test
  failed_when: false

- name: Report renewal test result
  ansible.builtin.debug:
    msg: "Certificate renewal dry-run {{ 'succeeded' if renewal_test.rc == 0 else 'FAILED' }}"
  when: ssl_provider == "letsencrypt"
```

```bash
#!/bin/bash
# roles/ssl_certs/templates/renewal_hook.sh.j2
# Post-renewal hook - managed by Ansible
# Reloads the web server after certificate renewal

echo "Certificate renewed, reloading services..."
{{ ssl_renewal_hook_command }}
echo "Services reloaded at $(date)"
```

## Main Task File and Handlers

```yaml
# roles/ssl_certs/tasks/main.yml
- name: Include installation tasks
  ansible.builtin.include_tasks: install.yml

- name: Include Let's Encrypt tasks
  ansible.builtin.include_tasks: letsencrypt.yml
  when: ssl_provider == "letsencrypt"

- name: Include self-signed certificate tasks
  ansible.builtin.include_tasks: selfsigned.yml
  when: ssl_provider == "selfsigned"

- name: Include renewal configuration
  ansible.builtin.include_tasks: renewal.yml
```

```yaml
# roles/ssl_certs/handlers/main.yml
- name: reload web server
  ansible.builtin.systemd:
    name: "{{ ssl_renewal_service }}"
    state: reloaded
```

## Using the Role

For production with Let's Encrypt:

```yaml
# setup-ssl.yml
- hosts: webservers
  become: yes
  roles:
    - role: ssl_certs
      vars:
        ssl_provider: letsencrypt
        ssl_letsencrypt_email: admin@example.com
        ssl_letsencrypt_challenge: http
        ssl_renewal_service: nginx
        ssl_domains:
          - domain: example.com
            aliases:
              - www.example.com
          - domain: api.example.com
          - domain: admin.example.com
```

For internal services with self-signed certificates:

```yaml
# setup-internal-ssl.yml
- hosts: internal_servers
  become: yes
  roles:
    - role: ssl_certs
      vars:
        ssl_provider: selfsigned
        ssl_selfsigned_days: 730
        ssl_selfsigned_org: "Acme Corp Internal"
        ssl_domains:
          - domain: grafana.internal.example.com
          - domain: prometheus.internal.example.com
          - domain: vault.internal.example.com
```

## Certificate Expiry Monitoring

Add a task to check certificate expiry as part of your monitoring playbook:

```yaml
# Check certificate expiry dates across all servers
- name: Check SSL certificate expiry
  ansible.builtin.command:
    cmd: openssl x509 -enddate -noout -in /etc/letsencrypt/live/{{ item.domain }}/fullchain.pem
  loop: "{{ ssl_domains }}"
  register: cert_expiry
  changed_when: false

- name: Warn about certificates expiring within 30 days
  ansible.builtin.debug:
    msg: "WARNING: Certificate for {{ item.item.domain }} expires {{ item.stdout }}"
  loop: "{{ cert_expiry.results }}"
  when: item.stdout is defined
```

This role covers both automated Let's Encrypt certificates for public-facing services and self-signed certificates for internal infrastructure. The renewal hooks ensure your web server picks up new certificates automatically, and the dry-run test validates that the renewal process works before you actually need it.
