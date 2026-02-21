# How to Use Ansible to Automate SSL Certificate Renewal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSL, TLS, Certificates, Security

Description: Automate SSL certificate renewal and deployment across your infrastructure using Ansible with Let's Encrypt and custom CA support.

---

SSL certificate expiration is one of the most common causes of unplanned outages. A certificate expires, HTTPS connections start failing, and your users see scary browser warnings. Even with Let's Encrypt's automatic renewal, things go wrong: certbot fails silently, a server's cron job stops running, or a new load balancer gets deployed without the renewal configuration. Ansible provides a safety net by centrally managing certificate renewal and deployment across your entire infrastructure.

## Role Defaults

```yaml
# roles/ssl_renewal/defaults/main.yml - Certificate management configuration
ssl_provider: letsencrypt
ssl_email: admin@example.com
ssl_cert_dir: /etc/letsencrypt/live
ssl_renewal_threshold: 30

ssl_domains:
  - name: example.com
    sans:
      - www.example.com
      - api.example.com
    webroot: /var/www/html
    services:
      - nginx
  - name: mail.example.com
    sans: []
    webroot: /var/www/html
    services:
      - postfix
      - dovecot
```

## Main Tasks

```yaml
# roles/ssl_renewal/tasks/main.yml - SSL certificate management
---
- name: Install certbot and plugins
  apt:
    name:
      - certbot
      - python3-certbot-nginx
    state: present
    update_cache: yes

- name: Check certificate expiration dates
  command: >
    openssl x509 -enddate -noout
    -in {{ ssl_cert_dir }}/{{ item.name }}/fullchain.pem
  loop: "{{ ssl_domains }}"
  register: cert_expiry
  changed_when: false
  ignore_errors: yes

- name: Identify certificates needing renewal
  set_fact:
    renewal_needed: "{{ renewal_needed | default([]) + [item.item] }}"
  loop: "{{ cert_expiry.results }}"
  when: item.failed or (item.stdout is defined and
    ((item.stdout | regex_replace('notAfter=', '') | to_datetime('%b %d %H:%M:%S %Y %Z'))
     - (ansible_date_time.iso8601[:10] | to_datetime('%Y-%m-%d'))).days < ssl_renewal_threshold)

- name: Display certificates that need renewal
  debug:
    msg: "Certificate for {{ item.name }} needs renewal"
  loop: "{{ renewal_needed | default([]) }}"

- name: Request or renew certificates
  command: >
    certbot certonly --webroot
    -w {{ item.webroot }}
    -d {{ item.name }}
    {% for san in item.sans %}
    -d {{ san }}
    {% endfor %}
    --non-interactive --agree-tos
    --email {{ ssl_email }}
    --force-renewal
  loop: "{{ renewal_needed | default([]) }}"
  register: renewal_result
  notify: reload affected services

- name: Verify renewed certificates
  command: >
    openssl x509 -subject -enddate -noout
    -in {{ ssl_cert_dir }}/{{ item.name }}/fullchain.pem
  loop: "{{ renewal_needed | default([]) }}"
  register: verify_result
  changed_when: false

- name: Display renewal verification
  debug:
    msg: "{{ item.stdout_lines }}"
  loop: "{{ verify_result.results | default([]) }}"

- name: Set up automatic renewal via cron
  cron:
    name: "Certbot auto-renewal"
    minute: "0"
    hour: "3"
    weekday: "1"
    job: "certbot renew --quiet --deploy-hook 'systemctl reload nginx'"
    user: root
```

## Certificate Monitoring Script

```yaml
# Task to deploy a certificate monitoring script
- name: Deploy certificate monitoring script
  copy:
    content: |
      #!/bin/bash
      # Check all certificates and report expiration status
      WARN_DAYS=14
      EXIT_CODE=0

      for domain_dir in {{ ssl_cert_dir }}/*/; do
        domain=$(basename "$domain_dir")
        cert="$domain_dir/fullchain.pem"

        if [ -f "$cert" ]; then
          expiry=$(openssl x509 -enddate -noout -in "$cert" | cut -d= -f2)
          expiry_epoch=$(date -d "$expiry" +%s)
          now_epoch=$(date +%s)
          days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

          if [ "$days_left" -lt "$WARN_DAYS" ]; then
            echo "CRITICAL: $domain expires in $days_left days ($expiry)"
            EXIT_CODE=2
          elif [ "$days_left" -lt 30 ]; then
            echo "WARNING: $domain expires in $days_left days ($expiry)"
            [ "$EXIT_CODE" -lt 1 ] && EXIT_CODE=1
          else
            echo "OK: $domain expires in $days_left days"
          fi
        fi
      done

      exit $EXIT_CODE
    dest: /usr/local/bin/check-ssl-certs.sh
    mode: '0755'

- name: Schedule daily certificate monitoring
  cron:
    name: "SSL certificate expiration check"
    minute: "0"
    hour: "8"
    job: "/usr/local/bin/check-ssl-certs.sh | logger -t ssl-check"
    user: root
```

## Distributing Certificates to Multiple Servers

```yaml
# roles/ssl_renewal/tasks/distribute.yml - Copy certs to load balancers
---
- name: Fetch renewed certificates to control node
  fetch:
    src: "{{ ssl_cert_dir }}/{{ item.name }}/{{ cert_file }}"
    dest: "/tmp/certs/{{ item.name }}/"
    flat: yes
  loop: "{{ ssl_domains }}"
  loop_control:
    label: "{{ item.name }}"
  delegate_to: "{{ ssl_renewal_server }}"
  vars:
    cert_file: "{{ lookup('items', ['fullchain.pem', 'privkey.pem']) }}"

- name: Deploy certificates to load balancers
  copy:
    src: "/tmp/certs/{{ item.0.name }}/{{ item.1 }}"
    dest: "/etc/ssl/{{ item.0.name }}/{{ item.1 }}"
    mode: '0600'
  loop: "{{ ssl_domains | product(['fullchain.pem', 'privkey.pem']) | list }}"
  notify: reload nginx
```

## Handlers

```yaml
# roles/ssl_renewal/handlers/main.yml
---
- name: reload affected services
  systemd:
    name: "{{ item }}"
    state: reloaded
  loop: "{{ ssl_domains | map(attribute='services') | flatten | unique }}"

- name: reload nginx
  systemd:
    name: nginx
    state: reloaded
```

## Playbook

```yaml
# renew-ssl.yml - Certificate renewal playbook
---
- hosts: web_servers
  become: yes
  roles:
    - ssl_renewal
```

## Running the Playbook

```bash
# Check and renew certificates
ansible-playbook -i inventory/hosts.ini renew-ssl.yml

# Schedule weekly renewal check from the control node
# Add to crontab: 0 4 * * 1 ansible-playbook -i /path/to/inventory renew-ssl.yml
```

## Summary

This Ansible playbook provides centralized SSL certificate management across your infrastructure. It checks expiration dates, renews certificates that are close to expiring, restarts the appropriate services, and sets up ongoing monitoring. Running it weekly ensures you never get surprised by an expired certificate. The monitoring script gives you early warning, and the distribution tasks handle multi-server deployments where certificates need to be copied to load balancers and application servers.
