# How to Reserve IPv4 Addresses for Network Infrastructure Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Infrastructure, DHCP Reservations, Network Devices, Addressing

Description: Learn best practices for reserving IPv4 addresses for routers, switches, firewalls, and management interfaces, ensuring consistent and conflict-free infrastructure addressing.

## Why Reserve Infrastructure Addresses?

Network devices (routers, switches, firewalls, APs) need stable, predictable IP addresses because:
- Management scripts and monitoring target specific IPs
- SSH/Telnet access relies on known addresses
- Routing protocols use specific interface IPs
- SNMP polling uses static device IPs

Without reservations, DHCP might assign different IPs after reboots.

## Step 1: Design Infrastructure Address Ranges

Reserve the low end of each subnet for network infrastructure:

```text
Subnet: 192.168.1.0/24

Reserved for infrastructure:
  192.168.1.1   = Default gateway (router)
  192.168.1.2   = Secondary router / standby
  192.168.1.3   = Firewall inside interface
  192.168.1.4   = Switch management SVI
  192.168.1.5-9 = Additional network devices
  192.168.1.10  = Primary DNS server
  192.168.1.11  = Secondary DNS server
  192.168.1.12  = DHCP server
  192.168.1.13-19 = Other servers

DHCP pool starts at:
  192.168.1.100 - 192.168.1.200 (client devices)
```

## Step 2: Create DHCP Reservations by MAC Address

For infrastructure devices managed via DHCP:

**ISC DHCPD (legacy; ISC DHCP is EOL):**
```text
# /etc/dhcp/dhcpd.conf

host core-switch {
    hardware ethernet AA:BB:CC:DD:EE:FF;
    fixed-address 192.168.1.4;
    option host-name "core-switch";
}

host access-switch-1 {
    hardware ethernet 11:22:33:44:55:66;
    fixed-address 192.168.1.5;
    option host-name "access-switch-1";
}

host wifi-ap-floor1 {
    hardware ethernet AA:11:BB:22:CC:33;
    fixed-address 192.168.1.6;
    option host-name "ap-floor1";
}
```

**dnsmasq:**
```text
# /etc/dnsmasq.conf

# DHCP reservations for infrastructure devices

dhcp-host=AA:BB:CC:DD:EE:FF,192.168.1.4,core-switch,infinite
dhcp-host=11:22:33:44:55:66,192.168.1.5,access-sw1,infinite
dhcp-host=AA:11:BB:22:CC:33,192.168.1.6,ap-floor1,infinite
```

## Step 3: Configure Static IPs on Network Devices

For devices that should use static configuration (more reliable than DHCP):

**Cisco IOS Switch (management SVI, IP routing disabled):**
```text
! Configure management VLAN IP
interface vlan 1
 ip address 192.168.1.4 255.255.255.0
 no shutdown

ip default-gateway 192.168.1.1
```

**Cisco CAPWAP AP (console CLI):**
```text
capwap ap ip 192.168.1.6 255.255.255.0 192.168.1.1 192.168.1.10
```

## Step 4: Allocate Loopback Addresses for Routers

Loopback interfaces are used as router IDs and stable management addresses:

```text
Loopback address scheme (dedicated block):
  10.255.0.0/24 - Router loopback addresses

  10.255.0.1/32  = Core-Router-01
  10.255.0.2/32  = Core-Router-02
  10.255.0.3/32  = Distribution-Router-01
  10.255.0.4/32  = Distribution-Router-02
  10.255.0.10/32 = Branch-Router-NYC
  10.255.0.11/32 = Branch-Router-London
```

**Cisco IOS:**
```text
interface Loopback0
 description Router_Management_and_RouterID
 ip address 10.255.0.1 255.255.255.255
 no shutdown
```

## Step 5: Document Infrastructure IPs in IPAM

```python
import requests

NETBOX_URL = "http://netbox.example.com"
NETBOX_TOKEN = "your_token"
headers = {"Authorization": f"Token {NETBOX_TOKEN}", "Content-Type": "application/json"}

infrastructure_devices = [
    {"ip": "192.168.1.1/24", "device": "core-router-01", "interface": "GigabitEthernet0/0", "status": "active"},
    {"ip": "192.168.1.2/24", "device": "core-router-02", "interface": "GigabitEthernet0/0", "status": "active"},
    {"ip": "192.168.1.4/24", "device": "core-switch-01", "interface": "Vlan1", "status": "active"},
]

for device in infrastructure_devices:
    payload = {
        "address": device["ip"],
        "status": device["status"],
        "description": f"{device['device']} - {device['interface']}",
        "role": "loopback" if "/32" in device["ip"] else None,
    }
    response = requests.post(f"{NETBOX_URL}/api/ipam/ip-addresses/", json=payload, headers=headers)
    if response.status_code == 201:
        print(f"Created: {device['ip']} for {device['device']}")
    else:
        print(f"Error: {response.text}")
```

## Step 6: Exclude Infrastructure IPs from DHCP Pool

Always exclude reserved ranges from DHCP:

```bash
# ISC DHCPD (legacy): set range to start after reserved block
subnet 192.168.1.0 netmask 255.255.255.0 {
    # Infrastructure: .1-.99 are manually assigned
    # DHCP pool starts at .100
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;
}
```

## Conclusion

Reserve the low end of each subnet (typically .1-.99) for network infrastructure with either static configuration or DHCP reservations tied to MAC addresses. Create a dedicated loopback block (10.255.0.0/24) for router IDs and management access. Document all reservations in IPAM to prevent conflicts, and configure DHCP pools to start at .100 or higher to leave infrastructure addresses protected. This ensures network devices always have predictable, stable IP addresses.
