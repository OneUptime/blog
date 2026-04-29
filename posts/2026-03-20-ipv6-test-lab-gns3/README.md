# How to Build an IPv6 Test Lab in GNS3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GNS3, IPv6, Test Lab, Networking, Simulation, Router

Description: Build a realistic IPv6 test lab in GNS3 with router images, OSPFv3, BGP, and dual-stack configurations.

## GNS3 IPv6 Lab Requirements

GNS3 supports IPv6 natively through:
- Router images (Cisco IOSv, IOSvL2, Arista vEOS, FRR containers)
- Cloud nodes for upstream IPv6 access and NAT nodes for simple internet access
- Linux hosts for end-device simulation

## Installing GNS3 and FRR Appliance

```bash
# Install GNS3 on Ubuntu

sudo add-apt-repository ppa:gns3/ppa
sudo apt update
sudo apt install gns3-gui gns3-server

# Pull a Debian-based FRR Docker image for GNS3
docker pull frrouting/frr-debian:latest

# Create a custom FRR image with tools
cat > Dockerfile.frr-lab << 'EOF'
FROM frrouting/frr-debian:latest
RUN apt-get update && apt-get install -y \
    iputils-ping \
    tcpdump \
    traceroute \
    curl \
    iproute2
EOF

docker build -t frr-lab:latest -f Dockerfile.frr-lab .
```

## GNS3 FRR Node OSPFv3 Configuration

After connecting nodes in GNS3, configure OSPFv3:

```text
! FRR Router 1 (R1) - via vtysh console
configure terminal
!
interface eth0
 ipv6 address 2001:db8:12::1/64
 no shutdown
!
interface eth1
 ipv6 address 2001:db8:13::1/64
 no shutdown
!
interface lo
 ipv6 address 2001:db8:1::1/128
!
router ospf6
 ospf6 router-id 1.1.1.1
!
interface eth0
 ipv6 ospf6 area 0.0.0.0
!
interface eth1
 ipv6 ospf6 area 0.0.0.0
!
interface lo
 ipv6 ospf6 passive
 ipv6 ospf6 area 0.0.0.0
!
end
write file
```

## BGP IPv6 in GNS3

```text
! R1 BGP configuration (eBGP between AS65001 and AS65002)
configure terminal
!
router bgp 65001
 bgp router-id 1.1.1.1
 neighbor 2001:db8:12::2 remote-as 65002
 !
 address-family ipv6 unicast
  neighbor 2001:db8:12::2 activate
  network 2001:db8:1::1/128
 exit-address-family
!
end
write file
```

## GNS3 Topology Script (Python GNS3 API)

Automate topology creation via the GNS3 API:

```python
import requests

GNS3_SERVER = "http://localhost:3080"
PROJECT_NAME = "IPv6-Lab"

def create_project():
    resp = requests.post(
        f"{GNS3_SERVER}/v2/projects",
        json={"name": PROJECT_NAME},
    )
    resp.raise_for_status()
    return resp.json()["project_id"]

def add_node(project_id, name, template_name, x=0, y=0):
    # Get template ID
    templates_resp = requests.get(f"{GNS3_SERVER}/v2/templates")
    templates_resp.raise_for_status()
    templates = templates_resp.json()
    template = next((t for t in templates if t["name"] == template_name), None)
    if not template:
        raise ValueError(f"Template {template_name} not found")

    resp = requests.post(
        f"{GNS3_SERVER}/v2/projects/{project_id}/templates/{template['template_id']}",
        json={
            "name": name,
            "x": x, "y": y,
        },
    )
    resp.raise_for_status()
    return resp.json()["node_id"]

def add_link(project_id, node1_id, port1, node2_id, port2):
    resp = requests.post(
        f"{GNS3_SERVER}/v2/projects/{project_id}/links",
        json={
            "nodes": [
                {"node_id": node1_id, "adapter_number": 0, "port_number": port1},
                {"node_id": node2_id, "adapter_number": 0, "port_number": port2},
            ]
        },
    )
    resp.raise_for_status()
    return resp.json()

def build_ipv6_lab():
    project_id = create_project()
    print(f"Created project: {project_id}")

    template_name = "FRR"  # Match this to the imported appliance name in GNS3.

    r1 = add_node(project_id, "R1", template_name, x=-100, y=0)
    r2 = add_node(project_id, "R2", template_name, x=100, y=0)
    r3 = add_node(project_id, "R3", template_name, x=0, y=100)

    add_link(project_id, r1, 0, r2, 0)
    add_link(project_id, r2, 1, r3, 0)
    add_link(project_id, r1, 1, r3, 1)

    print("Topology created. Configure IPv6 addresses and routing via console.")
    return project_id

if __name__ == "__main__":
    build_ipv6_lab()
```

## Verification in GNS3

After configuring routing:

```text
# In FRR vtysh console
show ipv6 route
show ipv6 ospf6 neighbor
show bgp ipv6 unicast summary

# End-to-end test
ping ipv6 2001:db8:3::1 source 2001:db8:1::1

# Traceroute
traceroute ipv6 2001:db8:3::1
```

## Conclusion

GNS3 provides a GUI-based environment for realistic IPv6 lab scenarios. FRR Docker containers are the quickest way to get started without needing commercial router images. The GNS3 REST API enables topology automation via Python. For Cisco IOS-based labs, GNS3 requires IOS/IOS-XE images from a valid Cisco entitlement. FRR covers OSPFv3, BGP-4+ with IPv6 AFI, IS-IS, and static routing - sufficient for most IPv6 learning and testing scenarios.
