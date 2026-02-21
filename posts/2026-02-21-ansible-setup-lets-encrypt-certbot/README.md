# How to Use Ansible to Set Up Let's Encrypt with Certbot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Let's Encrypt, Certbot, SSL, Security

Description: Automate free SSL certificate provisioning with Let's Encrypt and Certbot using Ansible for Nginx and Apache servers.

---

Let's Encrypt revolutionized web security by providing free, automated SSL/TLS certificates. Certbot is the official client for obtaining and renewing these certificates. While running Certbot manually on one server is simple enough, managing certificates across many servers is where Ansible shines. You can automate the entire process: installing Certbot, obtaining certificates, configuring your web server, and setting up automatic renewal.

This guide walks through using Ansible to set up Let's Encrypt with Certbot for both Nginx and Apache.

## Prerequisites

- Ansible 2.9+ on your control node
- Ubuntu 22.04 target servers
- Domain names pointing to your servers (DNS must be configured before running)
- Port 80 accessible from the internet (required for HTTP-01 challenge)

## Project Structure

```
letsencrypt-setup/
  inventory/
    hosts.yml
  group_vars/
    all.yml
  roles/
    certbot/
      tasks/
        main.yml
        nginx.yml
        apache.yml
      templates/
        nginx-ssl.conf.j2
        renewal-hook.sh.j2
      handlers/
        main.yml
  playbook.yml
```

## Variables

```yaml
# group_vars/all.yml
certbot_email: admin@example.com
domains:
  - www.example.com
  - example.com
web_server: nginx  # or "apache"
app_backend: "http://127.0.0.1:8000"
certbot_auto_renew: true
certbot_renew_hour: 3
certbot_renew_minute: 30
```

## Main Tasks

```yaml
# roles/certbot/tasks/main.yml
---
- name: Install Certbot and required plugins
  apt:
    name:
      - certbot
      - "python3-certbot-{{ web_server }}"
    state: present
    update_cache: yes

- name: Check if certificate already exists
  stat:
    path: "/etc/letsencrypt/live/{{ domains[0] }}/fullchain.pem"
  register: cert_exists

- name: Include Nginx-specific tasks
  include_tasks: nginx.yml
  when: web_server == "nginx"

- name: Include Apache-specific tasks
  include_tasks: apache.yml
  when: web_server == "apache"

- name: Set up automatic certificate renewal via cron
  cron:
    name: "Certbot renewal"
    hour: "{{ certbot_renew_hour }}"
    minute: "{{ certbot_renew_minute }}"
    job: "certbot renew --quiet --deploy-hook 'systemctl reload {{ web_server }}'"
    user: root
  when: certbot_auto_renew

- name: Deploy post-renewal hook script
  template:
    src: renewal-hook.sh.j2
    dest: /etc/letsencrypt/renewal-hooks/deploy/reload-webserver.sh
    mode: '0755'

- name: Verify certificate is valid
  command: "certbot certificates"
  register: cert_status
  changed_when: false

- name: Display certificate status
  debug:
    msg: "{{ cert_status.stdout_lines }}"
```

## Nginx Tasks

These tasks handle certificate acquisition and Nginx configuration.

```yaml
# roles/certbot/tasks/nginx.yml
---
- name: Install Nginx
  apt:
    name: nginx
    state: present

- name: Ensure Nginx is running for the ACME challenge
  systemd:
    name: nginx
    state: started
    enabled: yes

- name: Create webroot directory for ACME challenge
  file:
    path: /var/www/letsencrypt
    state: directory
    owner: www-data
    group: www-data
    mode: '0755'

- name: Deploy temporary Nginx config for certificate acquisition
  copy:
    content: |
      server {
          listen 80;
          server_name {{ domains | join(' ') }};

          location /.well-known/acme-challenge/ {
              root /var/www/letsencrypt;
          }

          location / {
              return 301 https://$host$request_uri;
          }
      }
    dest: /etc/nginx/sites-available/letsencrypt-challenge
    mode: '0644'
  when: not cert_exists.stat.exists

- name: Enable temporary config for initial certificate
  file:
    src: /etc/nginx/sites-available/letsencrypt-challenge
    dest: /etc/nginx/sites-enabled/letsencrypt-challenge
    state: link
  when: not cert_exists.stat.exists
  notify: reload nginx

- name: Flush handlers to apply temporary config
  meta: flush_handlers

- name: Obtain Let's Encrypt certificate using webroot method
  command: >
    certbot certonly --webroot
    -w /var/www/letsencrypt
    -d {{ domains | join(' -d ') }}
    --email {{ certbot_email }}
    --agree-tos
    --non-interactive
  when: not cert_exists.stat.exists
  notify: reload nginx

- name: Deploy the full Nginx SSL configuration
  template:
    src: nginx-ssl.conf.j2
    dest: /etc/nginx/sites-available/{{ domains[0] }}
    mode: '0644'
  notify: reload nginx

- name: Enable the SSL site
  file:
    src: /etc/nginx/sites-available/{{ domains[0] }}
    dest: /etc/nginx/sites-enabled/{{ domains[0] }}
    state: link
  notify: reload nginx

- name: Remove temporary challenge config
  file:
    path: /etc/nginx/sites-enabled/letsencrypt-challenge
    state: absent
  notify: reload nginx

- name: Remove default site
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: reload nginx
```

## Apache Tasks

```yaml
# roles/certbot/tasks/apache.yml
---
- name: Install Apache
  apt:
    name: apache2
    state: present

- name: Enable required Apache modules
  apache2_module:
    name: "{{ item }}"
    state: present
  loop:
    - ssl
    - rewrite
    - headers
  notify: restart apache

- name: Ensure Apache is running
  systemd:
    name: apache2
    state: started
    enabled: yes

- name: Obtain certificate using Apache plugin
  command: >
    certbot --apache
    -d {{ domains | join(' -d ') }}
    --email {{ certbot_email }}
    --agree-tos
    --non-interactive
    --redirect
  when: not cert_exists.stat.exists
  notify: restart apache
```

## Nginx SSL Configuration Template

This is the production Nginx configuration that uses the Let's Encrypt certificate.

```nginx
# roles/certbot/templates/nginx-ssl.conf.j2
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name {{ domains | join(' ') }};

    # Let's Encrypt challenge directory
    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name {{ domains | join(' ') }};

    # Let's Encrypt certificate paths
    ssl_certificate /etc/letsencrypt/live/{{ domains[0] }}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{{ domains[0] }}/privkey.pem;

    # Strong SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # SSL session optimization
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/{{ domains[0] }}/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxy to backend
    location / {
        proxy_pass {{ app_backend }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Renewal Hook Script

```bash
#!/bin/bash
# roles/certbot/templates/renewal-hook.sh.j2
# This script runs after each successful certificate renewal

# Reload the web server to pick up the new certificate
systemctl reload {{ web_server }}

# Log the renewal event
echo "$(date): Certificate renewed and {{ web_server }} reloaded" >> /var/log/certbot-renewal.log

# Optional: send notification
# curl -s -X POST "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
#   -d "{\"text\": \"SSL certificate renewed for {{ domains | join(', ') }}\"}"
```

## Handlers

```yaml
# roles/certbot/handlers/main.yml
---
- name: reload nginx
  systemd:
    name: nginx
    state: reloaded

- name: restart apache
  systemd:
    name: apache2
    state: restarted
```

## Wildcard Certificates with DNS Challenge

For wildcard certificates, you need DNS validation. Here is an example using Cloudflare:

```yaml
# Install Certbot DNS plugin for Cloudflare
- name: Install Certbot Cloudflare DNS plugin
  apt:
    name: python3-certbot-dns-cloudflare
    state: present

- name: Deploy Cloudflare credentials file
  copy:
    content: |
      dns_cloudflare_api_token = {{ vault_cloudflare_api_token }}
    dest: /etc/letsencrypt/cloudflare.ini
    owner: root
    group: root
    mode: '0600'

- name: Obtain wildcard certificate using DNS challenge
  command: >
    certbot certonly
    --dns-cloudflare
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini
    -d "*.example.com"
    -d "example.com"
    --email {{ certbot_email }}
    --agree-tos
    --non-interactive
  when: not cert_exists.stat.exists
```

## Running the Playbook

```bash
# Set up Let's Encrypt with Nginx
ansible-playbook -i inventory/hosts.yml playbook.yml

# Set up Let's Encrypt with Apache
ansible-playbook -i inventory/hosts.yml playbook.yml -e "web_server=apache"

# Test renewal without actually renewing
ansible-playbook -i inventory/hosts.yml playbook.yml -e "certbot_test=true"
```

## Testing Certificate Renewal

You can test the renewal process without actually obtaining new certificates:

```yaml
# Dry run to test the renewal process
- name: Test certificate renewal (dry run)
  command: certbot renew --dry-run
  register: renewal_test
  changed_when: false

- name: Display renewal test results
  debug:
    msg: "{{ renewal_test.stdout_lines }}"
```

## Wrapping Up

Let's Encrypt and Certbot provide free, automated SSL certificates. By combining them with Ansible, you get a fully automated certificate provisioning and renewal system that works across your entire infrastructure. The playbook handles both Nginx and Apache, supports webroot and DNS challenges for wildcard certificates, and sets up automatic renewal with cron. Once deployed, your servers will maintain valid SSL certificates without any manual intervention.
