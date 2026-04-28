# Validation Summary: How to Use Nornir as a Python Alternative to Ansible for Network Automation

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Nornir (Python network automation framework, v3.x)
- nornir-netmiko plugin
- nornir-napalm plugin
- nornir-utils plugin
- Netmiko (SSH library for network devices)
- NAPALM (multi-vendor network automation library)
- Cisco IOS / Arista EOS (target platforms)
- BGP (Border Gateway Protocol — used in NAPALM example)

## Sources Consulted
- Nornir source: https://github.com/nornir-automation/nornir (`nornir/__init__.py`, `nornir/core/task.py`, `nornir/core/filter.py`, `nornir/core/inventory.py`, `nornir/plugins/inventory/simple.py`)
- nornir-netmiko source: https://github.com/ktbyers/nornir_netmiko (`nornir_netmiko/tasks/__init__.py`, `nornir_netmiko/tasks/netmiko_send_config.py`)
- nornir-napalm source: https://github.com/nornir-automation/nornir_napalm (`nornir_napalm/plugins/tasks/napalm_get.py`)
- nornir-utils source: https://github.com/nornir-automation/nornir_utils
- NAPALM base API: https://github.com/napalm-automation/napalm/blob/develop/napalm/base/base.py (`get_bgp_neighbors` docstring)
- PyPI listings for `nornir`, `nornir-netmiko`, `nornir-napalm`, `nornir-utils`

## Issues Found
- **Incorrect Netmiko task name in Step 5**: The post imported and used `netmiko_send_config_set`, but the actual exported task in `nornir-netmiko` is `netmiko_send_config` (it internally calls Netmiko's `send_config_set`, but the wrapping task is named `netmiko_send_config`). Confirmed against `nornir_netmiko/tasks/__init__.py` `__all__` list. Fixed both the import and the `task.run(...)` call to use `netmiko_send_config`. The `config_commands=` keyword argument is unchanged since `netmiko_send_config` accepts it as a parameter.

## Review Notes
- Verified that `nornir.__version__` is exposed (via `importlib.metadata.version("nornir")` in `nornir/__init__.py`), so the install verification command in Step 1 works.
- `SimpleInventory` plugin name (case-sensitive) and option keys (`host_file`, `group_file`, `defaults_file`) match the registered entry point and `__init__` signature.
- The `F(groups__contains='cisco_ios')` filter syntax is correct: `Host.groups` (a `ParentGroups` list) implements `__contains__` to match group names by string.
- The `connection_options.netmiko.extras` pattern with `secret` and `device_type` is valid — extras are forwarded as kwargs to Netmiko's `ConnectHandler`.
- For `napalm_get`, `result[0].result` correctly returns the dict mapping getter names to their outputs. The `bgp_neighbors` structure (VRF → `peers` → peer IP → `is_up`/`remote_as`) matches the NAPALM base class contract.
- Minor caveat (not fixed, since it is not technically wrong): in Step 5, the verify step relies on `verify.result` containing the IP. This works for a successful single-result Netmiko subtask call, but readers should be aware that `task.run()` can return either a `Result` or `MultiResult` depending on whether the subtask spawned its own sub-tasks.
