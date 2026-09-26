# How to Detect and Remediate Network Drift Against Intended State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Ansible, Configuration Management, Networking

Description: Detect network drift within an explicit ownership boundary, review a current remediation plan, and verify configuration and operational health afterward.

A configuration backup tells you what changed. An intended state tells you whether that change was allowed. Drift detection connects the two, but remediation also needs an ownership boundary: which resources and fields may automation change?

Start with one small policy, such as interface descriptions and administrative enablement. Once the pipeline can detect, explain, repair, and verify those fields reliably, extend it to more consequential resources.

## Define the managed contract

An intended-state record should identify the device, platform, configuration revision, and owned fields. Here is a small Cisco IOS example:

```yaml
# intent/access-01.yml
managed_interfaces:
  - name: GigabitEthernet1/0/10
    description: Printer - floor 2
    enabled: true
  - name: GigabitEthernet1/0/11
    description: Reserved - change required
    enabled: false
```

This policy owns descriptions and administrative state on two interfaces. It says nothing about addresses, switchport settings, or the remaining interfaces. Do not compare a partial intent file against a complete running configuration and interpret every extra line as unauthorized.

Decide how missing values behave. An absent description might mean unmanaged, whereas an explicit empty description might mean remove it. Preserve that distinction in your data model instead of treating every omitted field as a default.

## Gather before planning

Use the collection and network connection plugins installed in your tested execution environment. Inventory should provide `ansible_connection: ansible.netcommon.network_cli` and `ansible_network_os: cisco.ios.ios`, with credentials injected separately.

```yaml
- name: Assess interface policy
  hosts: access_switches
  gather_facts: false
  vars_files:
    - "intent/{{ inventory_hostname }}.yml"
  tasks:
    - name: Gather the current interface configuration
      cisco.ios.ios_interfaces:
        state: gathered
      register: observed

    - name: Reject unknown intended interfaces
      ansible.builtin.assert:
        that:
          - item.name in (observed.gathered | map(attribute='name') | list)
        fail_msg: "Intended interface is absent from gathered configuration"
      loop: "{{ managed_interfaces }}"

    - name: Calculate a merge without applying it
      cisco.ios.ios_interfaces:
        config: "{{ managed_interfaces }}"
        state: merged
      check_mode: true
      register: plan

    - name: Report the proposed commands
      ansible.builtin.debug:
        var: plan.commands
```

The resource module documents `gathered`, `merged`, and other states and exposes generated commands. A merge is appropriate for this limited field ownership. Replacement and override have broader deletion semantics and require a correspondingly complete contract. Confirm check-mode behavior with the collection version and device release you deploy. [IOS interfaces module](https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_interfaces_module.html)

Treat a failed gather as unknown state. Never convert a connection failure into an empty interface list and proceed to create everything. Keep separate scan outcomes for compliant, drifted, unreachable, parser failure, and unsupported platform.

## Use text comparisons where they fit

For a complete, device-shaped intended configuration, `ios_config` can produce a compliance diff without applying that intended configuration:

```yaml
- name: Compare the complete intended configuration
  cisco.ios.ios_config:
    diff_against: intended
    intended_config: "{{ lookup('ansible.builtin.file', 'intended/access-01.cfg') }}"
    diff_ignore_lines:
      - '^! Last configuration change at .*'
```

Run the playbook with `--diff` to request diff output. The `intended_config` parameter is comparison-only; it does not converge the device. Use canonical command spelling and indentation, and review ignore patterns against representative captures. Keep sensitive configuration diffs out of broadly accessible CI logs. [IOS configuration module](https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html)

Textual equality is not a complete network health test. A configuration can match while a link is down, a peer is missing, or the wrong physical cable is installed.

## Classify the drift before fixing it

For every finding, record the intended revision, observation time, owned resource, actual value, expected value, and proposed operation. Classify differences by cause and impact:

| Finding | Suggested handling |
| --- | --- |
| Approved change missing from intent | Correct the source of truth before convergence |
| Unexpected description change | Review and optionally automate a narrow correction |
| Management interface enablement changed | Require a recovery path and explicit review |
| Device unreachable | Restore observability; do not assume configuration drift |
| Emergency exception still active | Honor its owner and expiry, then reassess |

Keep exception records explicit and time limited. A permanent regex that suppresses an entire interface block is difficult to distinguish from abandoned coverage.

## Apply a freshly checked plan

An approved plan can become stale while it waits. Immediately before applying, lock the device against competing automation, retrieve current state, and compare it with the approved observation. If it changed, generate a new plan. Do not silently deploy a different command list under an old approval.

Apply the same `managed_interfaces` data with `state: merged` in a separate authorized deployment job, without the forced check mode. Preserve the intended revision and target list across both jobs. Begin with one device and stop expansion when post-checks fail.

A write error can leave some commands applied. Record the result as uncertain until a fresh read establishes the actual state. Blindly retrying an entire command batch can conceal partial success or interfere with another operator's repair.

## Verify the outcome and persistence

Gather configuration again and verify the owned fields independently. Then test the service behavior relevant to the change: link status, expected neighbors, management reachability, or an application path. Administrative enablement and physical link status are different facts, so check both where required.

When the platform separates running and startup configurations, include an explicit, verified persistence step according to its driver semantics. Do not report a completed repair while the next reboot will restore the old state.

Finally, repeat the detection stage. A successful repair should produce no further commands for the same intent. Retain the before-state, applied plan, after-state, and verification outcome so the next drift finding starts with evidence rather than guesswork.
