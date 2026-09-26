# How to Make cisco.ios.ios_config Idempotent with Match and Replace Modes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cisco IOS, Network Automation, Idempotency, Configuration Management

Description: Choose ios_config match and replace modes correctly, preserve unmanaged configuration, and test real convergence instead of hiding repeated changes.

When `cisco.ios.ios_config` reports changed on every run, the first question is whether the proposed lines match what IOS actually stores. A command can be valid at the CLI and still be unsuitable for text-based comparison because IOS expands abbreviations, removes default settings, or rewrites the line.

The module has two separate decisions: `match` determines whether a difference exists, and `replace` determines which proposed commands are sent when it does. Neither option automatically turns a partial command list into a complete replacement of the running configuration.

## Establish the Canonical Input

Assume an IOS inventory configured with `ansible.netcommon.network_cli`, `ansible_network_os: cisco.ios.ios`, and appropriate device credentials. See the official [IOS connection guide](https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html) for connection and enable-mode settings.

Read the actual interface section before writing the task. If IOS stores this:

```text
interface GigabitEthernet1/0/24
 description Printer network
```

use the full parent and full command:

```yaml
- name: Set the managed interface description
  cisco.ios.ios_config:
    parents:
      - interface GigabitEthernet1/0/24
    lines:
      - description Printer network
    match: line
    replace: line
```

An abbreviation such as `int Gi1/0/24` may work interactively, but it is not the text stored in the configuration. Ansible's [network FAQ](https://docs.ansible.com/projects/ansible/latest/network/user_guide/faq.html) specifically calls out abbreviation-related repeated changes.

## Choose What Equality Means

Use this table to select the comparison policy:

| `match` | Intended comparison | Good starting use |
|---|---|---|
| `line` | Each proposed line is present; ordering is not the test | A few independent attributes in a shared section |
| `strict` | Proposed lines must match their positions | Ordered content with a known layout |
| `exact` | The compared section must equal the proposed content | A complete section owned by this workflow |
| `none` | Skip the comparison | Deliberate imperative operations |

The [`ios_config` parameter reference](https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html#parameters) defines these modes. A stricter comparison is not automatically safer. If another team owns lines in the same section, exact matching against your partial list can detect a difference forever.

For example, a desired list containing only a description will never equal an interface section containing a description and a switchport configuration. The switchport lines might be correct and intentionally unmanaged. `match: line` fits that ownership boundary better.

## Choose the Size of the Command Submission

With `replace: line`, the module sends proposed lines that need to change. With `replace: block`, a detected difference causes the affected proposed configuration block to be sent; separate top-level commands do not become one block merely because they share a `lines` list. The current [module source](https://github.com/ansible-collections/cisco.ios/blob/main/plugins/modules/ios_config.py) shows this comparison-to-command flow.

Block submission can help when commands share a configuration parent. Independent top-level commands, such as these logging destinations, remain separate:

```yaml
- name: Maintain a complete logging destination pair
  cisco.ios.ios_config:
    lines:
      - logging host 192.0.2.40
      - logging host 192.0.2.41
    match: line
    replace: block
```

This example intentionally ensures two destinations exist. It does not remove a third logging destination. With `match: line`, if one destination line is already present and the other is missing, only the missing line is sent, even with `replace: block`.

The distinction matters most for ACLs and route policies. Detecting an unexpected rule and resending the desired rules does not necessarily delete that unexpected rule. `replace: block` means “send the proposed block,” not “erase the old section.” Do not rely on it as a pruning mechanism.

## Treat Removal as an Explicit Operation

If you own a whole resource, a resource module with a suitable replacement state often expresses the intent more clearly. Review that module's exact deletion scope and supported platform behavior before using it.

If you must reconstruct an ACL through `ios_config`, a removal command in `before` can be conditionally applied when a difference exists. That operation may temporarily remove policy protection or alter packet handling. It deserves its own maintenance procedure, out-of-band access, and lab test; it should not be a casual fix for noisy `changed` output.

For partial ownership, explicitly remove only the stale lines your workflow owns. Keep the deletion policy next to the desired-state data so future maintainers understand why a line disappears.

## Recognize Defaults and Side Effects

Some commands disappear from ordinary running-config output when their value equals a default. Continually proposing such a line can continually trigger a textual difference. Inspect `show running-config all` and the module's `defaults` behavior on your release, or use a resource module that models the attribute directly.

Also inspect `save_when`. An always-save policy creates activity even when your desired configuration is already satisfied. A save policy should match your operational requirement, not conceal uncertainty about convergence.

Do not reuse an old `running_config` value after another task has changed the device. A cached pre-change baseline can cause later tasks to compare against state that no longer exists.

## Prove Convergence on a Lab Device

Use a small test matrix:

1. Apply the task to a device where the managed setting differs.
2. Read the resulting running configuration and confirm the expected canonical form.
3. Run the same task again and expect no configuration change.
4. Add an unrelated line to the section and confirm the ownership policy still holds.
5. Remove a managed line and verify the task restores it.

Run `ansible-playbook` with `--check` and inspect `commands` or `updates` for the proposed changes. The `--diff` flag enables supported comparisons, but `ios_config` cannot produce a before-and-after running-config diff with `diff_against: running` in check mode. A preview is not a substitute for the real second execution.

Never solve the problem by adding `changed_when: false` to the configuration task. That changes reporting while the device may still receive commands. Correct idempotency means that the comparison matches the intended ownership model and that a stable device no longer needs a mutation.
