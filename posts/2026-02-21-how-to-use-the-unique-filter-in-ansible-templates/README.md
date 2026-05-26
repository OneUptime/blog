# How to Use the unique Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filter, Template, Data Processing

Description: Learn how to deduplicate lists in Ansible using the unique filter to eliminate redundant entries in configuration files and task loops.

---

When you aggregate data from multiple sources in Ansible, duplicates are almost inevitable. You might pull package lists from group_vars and host_vars, merge IP addresses from different inventory groups, or combine tags from various roles. The `unique` filter strips out those duplicates and gives you a clean list to work with.

Ansible provides this as the `ansible.builtin.unique` filter plugin, and modern Jinja2 also includes a `unique` filter. In Ansible playbooks and templates, the short name `unique` works, though the fully qualified name is useful when you want to link directly to the Ansible plugin documentation or avoid name conflicts with other collections.

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

If you want to deduplicate by a specific attribute while keeping the original dictionaries, use the `attribute` parameter:

```yaml
# Deduplicate dictionaries by a specific attribute
- name: Get unique users by name
  ansible.builtin.debug:
    msg: "{{ users | unique(attribute='name') | list }}"
  vars:
    users:
      - name: alice
        role: admin
      - name: bob
        role: developer
      - name: alice
        role: developer
```

Output: Two dictionaries remain: the first "alice" entry and the "bob" entry. The later "alice" entry is skipped because its name was already seen.

If you only need the names, `map` still works well:

```yaml
{{ users | map(attribute='name') | unique | list }}
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

The unique filter is case-insensitive by default. This means "Nginx", "nginx", and "NGINX" are treated as duplicates:

```yaml
# Case-insensitive unique comparison
- name: Show default case handling
  ansible.builtin.debug:
    msg: "{{ items | unique | list }}"
  vars:
    items:
      - Nginx
      - nginx
      - NGINX
```

Output: `['Nginx']` - the first spelling is preserved.

To treat different capitalization as separate values, pass `case_sensitive=true`:

```yaml
# Case-sensitive unique comparison
- name: Case-sensitive unique
  ansible.builtin.debug:
    msg: "{{ items | unique(case_sensitive=true) | list }}"
  vars:
    items:
      - Nginx
      - nginx
      - NGINX
```

Output: `['Nginx', 'nginx', 'NGINX']` - all three remain.

If you want the final output normalized to lowercase, convert to lowercase first:

```yaml
{{ items | map('lower') | unique | list }}
```

Output: `['nginx']`

## Performance Considerations

The unique filter is efficient for typical Ansible use cases (lists of hundreds or even thousands of items). But if you are processing very large datasets, keep in mind that deduplication requires comparing each element, which is an O(n) operation for hashable types and O(n squared) for unhashable types.

For most configuration management scenarios, you will never hit performance issues. Just be aware that deduplicating a list of 100,000 complex dictionaries in a loop might slow things down.

## Summary

The unique filter is essential whenever you aggregate data from multiple sources in Ansible. Use it to clean up package lists, IP addresses, DNS records, user accounts, or any other data that might have duplicates. Combine it with `sort` for idempotent output, chain it with `map` and `selectattr` for targeted deduplication, and remember that it compares whole objects when working with dictionaries. Keep your configs clean, your diffs meaningful, and your task output readable.
