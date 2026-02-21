# How to Use Ansible to Manage Cloudflare DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cloudflare, DNS, Automation, Infrastructure

Description: Manage Cloudflare DNS records, zones, and settings programmatically with Ansible using the community.general cloudflare_dns module.

---

Cloudflare DNS is fast, free for basic use, and has an excellent API. That API support makes it a natural fit for Ansible automation. Instead of clicking through the Cloudflare dashboard to add DNS records, you can define all your records in YAML and let Ansible keep them in sync.

This guide covers managing Cloudflare DNS with Ansible, from basic record management to advanced patterns like dynamic DNS updates and bulk migrations.

## Prerequisites

You need a Cloudflare account and an API token. The older Global API Key works too, but API tokens with scoped permissions are the recommended approach.

Create an API token in the Cloudflare dashboard under My Profile > API Tokens. For DNS management, grant the token:

- Zone: DNS: Edit
- Zone: Zone: Read

Install the required Ansible collection:

```bash
# Install the community.general collection (includes cloudflare_dns module)
ansible-galaxy collection install community.general
```

## Basic DNS Record Management

The `community.general.cloudflare_dns` module handles creating, updating, and deleting DNS records. Here is a playbook that manages common record types:

```yaml
# cloudflare-dns.yml - Manage Cloudflare DNS records
---
- name: Manage Cloudflare DNS records
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    cloudflare_api_token: "{{ lookup('env', 'CLOUDFLARE_API_TOKEN') }}"
    domain: example.com

  tasks:
    # Create an A record for the root domain
    - name: Set root A record
      community.general.cloudflare_dns:
        zone: "{{ domain }}"
        record: "{{ domain }}"
        type: A
        value: 203.0.113.10
        proxied: true
        api_token: "{{ cloudflare_api_token }}"
        state: present

    # Create A record for www subdomain
    - name: Set www A record
      community.general.cloudflare_dns:
        zone: "{{ domain }}"
        record: www
        type: A
        value: 203.0.113.10
        proxied: true
        api_token: "{{ cloudflare_api_token }}"
        state: present

    # Create CNAME for blog subdomain
    - name: Set blog CNAME record
      community.general.cloudflare_dns:
        zone: "{{ domain }}"
        record: blog
        type: CNAME
        value: "{{ domain }}"
        proxied: true
        api_token: "{{ cloudflare_api_token }}"
        state: present

    # Create MX records for email
    - name: Set MX records
      community.general.cloudflare_dns:
        zone: "{{ domain }}"
        record: "{{ domain }}"
        type: MX
        value: "{{ item.server }}"
        priority: "{{ item.priority }}"
        api_token: "{{ cloudflare_api_token }}"
        state: present
      loop:
        - { server: "mx1.mailprovider.com", priority: 10 }
        - { server: "mx2.mailprovider.com", priority: 20 }

    # Create TXT record for SPF
    - name: Set SPF record
      community.general.cloudflare_dns:
        zone: "{{ domain }}"
        record: "{{ domain }}"
        type: TXT
        value: "v=spf1 include:mailprovider.com ~all"
        api_token: "{{ cloudflare_api_token }}"
        state: present

    # Create SRV record
    - name: Set SRV record for SIP
      community.general.cloudflare_dns:
        zone: "{{ domain }}"
        record: "_sip._tcp"
        type: SRV
        value: "sip.example.com"
        priority: 10
        weight: 60
        port: 5060
        api_token: "{{ cloudflare_api_token }}"
        state: present
```

## Data-Driven DNS Management

For managing many records, define them as data and loop over them:

```yaml
# cloudflare-dns-data.yml - Data-driven DNS management
---
- name: Data-driven Cloudflare DNS management
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    cloudflare_api_token: "{{ lookup('env', 'CLOUDFLARE_API_TOKEN') }}"
    domain: example.com

    # Define all DNS records as structured data
    dns_records:
      # Web infrastructure
      - record: "@"
        type: A
        value: 203.0.113.10
        proxied: true
      - record: www
        type: A
        value: 203.0.113.10
        proxied: true
      - record: api
        type: A
        value: 203.0.113.20
        proxied: true
      - record: staging
        type: A
        value: 203.0.113.30
        proxied: false
      # Internal services (not proxied)
      - record: db
        type: A
        value: 10.0.1.50
        proxied: false
      - record: redis
        type: A
        value: 10.0.1.51
        proxied: false
      # CNAME records
      - record: docs
        type: CNAME
        value: "mycompany.readthedocs.io"
        proxied: false
      - record: status
        type: CNAME
        value: "statuspage.example.com"
        proxied: false

  tasks:
    # Apply all DNS records in a loop
    - name: Ensure all DNS records exist
      community.general.cloudflare_dns:
        zone: "{{ domain }}"
        record: "{{ item.record }}"
        type: "{{ item.type }}"
        value: "{{ item.value }}"
        proxied: "{{ item.proxied | default(false) }}"
        ttl: "{{ item.ttl | default(1) }}"
        api_token: "{{ cloudflare_api_token }}"
        state: present
      loop: "{{ dns_records }}"
```

## Managing Multiple Zones

If you manage DNS for multiple domains, structure your variables per zone:

```yaml
# group_vars/all.yml - Multi-zone DNS configuration
---
cloudflare_zones:
  example.com:
    records:
      - { record: "@", type: A, value: "203.0.113.10", proxied: true }
      - { record: www, type: CNAME, value: "example.com", proxied: true }
  example.org:
    records:
      - { record: "@", type: A, value: "203.0.113.20", proxied: true }
      - { record: www, type: CNAME, value: "example.org", proxied: true }
```

```yaml
# multi-zone-dns.yml - Apply DNS records across multiple zones
---
- name: Manage multiple Cloudflare zones
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    # Loop through each zone and its records
    - name: Apply DNS records for all zones
      community.general.cloudflare_dns:
        zone: "{{ item.0.key }}"
        record: "{{ item.1.record }}"
        type: "{{ item.1.type }}"
        value: "{{ item.1.value }}"
        proxied: "{{ item.1.proxied | default(false) }}"
        api_token: "{{ lookup('env', 'CLOUDFLARE_API_TOKEN') }}"
        state: present
      loop: "{{ cloudflare_zones | dict2items | subelements('value.records') }}"
      loop_control:
        label: "{{ item.0.key }} - {{ item.1.record }}"
```

## Deleting DNS Records

To remove records that should no longer exist:

```yaml
# delete-records.yml - Remove obsolete DNS records
---
- name: Remove old DNS records
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    records_to_remove:
      - { record: old-app, type: A, value: "203.0.113.99" }
      - { record: legacy, type: CNAME, value: "old.example.com" }

  tasks:
    # Delete each specified record
    - name: Remove obsolete records
      community.general.cloudflare_dns:
        zone: example.com
        record: "{{ item.record }}"
        type: "{{ item.type }}"
        value: "{{ item.value }}"
        api_token: "{{ lookup('env', 'CLOUDFLARE_API_TOKEN') }}"
        state: absent
      loop: "{{ records_to_remove }}"
```

## Dynamic DNS Updates

If you have servers with dynamic IPs (like home labs or development machines), Ansible can update Cloudflare records as part of your provisioning process:

```yaml
# dynamic-dns.yml - Update DNS records after provisioning
---
- name: Update Cloudflare DNS after provisioning
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    # Get the public IP of a newly provisioned server
    - name: Get server public IP
      amazon.aws.ec2_instance_info:
        instance_ids:
          - "{{ new_instance_id }}"
        region: us-east-1
      register: instance_info

    # Update the DNS record to point to the new server
    - name: Update DNS for the new server
      community.general.cloudflare_dns:
        zone: example.com
        record: "app"
        type: A
        value: "{{ instance_info.instances[0].public_ip_address }}"
        proxied: true
        solo: true  # Replace existing record instead of adding duplicate
        api_token: "{{ lookup('env', 'CLOUDFLARE_API_TOKEN') }}"
        state: present
```

The `solo: true` parameter is important here. It tells the module to replace any existing record of the same type for that name, rather than creating a duplicate.

## DKIM and Email Authentication Records

Setting up email authentication records is tedious by hand. Automate it:

```yaml
# email-dns.yml - Configure email authentication DNS records
---
- name: Configure email DNS records
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    domain: example.com
    dkim_selector: default
    dkim_value: "v=DKIM1; k=rsa; p=MIIBIjANBgkqh..."

  tasks:
    # SPF record
    - name: Set SPF record
      community.general.cloudflare_dns:
        zone: "{{ domain }}"
        record: "{{ domain }}"
        type: TXT
        value: "v=spf1 include:_spf.google.com ~all"
        api_token: "{{ lookup('env', 'CLOUDFLARE_API_TOKEN') }}"
        state: present

    # DKIM record
    - name: Set DKIM record
      community.general.cloudflare_dns:
        zone: "{{ domain }}"
        record: "{{ dkim_selector }}._domainkey"
        type: TXT
        value: "{{ dkim_value }}"
        api_token: "{{ lookup('env', 'CLOUDFLARE_API_TOKEN') }}"
        state: present

    # DMARC record
    - name: Set DMARC record
      community.general.cloudflare_dns:
        zone: "{{ domain }}"
        record: "_dmarc"
        type: TXT
        value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@{{ domain }}; pct=100"
        api_token: "{{ lookup('env', 'CLOUDFLARE_API_TOKEN }}"
        state: present
```

## Tips for Production Use

Store your Cloudflare API token in Ansible Vault, not as an environment variable in production. Use `ansible-vault encrypt_string` to encrypt it inline in your variables file.

The `cloudflare_dns` module is idempotent for most record types, but be careful with TXT records. Multiple TXT records can exist for the same name, so always specify the exact value you want to match.

Use `--check --diff` mode before applying DNS changes in production. A wrong DNS record can take down your entire site, and even with Cloudflare's fast propagation, the impact is immediate.

Keep your DNS records in version control. When someone asks "when did we change the API endpoint," the git log will tell you.
