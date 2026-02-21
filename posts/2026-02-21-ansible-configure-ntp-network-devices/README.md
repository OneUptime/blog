# How to Use Ansible to Configure NTP on Network Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, NTP, Network Automation, Time Synchronization

Description: Automate NTP configuration on network devices with Ansible to ensure consistent time synchronization across your entire infrastructure.

---

Accurate time is one of those things you do not think about until it goes wrong. When your router logs show events at the wrong time, correlating incidents across devices becomes a nightmare. When certificate validation fails because a device clock drifted, you spend hours chasing ghosts. NTP (Network Time Protocol) keeps all your devices in sync, and configuring it consistently across every router and switch is a perfect job for Ansible.

This post shows you how to deploy NTP configuration across your network devices, handle authentication, and verify that time synchronization is working.

## Why NTP Consistency Matters

Every network device needs accurate time for:

- **Log correlation** - When troubleshooting, you need events from different devices to line up chronologically.
- **Certificate validation** - TLS certificates have validity windows that depend on accurate clocks.
- **SNMP trap timestamps** - Your monitoring system needs accurate timestamps on alerts.
- **Authentication protocols** - Kerberos and some RADIUS configurations are time-sensitive.
- **Compliance** - Many regulatory frameworks require accurate, synchronized logging.

## NTP Variables

Define your NTP infrastructure in group variables so every device uses the same time sources.

```yaml
# group_vars/all_network.yml - Shared NTP configuration
---
ntp_config:
  # Primary and backup NTP servers
  servers:
    - address: 10.10.1.10
      prefer: true
      key_id: 1
    - address: 10.10.1.11
      key_id: 1
    - address: 10.10.2.10
      key_id: 1

  # NTP authentication key
  authentication:
    enabled: true
    keys:
      - id: 1
        algorithm: md5
        password: "{{ vault_ntp_key }}"
    trusted_keys:
      - 1

  # Timezone
  timezone: EST
  timezone_offset: -5

  # NTP access control
  acl_name: NTP_PEER_ACCESS
  allowed_sources:
    - "10.10.1.0 0.0.0.255"
    - "10.10.2.0 0.0.0.255"

  # Source interface for NTP packets
  source_interface: Loopback0
```

## Basic NTP Configuration

Start with a straightforward NTP deployment using `ios_ntp_global`.

```yaml
# deploy_ntp.yml - Configure NTP on all network devices
---
- name: Deploy NTP configuration
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Configure NTP global settings
      cisco.ios.ios_ntp_global:
        config:
          authenticate: true
          authentication_keys:
            - id: 1
              algorithm: md5
              key: "{{ vault_ntp_key }}"
          trusted_keys:
            - range_start: 1
          servers:
            - server: "{{ ntp_config.servers[0].address }}"
              key_id: 1
              prefer: true
            - server: "{{ ntp_config.servers[1].address }}"
              key_id: 1
            - server: "{{ ntp_config.servers[2].address }}"
              key_id: 1
          source: "{{ ntp_config.source_interface }}"
        state: merged
      register: ntp_result

    - name: Show NTP changes
      ansible.builtin.debug:
        var: ntp_result.commands
      when: ntp_result.changed
```

## Full NTP Configuration with ios_config

When you need more control over NTP settings that the resource module does not cover, use `ios_config`.

```yaml
# deploy_ntp_full.yml - Complete NTP configuration with all options
---
- name: Deploy complete NTP configuration
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    # Set the timezone
    - name: Configure timezone
      cisco.ios.ios_config:
        lines:
          - "clock timezone {{ ntp_config.timezone }} {{ ntp_config.timezone_offset }}"

    # Configure NTP authentication
    - name: Enable NTP authentication
      cisco.ios.ios_config:
        lines:
          - ntp authenticate
          - "ntp authentication-key {{ item.id }} md5 {{ item.password }}"
          - "ntp trusted-key {{ item.id }}"
      loop: "{{ ntp_config.authentication.keys }}"
      no_log: true

    # Configure NTP servers with authentication and preference
    - name: Configure NTP servers
      cisco.ios.ios_config:
        lines:
          - "ntp server {{ item.address }} key {{ item.key_id }}{{ ' prefer' if item.prefer | default(false) else '' }}"
      loop: "{{ ntp_config.servers }}"

    # Set the source interface for NTP
    - name: Set NTP source interface
      cisco.ios.ios_config:
        lines:
          - "ntp source {{ ntp_config.source_interface }}"

    # Create NTP access list
    - name: Create NTP access control list
      cisco.ios.ios_config:
        lines:
          - "permit {{ item }}"
        parents: "ip access-list standard {{ ntp_config.acl_name }}"
      loop: "{{ ntp_config.allowed_sources }}"

    # Apply NTP access group
    - name: Apply NTP access group
      cisco.ios.ios_config:
        lines:
          - "ntp access-group serve-only {{ ntp_config.acl_name }}"

    # Enable NTP logging
    - name: Enable NTP logging
      cisco.ios.ios_config:
        lines:
          - service timestamps log datetime msec localtime show-timezone
          - service timestamps debug datetime msec localtime show-timezone
```

## NTP on Different Platforms

If you manage a multi-vendor network, the NTP configuration varies slightly per platform but the variables can be shared.

```yaml
# multi_platform_ntp.yml - Deploy NTP across Cisco IOS, NX-OS, and Arista EOS
---
- name: Configure NTP on Cisco IOS devices
  hosts: ios_devices
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Set NTP on IOS
      cisco.ios.ios_ntp_global:
        config:
          servers:
            - server: "{{ item.address }}"
              prefer: "{{ item.prefer | default(false) }}"
        state: merged
      loop: "{{ ntp_config.servers }}"

- name: Configure NTP on Cisco NX-OS devices
  hosts: nxos_devices
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Set NTP on NX-OS
      cisco.nxos.nxos_ntp_global:
        config:
          servers:
            - server: "{{ item.address }}"
              prefer: "{{ item.prefer | default(omit) }}"
        state: merged
      loop: "{{ ntp_config.servers }}"

- name: Configure NTP on Arista EOS devices
  hosts: eos_devices
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Set NTP on EOS
      arista.eos.eos_ntp_global:
        config:
          servers:
            - server: "{{ item.address }}"
              prefer: "{{ item.prefer | default(false) }}"
        state: merged
      loop: "{{ ntp_config.servers }}"
```

## NTP Verification Playbook

After deploying NTP, verify that devices are syncing correctly.

```yaml
# verify_ntp.yml - Check NTP synchronization status on all devices
---
- name: Verify NTP synchronization
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Check NTP associations
      cisco.ios.ios_command:
        commands:
          - show ntp associations
      register: ntp_assoc

    - name: Display NTP associations
      ansible.builtin.debug:
        var: ntp_assoc.stdout_lines[0]

    - name: Check NTP status
      cisco.ios.ios_command:
        commands:
          - show ntp status
      register: ntp_status

    - name: Display NTP status
      ansible.builtin.debug:
        var: ntp_status.stdout_lines[0]

    # Verify the clock is synchronized
    - name: Verify NTP is synchronized
      ansible.builtin.assert:
        that:
          - "'synchronized' in ntp_status.stdout[0] | lower"
        fail_msg: "NTP is NOT synchronized on {{ inventory_hostname }}!"
        success_msg: "NTP is synchronized on {{ inventory_hostname }}"

    # Check current device time
    - name: Check device clock
      cisco.ios.ios_command:
        commands:
          - show clock
      register: device_clock

    - name: Display device time
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: {{ device_clock.stdout[0] }}"
```

## NTP Drift Monitoring

For ongoing monitoring, you can periodically check NTP offset across all devices and flag any that have drifted too far.

```yaml
# monitor_ntp_drift.yml - Check for NTP clock drift across the network
---
- name: Monitor NTP drift
  hosts: all_network
  gather_facts: false
  connection: network_cli

  vars:
    max_offset_ms: 100

  tasks:
    - name: Get NTP associations detail
      cisco.ios.ios_command:
        commands:
          - show ntp associations detail
      register: ntp_detail

    # Parse the offset value from NTP associations
    - name: Extract NTP offset
      ansible.builtin.set_fact:
        ntp_offset: "{{ ntp_detail.stdout[0] | regex_search('offset\\s+([\\d.-]+)', '\\1') | first | default('unknown') }}"

    - name: Report devices with excessive drift
      ansible.builtin.debug:
        msg: "ALERT: {{ inventory_hostname }} has NTP offset of {{ ntp_offset }}ms (threshold: {{ max_offset_ms }}ms)"
      when:
        - ntp_offset != 'unknown'
        - ntp_offset | float | abs > max_offset_ms | float

    # Generate drift report
    - name: Build drift report
      ansible.builtin.set_fact:
        drift_entry:
          hostname: "{{ inventory_hostname }}"
          offset_ms: "{{ ntp_offset }}"
          status: "{{ 'OK' if (ntp_offset | float | abs <= max_offset_ms | float) else 'DRIFT' }}"

    - name: Save drift report
      ansible.builtin.copy:
        content: "{{ hostvars | dict2items | map(attribute='value.drift_entry') | select('defined') | list | to_nice_json }}"
        dest: "reports/ntp_drift_report.json"
      delegate_to: localhost
      run_once: true
```

## Removing Old NTP Servers

When migrating to new NTP infrastructure, clean up the old server references.

```yaml
# migrate_ntp.yml - Replace old NTP servers with new ones
---
- name: Migrate NTP servers
  hosts: all_network
  gather_facts: false
  connection: network_cli

  vars:
    old_ntp_servers:
      - 10.10.100.1
      - 10.10.100.2

  tasks:
    # Remove old NTP servers
    - name: Remove old NTP servers
      cisco.ios.ios_config:
        lines:
          - "no ntp server {{ item }}"
      loop: "{{ old_ntp_servers }}"

    # Configure new NTP servers
    - name: Add new NTP servers
      cisco.ios.ios_config:
        lines:
          - "ntp server {{ item.address }} key {{ item.key_id }}{{ ' prefer' if item.prefer | default(false) else '' }}"
      loop: "{{ ntp_config.servers }}"

    # Verify synchronization after migration
    - name: Wait for NTP to synchronize
      cisco.ios.ios_command:
        commands:
          - show ntp status
      register: sync_check
      until: "'synchronized' in sync_check.stdout[0] | lower"
      retries: 12
      delay: 30
```

NTP configuration is one of those foundational tasks that should be automated from day one. Every device in your network needs the same time servers, the same authentication keys, and the same timezone settings. Ansible makes this trivially easy to deploy and equally easy to verify. Set it up once, validate it regularly, and never debug a timestamp problem again.
