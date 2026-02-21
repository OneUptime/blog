# How to Use Ansible to Restore Network Device Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Disaster Recovery, Network Automation, Configuration Management

Description: Learn how to restore network device configurations from backups using Ansible, including full restores, partial restores, and rollback strategies.

---

Having backups is only half the equation. The other half is being able to restore them quickly and reliably when things go sideways. A bad configuration change during a maintenance window, a firmware upgrade that wipes the config, or a hardware replacement that needs the old config loaded onto a new chassis. These are all scenarios where fast, automated restoration saves your weekend.

This post covers the different approaches to restoring network device configurations with Ansible, from full config replacement to selective section restores.

## Full Configuration Restore

The most straightforward restore replaces the entire running configuration with a backup file. On Cisco IOS, you use `ios_config` with the `src` parameter.

```yaml
# full_restore.yml - Replace running config with a backup file
---
- name: Full configuration restore
  hosts: target_device
  gather_facts: false
  connection: network_cli

  vars:
    backup_file: "backups/router01/router01_20260220.cfg"

  tasks:
    # Always take a backup before restoring, just in case
    - name: Backup current config before restore
      cisco.ios.ios_config:
        backup: true
        backup_options:
          dir_path: "backups/pre-restore"
          filename: "{{ inventory_hostname }}_pre_restore.cfg"

    # Push the backup configuration to the device
    - name: Restore configuration from backup
      cisco.ios.ios_config:
        src: "{{ backup_file }}"
        replace: config
      register: restore_result

    - name: Display restore results
      ansible.builtin.debug:
        msg: "Restore completed. Commands sent: {{ restore_result.commands | length }}"

    # Save the restored config to startup
    - name: Save configuration
      cisco.ios.ios_command:
        commands:
          - write memory
```

## Using configure replace

Cisco IOS supports `configure replace`, which is a more surgical approach. It compares the target config against the running config and makes only the necessary changes. This is safer than loading a full config because it handles deletions properly.

```yaml
# configure_replace.yml - Use IOS configure replace for clean restoration
---
- name: Restore with configure replace
  hosts: target_device
  gather_facts: false
  connection: network_cli

  vars:
    backup_file: "backups/router01/router01_20260220.cfg"

  tasks:
    # First, copy the backup file to the device flash
    - name: Upload backup config to device
      ansible.netcommon.net_put:
        src: "{{ backup_file }}"
        dest: "flash:/restore_config.cfg"
        protocol: scp

    # Execute configure replace
    - name: Run configure replace
      cisco.ios.ios_command:
        commands:
          - command: "configure replace flash:/restore_config.cfg force"
        wait_for:
          - result[0] contains "successfully"
      register: replace_result

    - name: Show replace output
      ansible.builtin.debug:
        var: replace_result.stdout_lines[0]

    # Clean up the uploaded file
    - name: Remove temporary config from flash
      cisco.ios.ios_command:
        commands:
          - "delete flash:/restore_config.cfg"
          - ""
```

## Selective Section Restore

Sometimes you do not want to restore the entire config. Maybe just the routing section got messed up, or the ACLs need to go back to the previous version. You can restore individual sections.

```yaml
# partial_restore.yml - Restore specific configuration sections from backup
---
- name: Restore specific configuration sections
  hosts: target_device
  gather_facts: false
  connection: network_cli

  vars:
    backup_file: "backups/router01/router01_20260220.cfg"

  tasks:
    # Read the backup file
    - name: Load backup configuration
      ansible.builtin.set_fact:
        backup_config: "{{ lookup('file', backup_file) }}"

    # Extract the OSPF section from the backup
    - name: Extract OSPF configuration
      ansible.builtin.set_fact:
        ospf_config: "{{ backup_config | regex_search('router ospf 1[\\s\\S]*?(?=\\n!)', multiline=True) }}"

    # Remove current OSPF config and apply the backup version
    - name: Remove current OSPF configuration
      cisco.ios.ios_config:
        lines:
          - no router ospf 1

    - name: Restore OSPF from backup
      cisco.ios.ios_config:
        lines: "{{ ospf_config.split('\n') }}"
      when: ospf_config | length > 0
```

## Restoring from Git Repository

If you store backups in git (which you should), you can restore from any point in history.

```yaml
# restore_from_git.yml - Restore config from a specific git commit
---
- name: Restore configuration from git history
  hosts: target_device
  gather_facts: false
  connection: network_cli

  vars:
    git_repo: "/opt/network-config-repo"
    # Specify the commit hash or tag to restore from
    restore_commit: "abc123def"

  tasks:
    # Checkout the specific version of the config from git
    - name: Get config from git history
      ansible.builtin.command:
        cmd: "git show {{ restore_commit }}:configs/{{ inventory_hostname }}.cfg"
        chdir: "{{ git_repo }}"
      delegate_to: localhost
      register: git_config

    # Backup current config first
    - name: Backup current config
      cisco.ios.ios_config:
        backup: true
        backup_options:
          dir_path: "backups/pre-restore"
          filename: "{{ inventory_hostname }}_pre_restore_{{ lookup('pipe', 'date +%Y%m%d_%H%M%S') }}.cfg"

    # Write the git config to a temp file
    - name: Save git config to temp file
      ansible.builtin.copy:
        content: "{{ git_config.stdout }}"
        dest: "/tmp/{{ inventory_hostname }}_restore.cfg"
      delegate_to: localhost

    # Restore the configuration
    - name: Push restored configuration
      cisco.ios.ios_config:
        src: "/tmp/{{ inventory_hostname }}_restore.cfg"
      register: restore_result

    - name: Report restore status
      ansible.builtin.debug:
        msg: "Restored {{ inventory_hostname }} to commit {{ restore_commit }}. Changes: {{ restore_result.commands | default([]) | length }} commands"

    # Save to startup config
    - name: Save configuration to startup
      cisco.ios.ios_command:
        commands:
          - write memory
```

## Rollback After Failed Change

Build a rollback mechanism into your change playbooks. Take a snapshot before the change, and restore it if something goes wrong.

```yaml
# change_with_rollback.yml - Make changes with automatic rollback on failure
---
- name: Network change with rollback capability
  hosts: target_device
  gather_facts: false
  connection: network_cli

  vars:
    rollback_dir: "/tmp/rollback"

  tasks:
    # Step 1: Take a pre-change snapshot
    - name: Capture pre-change configuration
      cisco.ios.ios_command:
        commands:
          - show running-config
      register: pre_change_config

    - name: Save pre-change config
      ansible.builtin.copy:
        content: "{{ pre_change_config.stdout[0] }}"
        dest: "{{ rollback_dir }}/{{ inventory_hostname }}_rollback.cfg"
      delegate_to: localhost

    # Step 2: Make the changes
    - name: Apply configuration changes
      block:
        - name: Configure new routing policy
          cisco.ios.ios_config:
            lines:
              - route-map NEW_POLICY permit 10
              - match ip address prefix-list NEW_PREFIXES
              - set local-preference 300
            parents: []

        - name: Apply route map to BGP neighbor
          cisco.ios.ios_config:
            lines:
              - "neighbor 203.0.113.1 route-map NEW_POLICY in"
            parents: "router bgp 65001"

        # Step 3: Verify the change worked
        - name: Verify BGP session is still up
          cisco.ios.ios_command:
            commands:
              - "show ip bgp neighbors 203.0.113.1 | include BGP state"
          register: bgp_check

        - name: Assert BGP is established
          ansible.builtin.assert:
            that:
              - "'Established' in bgp_check.stdout[0]"

      rescue:
        # Step 4: Rollback if anything fails
        - name: ROLLBACK - Restore previous configuration
          cisco.ios.ios_config:
            src: "{{ rollback_dir }}/{{ inventory_hostname }}_rollback.cfg"
            replace: config
          delegate_to: localhost

        - name: ROLLBACK - Notify about rollback
          ansible.builtin.debug:
            msg: "ROLLBACK EXECUTED on {{ inventory_hostname }}! Change failed and was reverted."

        - name: ROLLBACK - Save rolled-back config
          cisco.ios.ios_command:
            commands:
              - write memory
```

## Hardware Replacement Restore

When replacing a failed device with new hardware, you need to load the entire configuration.

```yaml
# hardware_replace.yml - Restore config onto replacement hardware
---
- name: Configure replacement hardware from backup
  hosts: replacement_device
  gather_facts: false
  connection: network_cli

  vars:
    failed_device: "core-rtr01"
    backup_root: "/opt/network-backups/current"

  tasks:
    # Set the hostname first so logging makes sense
    - name: Set hostname on replacement device
      cisco.ios.ios_config:
        lines:
          - "hostname {{ failed_device }}"

    # Load the full backup config
    - name: Load backup configuration
      cisco.ios.ios_config:
        src: "{{ backup_root }}/{{ failed_device }}.cfg"
      register: restore_result

    - name: Report loaded commands
      ansible.builtin.debug:
        msg: "Loaded {{ restore_result.commands | length }} configuration commands"

    # Save to startup
    - name: Save to startup configuration
      cisco.ios.ios_command:
        commands:
          - write memory

    # Verify critical features are working
    - name: Verify OSPF neighbors
      cisco.ios.ios_command:
        commands:
          - show ip ospf neighbor
      register: ospf_check
      until: ospf_check.stdout[0] | regex_findall('FULL') | length > 0
      retries: 6
      delay: 30

    - name: Report OSPF status
      ansible.builtin.debug:
        msg: "OSPF neighbors detected: {{ ospf_check.stdout[0] | regex_findall('FULL') | length }}"
```

## Restore Verification Playbook

After any restore, run a verification playbook to confirm the device is operating correctly.

```yaml
# verify_restore.yml - Post-restore health checks
---
- name: Post-restore verification
  hosts: target_device
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Check interface status
      cisco.ios.ios_command:
        commands:
          - show ip interface brief
      register: interfaces

    - name: Verify critical interfaces are up
      ansible.builtin.assert:
        that:
          - "'up' in interfaces.stdout[0]"
        fail_msg: "No interfaces in up state after restore!"

    - name: Check routing table
      cisco.ios.ios_command:
        commands:
          - show ip route summary
      register: routes

    - name: Display route count
      ansible.builtin.debug:
        var: routes.stdout_lines[0]

    - name: Check for error messages in log
      cisco.ios.ios_command:
        commands:
          - show logging | include %
      register: error_logs

    - name: Report any errors
      ansible.builtin.debug:
        var: error_logs.stdout_lines[0]
```

Configuration restoration is the payoff for all the backup discipline you have built. Whether you are rolling back a bad change, recovering from a failure, or setting up replacement hardware, Ansible turns what could be a stressful, error-prone process into a repeatable, verified procedure. The key is to practice your restore procedures regularly, not just when you need them.
