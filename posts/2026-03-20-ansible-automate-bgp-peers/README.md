# How to Automate BGP Peer Configuration with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, BGP, Cisco IOS, Network Automation, Routing

Description: Learn how to automate BGP peer (neighbor) configuration on Cisco IOS routers using Ansible playbooks with the cisco.ios.ios_bgp_global and ios_bgp_address_family modules.

## Step 1: Define BGP Configuration in Inventory

```yaml
# inventory/hosts.yml

all:
  children:
    bgp_routers:
      hosts:
        router01:
          ansible_host: 192.168.1.1
          bgp_asn: 65001
          bgp_router_id: 1.1.1.1
          bgp_neighbors:
            - peer_ip: 203.0.113.1
              remote_as: 65100
              description: "ISP1_eBGP"
              peer_type: ebgp
              password: "bgp_md5_secret"
            - peer_ip: 192.168.1.2
              remote_as: 65001
              description: "Router02_iBGP"
              peer_type: ibgp
              update_source: Loopback0
        router02:
          ansible_host: 192.168.1.2
          bgp_asn: 65001
          bgp_router_id: 2.2.2.2
          bgp_neighbors:
            - peer_ip: 192.168.1.1
              remote_as: 65001
              description: "Router01_iBGP"
              peer_type: ibgp
              update_source: Loopback0
      vars:
        ansible_network_os: cisco.ios.ios
        ansible_connection: ansible.netcommon.network_cli
        ansible_user: admin
        ansible_password: "{{ vault_password }}"
        ansible_become: true
        ansible_become_method: enable
        ansible_become_password: "{{ vault_enable_password | default(vault_password) }}"
```

## Step 2: BGP Configuration Playbook

```yaml
# playbooks/configure_bgp.yml
---
- name: Configure BGP on Routers
  hosts: bgp_routers
  gather_facts: false

  tasks:
    - name: Configure BGP global settings
      cisco.ios.ios_bgp_global:
        config:
          as_number: "{{ bgp_asn }}"
          bgp:
            router_id:
              address: "{{ bgp_router_id }}"
            log_neighbor_changes: true
          neighbors:
            - neighbor_address: "{{ item.peer_ip }}"
              remote_as: "{{ item.remote_as }}"
              description: "{{ item.description }}"
              password_options: "{{ {'encryption': 0, 'pass_key': item.password} if item.password is defined else omit }}"
              update_source: "{{ item.update_source | default(omit) }}"
        state: merged
      loop: "{{ bgp_neighbors }}"

    - name: Configure BGP IPv4 address family
      cisco.ios.ios_bgp_address_family:
        config:
          as_number: "{{ bgp_asn }}"
          address_family:
            - afi: ipv4
              safi: unicast
              neighbors:
                - neighbor_address: "{{ item.peer_ip }}"
                  activate: true
                  nexthop_self: "{{ {'set': true} if item.peer_type == 'ibgp' else omit }}"
        state: merged
      loop: "{{ bgp_neighbors }}"

    - name: Save configuration
      cisco.ios.ios_command:
        commands:
          - write memory
```

## Step 3: Configure BGP Prefix Lists and Filtering

```yaml
# Add filtering configuration
    - name: Configure BGP prefix list (inbound filter)
      cisco.ios.ios_config:
        lines:
          - "ip prefix-list FROM_ISP1 seq 10 permit 0.0.0.0/0"
          - "ip prefix-list FROM_ISP1 seq 20 permit 0.0.0.0/0 ge 24 le 24"

    - name: Apply inbound prefix list to ISP1 neighbor
      cisco.ios.ios_bgp_address_family:
        config:
          as_number: "{{ bgp_asn }}"
          address_family:
            - afi: ipv4
              safi: unicast
              neighbors:
                - neighbor_address: 203.0.113.1
                  prefix_lists:
                    - name: FROM_ISP1
                      in: true
        state: merged
```

## Step 4: Verify BGP Sessions

```yaml
# playbooks/verify_bgp.yml
---
- name: Verify BGP Sessions
  hosts: bgp_routers
  gather_facts: false

  tasks:
    - name: Get BGP neighbor summary
      cisco.ios.ios_command:
        commands:
          - "show ip bgp summary"
      register: bgp_summary

    - name: Display BGP summary
      debug:
        msg: "{{ bgp_summary.stdout[0] }}"

    - name: Check BGP neighbor state
      cisco.ios.ios_command:
        commands:
          - "show ip bgp neighbors {{ item.peer_ip }}"
      loop: "{{ bgp_neighbors }}"
      register: bgp_neighbor_state

    - name: Assert neighbors are established
      assert:
        that:
          - "'BGP state = Established' in item.stdout[0]"
        fail_msg: "BGP neighbor {{ item.item.peer_ip }} is not in Established state!"
        success_msg: "BGP neighbor {{ item.item.peer_ip }} is Established."
      loop: "{{ bgp_neighbor_state.results }}"
```

## Step 5: Add BGP Peer Using Raw Config (for complex scenarios)

```yaml
    - name: Configure complex BGP peer settings
      cisco.ios.ios_config:
        lines:
          - "neighbor {{ item.peer_ip }} remote-as {{ item.remote_as }}"
          - "neighbor {{ item.peer_ip }} description {{ item.description }}"
          - "neighbor {{ item.peer_ip }} soft-reconfiguration inbound"
          - "neighbor {{ item.peer_ip }} timers 10 30"
        parents:
          - "router bgp {{ bgp_asn }}"
      loop: "{{ bgp_neighbors }}"
```

## Step 6: Deploy BGP Configuration

```bash
# Install required collection
ansible-galaxy collection install cisco.ios

# Dry run
ansible-playbook -i inventory/hosts.yml playbooks/configure_bgp.yml --check -v

# Deploy
ansible-playbook -i inventory/hosts.yml playbooks/configure_bgp.yml

# Verify
ansible-playbook -i inventory/hosts.yml playbooks/verify_bgp.yml
```

## Conclusion

Ansible's `cisco.ios.ios_bgp_global` and `cisco.ios.ios_bgp_address_family` modules configure BGP peers declaratively. Store per-router BGP data (ASN, router-ID, neighbors) in inventory or `host_vars`, run `configure_bgp.yml` to deploy, and verify with `verify_bgp.yml` that sessions reach Established state. For complex BGP scenarios, or when you need direct CLI parity, use `ios_config` with `lines` and `parents` to send raw IOS configuration commands.
