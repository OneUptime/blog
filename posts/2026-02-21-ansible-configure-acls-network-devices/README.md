# How to Use Ansible to Configure ACLs on Network Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ACL, Network Security, Automation

Description: Automate access control list configuration on network devices with Ansible, covering standard ACLs, extended ACLs, and applying them to interfaces.

---

Access Control Lists are the first line of defense in network security. They filter traffic at the interface level, controlling what gets in and what gets out. Managing ACLs by hand is painful, especially when you need the same policy applied across dozens of routers or when a single typo can lock you out of a device. Ansible makes ACL management repeatable and safe by letting you define your access policies as code.

This post covers how to create, apply, and manage ACLs on network devices using Ansible, with examples for both standard and extended ACLs.

## ACL Basics Review

Before diving into Ansible, let me quickly review the two main types of ACLs on Cisco IOS:

- **Standard ACLs** (numbered 1-99, named) filter traffic based on source IP address only.
- **Extended ACLs** (numbered 100-199, named) filter based on source IP, destination IP, protocol, and port numbers.

Named ACLs are preferred over numbered ACLs because they are easier to read, modify, and manage.

## Managing ACLs with the Resource Module

The `ios_acls` resource module provides declarative ACL management. You define the ACL entries and the module handles creating, updating, or removing them.

```yaml
# configure_acls.yml - Create named ACLs using the resource module
---
- name: Configure access control lists
  hosts: routers
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Configure extended ACL for server access
      cisco.ios.ios_acls:
        config:
          - afi: ipv4
            acls:
              - name: SERVER_ACCESS
                acl_type: extended
                aces:
                  # Allow HTTP/HTTPS from user network to servers
                  - sequence: 10
                    grant: permit
                    protocol: tcp
                    source:
                      address: 10.30.0.0
                      wildcard_bits: 0.0.255.255
                    destination:
                      address: 10.20.0.0
                      wildcard_bits: 0.0.255.255
                    protocol_options:
                      tcp:
                        eq: 443
                    remark: "Allow HTTPS to servers"

                  - sequence: 20
                    grant: permit
                    protocol: tcp
                    source:
                      address: 10.30.0.0
                      wildcard_bits: 0.0.255.255
                    destination:
                      address: 10.20.0.0
                      wildcard_bits: 0.0.255.255
                    protocol_options:
                      tcp:
                        eq: 80
                    remark: "Allow HTTP to servers"

                  # Allow DNS
                  - sequence: 30
                    grant: permit
                    protocol: udp
                    source:
                      address: 10.30.0.0
                      wildcard_bits: 0.0.255.255
                    destination:
                      any: true
                    protocol_options:
                      udp:
                        eq: 53
                    remark: "Allow DNS lookups"

                  # Allow ICMP for troubleshooting
                  - sequence: 40
                    grant: permit
                    protocol: icmp
                    source:
                      address: 10.30.0.0
                      wildcard_bits: 0.0.255.255
                    destination:
                      any: true
                    remark: "Allow ICMP"

                  # Deny everything else
                  - sequence: 1000
                    grant: deny
                    protocol: ip
                    source:
                      any: true
                    destination:
                      any: true
                    log: true
                    remark: "Deny all other traffic"
        state: merged
```

## Using ios_config for ACL Management

For complex ACLs or when you need finer control over the ordering, `ios_config` gives you direct CLI access.

```yaml
# acl_config_module.yml - Create ACLs using ios_config for direct CLI control
---
- name: Configure ACLs with ios_config
  hosts: routers
  gather_facts: false
  connection: network_cli

  tasks:
    # Create an extended named ACL
    - name: Configure management access ACL
      cisco.ios.ios_config:
        lines:
          - remark Allow SSH from management network
          - permit tcp 10.10.0.0 0.0.255.255 any eq 22
          - remark Allow SNMP from monitoring server
          - permit udp host 10.10.1.50 any eq 161
          - remark Allow ICMP from management
          - permit icmp 10.10.0.0 0.0.255.255 any
          - remark Deny everything else
          - deny ip any any log
        parents: ip access-list extended MGMT_ACCESS
        before: no ip access-list extended MGMT_ACCESS
        match: exact

    # Create a standard ACL for VTY line access
    - name: Configure VTY access ACL
      cisco.ios.ios_config:
        lines:
          - permit 10.10.0.0 0.0.255.255
          - permit host 10.20.1.100
          - deny any log
        parents: ip access-list standard VTY_ACCESS
```

## Applying ACLs to Interfaces

Creating ACLs does nothing until you apply them to interfaces. Here is how to bind ACLs to interfaces.

```yaml
# apply_acls.yml - Apply ACLs to interfaces for traffic filtering
---
- name: Apply ACLs to interfaces
  hosts: routers
  gather_facts: false
  connection: network_cli

  tasks:
    # Apply the server access ACL inbound on the user VLAN interface
    - name: Apply ACL to user-facing interface
      cisco.ios.ios_config:
        lines:
          - ip access-group SERVER_ACCESS in
        parents: interface GigabitEthernet0/1

    # Apply management ACL to the management interface
    - name: Apply management ACL
      cisco.ios.ios_config:
        lines:
          - ip access-group MGMT_ACCESS in
        parents: interface GigabitEthernet0/0

    # Apply VTY ACL to restrict remote access
    - name: Apply ACL to VTY lines
      cisco.ios.ios_config:
        lines:
          - access-class VTY_ACCESS in
        parents: line vty 0 15
```

## Variable-Driven ACL Deployment

For environments with multiple sites that share the same security policy, define ACLs in group variables and deploy them consistently.

```yaml
# group_vars/all_routers.yml - Shared ACL definitions
---
security_acls:
  management:
    name: MGMT_ACCESS
    type: extended
    entries:
      - seq: 10
        action: permit
        protocol: tcp
        src: "10.10.0.0 0.0.255.255"
        dst: any
        port: 22
        remark: "SSH from management"
      - seq: 20
        action: permit
        protocol: udp
        src: "host 10.10.1.50"
        dst: any
        port: 161
        remark: "SNMP monitoring"
      - seq: 30
        action: permit
        protocol: icmp
        src: "10.10.0.0 0.0.255.255"
        dst: any
        remark: "ICMP from management"
      - seq: 1000
        action: deny
        protocol: ip
        src: any
        dst: any
        remark: "Deny all"
        log: true

  anti_spoofing:
    name: ANTI_SPOOF
    type: extended
    entries:
      - seq: 10
        action: deny
        protocol: ip
        src: "10.0.0.0 0.255.255.255"
        dst: any
        remark: "Block RFC1918 from WAN"
        log: true
      - seq: 20
        action: deny
        protocol: ip
        src: "172.16.0.0 0.15.255.255"
        dst: any
        remark: "Block RFC1918 from WAN"
        log: true
      - seq: 30
        action: deny
        protocol: ip
        src: "192.168.0.0 0.0.255.255"
        dst: any
        remark: "Block RFC1918 from WAN"
        log: true
      - seq: 100
        action: permit
        protocol: ip
        src: any
        dst: any
        remark: "Allow legitimate traffic"
```

```yaml
# deploy_acl_policy.yml - Deploy security ACLs from shared variables
---
- name: Deploy security ACL policy
  hosts: all_routers
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Build and apply management ACL
      cisco.ios.ios_config:
        lines: >-
          {%- set lines = [] -%}
          {%- for entry in security_acls.management.entries -%}
            {%- set _ = lines.append(entry.seq ~ ' remark ' ~ entry.remark) -%}
            {%- if entry.port is defined -%}
              {%- set _ = lines.append(entry.seq ~ ' ' ~ entry.action ~ ' ' ~ entry.protocol ~ ' ' ~ entry.src ~ ' ' ~ entry.dst ~ ' eq ' ~ entry.port) -%}
            {%- else -%}
              {%- set _ = lines.append(entry.seq ~ ' ' ~ entry.action ~ ' ' ~ entry.protocol ~ ' ' ~ entry.src ~ ' ' ~ entry.dst) -%}
            {%- endif -%}
          {%- endfor -%}
          {{ lines }}
        parents: "ip access-list {{ security_acls.management.type }} {{ security_acls.management.name }}"
```

## ACL Audit and Compliance

Regularly auditing ACLs helps you identify stale rules, overly permissive entries, and missing security policies.

```yaml
# audit_acls.yml - Gather and analyze current ACLs for compliance
---
- name: Audit ACL configuration
  hosts: routers
  gather_facts: false
  connection: network_cli

  tasks:
    # Gather all ACLs from the device
    - name: Gather current ACLs
      cisco.ios.ios_acls:
        state: gathered
      register: current_acls

    # Check for overly permissive rules
    - name: Find permit-any-any rules
      ansible.builtin.debug:
        msg: "WARNING: ACL '{{ item.0.name }}' has permit ip any any at sequence {{ item.1.sequence }}"
      loop: "{{ current_acls.gathered | subelements('acls') | subelements('aces', skip_missing=True) }}"
      when:
        - item.1.grant == 'permit'
        - item.1.source.any is defined
        - item.1.destination.any is defined
        - item.1.protocol == 'ip'

    # Get ACL hit counters to find unused rules
    - name: Check ACL hit counters
      cisco.ios.ios_command:
        commands:
          - show access-lists
      register: acl_counters

    - name: Save ACL counter output
      ansible.builtin.copy:
        content: "{{ acl_counters.stdout[0] }}"
        dest: "reports/{{ inventory_hostname }}_acl_counters.txt"
      delegate_to: localhost
```

## Removing Stale ACL Entries

The `deleted` state lets you remove specific ACL entries or entire ACLs.

```yaml
# cleanup_acls.yml - Remove old ACLs that are no longer needed
---
- name: Clean up old ACLs
  hosts: routers
  gather_facts: false
  connection: network_cli

  tasks:
    # Remove a specific ACL entirely
    - name: Delete the old LEGACY_ACL
      cisco.ios.ios_acls:
        config:
          - afi: ipv4
            acls:
              - name: LEGACY_ACL
        state: deleted

    # Remove ACL from an interface before deleting it
    - name: Remove ACL from interface first
      cisco.ios.ios_config:
        lines:
          - no ip access-group LEGACY_ACL in
        parents: interface GigabitEthernet0/2
```

## ACL Testing with Check Mode

Always test ACL changes in check mode first, especially in production. A bad ACL can lock you out of the device.

```yaml
# test_acl_changes.yml - Test ACL changes before applying them
---
- name: Test ACL changes in check mode
  hosts: routers
  gather_facts: false
  connection: network_cli
  check_mode: true

  tasks:
    - name: Preview ACL changes
      cisco.ios.ios_acls:
        config:
          - afi: ipv4
            acls:
              - name: SERVER_ACCESS
                acl_type: extended
                aces:
                  - sequence: 25
                    grant: permit
                    protocol: tcp
                    source:
                      address: 10.30.0.0
                      wildcard_bits: 0.0.255.255
                    destination:
                      address: 10.20.0.0
                      wildcard_bits: 0.0.255.255
                    protocol_options:
                      tcp:
                        eq: 8443
                    remark: "Allow alt HTTPS"
        state: merged
      register: preview

    - name: Show what would change
      ansible.builtin.debug:
        var: preview.commands
```

ACL management with Ansible eliminates the risk of manual typos and ensures consistent security policies across your entire network. Define your access policies as code, test them in check mode, deploy them with confidence, and audit them regularly. Your security posture improves when policy enforcement is automated and auditable.
