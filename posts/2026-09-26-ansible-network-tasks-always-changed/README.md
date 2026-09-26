# How to Stop Ansible Network Tasks from Reporting Changed on Every Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Network Automation, Idempotency, Troubleshooting, Configuration Management

Description: Diagnose repeated changed results in Ansible network playbooks by separating observation, configuration comparison, persistence, and controller artifacts.

An Ansible network playbook that always reports changes is difficult to trust. It may notify handlers unnecessarily, hide real drift among routine noise, or make a CI check fail even when the switches are already configured correctly.

The fix starts by identifying what changed. A device configuration task, an operational command, a configuration save, and a timestamped backup file have different change semantics. Treating them all as the same problem leads to misleading status overrides.

## Find the Exact Task

Limit an investigation to a lab device and run the play twice with the same inputs. Inspect the task that reports changed, its module, its returned commands, and any diff. Keep sensitive configurations out of shared logs.

Use this diagnostic split:

| Changed task | First thing to inspect |
|---|---|
| Raw read-only command | Whether the module knows the command is observational |
| `ios_config` or another text configuration module | Canonical syntax, parents, ordering, and defaults |
| Resource module | Requested state, actual gathered state, and supported fields |
| Save to startup configuration | Whether persistence is unconditional or running differs from startup |
| Local backup or report | Whether filenames, timestamps, or ordering change every run |

Also verify that a template is receiving stable inputs. An embedded generation timestamp can produce a new configuration on every execution even when the network policy is unchanged.

## Make Observation Tasks Report Observation

Prefer a vendor's operational module where it fits. For an explicitly read-only command executed through a generic CLI module, describing its reporting semantics is reasonable:

```yaml
- name: Read the IOS software version
  ansible.netcommon.cli_command:
    command: show version
  register: version_result
  changed_when: false
```

This override applies only to the reporting of this known query. It does not suppress connection errors or establish that arbitrary commands are read-only. Never apply it indiscriminately to a role containing configuration mutations.

When parsing responses, check that the command succeeded and returned the expected structure. Some CLIs put an error message in output rather than exposing a shell-style return code. Use the behavior of your specific module and platform to detect that condition. The [Ansible error-handling guide](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html) explains the separate roles of `changed_when` and `failed_when`.

## Correct Text Comparisons

Replace abbreviated syntax with the canonical form stored by the device, as in this corrected task:

```yaml
- name: Maintain the access-port description
  cisco.ios.ios_config:
    parents:
      - interface GigabitEthernet1/0/12
    lines:
      - description Office printer
    match: line
    replace: line
```

This example uses the canonical command and full interface name. Compare your actual task to a fresh running-config capture. Check whether the device expands abbreviations, changes indentation, normalizes values, or omits default commands. The official [network FAQ](https://docs.ansible.com/projects/ansible/latest/network/user_guide/faq.html) describes the abbreviation issue.

Avoid `match: none` in a task expected to converge by comparison. Avoid exact matching against a section that contains intentionally unmanaged lines. Do not assume `diff_ignore_lines` changes every part of a module's command comparison; its documented purpose is controlling displayed configuration diffs. Consult the [`ios_config` reference](https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html) for the option involved.

## Prefer Structured State Where It Fits

For a supported interface resource, a structured task is easier to reason about:

```yaml
- name: Set the intended port attributes
  cisco.ios.ios_interfaces:
    config:
      - name: GigabitEthernet1/0/12
        description: Office printer
        enabled: true
    state: merged
```

Gather the interface state separately and compare it with the requested fields. Do not move to a broader replacement state simply to force a clean recap; replacement can remove attributes that another workflow owns.

The [`ios_interfaces` documentation](https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_interfaces_module.html) specifies supported attributes and states. Test the installed collection version against the device release. A reproducible module defect deserves a narrow workaround or an upstream report, with input and gathered output redacted appropriately.

## Separate Persistence from Configuration

A device can have correct running configuration but different startup configuration. Saving that state is a real change, even when no new interface command is required.

To save only when a particular `ios_config` task changes the device, use `save_when: changed` on that task. A separate save-only task with the same setting does not inherit the changed status of an earlier task. To reconcile running and startup state independently, use a documented persistence policy such as `save_when: modified`. Both settings copy the entire running configuration to startup configuration when they trigger, including unrelated unsaved changes.

Write this policy explicitly. A playbook whose purpose is a read-only audit should not casually persist running configuration just to make startup match.

## Keep Controller Artifacts Honest

A timestamped backup file is new on every run by design. Decide whether the play recap should count that local artifact separately from device changes. Stable filenames and content-based updates can reduce noise for generated reports, while a backup archive may appropriately remain append-only.

Sort unordered data before rendering it. Avoid timestamps in configuration fragments that are intended to converge. Keep collection time in a report manifest rather than a managed device description or banner unless changing that value is intentional.

## Test Both Steady State and Real Drift

A useful acceptance test has two halves: the unchanged second run reports no device configuration change, and a deliberately altered managed field is detected and corrected. Testing only the first half can reward a playbook that always reports `ok` while doing nothing useful.

Also test command rejection, an unavailable device, and a missing variable. These failures should remain failures. Once observation, comparison, persistence, and artifacts have distinct contracts, the recap becomes a meaningful signal of network state rather than a cosmetic target.
