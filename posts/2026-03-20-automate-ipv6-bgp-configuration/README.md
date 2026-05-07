# How to Automate IPv6 BGP Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, BGP, Automation, Python, Ansible, Routing, Jinja2

Description: Automate IPv6 BGP neighbor configuration across multiple routers using Ansible playbooks and Jinja2 templates, enabling consistent MP-BGP IPv6 deployments at scale.

## Introduction

Deploying IPv6 BGP at scale requires consistent configuration of MP-BGP (Multiprotocol BGP) sessions, address families, and route policies. Ansible with Jinja2 templates enables repeatable, auditable BGP configuration that can be deployed across hundreds of routers.
If you attach inbound or outbound route policies, the named policies must already exist on the target routers before the BGP configuration is committed.

## Step 1: BGP Neighbor Inventory

```yaml
# inventory/bgp_peers.yml

all:
  vars:
    ansible_connection: ansible.netcommon.network_cli
    ansible_network_os: cisco.iosxr.iosxr
  hosts:
    router1:
      ansible_host: 2001:db8:0:1::1
      bgp_local_as: 65001
      bgp_networks:
        - 2001:db8:1::/48
      bgp_peers:
        - peer_ip: 2001:db8:ffff:1::1
          remote_as: 65002
          description: "Upstream Provider 1"
          ipv6_unicast: true
          soft_reconfiguration: true
        - peer_ip: 2001:db8:ffff:2::1
          remote_as: 65003
          description: "Peering Partner"
          ipv6_unicast: true
          route_policy_in: "IPV6_FROM_PARTNER"
          route_policy_out: "IPV6_TO_PARTNER"

    router2:
      ansible_host: 2001:db8:0:2::1
      bgp_local_as: 65001
      bgp_networks:
        - 2001:db8:2::/48
      bgp_peers:
        - peer_ip: 2001:db8:ffff:3::1
          remote_as: 65004
          description: "Data Center Fabric"
          ipv6_unicast: true
```

## Step 2: Ansible Playbook

```yaml
# playbooks/configure_ipv6_bgp.yml
---
- name: Configure IPv6 BGP Neighbors
  hosts: all
  gather_facts: false

  tasks:
    - name: Generate BGP configuration
      template:
        src: "templates/{{ ansible_network_os }}_ipv6_bgp.j2"
        dest: "/tmp/{{ inventory_hostname }}_bgp.txt"
      delegate_to: localhost

    - name: Apply BGP config on IOS-XR
      cisco.iosxr.iosxr_config:
        src: "/tmp/{{ inventory_hostname }}_bgp.txt"
        replace: block
      when: ansible_network_os == "cisco.iosxr.iosxr"

    - name: Wait for and verify BGP sessions
      cisco.iosxr.iosxr_command:
        commands:
          - "show bgp ipv6 unicast neighbors {{ item.peer_ip }}"
        wait_for:
          - result[0] contains "BGP state = Established"
        retries: 12
        interval: 10
      loop: "{{ bgp_peers }}"
      when: ansible_network_os == "cisco.iosxr.iosxr" and not ansible_check_mode
```

## Step 3: IOS-XR BGP Jinja2 Template

```jinja2
{# templates/cisco.iosxr.iosxr_ipv6_bgp.j2 #}
router bgp {{ bgp_local_as }}
 address-family ipv6 unicast
{% for network in bgp_networks %}
  network {{ network }}
{% endfor %}
 !
{% for peer in bgp_peers %}
 neighbor {{ peer.peer_ip }}
  remote-as {{ peer.remote_as }}
  description {{ peer.description }}
{% if peer.ipv6_unicast | default(false) %}
  address-family ipv6 unicast
{% if peer.soft_reconfiguration is defined and peer.soft_reconfiguration %}
   soft-reconfiguration inbound always
{% endif %}
{% if peer.route_policy_in is defined %}
   route-policy {{ peer.route_policy_in }} in
{% endif %}
{% if peer.route_policy_out is defined %}
   route-policy {{ peer.route_policy_out }} out
{% endif %}
  !
{% endif %}
 !
{% endfor %}
!
```

## Step 4: Python BGP State Checker

```python
# scripts/check_bgp_ipv6.py
from netmiko import ConnectHandler
import yaml

def check_bgp_sessions(host: str, expected_peers: list) -> dict:
    """Verify that all expected IPv6 BGP peers are established."""
    device = {
        "device_type": "cisco_xr",
        "host": host,
        "username": "admin",
        "password": "secret",
    }

    results = {}
    with ConnectHandler(**device) as conn:
        for peer in expected_peers:
            peer_ip = peer["peer_ip"]
            output = conn.send_command(f"show bgp ipv6 unicast neighbors {peer_ip}")
            results[peer_ip] = {
                "found": peer_ip in output,
                "established": "BGP state = Established" in output,
            }

    return results

# Run compliance check
with open("inventory/bgp_peers.yml") as f:
    inventory = yaml.safe_load(f)

for hostname, host_data in inventory["all"]["hosts"].items():
    results = check_bgp_sessions(
        host_data["ansible_host"],
        host_data.get("bgp_peers", [])
    )
    for peer_ip, status in results.items():
        status_str = "UP" if status["established"] else "DOWN"
        print(f"{hostname} → {peer_ip}: {status_str}")
```

## Step 5: Deploy and Validate

```bash
# Syntax check
ansible-playbook playbooks/configure_ipv6_bgp.yml --syntax-check

# Dry run
ansible-playbook playbooks/configure_ipv6_bgp.yml --check --diff

# Deploy
ansible-playbook playbooks/configure_ipv6_bgp.yml

# Verify
python3 scripts/check_bgp_ipv6.py
```

## Conclusion

IPv6 BGP automation with Ansible reduces configuration drift and enables consistent MP-BGP deployments. Store BGP peer definitions in YAML inventory, generate device-specific configurations with Jinja2, and verify session state post-deployment. Monitor BGP peer state changes with OneUptime alerts to detect flapping sessions before they impact traffic.
