# How to Use Netmiko to SSH into a Cisco Router and Run Show Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Netmiko, Python, Cisco, SSH, Network Automation

Description: Learn how to use the Python Netmiko library to SSH into Cisco routers and switches and run show commands to retrieve device information programmatically.

## What Is Netmiko?

Netmiko is a Python library that simplifies SSH connections to network devices. It handles:
- SSH connection establishment and authentication
- Sending commands and receiving output
- Handling enable mode and configuration mode
- Multi-vendor device support (Cisco, Juniper, Arista, and 50+ others)

## Step 1: Install Netmiko

```bash
pip install netmiko

# Verify

python3 -c "import netmiko; print(netmiko.__version__)"
```

## Step 2: Basic SSH Connection and Show Command

```python
from netmiko import ConnectHandler

# Device connection dictionary
cisco_device = {
    'device_type': 'cisco_ios',
    'host': '192.168.1.1',
    'username': 'admin',
    'password': 'mypassword',
    'secret': 'enablepassword',   # Enable password (if required)
    'port': 22,
}

# Connect to the device
with ConnectHandler(**cisco_device) as conn:
    # Run a show command
    output = conn.send_command('show version')
    print(output)

    # Run another command
    interfaces = conn.send_command('show ip interface brief')
    print(interfaces)
```

## Step 3: Enter Enable Mode for Privileged Commands

```python
from netmiko import ConnectHandler

device = {
    'device_type': 'cisco_ios',
    'host': '192.168.1.1',
    'username': 'admin',
    'password': 'userpass',
    'secret': 'enablepass',
}

with ConnectHandler(**device) as conn:
    # Check if we're in enable mode
    print("In enable mode:", conn.check_enable_mode())

    # Enter enable mode
    conn.enable()
    print("In enable mode:", conn.check_enable_mode())

    # Run privileged commands
    output = conn.send_command('show running-config')
    print(output[:500])   # Print first 500 chars
```

## Step 4: Connect to Multiple Devices

```python
from netmiko import ConnectHandler
from concurrent.futures import ThreadPoolExecutor

devices = [
    {'device_type': 'cisco_ios', 'host': '192.168.1.1', 'username': 'admin', 'password': 'pass', 'secret': 'en_pass'},
    {'device_type': 'cisco_ios', 'host': '192.168.1.2', 'username': 'admin', 'password': 'pass', 'secret': 'en_pass'},
    {'device_type': 'cisco_ios', 'host': '192.168.1.3', 'username': 'admin', 'password': 'pass', 'secret': 'en_pass'},
]

def get_version(device):
    try:
        with ConnectHandler(**device) as conn:
            output = conn.send_command('show version')
            return {'host': device['host'], 'output': output}
    except Exception as e:
        return {'host': device['host'], 'error': str(e)}

# Run in parallel (3 threads)
with ThreadPoolExecutor(max_workers=3) as executor:
    results = list(executor.map(get_version, devices))

for result in results:
    if 'error' in result:
        print(f"{result['host']}: ERROR - {result['error']}")
    else:
        # Extract version from output
        for line in result['output'].splitlines():
            if 'Version' in line:
                print(f"{result['host']}: {line.strip()}")
                break
```

## Step 5: Handle Common Connection Errors

```python
from netmiko import ConnectHandler, NetmikoTimeoutException, NetmikoAuthenticationException

device = {
    'device_type': 'cisco_ios',
    'host': '192.168.1.1',
    'username': 'admin',
    'password': 'password',
    'conn_timeout': 10,      # TCP connection timeout in seconds
    'timeout': 30,           # SSH operation timeout in seconds
}

try:
    with ConnectHandler(**device) as conn:
        output = conn.send_command('show ip route')
        print(output)

except NetmikoAuthenticationException:
    print("Authentication failed: wrong username/password")

except NetmikoTimeoutException:
    print("Connection timed out: device unreachable or SSH not enabled")

except Exception as e:
    print(f"Unexpected error: {e}")
```

## Step 6: Use Device Inventory from File

```python
import yaml
from netmiko import ConnectHandler

# inventory.yaml
# devices:
#   - host: 192.168.1.1
#     device_type: cisco_ios
#     username: admin
#     password: password

def run_commands_from_inventory(inventory_file, commands):
    with open(inventory_file) as f:
        inventory = yaml.safe_load(f)

    for device in inventory['devices']:
        print(f"\n--- {device['host']} ---")
        try:
            with ConnectHandler(**device) as conn:
                for cmd in commands:
                    output = conn.send_command(cmd)
                    print(f"\n{cmd}:\n{output}")
        except Exception as e:
            print(f"Error: {e}")

run_commands_from_inventory('inventory.yaml', ['show version', 'show ip interface brief'])
```

## Conclusion

Netmiko simplifies SSH automation for network devices by handling connection setup, authentication, and command sending. Use `ConnectHandler` with the `device_type`, `host`, `username`, and `password` keys to connect. Run show commands with `send_command()`, enter privileged mode with `conn.enable()`, and handle errors with `NetmikoTimeoutException` and `NetmikoAuthenticationException`. Use Python's `ThreadPoolExecutor` for parallel execution across many devices.
