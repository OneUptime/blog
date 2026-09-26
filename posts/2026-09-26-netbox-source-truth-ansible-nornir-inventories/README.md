# How to Turn NetBox into the Source of Truth for Ansible and Nornir Inventories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NetBox, Ansible, Nornir, Inventory, Network Automation

Description: Generate Ansible and Nornir inventories from validated NetBox device data with explicit platform mappings, complete pagination, and consistent targeting.

NetBox becomes a source of truth when automation consumes its records through a clear contract. Merely replacing a static inventory with an API query does not establish that contract. Missing management addresses, ambiguous names, and unsupported platform slugs can still produce an incomplete or incorrectly targeted job.

A reliable integration separates three concerns: selecting approved devices, validating their data, and translating that data into each automation tool's inventory format.

## Define the Inventory Contract

For this example, manage physical devices that are active and carry an `automation-managed` tag. Require a unique device name, a primary management IP, and a recognized platform. Exclude virtual machines deliberately; add a separate VM workflow when needed.

Use a small translation table. NetBox platform slugs are local data, while Ansible network OS names and Netmiko device types are tool identifiers:

| NetBox slug used here | Ansible network OS | Nornir platform for Netmiko |
|---|---|---|
| `ios-xe` | `cisco.ios.ios` | `cisco_ios` |
| `eos` | `arista.eos.eos` | `arista_eos` |

Do not assume those NetBox slugs exist in your instance. Create or adapt the mapping to match your approved platform catalog. Keep authentication outside device inventory; NetBox inventory access and device login are different credentials.

## Use the Ansible Inventory Plugin for Direct Queries

Install `netbox.netbox` and the network collections you need. The following `netbox.yml` assumes NetBox 4.5 or later and a complete v2 API token (`nbt_<key>.<token>`) injected as `NETBOX_TOKEN`:

```yaml
plugin: netbox.netbox.nb_inventory
api_endpoint: https://netbox.example.com
token:
  type: Bearer
  value: "{{ lookup('ansible.builtin.env', 'NETBOX_TOKEN') }}"
validate_certs: true
cache: false
strict: true
query_filters:
  - status: active
  - tag: automation-managed
device_query_filters:
  - has_primary_ip: 'true'
vm_query_filters:
  - id: 0
group_by:
  - platforms
  - sites
compose:
  ansible_host: "(primary_ip4 or primary_ip6).address.split('/')[0]"
  ansible_network_os: >-
    {'ios-xe': 'cisco.ios.ios', 'eos': 'arista.eos.eos'}[platform.slug]
  ansible_connection: "'ansible.netcommon.network_cli'"
```

`vm_query_filters: id: 0` keeps this example limited to physical devices. Inspect the rendered host variables and group names with:

```bash
ansible-inventory -i netbox.yml --graph
ansible-inventory -i netbox.yml --host branch-r1
```

The [inventory plugin reference](https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/nb_inventory_inventory.html) documents filters, composition, strict handling, and token dictionaries. NetBox's [API authentication reference](https://netbox.readthedocs.io/en/stable/integrations/rest-api/#authenticating-to-the-api) distinguishes v2 Bearer tokens from legacy v1 Token authentication. Match the scheme to your token rather than blindly copying an old example.

A filter that excludes devices with missing IPs can also hide bad source data. Compare the number of all approved active devices with the number eligible for automation, and fail a deployment when the difference is unexpected. Validate nonempty, globally unique names across the selected records before using this direct inventory: `strict: true` checks composition errors, but does not enforce that name contract. NetBox permits names to repeat across sites or tenants, and the plugin can merge duplicate names or generate a UUID for an unnamed device.

## Export a Validated Snapshot for Nornir

For jobs requiring the same frozen targets throughout approval and execution, materialize a snapshot instead of querying repeatedly. This exporter uses the NetBox REST API and Nornir's built-in `SimpleInventory` format; it does not require an additional inventory plugin.

```python
# export_inventory.py
import ipaddress
import os
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import requests
import yaml

base = os.environ["NETBOX_URL"].rstrip("/")
platforms = {"ios-xe": "cisco_ios", "eos": "arista_eos"}
session = requests.Session()
session.headers["Authorization"] = "Bearer " + os.environ["NETBOX_TOKEN"]
url = base + "/api/dcim/devices/?status=active&tag=automation-managed"
hosts = {}

while url:
    if (urlsplit(url).scheme, urlsplit(url).netloc) != ("https", urlsplit(base).netloc):
        raise ValueError("Unexpected pagination origin")
    response = session.get(url, timeout=30, allow_redirects=False)
    response.raise_for_status()
    page = response.json()
    for device in page["results"]:
        name = device["name"]
        primary = device.get("primary_ip4") or device.get("primary_ip6")
        platform = (device.get("platform") or {}).get("slug")
        if not name or name in hosts or not primary or platform not in platforms:
            raise ValueError(f"Invalid inventory record: {device['id']}")
        address = str(ipaddress.ip_interface(primary["address"]).ip)
        hosts[name] = {
            "hostname": address,
            "platform": platforms[platform],
            "data": {
                "netbox_id": device["id"],
                "site": device["site"]["slug"],
            },
        }
    url = urljoin(base + "/", page["next"]) if page.get("next") else None

if not hosts:
    raise ValueError("Approved inventory is empty")
output = Path("inventory")
output.mkdir(exist_ok=True)
(output / "hosts.yaml").write_text(yaml.safe_dump(hosts, sort_keys=True))
(output / "groups.yaml").write_text("{}\n")
(output / "defaults.yaml").write_text("{}\n")
```

Install `requests`, `PyYAML`, and `nornir`. Use HTTPS for `NETBOX_URL`; for an internal CA, configure the Requests trust bundle rather than disabling verification. The example prefers IPv4 when both families exist, matching the explicit `ansible_host` composition above. Without that override, the Ansible plugin uses NetBox's `primary_ip`, which prefers IPv6 by default.

The exporter consumes every page before writing inventory and rejects incomplete records. Configure `InitNornir` with the three generated files as shown in the [Nornir inventory documentation](https://nornir.readthedocs.io/en/latest/tutorial/inventory.html). Inject device credentials at runtime.

## Keep Both Consumers Consistent

Direct Ansible inventory and a Nornir snapshot can differ if NetBox changes between queries. The Ansible plugin also skips non-master virtual-chassis members when a master is recorded, while this exporter includes every selected device; tag only the intended management target for each chassis consistently. For approved writes, generate one snapshot and derive both inventories from it, or freeze and hash the resolved target list before approval. Compare NetBox IDs, addresses, and platform mappings, not just host counts.

Record the export time, source URL, selection filters, and inventory digest with the job. Set an explicit freshness limit. If NetBox is unavailable, fail a new deployment rather than silently falling back to an unbounded stale cache.

Test duplicate names, missing primary IPs, unsupported platforms, empty selections, and multi-page responses. A source of truth integration should make bad records visible before a device connection is attempted. Once that boundary is dependable, Ansible and Nornir can share the same operational view without maintaining competing hand-edited host lists.
