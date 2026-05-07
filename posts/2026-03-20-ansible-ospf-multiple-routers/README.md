# How to Configure OSPF on Multiple Routers with an Ansible Playbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, OSPF, Cisco IOS, Network Automation, Routing

Description: Learn how to automate OSPF configuration across multiple Cisco IOS routers using an Ansible playbook with the cisco.ios.ios_ospfv2 module.

## Step 1: Inventory and Variables

```yaml
# inventory/hosts.yml

all:
  children:
    ospf_routers:
      hosts:
        router01:
          ansible_host: 192.168.1.1
          ospf_router_id: 1.1.1.1
          ospf_networks:
            - address: 192.168.1.0
              wildcard: 0.0.0.255
              area: 0
            - address: 10.0.12.0
              wildcard: 0.0.0.3
              area: 0
        router02:
          ansible_host: 192.168.1.2
          ospf_router_id: 2.2.2.2
          ospf_networks:
            - address: 10.0.12.0
              wildcard: 0.0.0.3
              area: 0
            - address: 10.0.23.0
              wildcard: 0.0.0.3
              area: 1
        router03:
          ansible_host: 192.168.1.3
          ospf_router_id: 3.3.3.3
          ospf_networks:
            - address: 10.0.23.0
              wildcard: 0.0.0.3
              area: 1
            - address: 172.16.0.0
              wildcard: 0.0.255.255
              area: 1
      vars:
        ansible_network_os: cisco.ios.ios
        ansible_connection: network_cli
        ansible_user: admin
        ansible_password: "{{ vault_password }}"
        ansible_become: yes
        ansible_become_method: enable
        ospf_process_id: 1
```

## Step 2: OSPF Configuration Playbook

```yaml
# playbooks/configure_ospf.yml
---
- name: Configure OSPF on All Routers
  hosts: ospf_routers
  gather_facts: false

  tasks:
    - name: Configure OSPF process and router-id
      cisco.ios.ios_ospfv2:
        config:
          processes:
            - process_id: "{{ ospf_process_id }}"
              router_id: "{{ ospf_router_id }}"
              passive_interfaces:
                default: false
                interface:
                  set_interface: true
                  name:
                    - Loopback0
              network:
                - address: "{{ item.address }}"
                  wildcard_bits: "{{ item.wildcard }}"
                  area: "{{ item.area }}"
        state: merged
      loop: "{{ ospf_networks }}"

    - name: Configure loopback with /32 for OSPF router-id
      cisco.ios.ios_l3_interfaces:
        config:
          - name: Loopback0
            ipv4:
              - address: "{{ ospf_router_id }}/32"
        state: merged

    - name: Save configuration
      cisco.ios.ios_command:
        commands:
          - write memory
```

## Step 3: Verify OSPF Neighbors

```yaml
# playbooks/verify_ospf.yml
---
- name: Verify OSPF Neighbor Adjacencies
  hosts: ospf_routers
  gather_facts: false

  tasks:
    - name: Get OSPF neighbors
      cisco.ios.ios_command:
        commands:
          - show ip ospf neighbor
      register: ospf_neighbors

    - name: Display OSPF neighbors
      debug:
        msg: "{{ ospf_neighbors.stdout[0] }}"

    - name: Assert at least one FULL neighbor
      assert:
        that:
          - (ospf_neighbors.stdout[0] | regex_findall('FULL/') | length) > 0
        fail_msg: "No OSPF neighbors in FULL state on {{ inventory_hostname }}"
        success_msg: "OSPF adjacencies established on {{ inventory_hostname }}"
```

## Step 4: Configure OSPF Authentication

```yaml
# Add to the ospf playbook or create a separate playbook
    - name: Configure OSPF MD5 authentication on interfaces
      cisco.ios.ios_config:
        lines:
          - ip ospf authentication message-digest
          - ip ospf message-digest-key 1 md5 ospf_secret_key
        parents: interface GigabitEthernet0/1
```

## Step 5: Configure OSPF Stub Area 1 on Routers in Area 1

```yaml
# Set this on every router in area 1, including the ABR.
# inventory/host_vars/router02.yml
ospf_area1_stub: true

# inventory/host_vars/router03.yml
ospf_area1_stub: true
```

```yaml
# In the playbook:
    - name: Configure area 1 as stub
      cisco.ios.ios_ospfv2:
        config:
          processes:
            - process_id: "{{ ospf_process_id }}"
              areas:
                - area_id: "1"
                  stub:
                    set: true
        state: merged
      when: ospf_area1_stub is defined and ospf_area1_stub
```

## Step 6: Run the Full OSPF Deployment

```bash
# Dry run
ansible-playbook -i inventory/hosts.yml playbooks/configure_ospf.yml --check

# Deploy OSPF
ansible-playbook -i inventory/hosts.yml playbooks/configure_ospf.yml

# Verify
ansible-playbook -i inventory/hosts.yml playbooks/verify_ospf.yml

# Run both in sequence
ansible-playbook -i inventory/hosts.yml playbooks/configure_ospf.yml && \
ansible-playbook -i inventory/hosts.yml playbooks/verify_ospf.yml
```

## Conclusion

Ansible's `cisco.ios.ios_ospfv2` module configures OSPF in a declarative, idempotent way. Store per-router data (router ID, networks, area assignments) in inventory `host_vars`, and share common settings (process ID, authentication) in group `vars`. Run the configuration playbook followed by the verification playbook to confirm adjacencies are established. The `state: merged` mode only makes changes where needed, making the playbook safe to run repeatedly.
