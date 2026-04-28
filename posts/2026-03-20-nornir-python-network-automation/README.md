# How to Use Nornir as a Python Alternative to Ansible for Network Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nornir, Python, Network Automation, Netmiko, NAPALM

Description: Learn how to use Nornir, a Python-native network automation framework, to run tasks across many network devices with inventory management, filtering, and parallel execution.

## What Is Nornir?

Nornir is a Python automation framework (unlike Ansible which uses YAML). It provides:
- Python-native inventory management
- Built-in parallel execution with thread pools
- Plugin ecosystem (Netmiko, NAPALM, HTTP)
- Filtering and targeting of device subsets
- Returns Python objects instead of YAML/JSON strings

## Step 1: Install Nornir

```bash
pip install nornir nornir-netmiko nornir-napalm nornir-utils

python3 -c "import nornir; print(nornir.__version__)"
```

## Step 2: Create Nornir Inventory

```yaml
# inventory/hosts.yaml

router01:
  hostname: 192.168.1.1
  groups:
    - cisco_ios
  data:
    role: core
    site: headquarters

router02:
  hostname: 192.168.1.2
  groups:
    - cisco_ios
  data:
    role: distribution
    site: headquarters

switch01:
  hostname: 192.168.1.10
  groups:
    - arista_eos
  data:
    role: access
    site: branch
```

```yaml
# inventory/groups.yaml
cisco_ios:
  platform: ios
  username: admin
  password: password
  connection_options:
    netmiko:
      extras:
        secret: enablepass
        device_type: cisco_ios

arista_eos:
  platform: eos
  username: admin
  password: password
```

```yaml
# inventory/defaults.yaml
username: admin
password: default_password
port: 22
```

## Step 3: Initialize Nornir and Run a Task

```python
from nornir import InitNornir
from nornir_netmiko.tasks import netmiko_send_command
from nornir_utils.plugins.functions import print_result

# Initialize with inventory files
nr = InitNornir(
    runner={
        'plugin': 'threaded',
        'options': {
            'num_workers': 10,    # Run on 10 devices simultaneously
        }
    },
    inventory={
        'plugin': 'SimpleInventory',
        'options': {
            'host_file': 'inventory/hosts.yaml',
            'group_file': 'inventory/groups.yaml',
            'defaults_file': 'inventory/defaults.yaml',
        }
    }
)

# Run a command on all devices
results = nr.run(
    task=netmiko_send_command,
    command_string='show ip interface brief'
)

# Print results (includes errors)
print_result(results)
```

## Step 4: Filter Devices and Run Tasks

```python
from nornir import InitNornir
from nornir.core.filter import F
from nornir_netmiko.tasks import netmiko_send_command

nr = InitNornir(config_file='config.yaml')

# Filter to Cisco IOS devices only
cisco_only = nr.filter(F(groups__contains='cisco_ios'))

# Filter by role
core_routers = nr.filter(F(data__role='core'))

# Filter by site
hq_devices = nr.filter(F(data__site='headquarters'))

# Combined filter
hq_cisco = nr.filter(F(groups__contains='cisco_ios') & F(data__site='headquarters'))

results = hq_cisco.run(
    task=netmiko_send_command,
    command_string='show version'
)

print_result(results)
```

## Step 5: Write a Custom Nornir Task

```python
from nornir import InitNornir
from nornir.core.task import Task, Result
from nornir_netmiko.tasks import netmiko_send_command, netmiko_send_config

def configure_interface_task(task: Task, interface: str, ip: str, mask: str, description: str) -> Result:
    """Configure an interface with IP and description."""
    config_commands = [
        f'interface {interface}',
        f'description {description}',
        f'ip address {ip} {mask}',
        'no shutdown',
    ]

    # Apply configuration
    result = task.run(
        task=netmiko_send_config,
        config_commands=config_commands,
    )

    # Verify
    verify = task.run(
        task=netmiko_send_command,
        command_string=f'show ip interface {interface} | include Internet address',
    )

    if ip in verify.result:
        return Result(host=task.host, result=f"Success: {interface} configured with {ip}")
    else:
        return Result(host=task.host, result=f"Warning: {ip} not found in interface output", failed=True)

nr = InitNornir(config_file='config.yaml')
core_only = nr.filter(F(data__role='core'))

results = core_only.run(
    task=configure_interface_task,
    interface='GigabitEthernet0/0',
    ip='192.168.1.1',
    mask='255.255.255.0',
    description='LAN_Interface',
)

print_result(results)
```

## Step 6: Use NAPALM via Nornir

```python
from nornir import InitNornir
from nornir_napalm.plugins.tasks import napalm_get

nr = InitNornir(config_file='config.yaml')

# Get BGP neighbors from all devices using NAPALM
results = nr.run(
    task=napalm_get,
    getters=['bgp_neighbors', 'facts'],
)

for hostname, result in results.items():
    if not result.failed:
        data = result[0].result
        facts = data.get('facts', {})
        bgp = data.get('bgp_neighbors', {})

        print(f"\n{hostname}: {facts.get('model', 'Unknown')} running {facts.get('os_version', 'Unknown')}")

        for vrf, vrf_data in bgp.items():
            for peer_ip, peer_data in vrf_data.get('peers', {}).items():
                state = "UP" if peer_data['is_up'] else "DOWN"
                print(f"  BGP peer {peer_ip} (AS {peer_data['remote_as']}): {state}")
```

## Conclusion

Nornir provides Ansible-like multi-device automation but in pure Python, giving full programmatic control. Use `InitNornir` with inventory files, filter with `nr.filter(F(...))` for targeted execution, and run tasks with `nr.run()` using plugins like `netmiko_send_command` or `napalm_get`. Nornir's thread pool runner executes tasks in parallel across all matching devices, making it efficient for large networks. Custom tasks are regular Python functions that receive a `Task` object and return a `Result`.
