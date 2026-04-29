# How to Build an IPv6 Test Lab in EVE-NG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: EVE-NG, IPv6, Test Lab, Networking, Simulation, Cisco

Description: Build an IPv6 test lab in EVE-NG (Emulated Virtual Environment) with Cisco, Juniper, and open-source router images.

## EVE-NG Overview

EVE-NG (Emulated Virtual Environment - Next Generation) is a network emulation platform that runs vendor virtual appliances and network OS images in a lab topology. It supports:
- Cisco IOS, IOS-XE, NX-OS, IOS-XR
- Juniper vSRX, vMX, vQFX
- Arista vEOS
- Linux guests that can run FRRouting (free)

## Adding FRR to EVE-NG (Free Option)

```bash
# On the EVE-NG server, create a custom Linux QEMU image

ssh root@eve-ng-server

# Create the image directory using the required linux- prefix
mkdir /opt/unetlab/addons/qemu/linux-ubuntu-frr/
cd /opt/unetlab/addons/qemu/linux-ubuntu-frr/

# Upload an Ubuntu Server ISO to this directory, then rename it
mv ubuntu-22.04-live-server-amd64.iso cdrom.iso

# Create the virtual disk expected by EVE-NG for Linux guests
/opt/qemu/bin/qemu-img create -f qcow2 virtioa.qcow2 8G
/opt/unetlab/wrappers/unl_wrapper -a fixpermissions

# After installing Ubuntu in the guest, remove the installer ISO
rm -f /opt/unetlab/addons/qemu/linux-ubuntu-frr/cdrom.iso

# Then install FRR inside the Linux guest
apt update
apt install -y frr
sed -i 's/^zebra=no/zebra=yes/; s/^bgpd=no/bgpd=yes/; s/^ospf6d=no/ospf6d=yes/' /etc/frr/daemons
systemctl enable --now frr
```

## IPv6 Lab Topology in EVE-NG

Create a lab file (`.unl`) via EVE-NG API:

```python
import requests
from requests.utils import quote

EVE_HOST = "http://eve-ng-server"
session = requests.Session()

def login(username, password):
    """Authenticate and store the EVE-NG session cookie"""
    resp = session.post(
        f"{EVE_HOST}/api/auth/login",
        json={"username": username, "password": password},
    )
    resp.raise_for_status()
    return resp.json()

def create_lab(path, name):
    """Create a new EVE-NG lab"""
    resp = session.post(
        f"{EVE_HOST}/api/labs",
        json={
            "path": path,
            "name": name,
            "version": "1",
            "description": "IPv6 test lab",
        }
    )
    resp.raise_for_status()
    return resp.json()

def add_node(lab_path, name, template, image, ethernet=4, node_type="qemu"):
    """Add a node to the lab"""
    resp = session.post(
        f"{EVE_HOST}/api/labs/{quote(lab_path.lstrip('/'), safe='/')}/nodes",
        json={
            "type": node_type,
            "name": name,
            "template": template,
            "image": image,
            "left": "35%",
            "top": "25%",
            "ethernet": ethernet,
        }
    )
    resp.raise_for_status()
    return resp.json()

def add_network(lab_path, name, network_type="bridge"):
    """Add a network (bridge)"""
    resp = session.post(
        f"{EVE_HOST}/api/labs/{quote(lab_path.lstrip('/'), safe='/')}/networks",
        json={
            "name": name,
            "left": "35%",
            "top": "25%",
            "type": network_type,
        }
    )
    resp.raise_for_status()
    return resp.json()

login("admin", "eve")
```

## Cisco IOS IPv6 Configuration in EVE-NG

```text
! Cisco IOS/IOS-XE - OSPFv3 and BGP IPv6

! Enable IPv6 routing
ipv6 unicast-routing

! Configure interfaces
interface GigabitEthernet0/0
 no shutdown
 ipv6 address 2001:db8:12::1/64
 ospfv3 1 ipv6 area 0

interface Loopback0
 ipv6 address 2001:db8:1::1/128
 ospfv3 1 ipv6 area 0
 ospfv3 1 network point-to-point

! OSPFv3
router ospfv3 1
 router-id 1.1.1.1
 log-adjacency-changes detail
 !
 address-family ipv6 unicast
 exit-address-family

! BGP with IPv6 address family
router bgp 65001
 bgp router-id 1.1.1.1
 no bgp default ipv4-unicast
 neighbor 2001:db8:12::2 remote-as 65002
 !
 address-family ipv6 unicast
  network 2001:db8:1::1/128
  neighbor 2001:db8:12::2 activate
 exit-address-family
```

## Juniper vSRX IPv6 in EVE-NG

```text
# Juniper Junos - OSPFv3 configuration
set interfaces ge-0/0/0 unit 0 family inet6 address 2001:db8:12::1/64
set interfaces lo0 unit 0 family inet6 address 2001:db8:1::1/128

set routing-options router-id 1.1.1.1
set protocols ospf3 area 0.0.0.0 interface ge-0/0/0.0
set protocols ospf3 area 0.0.0.0 interface lo0.0 passive

set routing-options autonomous-system 65001
set policy-options policy-statement EXPORT-LOOPBACK term LOOPBACK from route-filter 2001:db8:1::1/128 exact
set policy-options policy-statement EXPORT-LOOPBACK term LOOPBACK then accept
set protocols bgp group EBGP type external
set protocols bgp group EBGP export EXPORT-LOOPBACK
set protocols bgp group EBGP neighbor 2001:db8:12::2 peer-as 65002
set protocols bgp group EBGP family inet6 unicast
```

## EVE-NG Lab Validation Script

```bash
#!/bin/bash
# Run from a host that can SSH to the nodes' management IPs

SSH_OPTS=(-o StrictHostKeyChecking=no)
NODES=(
    "cisco|admin@10.0.0.101|2001:db8:12::2"
    "junos|admin@10.0.0.102|2001:db8:12::2"
    "frr|root@10.0.0.103|2001:db8:12::2"
)

for ENTRY in "${NODES[@]}"; do
    IFS='|' read -r PLATFORM TARGET PEER <<< "${ENTRY}"
    echo "=== Validating ${PLATFORM} node ${TARGET} ==="

    case "${PLATFORM}" in
        cisco)
            ssh "${SSH_OPTS[@]}" "${TARGET}" "show ipv6 route ospf"
            ssh "${SSH_OPTS[@]}" "${TARGET}" "show bgp ipv6 unicast summary | include ${PEER}"
            ;;
        junos)
            ssh "${SSH_OPTS[@]}" "${TARGET}" "cli -c 'show route protocol ospf3'"
            ssh "${SSH_OPTS[@]}" "${TARGET}" "cli -c 'show bgp neighbor ${PEER} | match Established'"
            ;;
        frr)
            ssh "${SSH_OPTS[@]}" "${TARGET}" "vtysh -c 'show ipv6 ospf6 route summary'"
            ssh "${SSH_OPTS[@]}" "${TARGET}" "vtysh -c 'show bgp ipv6 unicast summary'"
            ;;
    esac
done
```

## Conclusion

EVE-NG provides the most realistic IPv6 network emulation with actual vendor images. EVE-NG Community Edition supports Linux, Cisco, and Juniper image templates; Pro adds multi-user and workflow features. The EVE-NG API enables lab automation for rapid topology provisioning. Key IPv6 features to test in EVE-NG: OSPFv3, BGP4+ with IPv6 address families, DHCPv6, prefix delegation, and dual-stack service configurations. Use FRR nodes for cost-free IPv6 routing protocol testing.
