# How to Use Ansible to Set Up a Squid Proxy Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Squid, Proxy, Networking, Security

Description: Deploy a Squid forward proxy server with ACLs, caching, authentication, and SSL bump using Ansible for controlled and cached internet access.

---

A forward proxy sits between your internal network and the internet, giving you control over outbound traffic. Squid is the most popular open-source proxy server, used for caching web content to reduce bandwidth, filtering access to specific sites, and logging all outbound HTTP/HTTPS requests. In environments where you need to audit internet access or restrict what servers can reach externally, Squid is the tool for the job. Ansible lets you deploy and manage Squid configurations consistently across your infrastructure.

## Role Defaults

```yaml
# roles/squid/defaults/main.yml - Squid proxy configuration
squid_port: 3128
squid_cache_dir: /var/spool/squid
squid_cache_size_mb: 10000
squid_max_object_size_mb: 100
squid_log_dir: /var/log/squid

# Networks allowed to use the proxy
squid_allowed_networks:
  - name: internal_net
    src: 10.0.0.0/8
  - name: office_net
    src: 192.168.1.0/24

# Blocked domains
squid_blocked_domains:
  - .facebook.com
  - .twitter.com
  - .tiktok.com
  - .reddit.com

# Blocked file types
squid_blocked_extensions:
  - .exe
  - .msi
  - .torrent

# Authentication (optional)
squid_auth_enabled: false
squid_auth_users:
  - username: proxyuser
    password: "{{ vault_squid_proxy_password }}"

# Time-based access (optional)
squid_time_rules_enabled: false
squid_business_hours:
  start: "09:00"
  end: "18:00"
  days: MTWHF
```

## Main Tasks

```yaml
# roles/squid/tasks/main.yml - Install and configure Squid
---
- name: Install Squid proxy server
  apt:
    name:
      - squid
      - apache2-utils
    state: present
    update_cache: yes

- name: Create Squid cache directory
  file:
    path: "{{ squid_cache_dir }}"
    state: directory
    owner: proxy
    group: proxy
    mode: '0755'

- name: Deploy Squid configuration
  template:
    src: squid.conf.j2
    dest: /etc/squid/squid.conf
    owner: root
    group: root
    mode: '0644'
    validate: "squid -k parse -f %s"
  notify: restart squid

- name: Deploy blocked domains list
  template:
    src: blocked_domains.txt.j2
    dest: /etc/squid/blocked_domains.txt
    mode: '0644'
  notify: reconfigure squid

- name: Deploy blocked extensions list
  template:
    src: blocked_extensions.txt.j2
    dest: /etc/squid/blocked_extensions.txt
    mode: '0644'
  notify: reconfigure squid

- name: Create htpasswd file for proxy authentication
  command: "htpasswd -bc /etc/squid/passwd {{ item.username }} {{ item.password }}"
  loop: "{{ squid_auth_users }}"
  when: squid_auth_enabled
  no_log: true
  notify: reconfigure squid

- name: Initialize Squid cache directories
  command: squid -z
  args:
    creates: "{{ squid_cache_dir }}/00"

- name: Ensure Squid is started and enabled
  systemd:
    name: squid
    state: started
    enabled: yes

- name: Allow Squid port through firewall
  ufw:
    rule: allow
    port: "{{ squid_port }}"
    proto: tcp
    src: "{{ item.src }}"
  loop: "{{ squid_allowed_networks }}"
```

## Squid Configuration Template

```
# roles/squid/templates/squid.conf.j2 - Main Squid configuration
# Listening port
http_port {{ squid_port }}

# Cache configuration
cache_dir ufs {{ squid_cache_dir }} {{ squid_cache_size_mb }} 16 256
maximum_object_size {{ squid_max_object_size_mb }} MB
cache_mem 256 MB

# Log configuration
access_log daemon:{{ squid_log_dir }}/access.log squid
cache_log {{ squid_log_dir }}/cache.log

# ACL definitions for allowed networks
{% for network in squid_allowed_networks %}
acl {{ network.name }} src {{ network.src }}
{% endfor %}

# ACL for blocked domains
acl blocked_domains dstdomain "/etc/squid/blocked_domains.txt"

# ACL for blocked file extensions
acl blocked_extensions urlpath_regex -i "/etc/squid/blocked_extensions.txt"

# Standard ACLs
acl SSL_ports port 443
acl Safe_ports port 80 443 21 70 210 280 488 591 777 1025-65535
acl CONNECT method CONNECT

{% if squid_auth_enabled %}
# Basic authentication
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
auth_param basic realm Proxy Authentication Required
auth_param basic credentialsttl 2 hours
acl authenticated proxy_auth REQUIRED
{% endif %}

{% if squid_time_rules_enabled %}
# Time-based access control
acl business_hours time {{ squid_business_hours.days }} {{ squid_business_hours.start }}-{{ squid_business_hours.end }}
{% endif %}

# Access rules (order matters)
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access deny blocked_domains
http_access deny blocked_extensions

{% if squid_auth_enabled %}
http_access allow authenticated
{% endif %}

{% for network in squid_allowed_networks %}
http_access allow {{ network.name }}
{% endfor %}

# Deny everything else
http_access deny all

# Privacy settings
via off
forwarded_for delete
request_header_access X-Forwarded-For deny all

# Performance tuning
dns_nameservers 8.8.8.8 8.8.4.4
positive_dns_ttl 6 hours
negative_dns_ttl 1 minute
```

## Blocked Domains Template

```
# roles/squid/templates/blocked_domains.txt.j2
{% for domain in squid_blocked_domains %}
{{ domain }}
{% endfor %}
```

## Handlers

```yaml
# roles/squid/handlers/main.yml
---
- name: restart squid
  systemd:
    name: squid
    state: restarted

- name: reconfigure squid
  command: squid -k reconfigure
```

## Testing the Proxy

```bash
# Test proxy from a client machine
curl -x http://proxy.example.internal:3128 http://httpbin.org/ip

# Test that blocked domains are denied
curl -x http://proxy.example.internal:3128 http://www.facebook.com
# Expected: Access Denied

# Check Squid access log for requests
tail -f /var/log/squid/access.log
```

## Monitoring Cache Performance

```yaml
# Task to deploy a cache monitoring script
- name: Deploy Squid cache statistics script
  copy:
    content: |
      #!/bin/bash
      # Display Squid cache hit/miss statistics
      echo "=== Squid Cache Statistics ==="
      squidclient -h localhost -p {{ squid_port }} mgr:info 2>/dev/null | grep -E "(Request|Hit|Miss|CPU)"
      echo ""
      echo "=== Cache Storage ==="
      du -sh {{ squid_cache_dir }}
    dest: /usr/local/bin/squid-stats.sh
    mode: '0755'
```

## Summary

Ansible makes Squid proxy deployment predictable and manageable. You define allowed networks, blocked domains, and authentication rules in YAML, and the playbook generates a validated Squid configuration. This approach is especially useful in corporate environments where proxy configurations need to be consistent across multiple offices or data centers. When compliance requirements change, you update the variables and push new configurations to all proxy servers in a single playbook run.
