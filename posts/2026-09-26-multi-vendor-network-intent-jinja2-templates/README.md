# How to Model Multi-Vendor Network Intent Without Duplicating Jinja2 Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Jinja2, Python, Multi-Vendor, Configuration Management

Description: Model shared network intent separately from device capabilities and render small platform adapters instead of maintaining a full template copy per vendor.

A template directory often starts with one switch configuration and grows into a copy for every vendor, site, and role. Eventually, changing a common interface description policy requires editing twelve files. The underlying problem is that business intent, physical interface names, and vendor command syntax have become entangled.

Keep common intent in data, resolve platform capabilities before rendering, and limit templates to syntax. Share a template only where the supported devices truly have the same command semantics.

## Model the Intent Independently of CLI Syntax

Start with a deliberately small resource: an interface's description and administrative state. This YAML expresses the desired outcome without including commands such as `shutdown` or `no shutdown`:

```yaml
schema_version: 1
interfaces:
  - id: distribution-uplink
    description: Uplink to distribution
    enabled: true
  - id: unused-port
    description: Reserved
    enabled: false
```

The logical IDs are stable across hardware models. A separate binding maps them to actual ports:

```yaml
platform: ios-xe
interface_names:
  distribution-uplink: GigabitEthernet1/0/48
  unused-port: GigabitEthernet1/0/47
```

An Arista EOS device can use the same intent with `Ethernet48` and `Ethernet47`. These are example names; validate them against the inventory for each device. Physical identity belongs in the binding, not in a deeply nested Jinja conditional.

Document ownership: this schema manages description and administrative state only. It does not manage VLAN membership, MTU, IP addressing, or every other line under the interface. Rendering these two attributes must not imply permission to replace the whole interface configuration.

## Validate Before Rendering

Validation should reject ambiguity early. A missing `enabled` field must not silently become a disabled port. A duplicate logical ID must not configure the same resource twice.

```python
# render.py
import re
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined


def compile_interfaces(intent, binding):
    if intent.get("schema_version") != 1:
        raise ValueError("Unsupported intent schema")
    if binding.get("platform") not in {"ios-xe", "eos"}:
        raise ValueError("No tested platform adapter")
    rows, seen, ports = [], set(), set()
    for resource in intent["interfaces"]:
        key = resource["id"]
        if key in seen:
            raise ValueError("Duplicate logical interface")
        seen.add(key)
        name = binding["interface_names"][key]
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9/.-]*", name):
            raise ValueError("Invalid interface name")
        if name in ports:
            raise ValueError("Two logical interfaces use one port")
        ports.add(name)
        enabled = resource["enabled"]
        if type(enabled) is not bool:
            raise ValueError("enabled must be a boolean")
        description = resource["description"]
        if not isinstance(description, str) or not re.fullmatch(
            r"[A-Za-z0-9 ._:/-]{1,80}", description
        ):
            raise ValueError("Description outside supported policy")
        rows.append({"name": name, "description": description, "enabled": enabled})
    if not rows:
        raise ValueError("No interfaces to render")
    return sorted(rows, key=lambda row: row["name"])


intent = yaml.safe_load(Path("intent.yaml").read_text())
binding = yaml.safe_load(Path("binding.yaml").read_text())
rows = compile_interfaces(intent, binding)
env = Environment(
    loader=FileSystemLoader("templates"),
    undefined=StrictUndefined,
    autoescape=False,
    trim_blocks=True,
    lstrip_blocks=True,
    keep_trailing_newline=True,
)
print(env.get_template("interfaces.j2").render(interfaces=rows), end="")
```

The conservative description policy is an application choice. Expand it deliberately if your environment needs additional characters, with escaping rules and tests for every adapter. Jinja's [`StrictUndefined`](https://jinja.palletsprojects.com/en/stable/api/#jinja2.StrictUndefined) turns missing variables into rendering errors. It does not replace type checks, inventory validation, or CLI injection defenses.

## Share Only the Compatible Syntax

For the restricted IOS XE and EOS interface attributes in this example, create `templates/interfaces.j2`:

```jinja2
{% for interface in interfaces %}
interface {{ interface.name }}
 description {{ interface.description }}
 {{ 'no shutdown' if interface.enabled else 'shutdown' }}
{% endfor %}
```

This renders a configuration fragment. It is not a complete configuration suitable for a whole-device replacement operation.

The corresponding Ansible resource modules expose description and administrative state in structured form for [Cisco IOS](https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_interfaces_module.html) and [Arista EOS](https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_interfaces_module.html). Where those modules cover the resource, sending compiled data to them can eliminate the Jinja layer entirely.

For a Junos adapter, use the same intent schema but implement its hierarchy and disable/delete semantics explicitly. Do not add scattered `if vendor == ...` branches to every line in the shared template. Small vendor-specific templates are appropriate; duplicating an entire site policy for each vendor is what you want to avoid.

Jinja supports [imports, macros, and includes](https://jinja.palletsprojects.com/en/stable/templates/#macros) for reusable syntax. Use them for genuinely repeated blocks within a compatible command family. Keep policy decisions in the compiler so rendered behavior remains easy to test.

## Introduce Capability Checks as the Model Grows

The next request may be a switchport mode or MTU. Do not assume two devices support an option because their CLI looks similar. Add a capability record keyed by tested platform, model, and software family. Reject unsupported combinations before rendering.

Also distinguish an omitted attribute from an explicit deletion. For example, an absent description may mean “leave it unmanaged,” while a requested empty description could mean “remove it.” Those semantics should be part of the schema, with a version change when their meaning changes.

## Test the Model, Binding, and Output Separately

Store expected output fixtures for each supported adapter. Verify that changing only a logical description produces the intended line on every platform. Verify deterministic ordering by rendering the same data twice.

Include failure fixtures for missing port bindings, duplicate ports, unknown platforms, strings where booleans are expected, and multiline descriptions. Then load the generated fragment onto lab devices and inspect the canonical running configuration. Text rendering cannot prove that a command is accepted or that it represents the intended state on every release.

This separation gives each change a clear home: shared intent for policy, bindings for hardware identity, capability checks for support, and small adapters for syntax. Adding a vendor becomes an explicit implementation task rather than another copy of every configuration template.
