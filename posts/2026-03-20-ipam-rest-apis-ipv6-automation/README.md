# How to Use IPAM REST APIs for IPv6 Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPAM, REST API, Automation, NetBox, Python

Description: Use IPAM REST APIs to automate IPv6 address allocation, prefix management, and DNS record creation as part of infrastructure provisioning workflows.

## Introduction

IPAM REST APIs enable infrastructure-as-code workflows where address allocation is automated rather than manual. Every provisioning event (new VM, new container, new network device) triggers an IPAM API call that allocates an address and creates associated records. This guide covers patterns for NetBox, Infoblox, and generic IPAM REST API usage.

## NetBox REST API for IPv6

```python
#!/usr/bin/env python3
# netbox_ipv6_api.py

import requests
from typing import Optional

NETBOX_URL = "http://netbox.internal"
TOKEN = "nbt_<key>.<token>"

class NetBoxIPAM:
    def __init__(self, url: str, token: str):
        self.base = f"{url}/api"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def get_prefix_id(self, prefix: str) -> Optional[int]:
        resp = requests.get(
            f"{self.base}/ipam/prefixes/",
            params={"prefix": prefix},
            headers=self.headers
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
        return results[0]["id"] if results else None

    def allocate_next_ipv6(self, parent_prefix: str,
                            description: str = "",
                            dns_name: str = "") -> str:
        """Allocate next available IPv6 from a prefix."""
        prefix_id = self.get_prefix_id(parent_prefix)
        if not prefix_id:
            raise ValueError(f"Prefix {parent_prefix} not found")

        resp = requests.post(
            f"{self.base}/ipam/prefixes/{prefix_id}/available-ips/",
            json={},
            headers=self.headers
        )
        resp.raise_for_status()
        ip_record = resp.json()

        patch_resp = requests.patch(
            f"{self.base}/ipam/ip-addresses/{ip_record['id']}/",
            json={
                "description": description,
                "dns_name": dns_name,
                "status": "active"
            },
            headers=self.headers
        )
        patch_resp.raise_for_status()
        return patch_resp.json()["address"]

    def create_prefix(self, prefix: str, site_slug: Optional[str] = None,
                       description: str = "") -> dict:
        """Create a new IPv6 prefix."""
        data = {
            "prefix": prefix,
            "description": description,
            "status": "active"
        }
        if site_slug:
            site_resp = requests.get(
                f"{self.base}/dcim/sites/",
                params={"slug": site_slug},
                headers=self.headers
            )
            site_resp.raise_for_status()
            sites = site_resp.json().get("results", [])
            if sites:
                data["scope_type"] = "dcim.site"
                data["scope_id"] = sites[0]["id"]

        resp = requests.post(
            f"{self.base}/ipam/prefixes/",
            json=data, headers=self.headers
        )
        resp.raise_for_status()
        return resp.json()

    def search_addresses(self, prefix: str) -> list:
        """Search for IPv6 addresses within a prefix."""
        resp = requests.get(
            f"{self.base}/ipam/ip-addresses/",
            params={"parent": prefix, "family": 6, "limit": 200},
            headers=self.headers
        )
        resp.raise_for_status()
        return resp.json().get("results", [])

    def mark_deprecated(self, address: str, reason: str = "") -> bool:
        """Mark an IPv6 address as deprecated."""
        resp = requests.get(
            f"{self.base}/ipam/ip-addresses/",
            params={"address": address},
            headers=self.headers
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
        if not results:
            return False

        ip_id = results[0]["id"]
        patch_resp = requests.patch(
            f"{self.base}/ipam/ip-addresses/{ip_id}/",
            json={
                "status": "deprecated",
                "description": f"Deprecated: {reason}"
            },
            headers=self.headers
        )
        patch_resp.raise_for_status()
        return True

# Usage

ipam = NetBoxIPAM(NETBOX_URL, TOKEN)

# Allocate address for new server
new_ip = ipam.allocate_next_ipv6(
    parent_prefix="2001:db8:0001:0001::/64",
    description="Auto-provisioned web server",
    dns_name="web-server-15.example.com"
)
print(f"Allocated: {new_ip}")
```

## Terraform Provider Pattern

```hcl
# Match the provider version to your NetBox release
terraform {
  required_providers {
    netbox = {
      source  = "e-breuninger/netbox"
      version = "~> 5.0"
    }
  }
}

provider "netbox" {
  server_url = "https://netbox.internal"
  api_token  = "<your api token>"
}

# Allocate IPv6 address from IPAM
resource "netbox_available_ip_address" "instance_ipv6" {
  prefix_id   = data.netbox_prefix.app_servers.id
  dns_name    = "${var.instance_name}.example.com"
  description = "Terraform-managed instance: ${var.instance_name}"
  status      = "active"
}

data "netbox_prefix" "app_servers" {
  prefix = "2001:db8:0001:0001::/64"
}

output "instance_ipv6_address" {
  value = split("/", netbox_available_ip_address.instance_ipv6.ip_address)[0]
}
```

## Ansible Integration

```yaml
# allocate_ipv6.yml
- name: Allocate IPv6 address from NetBox IPAM
  ansible.builtin.uri:
    url: "http://netbox.internal/api/ipam/prefixes/{{ prefix_id }}/available-ips/"
    method: POST
    headers:
      Authorization: "Bearer {{ netbox_token }}"
      Content-Type: "application/json"
    body_format: json
    body: {}
    status_code: 201
  register: ipam_allocation

- name: Update allocated IPv6 metadata in NetBox
  ansible.builtin.uri:
    url: "http://netbox.internal/api/ipam/ip-addresses/{{ ipam_allocation.json.id }}/"
    method: PATCH
    headers:
      Authorization: "Bearer {{ netbox_token }}"
      Content-Type: "application/json"
    body_format: json
    body:
      description: "Ansible-provisioned: {{ inventory_hostname }}"
      dns_name: "{{ inventory_hostname }}.example.com"
      status: "active"
    status_code: 200

- name: Set allocated IPv6 fact
  set_fact:
    allocated_ipv6: "{{ ipam_allocation.json.address | ansible.utils.ipaddr('address') }}"

- name: Configure server IPv6 address
  community.general.nmcli:
    conn_name: eth0
    type: ethernet
    ip6: "{{ allocated_ipv6 }}/64"
    gw6: "2001:db8:0001:0001::1"
    state: present
```

## Conclusion

IPAM REST APIs enable IPv6 address management to become part of infrastructure-as-code workflows. The NetBox `available-ips` endpoint atomically allocates the next available address, and the created IP object can then be updated with metadata such as status, description, or `dns_name`. Integrate IPAM allocation into provisioning pipelines (Terraform, Ansible, CI/CD) to ensure every address is tracked from creation. Use IPAM API calls in decommission workflows to mark addresses as deprecated, maintaining audit history without deleting records.
