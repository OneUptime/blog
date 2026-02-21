# How to Use Ansible with VyOS Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, VyOS, Network Automation, Open Source Networking

Description: Automate VyOS routers and firewalls with Ansible for routing, firewall rules, VPN configuration, and network management tasks.

---

VyOS is an open-source network operating system based on Debian Linux. It provides routing, firewall, VPN, and NAT functionality in a package that can run on bare metal, virtual machines, or cloud instances. VyOS is popular in lab environments, small-to-medium businesses, and as a cost-effective alternative to commercial routers. Its configuration model is similar to JunOS with a commit-based workflow, which makes it well-suited for automation.

Ansible's `vyos.vyos` collection provides modules specifically designed for VyOS devices. This post covers the essential automation patterns for managing VyOS in production and lab environments.

## Prerequisites

```bash
# Install the VyOS collection
ansible-galaxy collection install vyos.vyos
ansible-galaxy collection install ansible.netcommon
```

```ini
# inventory/vyos-devices.ini
# VyOS device inventory
[vyos_routers]
vyos-edge-01 ansible_host=10.0.0.1
vyos-edge-02 ansible_host=10.0.0.2

[vyos_firewalls]
vyos-fw-01 ansible_host=10.0.0.10
vyos-fw-02 ansible_host=10.0.0.11

[vyos:children]
vyos_routers
vyos_firewalls

[vyos:vars]
ansible_network_os=vyos.vyos.vyos
ansible_connection=ansible.netcommon.network_cli
ansible_user=vyos
ansible_password={{ vault_vyos_password }}
```

VyOS uses SSH for management and does not require an enable password. Once connected, you have access to both operational and configuration modes.

## Gathering VyOS Facts

```yaml
# playbook-vyos-facts.yml
# Collects system and configuration facts from VyOS devices
- name: Gather VyOS facts
  hosts: vyos
  gather_facts: no

  tasks:
    - name: Collect device facts
      vyos.vyos.vyos_facts:
        gather_subset:
          - all
      register: vyos_facts

    - name: Display device information
      ansible.builtin.debug:
        msg: |
          Hostname: {{ ansible_net_hostname }}
          Version: {{ ansible_net_version }}
          Model: {{ ansible_net_model | default('Virtual') }}
          Interfaces: {{ ansible_net_interfaces | dict2items | map(attribute='key') | list }}
```

## Basic System Configuration

VyOS uses a set/delete command syntax similar to JunOS. The `vyos_config` module handles the configuration mode and commit process automatically.

```yaml
# playbook-vyos-base-config.yml
# Applies baseline system configuration to VyOS devices
- name: Configure VyOS baseline
  hosts: vyos
  gather_facts: no

  tasks:
    - name: Configure system settings
      vyos.vyos.vyos_config:
        lines:
          - set system host-name {{ inventory_hostname }}
          - set system domain-name corp.local
          - set system name-server 10.0.0.53
          - set system name-server 10.0.0.54
          - set system time-zone America/New_York

    - name: Configure NTP
      vyos.vyos.vyos_config:
        lines:
          - set system ntp server 10.0.0.50
          - set system ntp server 10.0.0.51

    - name: Configure syslog
      vyos.vyos.vyos_config:
        lines:
          - set system syslog host 10.0.100.50 facility all level info
          - set system syslog global facility all level info
          - set system syslog global facility protocols level debug

    - name: Configure SSH settings
      vyos.vyos.vyos_config:
        lines:
          - set service ssh port 22
          - set service ssh disable-password-authentication
          - set service ssh listen-address 0.0.0.0

    - name: Configure login banner
      vyos.vyos.vyos_config:
        lines:
          - set system login banner pre-login "Authorized access only. All activity is monitored."

    - name: Save configuration
      vyos.vyos.vyos_config:
        save: yes
```

The `save: yes` parameter writes the running configuration to the startup configuration file, similar to `copy running-config startup-config` on Cisco devices.

## Interface Configuration

```yaml
# playbook-vyos-interfaces.yml
# Configures network interfaces on VyOS routers
- name: Configure VyOS interfaces
  hosts: vyos_routers
  gather_facts: no

  tasks:
    - name: Configure WAN interface
      vyos.vyos.vyos_config:
        lines:
          - set interfaces ethernet eth0 address dhcp
          - set interfaces ethernet eth0 description "WAN - Internet"

    - name: Configure LAN interface
      vyos.vyos.vyos_config:
        lines:
          - set interfaces ethernet eth1 address 192.168.1.1/24
          - set interfaces ethernet eth1 description "LAN - Internal Network"

    - name: Configure DMZ interface
      vyos.vyos.vyos_config:
        lines:
          - set interfaces ethernet eth2 address 10.0.100.1/24
          - set interfaces ethernet eth2 description "DMZ - Public Services"

    - name: Configure loopback
      vyos.vyos.vyos_config:
        lines:
          - set interfaces loopback lo address {{ router_id }}/32

    - name: Configure VLAN sub-interfaces
      vyos.vyos.vyos_config:
        lines:
          - set interfaces ethernet eth1 vif 10 address 10.0.10.1/24
          - set interfaces ethernet eth1 vif 10 description "VLAN 10 - Servers"
          - set interfaces ethernet eth1 vif 20 address 10.0.20.1/24
          - set interfaces ethernet eth1 vif 20 description "VLAN 20 - Workstations"
          - set interfaces ethernet eth1 vif 30 address 10.0.30.1/24
          - set interfaces ethernet eth1 vif 30 description "VLAN 30 - Voice"

    - name: Save configuration
      vyos.vyos.vyos_config:
        save: yes
```

## Firewall Configuration

VyOS firewall rules are one of its strongest features. The zone-based firewall model provides clear security boundaries:

```yaml
# playbook-vyos-firewall.yml
# Configures zone-based firewall on VyOS
- name: Configure VyOS firewall
  hosts: vyos_firewalls
  gather_facts: no

  tasks:
    - name: Define firewall zones
      vyos.vyos.vyos_config:
        lines:
          - set zone-policy zone WAN interface eth0
          - set zone-policy zone WAN default-action drop

          - set zone-policy zone LAN interface eth1
          - set zone-policy zone LAN default-action drop

          - set zone-policy zone DMZ interface eth2
          - set zone-policy zone DMZ default-action drop

          - set zone-policy zone LOCAL local-zone

    - name: Create firewall ruleset - WAN to LAN
      vyos.vyos.vyos_config:
        lines:
          - set firewall name WAN-TO-LAN default-action drop

          - set firewall name WAN-TO-LAN rule 10 action accept
          - set firewall name WAN-TO-LAN rule 10 state established enable
          - set firewall name WAN-TO-LAN rule 10 state related enable
          - set firewall name WAN-TO-LAN rule 10 description "Allow established connections"

    - name: Create firewall ruleset - LAN to WAN
      vyos.vyos.vyos_config:
        lines:
          - set firewall name LAN-TO-WAN default-action accept

          - set firewall name LAN-TO-WAN rule 10 action drop
          - set firewall name LAN-TO-WAN rule 10 description "Block outbound SMTP from workstations"
          - set firewall name LAN-TO-WAN rule 10 protocol tcp
          - set firewall name LAN-TO-WAN rule 10 destination port 25

    - name: Create firewall ruleset - WAN to DMZ
      vyos.vyos.vyos_config:
        lines:
          - set firewall name WAN-TO-DMZ default-action drop

          - set firewall name WAN-TO-DMZ rule 10 action accept
          - set firewall name WAN-TO-DMZ rule 10 description "Allow HTTP to DMZ"
          - set firewall name WAN-TO-DMZ rule 10 protocol tcp
          - set firewall name WAN-TO-DMZ rule 10 destination port 80

          - set firewall name WAN-TO-DMZ rule 20 action accept
          - set firewall name WAN-TO-DMZ rule 20 description "Allow HTTPS to DMZ"
          - set firewall name WAN-TO-DMZ rule 20 protocol tcp
          - set firewall name WAN-TO-DMZ rule 20 destination port 443

          - set firewall name WAN-TO-DMZ rule 30 action accept
          - set firewall name WAN-TO-DMZ rule 30 state established enable
          - set firewall name WAN-TO-DMZ rule 30 state related enable

    - name: Apply firewall rulesets to zones
      vyos.vyos.vyos_config:
        lines:
          - set zone-policy zone LAN from WAN firewall name WAN-TO-LAN
          - set zone-policy zone WAN from LAN firewall name LAN-TO-WAN
          - set zone-policy zone DMZ from WAN firewall name WAN-TO-DMZ

    - name: Save configuration
      vyos.vyos.vyos_config:
        save: yes
```

## NAT Configuration

```yaml
# playbook-vyos-nat.yml
# Configures source and destination NAT on VyOS
- name: Configure NAT
  hosts: vyos_firewalls
  gather_facts: no

  tasks:
    - name: Configure source NAT (masquerade) for outbound traffic
      vyos.vyos.vyos_config:
        lines:
          - set nat source rule 100 outbound-interface eth0
          - set nat source rule 100 source address 192.168.1.0/24
          - set nat source rule 100 translation address masquerade
          - set nat source rule 100 description "LAN to Internet"

          - set nat source rule 110 outbound-interface eth0
          - set nat source rule 110 source address 10.0.100.0/24
          - set nat source rule 110 translation address masquerade
          - set nat source rule 110 description "DMZ to Internet"

    - name: Configure destination NAT (port forwarding)
      vyos.vyos.vyos_config:
        lines:
          - set nat destination rule 10 inbound-interface eth0
          - set nat destination rule 10 protocol tcp
          - set nat destination rule 10 destination port 80
          - set nat destination rule 10 translation address 10.0.100.10
          - set nat destination rule 10 description "HTTP to web server"

          - set nat destination rule 20 inbound-interface eth0
          - set nat destination rule 20 protocol tcp
          - set nat destination rule 20 destination port 443
          - set nat destination rule 20 translation address 10.0.100.10
          - set nat destination rule 20 description "HTTPS to web server"

    - name: Save configuration
      vyos.vyos.vyos_config:
        save: yes
```

## VPN Configuration

VyOS supports both IPsec site-to-site and OpenVPN:

```yaml
# playbook-vyos-vpn.yml
# Configures IPsec site-to-site VPN on VyOS
- name: Configure site-to-site VPN
  hosts: vyos_edge-01
  gather_facts: no

  vars:
    remote_peer: 203.0.113.1
    local_subnet: 192.168.1.0/24
    remote_subnet: 192.168.2.0/24
    psk: "{{ vault_vpn_psk }}"

  tasks:
    - name: Configure IKE group
      vyos.vyos.vyos_config:
        lines:
          - set vpn ipsec ike-group IKE-BRANCH proposal 1 encryption aes256
          - set vpn ipsec ike-group IKE-BRANCH proposal 1 hash sha256
          - set vpn ipsec ike-group IKE-BRANCH proposal 1 dh-group 14
          - set vpn ipsec ike-group IKE-BRANCH lifetime 28800
          - set vpn ipsec ike-group IKE-BRANCH dead-peer-detection action restart
          - set vpn ipsec ike-group IKE-BRANCH dead-peer-detection interval 30

    - name: Configure ESP group
      vyos.vyos.vyos_config:
        lines:
          - set vpn ipsec esp-group ESP-BRANCH proposal 1 encryption aes256
          - set vpn ipsec esp-group ESP-BRANCH proposal 1 hash sha256
          - set vpn ipsec esp-group ESP-BRANCH lifetime 3600
          - set vpn ipsec esp-group ESP-BRANCH pfs dh-group14

    - name: Configure IPsec tunnel
      vyos.vyos.vyos_config:
        lines:
          - set vpn ipsec site-to-site peer {{ remote_peer }} authentication mode pre-shared-secret
          - set vpn ipsec site-to-site peer {{ remote_peer }} authentication pre-shared-secret {{ psk }}
          - set vpn ipsec site-to-site peer {{ remote_peer }} ike-group IKE-BRANCH
          - set vpn ipsec site-to-site peer {{ remote_peer }} local-address any
          - set vpn ipsec site-to-site peer {{ remote_peer }} tunnel 0 esp-group ESP-BRANCH
          - set vpn ipsec site-to-site peer {{ remote_peer }} tunnel 0 local prefix {{ local_subnet }}
          - set vpn ipsec site-to-site peer {{ remote_peer }} tunnel 0 remote prefix {{ remote_subnet }}

    - name: Enable IPsec interface
      vyos.vyos.vyos_config:
        lines:
          - set vpn ipsec ipsec-interfaces interface eth0

    - name: Save configuration
      vyos.vyos.vyos_config:
        save: yes
```

## OSPF Routing

```yaml
# playbook-vyos-ospf.yml
# Configures OSPF routing on VyOS
- name: Configure OSPF
  hosts: vyos_routers
  gather_facts: no

  tasks:
    - name: Configure OSPF process
      vyos.vyos.vyos_config:
        lines:
          - set protocols ospf parameters router-id {{ router_id }}
          - set protocols ospf area 0 network 10.0.0.0/24
          - set protocols ospf area 0 network 192.168.1.0/24
          - set protocols ospf redistribute connected
          - set protocols ospf redistribute static
          - set protocols ospf passive-interface eth1
          - set protocols ospf log-adjacency-changes

    - name: Save configuration
      vyos.vyos.vyos_config:
        save: yes
```

## Configuration Backup and Operational Commands

```yaml
# playbook-vyos-backup.yml
# Backs up VyOS configurations and runs operational commands
- name: Backup and verify VyOS
  hosts: vyos
  gather_facts: no

  tasks:
    - name: Backup running configuration
      vyos.vyos.vyos_config:
        backup: yes
        backup_options:
          dir_path: "./backups/vyos/"
          filename: "{{ inventory_hostname }}-{{ lookup('pipe', 'date +%Y%m%d') }}.conf"

    - name: Run operational verification commands
      vyos.vyos.vyos_command:
        commands:
          - show interfaces
          - show ip route
          - show firewall
          - show vpn ipsec sa
          - show log tail 20
      register: op_data

    - name: Display interface status
      ansible.builtin.debug:
        msg: "{{ op_data.stdout[0] }}"

    - name: Display routing table
      ansible.builtin.debug:
        msg: "{{ op_data.stdout[1] }}"
```

## Tips for VyOS Automation

**VyOS uses a commit model.** Like JunOS, changes are staged and committed. The `vyos_config` module handles this automatically, committing after each task. For atomicity, group related changes in a single task.

**Always save after critical changes.** Use `save: yes` to persist changes to the startup configuration. Without this, changes are lost on reboot.

**VyOS runs on Linux.** You can access the underlying Debian system with the `sudo su` command from the VyOS shell. This is useful for advanced troubleshooting but should not be used for configuration changes.

**Version differences matter.** VyOS has several branches (legacy 1.2.x, current 1.3.x, rolling). Configuration syntax can differ between versions. Test your playbooks against the specific version you are running.

**VyOS is great for labs.** Because it runs as a VM, VyOS is perfect for building network automation lab environments. You can spin up complex topologies with multiple VyOS instances for testing playbooks before applying them to production equipment.

VyOS offers enterprise-grade routing and firewall features in an open-source package, and its commit-based configuration model works naturally with Ansible. Whether you are using it in production or as a lab environment for network automation development, the `vyos.vyos` collection gives you everything you need for comprehensive management.
