# How to Use NAPALM to Configure IPv4 Interfaces Declaratively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NAPALM, Python, IPv4, Network Automation, Declarative Configuration

Description: Learn how to use NAPALM's configuration management capabilities to declaratively configure IPv4 interfaces, with diff preview and rollback support.

## NAPALM's Declarative Configuration Model

NAPALM supports two configuration approaches:
- **load_merge_candidate()** - merges new config with running config
- **load_replace_candidate()** - replaces entire config with the candidate

Both methods support:
- `compare_config()` - preview a diff before applying
- `commit_config()` - apply the candidate configuration
- `discard_config()` - cancel pending changes
- `rollback()` - revert to the previous configuration

## Step 1: Load and Apply a Configuration Merge

```python
import napalm

driver = napalm.get_network_driver('ios')
device = driver(
    hostname='192.168.1.1',
    username='admin',
    password='password',
    optional_args={'secret': 'enablepass'},
)

device.open()

# Define configuration to merge

config = """
interface GigabitEthernet0/1
 description WAN_Link_ISP1
 ip address 203.0.113.2 255.255.255.252
 no shutdown
!
interface GigabitEthernet0/2
 description LAN_Internal
 ip address 192.168.10.1 255.255.255.0
 no shutdown
"""

# Load as merge candidate
device.load_merge_candidate(config=config)

# Preview the diff
diff = device.compare_config()
print("Pending changes:")
print(diff)

# Commit if diff looks correct
if diff:
    confirm = input("Apply these changes? (yes/no): ")
    if confirm.lower() == 'yes':
        device.commit_config()
        print("Configuration committed.")
    else:
        device.discard_config()
        print("Changes discarded.")
else:
    print("No changes needed.")
    device.discard_config()

device.close()
```

## Step 2: Manage Interface Config via Jinja2 Templates

```python
import napalm
from jinja2 import Environment, FileSystemLoader

# template.j2:
# {% for intf in interfaces %}
# interface {{ intf.name }}
#  description {{ intf.description }}
#  ip address {{ intf.ip_address }} {{ intf.subnet_mask }}
#  no shutdown
# !
# {% endfor %}

env = Environment(loader=FileSystemLoader('.'))
template = env.get_template('template.j2')

interfaces_data = {
    'interfaces': [
        {'name': 'GigabitEthernet0/0', 'description': 'LAN', 'ip_address': '192.168.1.1', 'subnet_mask': '255.255.255.0'},
        {'name': 'GigabitEthernet0/1', 'description': 'WAN', 'ip_address': '10.0.0.2', 'subnet_mask': '255.255.255.252'},
    ]
}

rendered_config = template.render(interfaces_data)

driver = napalm.get_network_driver('ios')
device = driver('192.168.1.1', 'admin', 'password', optional_args={'secret': 'ep'})

device.open()
device.load_merge_candidate(config=rendered_config)

diff = device.compare_config()
if diff:
    print(f"Changes to apply:\n{diff}")
    device.commit_config()
else:
    print("Device is already in desired state.")
    device.discard_config()

device.close()
```

## Step 3: Configure Multiple Devices from YAML

```python
import napalm
import yaml

# devices.yaml
# - host: 192.168.1.1
#   driver: ios
#   username: admin
#   password: pass
#   enable: enablepass
#   interfaces:
#     - name: GigabitEthernet0/0
#       ip: 192.168.1.1
#       mask: 255.255.255.0
#       description: LAN

with open('devices.yaml') as f:
    devices_config = yaml.safe_load(f)

for dev_info in devices_config:
    driver_class = napalm.get_network_driver(dev_info['driver'])
    device = driver_class(
        hostname=dev_info['host'],
        username=dev_info['username'],
        password=dev_info['password'],
        optional_args={'secret': dev_info.get('enable', '')},
    )

    config_lines = []
    for intf in dev_info.get('interfaces', []):
        config_lines.append(f"interface {intf['name']}")
        config_lines.append(f" description {intf['description']}")
        config_lines.append(f" ip address {intf['ip']} {intf['mask']}")
        config_lines.append(" no shutdown")
        config_lines.append("!")

    config = "\n".join(config_lines)

    print(f"\n--- {dev_info['host']} ---")
    device.open()
    device.load_merge_candidate(config=config)
    diff = device.compare_config()

    if diff:
        print(diff)
        device.commit_config()
        print("Applied.")
    else:
        print("No changes needed.")
        device.discard_config()

    device.close()
```

## Step 4: Use Rollback After Failed Commit

```python
import napalm

driver = napalm.get_network_driver('eos')
device = driver('192.168.1.2', 'admin', 'password')

device.open()

# Load configuration change
device.load_merge_candidate(config="""
interface Ethernet1
   ip address 10.0.1.1/24
   no shutdown
""")

diff = device.compare_config()
print(f"Diff:\n{diff}")

# Commit the change
device.commit_config()
print("Committed.")

# If something breaks, rollback to previous config
# (Only works if the device supports checkpoint/rollback)
# device.rollback()
# print("Rolled back to previous configuration.")

device.close()
```

## Conclusion

NAPALM's declarative configuration model - `load_merge_candidate()` followed by `compare_config()` and `commit_config()` - enables safe, auditable configuration changes. Always call `compare_config()` to preview the diff before committing, and use `discard_config()` to cancel. Combine with Jinja2 templates to generate interface configurations from structured data, and YAML inventory files to scale across many devices. NAPALM's vendor abstraction means the same Python code works for Cisco IOS, Arista EOS, and Juniper JunOS.
