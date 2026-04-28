# How to Push IPv4 Static Routes to Multiple Routers Using Netmiko

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Netmiko, Python, Static Routes, IPv4, Network Automation, Cisco

Description: Learn how to use Netmiko to automate the deployment of IPv4 static routes to multiple Cisco routers from a Python script or YAML configuration file.

## Why Automate Static Route Deployment?

Manually configuring static routes on dozens of routers is error-prone and time-consuming. Netmiko allows you to push static routes to all devices simultaneously, with verification, from a single script.

## Step 1: Push a Static Route to a Single Router

```python
from netmiko import ConnectHandler

device = {
    'device_type': 'cisco_ios',
    'host': '192.168.1.1',
    'username': 'admin',
    'password': 'password',
    'secret': 'enablepass',
}

# Add a static route

route_commands = [
    'ip route 10.20.0.0 255.255.0.0 192.168.1.254',     # DC network
    'ip route 172.16.0.0 255.255.0.0 192.168.1.253',    # Secondary path
    'ip route 0.0.0.0 0.0.0.0 203.0.113.1',             # Default route
]

with ConnectHandler(**device) as conn:
    conn.enable()
    output = conn.send_config_set(route_commands)
    print(output)

    # Verify routes were added
    routing_table = conn.send_command('show ip route static')
    print(routing_table)

    conn.save_config()
```

## Step 2: Define Routes in YAML

Separate data from code using a YAML configuration file:

```yaml
# routes.yaml
routers:
  - host: 192.168.1.1
    name: router-01
    static_routes:
      - network: 10.20.0.0
        mask: 255.255.0.0
        next_hop: 192.168.1.254
        description: DC_Network

  - host: 192.168.1.2
    name: router-02
    static_routes:
      - network: 10.30.0.0
        mask: 255.255.0.0
        next_hop: 192.168.2.254
        description: Branch_Network
      - network: 0.0.0.0
        mask: 0.0.0.0
        next_hop: 203.0.113.1
        description: Default_Route
```

```python
import yaml
from netmiko import ConnectHandler

def push_static_routes(yaml_file, username, password, enable_pass):
    with open(yaml_file) as f:
        config = yaml.safe_load(f)

    for router in config['routers']:
        device = {
            'device_type': 'cisco_ios',
            'host': router['host'],
            'username': username,
            'password': password,
            'secret': enable_pass,
        }

        # Build route commands
        commands = []
        for route in router.get('static_routes', []):
            cmd = f"ip route {route['network']} {route['mask']} {route['next_hop']}"
            if 'description' in route:
                cmd += f" name {route['description']}"
            commands.append(cmd)

        if not commands:
            continue

        print(f"\n--- Configuring {router['name']} ({router['host']}) ---")
        try:
            with ConnectHandler(**device) as conn:
                conn.enable()
                output = conn.send_config_set(commands)
                print(output)
                conn.save_config()
                print("Saved.")
        except Exception as e:
            print(f"ERROR: {e}")

push_static_routes('routes.yaml', 'admin', 'password', 'enablepass')
```

## Step 3: Remove Static Routes

```python
from netmiko import ConnectHandler

def remove_static_routes(device_info, routes_to_remove):
    """Remove static routes using 'no ip route' commands."""
    with ConnectHandler(**device_info) as conn:
        conn.enable()

        commands = []
        for route in routes_to_remove:
            commands.append(
                f"no ip route {route['network']} {route['mask']} {route['next_hop']}"
            )

        output = conn.send_config_set(commands)
        conn.save_config()
        return output

device = {
    'device_type': 'cisco_ios', 'host': '192.168.1.1',
    'username': 'admin', 'password': 'password', 'secret': 'enablepass',
}

routes_to_remove = [
    {'network': '10.20.0.0', 'mask': '255.255.0.0', 'next_hop': '192.168.1.254'},
]

result = remove_static_routes(device, routes_to_remove)
print(result)
```

## Step 4: Verify Routes After Deployment

```python
from netmiko import ConnectHandler
import re

def verify_routes(device_info, expected_networks):
    """Verify that expected routes appear in the routing table."""
    with ConnectHandler(**device_info) as conn:
        conn.enable()
        routing_table = conn.send_command('show ip route static')

    missing = []
    for network in expected_networks:
        if network not in routing_table:
            missing.append(network)

    if missing:
        print(f"MISSING routes: {missing}")
        return False
    else:
        print("All expected routes are present.")
        return True

device = {
    'device_type': 'cisco_ios', 'host': '192.168.1.1',
    'username': 'admin', 'password': 'password', 'secret': 'enablepass',
}

verify_routes(device, ['10.20.0.0', '172.16.0.0'])
```

## Step 5: Deploy with Rollback on Failure

```python
from netmiko import ConnectHandler

def deploy_with_rollback(device_info, new_routes):
    """Apply routes with automatic rollback if verification fails."""
    with ConnectHandler(**device_info) as conn:
        conn.enable()

        # Capture current state
        before = conn.send_command('show ip route static')

        # Apply new routes
        conn.send_config_set(new_routes)
        after = conn.send_command('show ip route static')

        print("Routes applied. Verify the changes:")
        print(after)

        confirm = input("Commit? (yes/no): ")
        if confirm.lower() != 'yes':
            # Rollback: remove newly added routes
            rollback_cmds = ['no ' + r for r in new_routes if r.startswith('ip route')]
            conn.send_config_set(rollback_cmds)
            conn.save_config()
            print("Rolled back.")
        else:
            conn.save_config()
            print("Committed.")
```

## Conclusion

Netmiko automates static route deployment across multiple routers using `send_config_set()` with `ip route` commands. Store route definitions in YAML to separate data from code, then iterate through the router list applying routes. Always verify with `show ip route static` after deployment and implement rollback logic for production changes. This approach eliminates manual configuration errors and enables deploying routes to dozens of routers in seconds.
