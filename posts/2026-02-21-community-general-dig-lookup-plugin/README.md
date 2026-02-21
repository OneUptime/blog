# How to Use the community.general.dig Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, DNS, Lookup Plugins, Network Automation

Description: Learn how to use the community.general.dig lookup plugin to perform DNS queries directly in your Ansible playbooks for dynamic infrastructure configuration.

---

DNS is the backbone of network communication. When your Ansible playbooks need to resolve hostnames, look up MX records, verify TXT records, or discover service locations through SRV records, the `community.general.dig` lookup plugin lets you perform DNS queries right inside your playbook logic. It is essentially the `dig` command wrapped as an Ansible lookup, giving you programmatic access to DNS data.

## Prerequisites

Install the required collection and Python library:

```bash
# Install the community.general collection
ansible-galaxy collection install community.general

# Install the dnspython library
pip install dnspython
```

## Basic Usage

The simplest form resolves a hostname to its IP address.

This playbook looks up an A record:

```yaml
# playbook.yml - Basic DNS lookup
---
- name: DNS lookup examples
  hosts: localhost
  tasks:
    - name: Resolve hostname to IP
      ansible.builtin.debug:
        msg: "example.com resolves to {{ lookup('community.general.dig', 'example.com.') }}"

    - name: Resolve with explicit record type
      ansible.builtin.debug:
        msg: "IP: {{ lookup('community.general.dig', 'example.com.', qtype='A') }}"
```

Note the trailing dot (`.`) on the domain name. This tells the DNS resolver to treat it as a fully qualified domain name (FQDN) and skip search domain appending.

## Querying Different Record Types

The `dig` lookup supports all standard DNS record types.

```yaml
# playbook.yml - Query different DNS record types
---
- name: Query various DNS record types
  hosts: localhost
  tasks:
    # A record (IPv4 address)
    - name: Get A record
      ansible.builtin.debug:
        msg: "A: {{ lookup('community.general.dig', 'example.com.', qtype='A') }}"

    # AAAA record (IPv6 address)
    - name: Get AAAA record
      ansible.builtin.debug:
        msg: "AAAA: {{ lookup('community.general.dig', 'example.com.', qtype='AAAA') }}"

    # MX records (mail servers)
    - name: Get MX records
      ansible.builtin.debug:
        msg: "MX: {{ lookup('community.general.dig', 'example.com.', qtype='MX') }}"

    # TXT records
    - name: Get TXT records
      ansible.builtin.debug:
        msg: "TXT: {{ lookup('community.general.dig', 'example.com.', qtype='TXT') }}"

    # CNAME record
    - name: Get CNAME record
      ansible.builtin.debug:
        msg: "CNAME: {{ lookup('community.general.dig', 'www.example.com.', qtype='CNAME') }}"

    # NS records (nameservers)
    - name: Get NS records
      ansible.builtin.debug:
        msg: "NS: {{ lookup('community.general.dig', 'example.com.', qtype='NS') }}"

    # SRV records (service discovery)
    - name: Get SRV records
      ansible.builtin.debug:
        msg: "SRV: {{ lookup('community.general.dig', '_http._tcp.example.com.', qtype='SRV') }}"

    # SOA record
    - name: Get SOA record
      ansible.builtin.debug:
        msg: "SOA: {{ lookup('community.general.dig', 'example.com.', qtype='SOA') }}"
```

## Practical Example: Dynamic Load Balancer Configuration

Use DNS lookups to discover backend servers dynamically.

```yaml
# playbook.yml - Build load balancer config from DNS
---
- name: Configure load balancer from DNS records
  hosts: loadbalancers
  vars:
    backend_domain: "backends.internal.example.com"
    backend_ips: "{{ lookup('community.general.dig', backend_domain + '.', qtype='A', wantlist=True) }}"
  tasks:
    - name: Show discovered backend IPs
      ansible.builtin.debug:
        msg: "Discovered backends: {{ backend_ips }}"

    - name: Template HAProxy config with DNS-discovered backends
      ansible.builtin.template:
        src: haproxy.cfg.j2
        dest: /etc/haproxy/haproxy.cfg
        mode: '0644'
      notify: reload haproxy
```

Template:

```
# templates/haproxy.cfg.j2
backend app_servers
    balance roundrobin
{% for ip in backend_ips %}
    server backend-{{ loop.index }} {{ ip }}:8080 check
{% endfor %}
```

## Reverse DNS Lookups

Look up PTR records to find hostnames from IP addresses:

```yaml
# playbook.yml - Reverse DNS lookups
---
- name: Reverse DNS lookup
  hosts: localhost
  tasks:
    - name: Get PTR record for an IP
      ansible.builtin.debug:
        msg: "Reverse DNS: {{ lookup('community.general.dig', '8.8.8.8/PTR') }}"

    - name: Verify reverse DNS for all servers
      ansible.builtin.debug:
        msg: "{{ item }} -> {{ lookup('community.general.dig', item + '/PTR', wantlist=True) }}"
      loop:
        - "10.0.1.10"
        - "10.0.1.11"
        - "10.0.1.12"
```

## DNS-Based Service Discovery

SRV records are used for service discovery in many protocols. Query them to find service endpoints.

```yaml
# playbook.yml - Service discovery via SRV records
---
- name: Discover services via DNS SRV records
  hosts: appservers
  tasks:
    - name: Find MongoDB servers via SRV
      ansible.builtin.set_fact:
        mongo_srv: "{{ lookup('community.general.dig', '_mongodb._tcp.example.com.', qtype='SRV', wantlist=True) }}"

    - name: Parse SRV records into connection info
      ansible.builtin.debug:
        msg: "MongoDB endpoint: {{ item }}"
      loop: "{{ mongo_srv }}"

    - name: Find LDAP servers
      ansible.builtin.set_fact:
        ldap_srv: "{{ lookup('community.general.dig', '_ldap._tcp.example.com.', qtype='SRV', wantlist=True) }}"

    - name: Show LDAP servers
      ansible.builtin.debug:
        msg: "LDAP server: {{ item }}"
      loop: "{{ ldap_srv }}"
```

## Using a Specific DNS Server

You can direct queries to a specific DNS server instead of using the system resolver.

```yaml
# playbook.yml - Query specific DNS servers
---
- name: Query specific DNS servers
  hosts: localhost
  tasks:
    # Query Google's DNS
    - name: Resolve via Google DNS
      ansible.builtin.debug:
        msg: "{{ lookup('community.general.dig', 'example.com.', qtype='A', dns_servers='8.8.8.8') }}"

    # Query internal DNS
    - name: Resolve via internal DNS
      ansible.builtin.debug:
        msg: "{{ lookup('community.general.dig', 'internal.example.com.', qtype='A', dns_servers='10.0.0.53') }}"

    # Compare results from different DNS servers
    - name: Check DNS consistency
      ansible.builtin.debug:
        msg: |
          Public DNS: {{ lookup('community.general.dig', 'api.example.com.', qtype='A', dns_servers='8.8.8.8') }}
          Internal DNS: {{ lookup('community.general.dig', 'api.example.com.', qtype='A', dns_servers='10.0.0.53') }}
```

## DNS Validation and Health Checks

Use DNS lookups to validate your infrastructure configuration.

```yaml
# playbook.yml - DNS validation playbook
---
- name: Validate DNS configuration
  hosts: localhost
  vars:
    expected_records:
      - domain: "www.example.com"
        type: A
        expected: "93.184.216.34"
      - domain: "example.com"
        type: MX
        expected_contains: "mail"
      - domain: "example.com"
        type: TXT
        expected_contains: "v=spf1"
  tasks:
    - name: Validate A records
      ansible.builtin.assert:
        that:
          - "lookup('community.general.dig', item.domain + '.', qtype=item.type) == item.expected"
        fail_msg: "DNS mismatch for {{ item.domain }}: expected {{ item.expected }}"
        success_msg: "DNS OK for {{ item.domain }}"
      loop: "{{ expected_records | selectattr('type', 'equalto', 'A') | list }}"

    - name: Validate records contain expected strings
      ansible.builtin.assert:
        that:
          - "item.expected_contains in lookup('community.general.dig', item.domain + '.', qtype=item.type)"
        fail_msg: "{{ item.type }} record for {{ item.domain }} does not contain '{{ item.expected_contains }}'"
        success_msg: "{{ item.type }} record for {{ item.domain }} validated"
      loop: "{{ expected_records | selectattr('expected_contains', 'defined') | list }}"
```

## Email Delivery Verification

Verify that email-related DNS records are properly configured:

```yaml
# playbook.yml - Email DNS verification
---
- name: Verify email DNS configuration
  hosts: localhost
  vars:
    domain: "example.com"
  tasks:
    - name: Check MX records
      ansible.builtin.set_fact:
        mx_records: "{{ lookup('community.general.dig', domain + '.', qtype='MX', wantlist=True) }}"

    - name: Check SPF record
      ansible.builtin.set_fact:
        spf_record: "{{ lookup('community.general.dig', domain + '.', qtype='TXT', wantlist=True) | select('match', '.*v=spf1.*') | list }}"

    - name: Check DKIM record
      ansible.builtin.set_fact:
        dkim_record: "{{ lookup('community.general.dig', 'default._domainkey.' + domain + '.', qtype='TXT') }}"

    - name: Check DMARC record
      ansible.builtin.set_fact:
        dmarc_record: "{{ lookup('community.general.dig', '_dmarc.' + domain + '.', qtype='TXT') }}"

    - name: Report email DNS status
      ansible.builtin.debug:
        msg: |
          Email DNS Configuration for {{ domain }}:
          MX Records: {{ mx_records | join(', ') }}
          SPF: {{ spf_record | join(', ') | default('NOT FOUND') }}
          DKIM: {{ dkim_record | default('NOT FOUND') }}
          DMARC: {{ dmarc_record | default('NOT FOUND') }}
```

## Certificate Pre-Validation

Before requesting SSL certificates, verify that DNS records point correctly:

```yaml
# playbook.yml - Pre-validate DNS before certificate request
---
- name: Validate DNS before certificate issuance
  hosts: localhost
  vars:
    cert_domains:
      - example.com
      - www.example.com
      - api.example.com
    expected_ip: "93.184.216.34"
  tasks:
    - name: Verify DNS resolves correctly for all certificate domains
      ansible.builtin.assert:
        that:
          - "lookup('community.general.dig', item + '.', qtype='A') == expected_ip or lookup('community.general.dig', item + '.', qtype='CNAME') != 'NXDOMAIN'"
        fail_msg: "{{ item }} does not resolve to {{ expected_ip }}. Fix DNS before requesting certificate."
        success_msg: "{{ item }} DNS verified"
      loop: "{{ cert_domains }}"

    - name: Request certificates after validation
      ansible.builtin.debug:
        msg: "All DNS records validated. Safe to request certificates."
```

## Tips and Considerations

1. **Trailing dot**: Always use a trailing dot on domain names (`example.com.`) to prevent the resolver from appending search domains. Without it, queries might go to unexpected domains.

2. **Multiple results**: Many record types (A, MX, TXT, NS) can return multiple values. Use `wantlist=True` to get a proper list.

3. **Caching**: DNS results are cached by the resolver for the TTL duration. The lookup returns whatever the resolver gives you, which might be a cached result.

4. **Error handling**: If a domain does not exist or has no records of the requested type, the lookup returns `NXDOMAIN` or an empty result. Check for this in your logic.

5. **Network dependency**: DNS lookups require network access. If your Ansible controller cannot reach DNS servers, the lookups will fail. Consider caching results for offline scenarios.

6. **Performance**: Each lookup makes a DNS query. If you are looking up many records, the latency adds up. For large-scale DNS operations, consider using the `dig` command directly through the `command` module.

The `community.general.dig` lookup plugin turns Ansible into a DNS-aware automation tool. Whether you are validating configurations, discovering services, or building dynamic infrastructure maps, having DNS data available inline makes your playbooks smarter and more resilient to infrastructure changes.
