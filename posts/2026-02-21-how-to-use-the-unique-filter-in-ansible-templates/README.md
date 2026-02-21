# How to Use the unique Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Templates, Data Processing

Description: Learn how to deduplicate lists in Ansible using the unique filter to eliminate redundant entries in configuration files and task loops.

---

When you aggregate data from multiple sources in Ansible, duplicates are almost inevitable. You might pull package lists from group_vars and host_vars, merge IP addresses from different inventory groups, or combine tags from various roles. The `unique` filter strips out those duplicates and gives you a clean list to work with.

This filter is not part of standard Jinja2. It is an Ansible-specific addition, which means it works in playbooks and Ansible templates but would not work in a plain Jinja2 environment outside of Ansible.

## Basic Usage

The unique filter removes duplicate values from a list while preserving the order of first occurrence:

```yaml
# Remove duplicates from a simple list
- name: Show unique packages
  ansible.builtin.debug:
    msg: "{{ packages | unique | list }}"
  vars:
    packages:
      - nginx
      - curl
      - nginx
      - vim
      - curl
      - git
```

Output: `['nginx', 'curl', 'vim', 'git']`

The order matches the first time each item appears. Nginx shows up first because it was the first element, even though it appeared again later.

## Why You Need unique

Consider a scenario where you build a package list from multiple variable sources:

```yaml
# group_vars/webservers.yml
base_packages:
  - nginx
  - curl
  - openssl

# group_vars/all.yml
common_packages:
  - curl
  - vim
  - git
  - openssl
```

When you merge these in a playbook:

```yaml
# Combine package lists and remove duplicates before installing
- name: Install all required packages
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop: "{{ (base_packages + common_packages) | unique | sort }}"
```

Without `unique`, apt would try to install curl and openssl twice. While apt handles this gracefully (it just skips already-installed packages), it clutters your output and wastes time checking each duplicate.

## Using unique in Templates

Inside Jinja2 templates, unique works the same way:

```jinja2
{# templates/allowed_ips.conf.j2 - Deduplicated list of allowed IPs #}
# Allowed IP addresses - Managed by Ansible
# Generated from {{ ansible_date_time.iso8601 }}
{% for ip in (internal_ips + external_ips + vpn_ips) | unique | sort %}
allow {{ ip }};
{% endfor %}
deny all;
```

The playbook:

```yaml
# Generate nginx access control config from multiple IP sources
- name: Generate allowed IPs config
  ansible.builtin.template:
    src: templates/allowed_ips.conf.j2
    dest: /etc/nginx/conf.d/allowed_ips.conf
  vars:
    internal_ips:
      - 10.0.1.5
      - 10.0.1.10
      - 10.0.2.15
    external_ips:
      - 203.0.113.50
      - 10.0.1.5
    vpn_ips:
      - 10.0.2.15
      - 172.16.0.100
```

The output config will have each IP listed exactly once, even though 10.0.1.5 and 10.0.2.15 appeared in multiple lists.

## Deduplicating Lists of Dictionaries

Here is where things get a bit tricky. The `unique` filter works great on simple lists of strings or numbers, but for lists of dictionaries, it compares entire dictionary objects. Two dictionaries must be completely identical (same keys, same values) to be considered duplicates.

```yaml
# Unique works by comparing entire dictionary objects
- name: Deduplicate user list
  ansible.builtin.debug:
    msg: "{{ users | unique | list }}"
  vars:
    users:
      - name: alice
        role: admin
      - name: bob
        role: developer
      - name: alice
        role: admin
      - name: alice
        role: developer
```

Output: Three items remain. The two entries for "alice" with role "admin" collapse into one, but "alice" with role "developer" stays because it is a different dictionary.

If you want to deduplicate by a specific attribute (like just the name), you need a different approach:

```yaml
# Deduplicate by a specific attribute using map and unique
- name: Get unique usernames
  ansible.builtin.debug:
    msg: "{{ users | map(attribute='name') | unique | list }}"
  vars:
    users:
      - name: alice
        role: admin
      - name: bob
        role: developer
      - name: alice
        role: developer
```

Output: `['alice', 'bob']`

## Practical Example: Generating SSH Authorized Keys

Suppose you collect SSH keys from multiple sources and need to write them into an authorized_keys file:

```yaml
# vars/ssh_keys.yml - SSH keys from different sources
team_keys:
  - "ssh-rsa AAAA...1 alice@work"
  - "ssh-rsa AAAA...2 bob@work"
  - "ssh-rsa AAAA...3 charlie@work"

deploy_keys:
  - "ssh-rsa AAAA...2 bob@work"
  - "ssh-rsa AAAA...4 deploy@ci"

emergency_keys:
  - "ssh-rsa AAAA...1 alice@work"
  - "ssh-rsa AAAA...5 oncall@ops"
```

The template:

```jinja2
{# templates/authorized_keys.j2 - Deduplicated SSH authorized keys #}
# Managed by Ansible - Do not edit manually
{% for key in (team_keys + deploy_keys + emergency_keys) | unique | sort %}
{{ key }}
{% endfor %}
```

Each key appears exactly once in the output, no matter how many source lists included it.

## Combining unique with selectattr

A powerful pattern is filtering a list first, then deduplicating:

```yaml
# Get unique active environments from a server list
- name: List active environments
  ansible.builtin.debug:
    msg: "{{ servers | selectattr('active', 'equalto', true) | map(attribute='environment') | unique | sort | list }}"
  vars:
    servers:
      - name: web01
        environment: production
        active: true
      - name: web02
        environment: production
        active: true
      - name: web03
        environment: staging
        active: true
      - name: web04
        environment: staging
        active: false
      - name: web05
        environment: development
        active: true
```

Output: `['development', 'production', 'staging']`

## Using unique for Idempotent DNS Configuration

Here is a more complete example generating a DNS zone file:

```yaml
# Generate a zone file with deduplicated records
- name: Generate DNS zone file
  ansible.builtin.template:
    src: templates/zone.j2
    dest: "/etc/bind/zones/db.example.com"
  vars:
    a_records:
      - name: www
        ip: 10.0.1.10
      - name: api
        ip: 10.0.1.20
      - name: www
        ip: 10.0.1.10
      - name: mail
        ip: 10.0.1.30
    cname_records:
      - name: blog
        target: www.example.com.
      - name: docs
        target: www.example.com.
      - name: blog
        target: www.example.com.
```

```jinja2
{# templates/zone.j2 - DNS zone file with deduplicated records #}
$TTL 86400
@   IN  SOA ns1.example.com. admin.example.com. (
        {{ ansible_date_time.epoch }}  ; Serial
        3600        ; Refresh
        1800        ; Retry
        604800      ; Expire
        86400       ; Minimum TTL
)

; A Records
{% for record in a_records | unique | sort(attribute='name') %}
{{ record.name }}    IN  A   {{ record.ip }}
{% endfor %}

; CNAME Records
{% for record in cname_records | unique | sort(attribute='name') %}
{{ record.name }}    IN  CNAME   {{ record.target }}
{% endfor %}
```

## Case Sensitivity

The unique filter is case-sensitive by default. This means "Nginx" and "nginx" are treated as different values:

```yaml
# Case-sensitive unique comparison
- name: Show case sensitivity
  ansible.builtin.debug:
    msg: "{{ items | unique | list }}"
  vars:
    items:
      - Nginx
      - nginx
      - NGINX
```

Output: `['Nginx', 'nginx', 'NGINX']` - all three remain.

To do a case-insensitive dedup, convert to lowercase first:

```yaml
# Case-insensitive deduplication using lower filter
- name: Case-insensitive unique
  ansible.builtin.debug:
    msg: "{{ items | map('lower') | unique | list }}"
  vars:
    items:
      - Nginx
      - nginx
      - NGINX
```

Output: `['nginx']`

## Performance Considerations

The unique filter is efficient for typical Ansible use cases (lists of hundreds or even thousands of items). But if you are processing very large datasets, keep in mind that deduplication requires comparing each element, which is an O(n) operation for hashable types and O(n squared) for unhashable types.

For most configuration management scenarios, you will never hit performance issues. Just be aware that deduplicating a list of 100,000 complex dictionaries in a loop might slow things down.

## Summary

The unique filter is essential whenever you aggregate data from multiple sources in Ansible. Use it to clean up package lists, IP addresses, DNS records, user accounts, or any other data that might have duplicates. Combine it with `sort` for idempotent output, chain it with `map` and `selectattr` for targeted deduplication, and remember that it compares whole objects when working with dictionaries. Keep your configs clean, your diffs meaningful, and your task output readable.
