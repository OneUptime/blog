# How to Deploy IPv6 DNS Records with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, DNS, AAAA Records, BIND, Automation

Description: A guide to deploying IPv6 AAAA DNS records using Ansible, covering both BIND zone file management and dynamic DNS APIs.

Managing IPv6 DNS records with Ansible ensures AAAA records are created, updated, and verified consistently across your DNS infrastructure. This guide covers BIND zone file management, provider modules, and dynamic DNS updates.

## Method 1: Managing BIND Zone Files

```yaml
# tasks/bind-aaaa.yml - Add AAAA records to a BIND zone file

---
- name: Add AAAA record to BIND zone file
  ansible.builtin.blockinfile:
    path: /etc/bind/zones/db.example.com
    marker: "; {mark} ANSIBLE MANAGED - {{ item.name }} AAAA"
    block: |
      {{ item.name }}  IN  AAAA  {{ item.ipv6 }}
    insertafter: "; AAAA Records"
  loop: "{{ aaaa_records }}"
  notify: Reload BIND

- name: Read current BIND zone file
  ansible.builtin.slurp:
    path: /etc/bind/zones/db.example.com
  register: bind_zone_file

- name: Calculate next BIND zone serial number
  ansible.builtin.set_fact:
    bind_zone_serial_next: >-
      {{
        [
          (
            (
              bind_zone_file.content
              | b64decode
              | regex_search('(?m)^\\s*([0-9]+)\\s*;\\s*Serial\\s*$', '\\1')
              | first
            ) | int
          ) + 1,
          ('%Y%m%d01' | strftime | int)
        ] | max
      }}

- name: Update BIND zone serial number
  ansible.builtin.replace:
    path: /etc/bind/zones/db.example.com
    # Use a YYYYMMDDNN serial and ensure it always increases
    regexp: '(?m)^(\s*)([0-9]+)(\s*;\s*Serial\s*)$'
    replace: '\1{{ bind_zone_serial_next }}\3'
  notify: Reload BIND
```

## Method 2: Using Provider Modules for Cloudflare/Route 53

```yaml
# tasks/cloud-dns-aaaa.yml - Create AAAA records via DNS provider APIs
---
- name: Create AAAA records in Cloudflare
  community.general.cloudflare_dns:
    zone: "example.com"
    record: "{{ item.name }}"
    type: AAAA
    value: "{{ item.ipv6 }}"
    ttl: 300
    proxied: false
    api_token: "{{ cloudflare_api_token }}"
  loop: "{{ aaaa_records }}"
  when: dns_provider == "cloudflare"

- name: Create AAAA records in AWS Route 53
  amazon.aws.route53:
    state: present
    zone: "example.com"
    record: "{{ item.name }}.example.com"
    type: AAAA
    ttl: 300
    value: "{{ item.ipv6 }}"
    aws_access_key: "{{ aws_access_key }}"
    aws_secret_key: "{{ aws_secret_key }}"
  loop: "{{ aaaa_records }}"
  when: dns_provider == "route53"
```

## Method 3: nsupdate for Dynamic DNS (RFC 2136)

```yaml
# tasks/nsupdate-aaaa.yml - Update DNS dynamically using nsupdate
---
- name: Deploy AAAA records via nsupdate
  community.general.nsupdate:
    key_name: "ansible-update-key"
    key_secret: "{{ dns_tsig_key }}"
    key_algorithm: "hmac-sha256"
    server: "{{ dns_primary_server }}"
    zone: "example.com"
    record: "{{ item.name }}"
    type: AAAA
    value: "{{ item.ipv6 }}"
    ttl: 300
    state: present
  loop: "{{ aaaa_records }}"
```

## Variables Definition

```yaml
# group_vars/all.yml - AAAA records to manage
aaaa_records:
  - name: "www"
    ipv6: "2001:db8::1"
  - name: "api"
    ipv6: "2001:db8::2"
  - name: "mail"
    ipv6: "2001:db8::3"
  - name: "cdn"
    ipv6: "2001:db8::4"

dns_provider: "cloudflare"
```

## Verify DNS Records After Deployment

```yaml
# tasks/verify-aaaa.yml - Verify AAAA records resolve correctly
---
- name: Verify AAAA records resolve
  ansible.builtin.command:
    cmd: "dig AAAA {{ item.name }}.example.com +short @{{ dns_resolver }}"
  register: aaaa_result
  changed_when: false
  loop: "{{ aaaa_records }}"

- name: Assert AAAA records return expected IPv6 addresses
  ansible.builtin.assert:
    that:
      - item.item.ipv6 in item.stdout
    fail_msg: "AAAA record for {{ item.item.name }} returned unexpected: {{ item.stdout }}"
    success_msg: "AAAA record for {{ item.item.name }} is correct"
  loop: "{{ aaaa_result.results }}"
```

## Run the Playbook

```bash
# Dry run first
ansible-playbook deploy-dns.yml -i inventory.ini --check

# Apply AAAA records
ansible-playbook deploy-dns.yml -i inventory.ini

# Verify
dig AAAA www.example.com +short
dig AAAA api.example.com +short
```

Deploying IPv6 AAAA records with Ansible creates a repeatable, auditable process for DNS management that can be integrated into your CI/CD pipeline alongside infrastructure provisioning.
