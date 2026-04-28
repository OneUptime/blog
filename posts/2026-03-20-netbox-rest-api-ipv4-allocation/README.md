# How to Use NetBox REST API to Automate IPv4 Address Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NetBox, REST API, IPv4, IPAM, Automation, Python

Description: Use the NetBox REST API and Python to automatically allocate IPv4 addresses from prefixes during server provisioning workflows.

NetBox's REST API makes it possible to integrate IPAM into provisioning automation. When a new server is provisioned, your automation pipeline can claim the next available IP from NetBox.

## Setting Up API Authentication

```bash
# Generate an API token via the web UI:

# Click your username (top-right) → API Tokens → + Add Token

# Test authentication
curl -H "Authorization: Token <YOUR_TOKEN>" \
  http://netbox.example.com/api/ | python3 -m json.tool

# Set token as environment variable for convenience
export NETBOX_TOKEN="your-api-token-here"
export NETBOX_URL="http://netbox.example.com"
```

## Python Client Setup

```bash
# Install pynetbox - the official NetBox Python client
pip install pynetbox
```

```python
# netbox_client.py
import pynetbox

# Connect to NetBox
nb = pynetbox.api(
    "http://netbox.example.com",
    token="your-api-token-here"
)

# Test connection
print(nb.dcim.sites.all())
```

## Automatically Allocating the Next IP from a Prefix

```python
# allocate_ip.py
import pynetbox

nb = pynetbox.api("http://netbox.example.com", token="your-api-token")

def allocate_next_ip(prefix_cidr, description, dns_name):
    """
    Allocate the next available IPv4 address from a given prefix.
    Returns the allocated IP address string.
    """
    # Find the prefix
    prefix = nb.ipam.prefixes.get(prefix=prefix_cidr)
    if not prefix:
        raise ValueError(f"Prefix {prefix_cidr} not found")

    # Get available IPs in the prefix
    available = prefix.available_ips.list()
    if not available:
        raise RuntimeError(f"No available IPs in {prefix_cidr}")

    # Allocate the first available IP
    new_ip = nb.ipam.ip_addresses.create(
        address=available[0]["address"],
        status="active",
        description=description,
        dns_name=dns_name
    )
    return new_ip.address

# Usage
ip = allocate_next_ip("10.100.1.0/24", "New web server", "web03.corp.example.com")
print(f"Allocated: {ip}")
```

## Complete Provisioning Workflow

```python
# provision_server.py
import pynetbox

nb = pynetbox.api("http://netbox.example.com", token="your-api-token")

def provision_server(hostname, role, site_name, prefix_cidr):
    """
    Full server provisioning: create device, interface, and allocate IP.
    """
    # 1. Get or create the device type and role
    device_role = nb.dcim.device_roles.get(name=role)
    site = nb.dcim.sites.get(name=site_name)
    device_type = nb.dcim.device_types.get(slug="generic-server")

    # 2. Create the device record
    device = nb.dcim.devices.create(
        name=hostname,
        role=device_role.id,
        site=site.id,
        device_type=device_type.id,
        status="active"
    )

    # 3. Create a management interface
    interface = nb.dcim.interfaces.create(
        device=device.id,
        name="eth0",
        type="1000base-t"
    )

    # 4. Allocate next available IP
    prefix = nb.ipam.prefixes.get(prefix=prefix_cidr)
    available = prefix.available_ips.list()

    ip = nb.ipam.ip_addresses.create(
        address=available[0]["address"],
        status="active",
        dns_name=f"{hostname}.corp.example.com",
        assigned_object_type="dcim.interface",
        assigned_object_id=interface.id
    )

    # 5. Set as primary IP
    device.primary_ip4 = ip.id
    device.save()

    return {
        "device_id": device.id,
        "ip_address": ip.address,
        "interface": interface.name
    }

result = provision_server("web04", "Web Server", "New York", "10.100.1.0/24")
print(f"Provisioned: {result}")
```

## Searching for IPs via API

```bash
# Find all active IPs in a prefix
curl -H "Authorization: Token $NETBOX_TOKEN" \
  "$NETBOX_URL/api/ipam/ip-addresses/?parent=10.100.1.0/24&status=active" \
  | python3 -m json.tool

# Find IP by DNS name
curl -H "Authorization: Token $NETBOX_TOKEN" \
  "$NETBOX_URL/api/ipam/ip-addresses/?dns_name=web03.corp.example.com" \
  | python3 -m json.tool | grep '"address"'
```

Integrating NetBox into provisioning automation ensures every assigned IP is documented with full context the moment it's allocated.
