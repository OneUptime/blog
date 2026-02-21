# How to Use Ansible to Configure Logging on Network Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Syslog, Logging, Network Monitoring

Description: Automate syslog and logging configuration on network devices with Ansible to ensure consistent log collection across your entire infrastructure.

---

Logging is the foundation of network observability. When something breaks, logs are the first place you look. When you need to prove compliance, logs are your evidence. When you want to detect security incidents, logs are your signal. But logging is only useful if every device is configured to send logs to the right place, at the right severity level, with the right format.

Ansible makes it simple to deploy logging configuration uniformly across your network. This post covers syslog server setup, severity levels, buffer configuration, and timestamp formatting.

## Logging Configuration Variables

Start by defining your logging standards in group variables.

```yaml
# group_vars/all_network/logging.yml - Centralized logging configuration
---
logging_config:
  # Syslog servers
  servers:
    - address: 10.10.1.50
      severity: informational
      transport: udp
      port: 514
    - address: 10.10.1.51
      severity: informational
      transport: tcp
      port: 514

  # Local buffer settings
  buffer_size: 65536
  buffer_severity: debugging

  # Console and monitor logging
  console_severity: critical
  monitor_severity: warnings

  # Timestamp format
  timestamp_format: datetime_msec
  timestamp_localtime: true
  show_timezone: true

  # Facility
  facility: local6

  # Source interface for syslog packets
  source_interface: Loopback0

  # Rate limiting
  rate_limit: true
  rate_limit_except_severity: critical

  # Log discriminators (filter noise)
  suppress_messages:
    - "%SYS-5-CONFIG_I"
    - "%LINEPROTO-5-UPDOWN"
```

## Basic Syslog Configuration

Deploy the core logging settings to all network devices.

```yaml
# deploy_logging.yml - Configure syslog on all network devices
---
- name: Deploy logging configuration
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    # Enable timestamp on log messages
    - name: Configure log timestamps
      cisco.ios.ios_config:
        lines:
          - service timestamps log datetime msec localtime show-timezone
          - service timestamps debug datetime msec localtime show-timezone

    # Set logging buffer
    - name: Configure local log buffer
      cisco.ios.ios_config:
        lines:
          - "logging buffered {{ logging_config.buffer_size }} {{ logging_config.buffer_severity }}"

    # Set console logging severity (keep it minimal)
    - name: Configure console logging
      cisco.ios.ios_config:
        lines:
          - "logging console {{ logging_config.console_severity }}"

    # Set monitor (terminal) logging
    - name: Configure monitor logging
      cisco.ios.ios_config:
        lines:
          - "logging monitor {{ logging_config.monitor_severity }}"

    # Set the syslog facility
    - name: Configure syslog facility
      cisco.ios.ios_config:
        lines:
          - "logging facility {{ logging_config.facility }}"

    # Set source interface for syslog traffic
    - name: Configure syslog source interface
      cisco.ios.ios_config:
        lines:
          - "logging source-interface {{ logging_config.source_interface }}"

    # Configure syslog servers
    - name: Configure syslog servers
      cisco.ios.ios_config:
        lines:
          - "logging host {{ item.address }} transport {{ item.transport }} port {{ item.port }}"
      loop: "{{ logging_config.servers }}"

    # Set trap level for remote syslog
    - name: Configure syslog trap level
      cisco.ios.ios_config:
        lines:
          - "logging trap {{ logging_config.servers[0].severity }}"

    # Enable logging origin-id to identify source device
    - name: Configure logging origin-id
      cisco.ios.ios_config:
        lines:
          - logging origin-id hostname

    # Enable sequence numbers for log ordering
    - name: Enable log sequence numbers
      cisco.ios.ios_config:
        lines:
          - service sequence-numbers
```

## Rate Limiting Configuration

On busy networks, rate limiting prevents log storms from overwhelming your syslog server.

```yaml
# configure_rate_limit.yml - Set up log rate limiting
---
- name: Configure logging rate limits
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    # Enable rate limiting with exception for critical messages
    - name: Configure rate limiting
      cisco.ios.ios_config:
        lines:
          - logging rate-limit console 10
          - logging rate-limit all 100 except critical
      when: logging_config.rate_limit

    # Configure log discriminators to suppress noisy messages
    - name: Create log discriminator for noisy messages
      cisco.ios.ios_config:
        lines:
          - "logging discriminator SUPPRESS_NOISE mnemonics drops CONFIG_I,UPDOWN"

    # Apply discriminator to syslog hosts
    - name: Apply discriminator to syslog servers
      cisco.ios.ios_config:
        lines:
          - "logging host {{ item.address }} discriminator SUPPRESS_NOISE"
      loop: "{{ logging_config.servers }}"
```

## Platform-Specific Logging (NX-OS and EOS)

Different platforms have different logging syntax. Handle multi-vendor environments with conditional tasks.

```yaml
# multi_platform_logging.yml - Deploy logging across multiple platforms
---
- name: Configure logging on Cisco IOS
  hosts: ios_devices
  gather_facts: false
  connection: network_cli

  tasks:
    - name: IOS syslog configuration
      cisco.ios.ios_config:
        lines:
          - service timestamps log datetime msec localtime show-timezone
          - logging buffered {{ logging_config.buffer_size }} {{ logging_config.buffer_severity }}
          - "logging host {{ item.address }}"
          - "logging trap {{ item.severity }}"
          - "logging source-interface {{ logging_config.source_interface }}"
      loop: "{{ logging_config.servers }}"

- name: Configure logging on Cisco NX-OS
  hosts: nxos_devices
  gather_facts: false
  connection: network_cli

  tasks:
    - name: NX-OS syslog configuration
      cisco.nxos.nxos_config:
        lines:
          - "logging server {{ item.address }} {{ item.severity | default('6') }} use-vrf management"
          - logging timestamp milliseconds
          - "logging source-interface {{ logging_config.source_interface }}"
          - "logging level local6 {{ logging_config.buffer_severity }}"
      loop: "{{ logging_config.servers }}"

- name: Configure logging on Arista EOS
  hosts: eos_devices
  gather_facts: false
  connection: network_cli

  tasks:
    - name: EOS syslog configuration
      arista.eos.eos_config:
        lines:
          - "logging host {{ item.address }}"
          - "logging trap {{ item.severity }}"
          - "logging buffered {{ logging_config.buffer_size }}"
          - "logging source-interface {{ logging_config.source_interface }}"
          - logging format timestamp traditional timezone
      loop: "{{ logging_config.servers }}"
```

## Logging Archive Configuration

For devices that support it, configure log archival to persistent storage.

```yaml
# configure_log_archive.yml - Set up local log archiving on devices
---
- name: Configure logging archive
  hosts: ios_devices
  gather_facts: false
  connection: network_cli

  tasks:
    # Configure archive logging on IOS-XE
    - name: Configure logging archive
      cisco.ios.ios_config:
        lines:
          - logging enable
          - logging size 500
          - hidekeys
          - notify syslog contenttype plaintext
        parents: archive log config

    # Configure logging persistent storage
    - name: Configure persistent logging
      cisco.ios.ios_config:
        lines:
          - "logging persistent url flash:/syslogs size 1048576 filesize 262144"
      ignore_errors: true
```

## Logging Verification Playbook

After deploying logging, verify it is working.

```yaml
# verify_logging.yml - Validate logging configuration and functionality
---
- name: Verify logging configuration
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    # Check logging status
    - name: Get logging configuration
      cisco.ios.ios_command:
        commands:
          - show logging
      register: logging_status

    - name: Display logging status
      ansible.builtin.debug:
        var: logging_status.stdout_lines[0]

    # Verify syslog servers are configured
    - name: Check for syslog server configuration
      ansible.builtin.assert:
        that:
          - "item.address in logging_status.stdout[0]"
        fail_msg: "Syslog server {{ item.address }} not configured on {{ inventory_hostname }}"
        success_msg: "Syslog server {{ item.address }} is configured"
      loop: "{{ logging_config.servers }}"

    # Verify buffer is set correctly
    - name: Check buffer configuration
      ansible.builtin.assert:
        that:
          - "'Buffer logging' in logging_status.stdout[0]"
        fail_msg: "Logging buffer not configured on {{ inventory_hostname }}"
        success_msg: "Logging buffer is configured"

    # Generate a test log message
    - name: Send test log message
      cisco.ios.ios_command:
        commands:
          - "send log Ansible logging verification test from {{ inventory_hostname }}"
      ignore_errors: true

    # Check the local log buffer for recent messages
    - name: Check local log buffer
      cisco.ios.ios_command:
        commands:
          - "show logging | tail 20"
      register: recent_logs

    - name: Display recent logs
      ansible.builtin.debug:
        var: recent_logs.stdout_lines[0]
```

## Logging Compliance Audit

Check that all devices meet your logging standards.

```yaml
# audit_logging.yml - Audit logging configuration compliance
---
- name: Audit logging compliance
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Get running config logging section
      cisco.ios.ios_command:
        commands:
          - show running-config | include logging|timestamps
      register: log_config

    - name: Store config
      ansible.builtin.set_fact:
        log_cfg: "{{ log_config.stdout[0] }}"

    # Build compliance report
    - name: Check logging compliance
      ansible.builtin.set_fact:
        logging_compliance:
          hostname: "{{ inventory_hostname }}"
          timestamp_format: "{{ 'service timestamps log datetime msec' in log_cfg }}"
          buffer_configured: "{{ 'logging buffered' in log_cfg }}"
          syslog_server_1: "{{ logging_config.servers[0].address in log_cfg }}"
          syslog_server_2: "{{ logging_config.servers[1].address in log_cfg }}"
          source_interface: "{{ 'logging source-interface' in log_cfg }}"
          origin_id: "{{ 'logging origin-id' in log_cfg }}"

    - name: Calculate compliance score
      ansible.builtin.set_fact:
        log_score: "{{ ((logging_compliance.values() | select('equalto', true) | list | length - 1) / (logging_compliance | length - 1) * 100) | round(0) }}"

    - name: Report logging compliance
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: Logging compliance {{ log_score }}%"

    - name: Save compliance report
      ansible.builtin.copy:
        content: "{{ logging_compliance | to_nice_json }}"
        dest: "reports/logging/{{ inventory_hostname }}.json"
      delegate_to: localhost
```

Consistent logging across your network is one of those things that pays dividends during every outage, every security investigation, and every compliance audit. Ansible lets you define your logging standards once and deploy them everywhere. When your syslog server IP changes or you need to adjust severity levels, it is a variable change and a playbook run instead of a hundred manual changes.
