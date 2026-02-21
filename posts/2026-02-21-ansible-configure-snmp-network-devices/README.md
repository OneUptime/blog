# How to Use Ansible to Configure SNMP on Network Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SNMP, Monitoring, Network Automation

Description: Automate SNMP configuration across network devices with Ansible, covering SNMPv2c communities, SNMPv3 users, trap destinations, and security hardening.

---

SNMP is how monitoring systems talk to network devices. Without it, your NMS is blind. Configuring SNMP on every router and switch in your network is one of those tasks that is easy on one device and tedious on a hundred. It is also security-sensitive, because SNMP community strings are basically passwords, and SNMPv2c sends them in clear text.

Ansible lets you deploy SNMP configuration consistently, rotate community strings easily, and enforce SNMPv3 across your entire network. This post covers the practical side of SNMP automation.

## SNMP Configuration Variables

Start by defining your SNMP configuration in group variables. This keeps the data in one place and makes it easy to update across all devices.

```yaml
# group_vars/all_network.yml - Shared SNMP configuration
---
snmp_config:
  # SNMPv2c communities (for legacy monitoring tools)
  communities:
    - name: "{{ vault_snmp_ro_community }}"
      type: ro
      acl: SNMP_ACCESS
    - name: "{{ vault_snmp_rw_community }}"
      type: rw
      acl: SNMP_ACCESS

  # SNMPv3 users (preferred for security)
  v3_users:
    - name: monitoring_user
      group: MONITOR_GROUP
      auth_protocol: sha
      auth_password: "{{ vault_snmpv3_auth_pass }}"
      priv_protocol: aes128
      priv_password: "{{ vault_snmpv3_priv_pass }}"

  # Trap destinations
  trap_hosts:
    - host: 10.10.1.50
      version: "2c"
      community: "{{ vault_snmp_trap_community }}"
    - host: 10.10.1.51
      version: "3"
      user: monitoring_user
      security_level: priv

  # Contact and location
  contact: "noc@company.com"
  location_prefix: "DC1"

  # Allowed SNMP source networks
  allowed_sources:
    - "10.10.0.0 0.0.255.255"
    - "10.20.1.0 0.0.0.255"

  # Traps to enable
  enabled_traps:
    - snmp authentication linkdown linkup coldstart
    - config
    - ospf
    - bgp
    - syslog
    - envmon
```

## Deploying SNMPv2c Configuration

Let me start with the basic SNMPv2c setup that most environments use with their monitoring platforms.

```yaml
# deploy_snmpv2.yml - Configure SNMPv2c on all network devices
---
- name: Deploy SNMP configuration
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    # Create ACL to restrict SNMP access to monitoring servers only
    - name: Configure SNMP access ACL
      cisco.ios.ios_config:
        lines:
          - "permit {{ item }}"
        parents: ip access-list standard SNMP_ACCESS
      loop: "{{ snmp_config.allowed_sources }}"

    # Add deny any at the end of the ACL
    - name: Add implicit deny to SNMP ACL
      cisco.ios.ios_config:
        lines:
          - deny any log
        parents: ip access-list standard SNMP_ACCESS

    # Configure SNMP contact and location
    - name: Set SNMP contact
      cisco.ios.ios_config:
        lines:
          - "snmp-server contact {{ snmp_config.contact }}"
          - "snmp-server location {{ snmp_config.location_prefix }}-{{ inventory_hostname }}"

    # Configure SNMP communities with ACL restriction
    - name: Configure SNMP communities
      cisco.ios.ios_config:
        lines:
          - "snmp-server community {{ item.name }} {{ item.type }} {{ item.acl }}"
      loop: "{{ snmp_config.communities }}"
      no_log: true

    # Configure trap destinations
    - name: Configure SNMP trap hosts
      cisco.ios.ios_config:
        lines:
          - "snmp-server host {{ item.host }} version {{ item.version }} {{ item.community }}"
      loop: "{{ snmp_config.trap_hosts | selectattr('version', 'equalto', '2c') | list }}"
      no_log: true

    # Enable SNMP traps
    - name: Enable SNMP traps
      cisco.ios.ios_config:
        lines:
          - "snmp-server enable traps {{ item }}"
      loop: "{{ snmp_config.enabled_traps }}"
```

## Deploying SNMPv3 Configuration

SNMPv3 provides authentication and encryption, making it the right choice for security-conscious environments.

```yaml
# deploy_snmpv3.yml - Configure SNMPv3 with auth and encryption
---
- name: Deploy SNMPv3 configuration
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    # Create SNMPv3 group with read-only access
    - name: Configure SNMPv3 group
      cisco.ios.ios_config:
        lines:
          - snmp-server group MONITOR_GROUP v3 priv read SNMP_READ_VIEW

    # Create SNMPv3 view to limit what can be queried
    - name: Configure SNMPv3 view
      cisco.ios.ios_config:
        lines:
          # Allow read access to the full MIB tree
          - snmp-server view SNMP_READ_VIEW iso included
          # But exclude sensitive config areas
          - snmp-server view SNMP_READ_VIEW ciscoMgmt.47 excluded

    # Create SNMPv3 user with SHA auth and AES encryption
    - name: Configure SNMPv3 users
      cisco.ios.ios_config:
        lines:
          - "snmp-server user {{ item.name }} {{ item.group }} v3 auth {{ item.auth_protocol }} {{ item.auth_password }} priv {{ item.priv_protocol }} {{ item.priv_password }}"
      loop: "{{ snmp_config.v3_users }}"
      no_log: true

    # Configure SNMPv3 trap host
    - name: Configure SNMPv3 trap destinations
      cisco.ios.ios_config:
        lines:
          - "snmp-server host {{ item.host }} version 3 {{ item.security_level }} {{ item.user }}"
      loop: "{{ snmp_config.trap_hosts | selectattr('version', 'equalto', '3') | list }}"
```

## Removing Old SNMP Communities

When rotating SNMP community strings, you need to remove the old ones.

```yaml
# rotate_snmp_communities.yml - Remove old communities and set new ones
---
- name: Rotate SNMP community strings
  hosts: all_network
  gather_facts: false
  connection: network_cli

  vars:
    old_communities:
      - "old_readonly_string"
      - "old_readwrite_string"

  tasks:
    # Remove old SNMP communities
    - name: Remove old SNMP communities
      cisco.ios.ios_config:
        lines:
          - "no snmp-server community {{ item }}"
      loop: "{{ old_communities }}"
      no_log: true

    # Configure new communities
    - name: Set new SNMP communities
      cisco.ios.ios_config:
        lines:
          - "snmp-server community {{ item.name }} {{ item.type }} {{ item.acl }}"
      loop: "{{ snmp_config.communities }}"
      no_log: true

    # Update trap host configurations with new community
    - name: Update trap host community strings
      cisco.ios.ios_config:
        lines:
          - "snmp-server host {{ item.host }} version {{ item.version }} {{ item.community }}"
      loop: "{{ snmp_config.trap_hosts | selectattr('version', 'equalto', '2c') | list }}"
      no_log: true
```

## SNMP Audit Playbook

Regularly audit SNMP configuration to catch unauthorized communities or missing settings.

```yaml
# audit_snmp.yml - Audit SNMP configuration for compliance
---
- name: Audit SNMP configuration
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Get current SNMP configuration
      cisco.ios.ios_command:
        commands:
          - show running-config | section snmp
      register: snmp_running

    - name: Save SNMP config for review
      ansible.builtin.copy:
        content: "{{ snmp_running.stdout[0] }}"
        dest: "audit/{{ inventory_hostname }}_snmp.txt"
      delegate_to: localhost

    # Check for insecure default communities
    - name: Check for default community strings
      ansible.builtin.assert:
        that:
          - "'community public' not in snmp_running.stdout[0]"
          - "'community private' not in snmp_running.stdout[0]"
        fail_msg: "WARNING: Default SNMP community found on {{ inventory_hostname }}!"
        success_msg: "No default communities found"

    # Verify SNMPv3 is configured
    - name: Check for SNMPv3 users
      cisco.ios.ios_command:
        commands:
          - show snmp user
      register: snmpv3_users

    - name: Verify SNMPv3 user exists
      ansible.builtin.assert:
        that:
          - "'monitoring_user' in snmpv3_users.stdout[0]"
        fail_msg: "SNMPv3 user 'monitoring_user' not found on {{ inventory_hostname }}"
        success_msg: "SNMPv3 user confirmed"

    # Check that SNMP ACL is in place
    - name: Verify SNMP ACL exists
      cisco.ios.ios_command:
        commands:
          - show ip access-lists SNMP_ACCESS
      register: snmp_acl

    - name: Assert SNMP ACL is configured
      ansible.builtin.assert:
        that:
          - snmp_acl.stdout[0] | length > 0
        fail_msg: "SNMP access ACL is missing on {{ inventory_hostname }}"
        success_msg: "SNMP access ACL is in place"
```

## SNMP Verification

After deployment, verify that SNMP is working correctly by testing from the monitoring server.

```yaml
# verify_snmp.yml - Test SNMP connectivity after deployment
---
- name: Verify SNMP configuration
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    # Check SNMP engine status
    - name: Verify SNMP is running
      cisco.ios.ios_command:
        commands:
          - show snmp
      register: snmp_status

    - name: Display SNMP status
      ansible.builtin.debug:
        var: snmp_status.stdout_lines[0]

    # Check SNMP community list
    - name: Check configured communities
      cisco.ios.ios_command:
        commands:
          - show snmp community
      register: community_list

    # Check trap host configuration
    - name: Verify trap hosts
      cisco.ios.ios_command:
        commands:
          - show snmp host
      register: trap_hosts

    - name: Display trap host config
      ansible.builtin.debug:
        var: trap_hosts.stdout_lines[0]

    # Test SNMP from control node using snmpwalk (requires net-snmp on control node)
    - name: Test SNMPv2c connectivity
      ansible.builtin.command:
        cmd: "snmpget -v2c -c {{ vault_snmp_ro_community }} {{ ansible_host }} sysName.0"
      delegate_to: localhost
      register: snmp_test
      changed_when: false
      no_log: true

    - name: Verify SNMP response
      ansible.builtin.assert:
        that:
          - snmp_test.rc == 0
        fail_msg: "SNMP test failed for {{ inventory_hostname }}"
        success_msg: "SNMP is responding correctly on {{ inventory_hostname }}"
```

## Per-Device Location Strings

When you have devices in different locations, set the SNMP location string based on host variables.

```yaml
# host_vars/switch01.yml - Device-specific SNMP location
---
snmp_location: "Building-A Floor-3 Rack-12 U20"
```

```yaml
# set_snmp_location.yml - Apply per-device SNMP location strings
---
- name: Set SNMP location per device
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Configure device-specific SNMP location
      cisco.ios.ios_config:
        lines:
          - "snmp-server location {{ snmp_location | default(snmp_config.location_prefix ~ '-' ~ inventory_hostname) }}"
```

SNMP automation with Ansible solves the consistency problem that every network team faces. Community strings are managed through Ansible Vault so they never appear in plain text in your playbooks. ACLs are deployed uniformly to restrict SNMP access. SNMPv3 credentials are configured identically across every device. And when it is time to rotate credentials, you update the vault and run the playbook. That beats logging into a hundred devices any day.
