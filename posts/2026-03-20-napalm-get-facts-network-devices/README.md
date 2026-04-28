# How to Use NAPALM to Get Facts from Network Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NAPALM, Python, Network Automation, Multi-Vendor, Network Facts

Description: Learn how to use NAPALM (Network Automation and Programmability Abstraction Layer with Multivendor support) to retrieve standardized device facts from network equipment.

## What Is NAPALM?

NAPALM provides a unified Python API for interacting with multiple vendor network operating systems. The same Python code works for Cisco IOS, Cisco NX-OS, Juniper JunOS, Arista EOS, and others.

Supported operations:
- `get_facts()` - hostname, model, OS version, serial
- `get_interfaces()` - interface status and MAC addresses
- `get_interfaces_ip()` - IP addresses on each interface
- `get_bgp_neighbors()` - BGP peer status
- `get_route_to()` - routing table lookup

## Step 1: Install NAPALM

```bash
pip install napalm

# A single `pip install napalm` installs all core drivers and their
# transport dependencies:
#   - Cisco IOS    (uses Netmiko)
#   - Cisco NX-OS  (uses pynxos / Netmiko)
#   - Cisco IOS-XR (uses pyIOSXR)
#   - Arista EOS   (uses pyeapi)
#   - Juniper JunOS (uses PyEZ / junos-eznc)

# Verify
python3 -c "import napalm; print(napalm.__version__)"
```

## Step 2: Connect and Get Basic Facts

```python
import napalm

# Initialize driver for Cisco IOS
driver = napalm.get_network_driver('ios')

# Create device object
device = driver(
    hostname='192.168.1.1',
    username='admin',
    password='password',
    optional_args={'secret': 'enablepass'},
)

# Open connection
device.open()

# Get device facts
facts = device.get_facts()
print(facts)

# Output:
# {
#   'hostname': 'Router01',
#   'fqdn': 'Router01.example.com',
#   'vendor': 'Cisco',
#   'model': 'ISR4331',
#   'os_version': 'IOS-XE 16.9.3',
#   'serial_number': 'FTX1234ABCD',
#   'uptime': 1234567,
#   'interface_list': ['GigabitEthernet0/0/0', 'GigabitEthernet0/0/1', ...]
# }

device.close()
```

## Step 3: Get Interface Information

```python
import napalm
from pprint import pprint

driver = napalm.get_network_driver('ios')
device = driver('192.168.1.1', 'admin', 'password', optional_args={'secret': 'ep'})

device.open()

# Get interface status
interfaces = device.get_interfaces()
for intf_name, intf_data in interfaces.items():
    status = "UP" if intf_data['is_up'] else "DOWN"
    enabled = "enabled" if intf_data['is_enabled'] else "disabled"
    print(f"{intf_name}: {status}/{enabled} - {intf_data.get('description', 'no description')}")

# Get IP addresses on interfaces
ip_data = device.get_interfaces_ip()
for intf_name, intf_ips in ip_data.items():
    for family, addrs in intf_ips.items():
        for ip, details in addrs.items():
            print(f"{intf_name}: {ip}/{details['prefix_length']}")

device.close()
```

## Step 4: Multi-Vendor Device Inventory

```python
import napalm
from concurrent.futures import ThreadPoolExecutor
import json

# Define inventory with different device types
inventory = [
    {'hostname': '192.168.1.1', 'driver': 'ios', 'username': 'admin', 'password': 'pass', 'optional_args': {'secret': 'ep'}},
    {'hostname': '192.168.1.2', 'driver': 'eos', 'username': 'admin', 'password': 'pass', 'optional_args': {}},
    {'hostname': '192.168.1.3', 'driver': 'junos', 'username': 'admin', 'password': 'pass', 'optional_args': {}},
]

def get_device_facts(device_config):
    driver_class = napalm.get_network_driver(device_config['driver'])
    device = driver_class(
        hostname=device_config['hostname'],
        username=device_config['username'],
        password=device_config['password'],
        optional_args=device_config.get('optional_args', {}),
    )

    try:
        device.open()
        facts = device.get_facts()
        device.close()

        return {
            'host': device_config['hostname'],
            'vendor': facts.get('vendor'),
            'model': facts.get('model'),
            'os_version': facts.get('os_version'),
            'hostname': facts.get('hostname'),
            'uptime_days': facts.get('uptime', 0) // 86400,
        }
    except Exception as e:
        return {'host': device_config['hostname'], 'error': str(e)}

# Collect facts from all devices in parallel
with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(get_device_facts, inventory))

# Display results
for result in results:
    if 'error' in result:
        print(f"ERROR {result['host']}: {result['error']}")
    else:
        print(f"{result['host']} | {result['vendor']} {result['model']} | "
              f"{result['os_version']} | Uptime: {result['uptime_days']} days")
```

## Step 5: Environment Monitoring

```python
import napalm

driver = napalm.get_network_driver('eos')
device = driver('192.168.1.2', 'admin', 'password')

device.open()

# Get environment data (temperature, power, fans)
environment = device.get_environment()

print("CPU:", environment.get('cpu'))
print("Memory:", environment.get('memory'))
for fan, data in environment.get('fans', {}).items():
    print(f"Fan {fan}: {'OK' if data.get('status') else 'FAIL'}")

for sensor, data in environment.get('temperature', {}).items():
    temp = data.get('temperature', 0)
    alert = data.get('is_alert', False)
    print(f"Temp {sensor}: {temp}°C {'ALERT!' if alert else 'OK'}")

device.close()
```

## Conclusion

NAPALM provides a unified interface for network device automation across multiple vendors. Use `napalm.get_network_driver('ios')` to load the correct driver, then `device.get_facts()` for hostname/model/serial data and `device.get_interfaces_ip()` for IP addressing. The same code works for Cisco IOS, Arista EOS, and Juniper JunOS without modification. Use `ThreadPoolExecutor` to collect facts from many devices in parallel for efficient inventory auditing.
