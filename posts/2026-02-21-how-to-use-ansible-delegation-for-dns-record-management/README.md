# How to Use Ansible Delegation for DNS Record Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, DNS, Delegation, Infrastructure

Description: Learn how to use Ansible delegation to manage DNS records from playbooks that target application and infrastructure hosts.

---

DNS record management is a natural fit for Ansible delegation. When you provision or configure a server, you often need to create or update DNS records for it. The DNS server (or API) is different from the target host, so you delegate the DNS task to the appropriate host or to localhost for API-based DNS providers. This keeps your DNS configuration in sync with your infrastructure automation.

## Managing DNS with Route53 via Delegation

AWS Route53 is managed through API calls. You delegate these tasks to localhost since the AWS CLI/SDK runs on the controller.

```yaml
# route53-dns.yml - Managing Route53 DNS records during deployment
---
- name: Provision and configure web servers with DNS
  hosts: webservers
  gather_facts: true
  vars:
    dns_zone: example.com
    dns_ttl: 300
  tasks:
    - name: Configure the web server
      ansible.builtin.apt:
        name:
          - nginx
          - certbot
        state: present
      become: true

    - name: Create A record for this server
      amazon.aws.route53:
        zone: "{{ dns_zone }}"
        record: "{{ inventory_hostname }}.{{ dns_zone }}"
        type: A
        value: "{{ ansible_default_ipv4.address }}"
        ttl: "{{ dns_ttl }}"
        state: present
        overwrite: true
      delegate_to: localhost

    - name: Create CNAME for the service endpoint
      amazon.aws.route53:
        zone: "{{ dns_zone }}"
        record: "web.{{ dns_zone }}"
        type: A
        value: "{{ ansible_default_ipv4.address }}"
        ttl: "{{ dns_ttl }}"
        state: present
        overwrite: true
      delegate_to: localhost
      run_once: true     # Only one A record for the service name

    - name: Verify DNS resolution
      ansible.builtin.command: >
        dig +short {{ inventory_hostname }}.{{ dns_zone }} @8.8.8.8
      register: dns_check
      delegate_to: localhost
      changed_when: false
      retries: 6
      delay: 10
      until: ansible_default_ipv4.address in dns_check.stdout
```

## BIND/nsupdate for On-Premises DNS

For on-premises environments using BIND, you delegate to the DNS server and use `nsupdate` for dynamic updates.

```yaml
# bind-dns.yml - Managing BIND DNS records with nsupdate
---
- name: Manage DNS records on BIND server
  hosts: appservers
  gather_facts: true
  vars:
    dns_server: dns1.internal.example.com
    dns_zone: internal.example.com
    dns_key: /etc/bind/keys/ansible-update.key
    dns_ttl: 300
  tasks:
    - name: Add forward DNS record (A record)
      ansible.builtin.shell: |
        nsupdate -k {{ dns_key }} << EOF
        server {{ dns_server }}
        zone {{ dns_zone }}
        update delete {{ inventory_hostname }}.{{ dns_zone }} A
        update add {{ inventory_hostname }}.{{ dns_zone }} {{ dns_ttl }} A {{ ansible_default_ipv4.address }}
        send
        EOF
      delegate_to: "{{ dns_server }}"
      become: true

    - name: Add reverse DNS record (PTR record)
      ansible.builtin.shell: |
        # Calculate the reverse IP for PTR record
        REVERSE_IP=$(echo "{{ ansible_default_ipv4.address }}" | awk -F. '{print $4"."$3"."$2"."$1}')
        nsupdate -k {{ dns_key }} << EOF
        server {{ dns_server }}
        update delete ${REVERSE_IP}.in-addr.arpa PTR
        update add ${REVERSE_IP}.in-addr.arpa {{ dns_ttl }} PTR {{ inventory_hostname }}.{{ dns_zone }}.
        send
        EOF
      delegate_to: "{{ dns_server }}"
      become: true

    - name: Verify forward DNS resolution
      ansible.builtin.command: "dig +short {{ inventory_hostname }}.{{ dns_zone }} @{{ dns_server }}"
      register: forward_check
      delegate_to: localhost
      changed_when: false

    - name: Confirm DNS is correct
      ansible.builtin.assert:
        that:
          - ansible_default_ipv4.address in forward_check.stdout
        fail_msg: "DNS A record for {{ inventory_hostname }} does not resolve to {{ ansible_default_ipv4.address }}"
```

## CloudFlare DNS Management

CloudFlare provides an API for DNS management. All operations delegate to localhost:

```yaml
# cloudflare-dns.yml - Managing CloudFlare DNS records
---
- name: Manage CloudFlare DNS for web servers
  hosts: webservers
  gather_facts: true
  vars:
    cloudflare_api_token: "{{ vault_cloudflare_token }}"
    cloudflare_zone_id: "abc123def456"
    domain: example.com
  tasks:
    - name: Create or update DNS A record in CloudFlare
      ansible.builtin.uri:
        url: "https://api.cloudflare.com/client/v4/zones/{{ cloudflare_zone_id }}/dns_records"
        method: POST
        headers:
          Authorization: "Bearer {{ cloudflare_api_token }}"
          Content-Type: "application/json"
        body_format: json
        body:
          type: A
          name: "{{ inventory_hostname_short }}.{{ domain }}"
          content: "{{ ansible_default_ipv4.address }}"
          ttl: 300
          proxied: false
        status_code: [200, 409]  # 409 if record already exists
      delegate_to: localhost
      register: cf_result

    - name: Update existing record if it already exists
      ansible.builtin.uri:
        url: "https://api.cloudflare.com/client/v4/zones/{{ cloudflare_zone_id }}/dns_records/{{ existing_record_id }}"
        method: PUT
        headers:
          Authorization: "Bearer {{ cloudflare_api_token }}"
          Content-Type: "application/json"
        body_format: json
        body:
          type: A
          name: "{{ inventory_hostname_short }}.{{ domain }}"
          content: "{{ ansible_default_ipv4.address }}"
          ttl: 300
          proxied: false
      delegate_to: localhost
      when: cf_result.status == 409
      vars:
        existing_record_id: "{{ cf_result.json.result.id | default('') }}"
```

## DNS Cleanup During Server Decommissioning

When removing servers, you need to clean up their DNS records. Here is a decommissioning playbook:

```yaml
# decommission-dns.yml - Clean up DNS when removing servers
---
- name: Decommission servers and clean up DNS
  hosts: servers_to_remove
  gather_facts: false
  vars:
    dns_zone: example.com
  tasks:
    - name: Remove A record from Route53
      amazon.aws.route53:
        zone: "{{ dns_zone }}"
        record: "{{ inventory_hostname }}.{{ dns_zone }}"
        type: A
        state: absent
      delegate_to: localhost
      ignore_errors: true    # Record might not exist

    - name: Remove any CNAME records
      amazon.aws.route53:
        zone: "{{ dns_zone }}"
        record: "{{ item }}.{{ dns_zone }}"
        type: CNAME
        state: absent
      delegate_to: localhost
      loop:
        - "{{ inventory_hostname_short }}"
        - "{{ inventory_hostname_short }}-mgmt"
      ignore_errors: true

    - name: Remove from monitoring
      ansible.builtin.uri:
        url: "http://monitoring.internal/api/hosts/{{ inventory_hostname }}"
        method: DELETE
      delegate_to: localhost
      ignore_errors: true

    - name: Shutdown the server
      ansible.builtin.command: shutdown -h now
      become: true
      ignore_errors: true    # May lose connection before command completes
```

## DNS Record Validation Role

Create a reusable role that validates DNS records after any change:

```yaml
# roles/validate_dns/tasks/main.yml - DNS validation role
---
- name: Wait for DNS propagation
  ansible.builtin.pause:
    seconds: "{{ dns_propagation_wait | default(10) }}"

- name: Check DNS resolution from multiple resolvers
  ansible.builtin.command: "dig +short {{ dns_record_name }} @{{ item }}"
  register: dns_checks
  delegate_to: localhost
  changed_when: false
  loop:
    - "8.8.8.8"             # Google DNS
    - "1.1.1.1"             # Cloudflare DNS
    - "{{ internal_dns | default('127.0.0.1') }}"
  ignore_errors: true

- name: Report DNS resolution results
  ansible.builtin.debug:
    msg: >
      DNS check for {{ dns_record_name }} via {{ item.item }}:
      {{ item.stdout | default('NO RESULT') }}
  loop: "{{ dns_checks.results }}"
  loop_control:
    label: "{{ item.item }}"

- name: Fail if DNS does not resolve to expected value
  ansible.builtin.fail:
    msg: >
      DNS record {{ dns_record_name }} does not resolve to {{ dns_expected_value }}
      on resolver {{ item.item }}. Got: {{ item.stdout | default('empty') }}
  loop: "{{ dns_checks.results }}"
  loop_control:
    label: "{{ item.item }}"
  when:
    - item is succeeded
    - dns_expected_value not in (item.stdout | default(''))
    - item.item != (internal_dns | default('127.0.0.1'))  # Skip internal DNS check if not configured
```

Use it in your playbook:

```yaml
# deploy-with-dns-validation.yml
---
- name: Deploy and validate DNS
  hosts: webservers
  tasks:
    - name: Create DNS record
      amazon.aws.route53:
        zone: example.com
        record: "{{ inventory_hostname }}.example.com"
        type: A
        value: "{{ ansible_default_ipv4.address }}"
        state: present
      delegate_to: localhost

    - name: Validate DNS
      ansible.builtin.include_role:
        name: validate_dns
      vars:
        dns_record_name: "{{ inventory_hostname }}.example.com"
        dns_expected_value: "{{ ansible_default_ipv4.address }}"
```

## Generating DNS Zone Files with Delegation

For static DNS setups, you might want to generate zone files from your inventory:

```yaml
# generate-zone.yml - Generate BIND zone file from inventory
---
- name: Generate DNS zone file from inventory
  hosts: all
  gather_facts: true
  tasks:
    - name: Generate zone file entry for each host
      ansible.builtin.lineinfile:
        path: /tmp/generated-zone.db
        line: "{{ inventory_hostname_short }}    IN    A    {{ ansible_default_ipv4.address }}"
        create: true
      delegate_to: localhost

    - name: Add zone file header
      ansible.builtin.blockinfile:
        path: /tmp/generated-zone.db
        insertbefore: BOF
        block: |
          $TTL 300
          @    IN    SOA    ns1.example.com. admin.example.com. (
                           {{ ansible_date_time.epoch }}  ; Serial
                           3600        ; Refresh
                           600         ; Retry
                           86400       ; Expire
                           300 )       ; Minimum TTL
               IN    NS     ns1.example.com.
               IN    NS     ns2.example.com.
      delegate_to: localhost
      run_once: true
```

## Summary

DNS management through Ansible delegation follows a consistent pattern regardless of your DNS provider. For cloud providers (Route53, CloudFlare, Google Cloud DNS), delegate to localhost and use API calls. For on-premises BIND servers, delegate to the DNS server and use nsupdate. Always validate DNS records after changes, account for propagation delays, and include DNS cleanup in your decommissioning playbooks. The delegation pattern keeps DNS management tightly coupled with your server provisioning without requiring the target hosts to have DNS management tools installed.
