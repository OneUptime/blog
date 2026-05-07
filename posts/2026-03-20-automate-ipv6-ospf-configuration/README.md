# How to Automate IPv6 OSPFv3 Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, OSPFv3, Automation, Ansible, Python, Routing

Description: Automate IPv6 OSPFv3 configuration across network devices using Ansible, including area configuration, interface assignment, and neighbor verification.

## Introduction

OSPFv3 is the IPv6 routing protocol for link-state interior gateway routing. Automating its configuration ensures consistent area assignments, passive interface settings, and redistribution settings across all routers in your network.

## Step 1: OSPFv3 Policy Definition

```yaml
# policies/ospfv3_policy.yml

ospf:
  process_id: 1
  router_id: 10.0.0.1   # 32-bit router ID required for OSPFv3
  areas:
    - id: 0
      interfaces:
        - name: GigabitEthernet0/0/0/0
          passive: false
          cost: 10
          network_type: point-to-point
        - name: GigabitEthernet0/0/0/1
          passive: false
          cost: 20
    - id: 1
      stub: true
      interfaces:
        - name: GigabitEthernet0/0/0/2
          passive: true  # LAN interface - no OSPF neighbors

  # Redistribute connected IPv6 networks
  redistribute:
    - type: connected
      metric: 20
      metric_type: 2
```

## Step 2: Ansible Playbook

```yaml
# playbooks/deploy_ospfv3.yml
---
- name: Configure OSPFv3
  hosts: ospf_routers
  gather_facts: false

  vars_files:
    - "policies/ospfv3_policy.yml"

  tasks:
    - name: Generate OSPFv3 configuration
      template:
        src: "templates/iosxr_ospfv3.j2"
        dest: "/tmp/{{ inventory_hostname }}_ospfv3.txt"
      delegate_to: localhost

    - name: Apply OSPFv3 configuration
      cisco.iosxr.iosxr_config:
        src: "/tmp/{{ inventory_hostname }}_ospfv3.txt"
        replace: block

    - name: Wait for neighbor adjacency
      pause:
        seconds: 45

    - name: Verify OSPFv3 neighbors
      cisco.iosxr.iosxr_command:
        commands:
          - "show ospfv3 neighbor"
      register: ospf_neighbors

    - name: Show neighbor table
      debug:
        var: ospf_neighbors.stdout_lines
```

## Step 3: IOS-XR Jinja2 Template

```jinja2
{# templates/iosxr_ospfv3.j2 #}
router ospfv3 {{ ospf.process_id }}
 router-id {{ ospf.router_id }}
{% for area in ospf.areas %}
 area {{ area.id }}
{% if area.stub is defined and area.stub %}
  stub
{% endif %}
{% for iface in area.interfaces %}
  interface {{ iface.name }}
{% if iface.passive is defined and iface.passive %}
   passive
{% else %}
{% if iface.cost is defined %}
   cost {{ iface.cost }}
{% endif %}
{% if iface.network_type is defined %}
   network {{ iface.network_type }}
{% endif %}
{% endif %}
  !
{% endfor %}
 !
{% endfor %}
{% if ospf.redistribute is defined %}
{% for redist in ospf.redistribute %}
 redistribute {{ redist.type }} metric {{ redist.metric }}{% if redist.metric_type is defined %} metric-type {{ redist.metric_type }}{% endif %}
{% endfor %}
{% endif %}
!
```

## Step 4: Python Verification Script

```python
# scripts/verify_ospfv3.py
from netmiko import ConnectHandler
import re

def verify_ospfv3_neighbors(host: str) -> dict:
    """Check OSPFv3 neighbor adjacencies."""
    device = {
        "device_type": "cisco_xr",
        "host": host,
        "username": "admin",
        "password": "secret",
    }

    with ConnectHandler(**device) as conn:
        output = conn.send_command("show ospfv3 neighbor")

    # Parse neighbors
    neighbors = []
    for line in output.splitlines():
        # Match summary lines from "show ospfv3 neighbor"
        m = re.search(r'^\s*(\d{1,3}(?:\.\d{1,3}){3})\s+\d+\s+(FULL/\s*\S+)', line)
        if m:
            neighbors.append({
                "neighbor_id": m.group(1),
                "state": re.sub(r"\s+", "", m.group(2)),
            })

    return {"host": host, "neighbors": neighbors, "count": len(neighbors)}

# Verify all routers
routers = ["2001:db8::1", "2001:db8::2", "2001:db8::3"]
for router in routers:
    result = verify_ospfv3_neighbors(router)
    print(f"{router}: {result['count']} FULL neighbors")
    for n in result["neighbors"]:
        print(f"  {n['neighbor_id']}: {n['state']}")
```

## Step 5: Deploy and Monitor

```bash
# Check OSPFv3 database after deployment
ansible -i inventory/hosts.yml ospf_routers -m cisco.iosxr.iosxr_command \
    -a "commands='show ospfv3 database database-summary'"

# Check IPv6 route table for OSPF-learned routes
ansible -i inventory/hosts.yml ospf_routers -m cisco.iosxr.iosxr_command \
    -a "commands='show route ipv6 unicast'"

# Full playbook deployment
ansible-playbook playbooks/deploy_ospfv3.yml -v
```

## Conclusion

OSPFv3 automation with Ansible and Jinja2 templates ensures consistent area and interface assignments across all routers. Always validate neighbor adjacency after deployment using the verification script. Store OSPFv3 policies in version-controlled YAML files. Monitor OSPFv3 neighbor state changes with OneUptime to alert on adjacency drops that could indicate network partitioning.
