# How to Use Ansible ios_acls Module to Deploy IPv4 Access Control Lists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cisco IOS, ACL, IPv4, Network Security, Automation

Description: Learn how to deploy and manage IPv4 Access Control Lists on Cisco IOS devices using Ansible's cisco.ios.ios_acls module.

## Step 1: Install the Cisco IOS Collection

```bash
ansible-galaxy collection install cisco.ios
pip install ansible
```

## Step 2: Define ACLs in Playbook Variables

```yaml
# playbooks/deploy_acls.yml

---
- name: Deploy IPv4 ACLs on Cisco IOS
  hosts: cisco_routers
  gather_facts: false

  vars:
    acls:
      - name: BLOCK_RFC1918_INBOUND
        acl_type: extended
        ace_list:
          - sequence: 10
            remarks:
              - "Block RFC 1918 - 10.x.x.x"
            grant: deny
            protocol: ip
            source:
              address: 10.0.0.0
              wildcard_bits: 0.255.255.255
            destination:
              any: true
          - sequence: 20
            remarks:
              - "Block RFC 1918 - 172.x.x.x"
            grant: deny
            protocol: ip
            source:
              address: 172.16.0.0
              wildcard_bits: 0.15.255.255
            destination:
              any: true
          - sequence: 100
            remarks:
              - "Permit everything else"
            grant: permit
            protocol: ip
            source:
              any: true
            destination:
              any: true

      - name: PERMIT_WEB_TRAFFIC
        acl_type: extended
        ace_list:
          - sequence: 10
            grant: permit
            protocol: tcp
            source:
              any: true
            destination:
              any: true
              port_protocol:
                eq: www
          - sequence: 20
            grant: permit
            protocol: tcp
            source:
              any: true
            destination:
              any: true
              port_protocol:
                eq: "443"
          - sequence: 100
            grant: deny
            protocol: ip
            source:
              any: true
            destination:
              any: true

  tasks:
    - name: Deploy ACLs
      cisco.ios.ios_acls:
        config:
          - afi: ipv4
            acls:
              - name: "{{ item.name }}"
                acl_type: "{{ item.acl_type }}"
                aces: "{{ item.ace_list }}"
        state: merged
      loop: "{{ acls }}"

    - name: Apply ACL to interface
      cisco.ios.ios_acl_interfaces:
        config:
          - name: GigabitEthernet0/0
            access_groups:
              - afi: ipv4
                acls:
                  - name: BLOCK_RFC1918_INBOUND
                    direction: in
        state: merged

    - name: Save configuration
      cisco.ios.ios_command:
        commands:
          - write memory
```

## Step 3: Verify ACL Deployment

```yaml
# Add verification tasks to the playbook

    - name: Verify ACL exists
      cisco.ios.ios_command:
        commands:
          - "show ip access-lists BLOCK_RFC1918_INBOUND"
      register: acl_output

    - name: Assert ACL has entries
      assert:
        that:
          - "'deny' in acl_output.stdout[0]"
        fail_msg: "ACL BLOCK_RFC1918_INBOUND not configured correctly"

    - name: Display ACL
      debug:
        var: acl_output.stdout[0]
```

## Step 4: Remove Specific ACE Entries

```yaml
# Remove a specific ACE by replacing the ACL without that sequence number
---
- name: Remove specific ACE from ACL
  hosts: router01
  gather_facts: false

  tasks:
    - name: Remove sequence 10 from BLOCK_RFC1918_INBOUND
      cisco.ios.ios_acls:
        config:
          - afi: ipv4
            acls:
              - name: BLOCK_RFC1918_INBOUND
                acl_type: extended
                aces:
                  - sequence: 20
                    remarks:
                      - "Block RFC 1918 - 172.x.x.x"
                    grant: deny
                    protocol: ip
                    source:
                      address: 172.16.0.0
                      wildcard_bits: 0.15.255.255
                    destination:
                      any: true
                  - sequence: 100
                    remarks:
                      - "Permit everything else"
                    grant: permit
                    protocol: ip
                    source:
                      any: true
                    destination:
                      any: true
        state: replaced
```

## Step 5: Replace an Entire ACL

```yaml
# Replace (overwrite) an entire ACL
---
- name: Replace ACL on router
  hosts: router01
  gather_facts: false

  tasks:
    - name: Replace PERMIT_WEB_TRAFFIC ACL
      cisco.ios.ios_acls:
        config:
          - afi: ipv4
            acls:
              - name: PERMIT_WEB_TRAFFIC
                acl_type: extended
                aces:
                  - sequence: 10
                    grant: permit
                    protocol: tcp
                    source:
                      any: true
                    destination:
                      any: true
                      port_protocol:
                        eq: www
                  - sequence: 20
                    grant: permit
                    protocol: tcp
                    source:
                      any: true
                    destination:
                      any: true
                      port_protocol:
                        eq: "443"
                  - sequence: 30
                    grant: permit
                    protocol: tcp
                    source:
                      any: true
                    destination:
                      any: true
                      port_protocol:
                        eq: "8080"
                  - sequence: 100
                    grant: deny
                    protocol: ip
                    source:
                      any: true
                    destination:
                      any: true
        state: replaced   # Replaces the ACE list for this ACL
```

## Step 6: Run the Playbook

```bash
# Check mode (dry run)
ansible-playbook -i inventory/hosts.yml playbooks/deploy_acls.yml --check -v

# Apply changes
ansible-playbook -i inventory/hosts.yml playbooks/deploy_acls.yml

# Apply to specific host
ansible-playbook -i inventory/hosts.yml playbooks/deploy_acls.yml --limit router01
```

## Conclusion

Ansible's `cisco.ios.ios_acls` module enables declarative ACL management on Cisco IOS. Define ACEs in YAML under the `config.acls.aces` key, use `state: merged` to add ACLs or new ACEs, use `state: replaced` to rewrite the ACE list for a specific ACL, and use `state: deleted` to remove ACLs. Use `cisco.ios.ios_acl_interfaces` to bind an ACL to an interface. Always test with `--check` before applying, and verify with `show ip access-lists` after deployment.
