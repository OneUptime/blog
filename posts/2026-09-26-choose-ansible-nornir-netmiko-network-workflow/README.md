# How to Choose Ansible, Nornir, or Netmiko for a Real Network Automation Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Ansible, Nornir, Netmiko, Python

Description: Choose Ansible, Nornir, or Netmiko by mapping a network workflow to state management, orchestration, transport, testing, and operational ownership.

Choosing a network automation tool starts with a workflow, not a popularity comparison. A daily configuration audit, an approved VLAN change, and an interactive troubleshooting session have different requirements even when all three connect to the same switches.

Ansible, Nornir, and Netmiko also sit at different levels. Ansible can organize declarative configuration tasks. Nornir provides Python-oriented inventory and task execution. Netmiko provides device-oriented CLI connections. A Nornir workflow can use Netmiko as its transport, so selecting one does not always exclude the other.

## Describe the Outcome Before Selecting the Tool

Consider a request to maintain a description on 200 switch interfaces. Write down the acceptance criteria:

- Inventory comes from an approved source and resolves an explicit target list.
- The change is previewed before execution.
- A second execution makes no further change.
- Devices that fail authentication remain visible in the result.
- A post-check confirms the desired configuration.
- Another operator can maintain the workflow without its original author.

Now contrast that with a support workflow that reads three unusual commands and correlates their output with a ticket API. The second workflow may need complex branching and parsing but no persistent configuration change. The correct tool choice can differ without either choice being inconsistent.

## Compare the Responsibilities

| Requirement | Ansible | Nornir | Netmiko alone |
|---|---|---|---|
| Existing resource module fits desired state | Strong starting point | Invoke a suitable library or implement comparison | Implement comparison yourself |
| Complex Python transformations | Usually move logic into a plugin or helper | Natural fit | Natural fit for a small script |
| Fleet inventory and execution | Inventory and playbook controls | Inventory and runners | Application supplies these |
| Interactive CLI dialogue | Supported modules for supported network platforms | Delegates to connection/task plugins | Direct control of the CLI session |
| Team already operates playbooks | Low adoption cost | New Python operational surface | Suitable for bounded utilities |
| Custom workflow and result model | Possible through plugins | Central design strength | You build orchestration around transport |

These are engineering tradeoffs, not guarantees of correctness. None of the tools provides universal idempotency merely because a function or task ran successfully.

## Use Ansible for Supported Desired-State Operations

For the interface-description example, prefer a resource module over an arbitrary command list:

```yaml
- name: Maintain the branch uplink description
  hosts: branch_ios
  gather_facts: false
  serial: 5
  tasks:
    - name: Merge the intended interface attributes
      cisco.ios.ios_interfaces:
        config:
          - name: GigabitEthernet1/0/48
            description: Uplink to distribution
        state: merged
```

The play needs inventory settings for `ansible.netcommon.network_cli`, `cisco.ios.ios`, authentication, and any required privilege escalation. Validate the interface name against the actual platform. Keep credentials in your existing secret system.

Ansible's [resource module guide](https://docs.ansible.com/projects/ansible/latest/network/user_guide/network_resource_modules.html) explains structured configuration and the distinction between merge, replacement, and read/render states. The [`ios_interfaces` reference](https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_interfaces_module.html) defines the specific fields and supported behavior.

The adoption test is practical: can the on-call team inspect the proposed state and understand the change without reading a custom framework? If yes, a short playbook may be easier to operate than a general Python application.

## Use Nornir When the Workflow Is a Python Application

Suppose an audit needs to select hosts by site, collect operational data, join that data to an asset API, and emit one structured report per device. Python may express those transformations more clearly.

```python
from nornir import InitNornir
from nornir_netmiko.tasks import netmiko_send_command

nr = InitNornir(config_file="config.yaml")
branch = nr.filter(site="london", platform="cisco_ios")
if not branch.inventory.hosts:
    raise SystemExit("No devices matched the approved scope")

try:
    results = branch.run(
        task=netmiko_send_command,
        command_string="show version",
        read_timeout=45,
    )
    for name, result in results.items():
        print(name, "failed" if result.failed else "collected")
    results.raise_on_error()
finally:
    nr.close_connections()
```

Here, `site` is inventory data you define. Nornir's [inventory tutorial](https://nornir.readthedocs.io/en/latest/tutorial/inventory.html) describes host attributes and filtering. Design result schemas, error classes, and tests as you would for any maintained application.

Do not assume `nr.run()` raising no exception means every device succeeded. Inspect the aggregate result or configure explicit error raising. Also document that failed hosts are normally excluded from subsequent tasks until deliberately recovered.

## Use Netmiko Alone for a Bounded Device Interaction

A short, single-device diagnostic utility does not necessarily need a fleet framework:

```python
import os
from netmiko import ConnectHandler

with ConnectHandler(
    device_type="cisco_ios",
    host="192.0.2.31",
    username=os.environ["NETWORK_USERNAME"],
    password=os.environ["NETWORK_PASSWORD"],
    ssh_strict=True,
    system_host_keys=True,
) as connection:
    output = connection.send_command("show version", read_timeout=45)
    print(output)
```

Use a prevalidated known-hosts file. Netmiko's [project documentation](https://github.com/ktbyers/netmiko) describes its supported platforms and role as a connection library. Once this utility grows to hundreds of devices, durable scheduling, partial failures, retries, and inventory consistency become application responsibilities. That growth is a good reason to introduce Nornir or a broader job system.

## Make the Decision with a Small Pilot

Run the same representative task on a lab device for each platform and release you support. Include an offline device, denied command, malformed response, and unchanged second run. Compare the amount of custom logic, clarity of failures, and maintenance burden.

For a configuration change, verify device state after execution; for collection, verify completeness and freshness. Record operational facts such as duration, session count, and the exact dependency versions tested.

A useful default is Ansible for well-supported configuration resources, Nornir for Python-heavy fleet workflows, and Netmiko for CLI interaction within either a small utility or a larger orchestrator. Let the pilot change that default when the device support or team workflow calls for it.
