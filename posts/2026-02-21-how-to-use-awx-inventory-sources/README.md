# How to Use AWX Inventory Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWX, Inventory, Dynamic Inventory, Cloud

Description: Configure AWX inventory sources to automatically sync hosts from AWS, Azure, GCP, VMware, and custom scripts for always-current inventories.

---

Static inventory files work until your infrastructure starts changing faster than you can update them. AWX inventory sources solve this by pulling host data from cloud APIs, CMDB systems, and custom scripts on a schedule. When a new EC2 instance launches or a VM gets decommissioned, your AWX inventory reflects the change automatically.

## How Inventory Sources Work

An AWX inventory can have one or more inventory sources attached to it. Each source defines where to pull hosts from and how often to sync. When a source syncs, AWX runs the appropriate inventory plugin, parses the results, and updates the host and group data in the inventory.

```mermaid
flowchart TD
    A[AWX Inventory] --> B[Source: AWS EC2]
    A --> C[Source: VMware vCenter]
    A --> D[Source: Custom Script]
    B -->|sync| E[AWS API]
    C -->|sync| F[vCenter API]
    D -->|sync| G[Script Output]
    E --> H[Hosts + Groups Updated]
    F --> H
    G --> H
```

## Built-in Source Types

AWX supports these inventory source types out of the box:

- **Amazon EC2** - Pulls instances from AWS
- **Google Compute Engine** - Pulls VMs from GCP
- **Microsoft Azure Resource Manager** - Pulls VMs from Azure
- **VMware vCenter** - Pulls VMs from VMware
- **Red Hat Satellite** - Pulls hosts from Satellite
- **OpenStack** - Pulls instances from OpenStack
- **Red Hat Virtualization** - Pulls VMs from RHV
- **Ansible Controller** - Pulls inventories from another AWX/Controller
- **Sourced from a project** - Uses an inventory file or script from a Git repo

## Setting Up an AWS EC2 Inventory Source

This is the most common dynamic inventory source. You need AWS credentials and an AWX inventory to attach the source to.

```bash
# Step 1: Create an AWS credential (if not already done)
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/ \
  -d '{
    "name": "AWS Production Account",
    "organization": 1,
    "credential_type": 6,
    "inputs": {
      "username": "AKIAIOSFODNN7EXAMPLE",
      "password": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    }
  }'
```

```bash
# Step 2: Create an inventory
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/inventories/ \
  -d '{
    "name": "AWS Production",
    "organization": 1,
    "description": "All EC2 instances in production AWS account"
  }'
```

```bash
# Step 3: Create the inventory source
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/inventories/5/inventory_sources/ \
  -d '{
    "name": "EC2 - us-east-1",
    "source": "ec2",
    "credential": 3,
    "overwrite": true,
    "overwrite_vars": false,
    "update_on_launch": true,
    "update_cache_timeout": 300,
    "source_vars": {
      "regions": "us-east-1",
      "filters": "tag:Environment=production",
      "keyed_groups": [
        {"key": "tags.Role", "prefix": "role"},
        {"key": "placement.availability_zone", "prefix": "az"},
        {"key": "instance_type", "prefix": "type"}
      ],
      "compose": {
        "ansible_host": "private_ip_address"
      },
      "hostnames": [
        "tag:Name",
        "private-ip-address"
      ]
    }
  }'
```

Key settings in `source_vars`:
- `regions` - Which AWS regions to scan
- `filters` - EC2 API filters to limit which instances are imported
- `keyed_groups` - Creates AWX groups based on instance attributes (tags, AZ, type)
- `compose` - Sets Ansible variables on each host
- `hostnames` - Controls how hosts are named in the inventory

## Syncing the Inventory Source

```bash
# Manually trigger a sync
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  https://awx.example.com/api/v2/inventory_sources/3/update/

# Check sync status
curl -s -H "Authorization: Bearer ${AWX_TOKEN}" \
  https://awx.example.com/api/v2/inventory_sources/3/ \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Status: {data[\"status\"]}')
print(f'Last synced: {data[\"last_updated\"]}')
print(f'Last sync result: {data[\"last_job_run\"]}')
"
```

## VMware vCenter Inventory Source

```bash
# Create a VMware inventory source
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/inventories/5/inventory_sources/ \
  -d '{
    "name": "vCenter - Production",
    "source": "vmware",
    "credential": 8,
    "overwrite": true,
    "update_on_launch": true,
    "source_vars": {
      "hostnames": ["config.name"],
      "properties": [
        "name",
        "config.cpuHotAddEnabled",
        "config.guestFullName",
        "guest.ipAddress",
        "guest.net",
        "runtime.powerState"
      ],
      "filters": [
        {"runtime.powerState": "poweredOn"}
      ],
      "keyed_groups": [
        {"key": "config.guestId", "separator": ""},
        {"key": "summary.runtime.powerState", "separator": ""}
      ],
      "compose": {
        "ansible_host": "guest.ipAddress"
      }
    }
  }'
```

## Azure Inventory Source

```bash
# Create an Azure inventory source
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/inventories/5/inventory_sources/ \
  -d '{
    "name": "Azure - Production",
    "source": "azure_rm",
    "credential": 10,
    "overwrite": true,
    "update_on_launch": true,
    "source_vars": {
      "include_vm_resource_groups": ["production-rg", "shared-rg"],
      "conditional_groups": {
        "web_servers": "\"web\" in tags.get(\"Role\", \"\")",
        "db_servers": "\"database\" in tags.get(\"Role\", \"\")"
      },
      "keyed_groups": [
        {"key": "location", "prefix": "region"},
        {"key": "tags.Environment | default(\"untagged\")", "prefix": "env"}
      ],
      "compose": {
        "ansible_host": "private_ip_addresses[0]"
      }
    }
  }'
```

## Project-Based Inventory Sources

For inventories that need custom logic beyond what built-in plugins provide, you can use an inventory file or script from a Git project.

First, create a project pointing to the repo that contains your inventory.

```yaml
# inventories/production/hosts.yml (in your Git repo)
---
plugin: constructed
strict: false
groups:
  webservers: "'web' in group_names"
  databases: "'db' in group_names"
compose:
  ansible_host: primary_ip | default(inventory_hostname)
```

```bash
# Create inventory source from a project
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/inventories/5/inventory_sources/ \
  -d '{
    "name": "Custom CMDB Source",
    "source": "scm",
    "source_project": 4,
    "source_path": "inventories/production/",
    "overwrite": true,
    "update_on_launch": true,
    "update_on_project_update": true
  }'
```

The `update_on_project_update` flag means the inventory syncs automatically whenever the source project is updated from Git.

## Scheduling Inventory Syncs

Set up a recurring sync schedule so your inventory stays current even when no jobs are launching.

```bash
# Sync inventory every 30 minutes
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/inventory_sources/3/schedules/ \
  -d '{
    "name": "Sync every 30 minutes",
    "rrule": "DTSTART:20260221T000000Z RRULE:FREQ=MINUTELY;INTERVAL=30",
    "enabled": true
  }'
```

## Overwrite vs Merge Behavior

The `overwrite` and `overwrite_vars` settings control what happens to hosts that already exist in the inventory.

- `overwrite: true` - Hosts not returned by the source are removed from the inventory. This keeps the inventory clean but means manually-added hosts will be deleted on sync.
- `overwrite: false` - Existing hosts are kept even if the source no longer returns them. New hosts are added.
- `overwrite_vars: true` - Host variables are replaced with whatever the source returns.
- `overwrite_vars: false` - Existing host variables are kept; new variables from the source are merged in.

For most dynamic inventory use cases, `overwrite: true` and `overwrite_vars: false` gives the best results.

## Troubleshooting Inventory Syncs

When a sync fails, check the sync job output.

```bash
# Get the latest sync job for an inventory source
curl -s -H "Authorization: Bearer ${AWX_TOKEN}" \
  "https://awx.example.com/api/v2/inventory_sources/3/inventory_updates/?order_by=-id&page_size=1" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['results']:
    job = data['results'][0]
    print(f'Status: {job[\"status\"]}')
    print(f'Started: {job[\"started\"]}')
    print(f'Finished: {job[\"finished\"]}')
    # Get the full output
    update_id = job['id']
    print(f'Check output at: /api/v2/inventory_updates/{update_id}/stdout/')
"
```

Common issues:
- **Credential errors** - The cloud credential does not have the right permissions. AWS needs `ec2:DescribeInstances`, Azure needs Reader role.
- **Timeout** - Large inventories can take a long time to sync. Increase the inventory update timeout in AWX settings.
- **Source vars syntax** - YAML parsing is strict. Use the AWX UI to validate your source variables before saving.

## Wrapping Up

Inventory sources are what make AWX inventories dynamic. Instead of manually tracking which servers exist and which groups they belong to, you let cloud APIs and CMDB systems provide that data automatically. Set up sources for each cloud account, schedule syncs, and use `keyed_groups` to create groups that your playbooks can target. The initial configuration takes some experimentation with source variables, but once it is dialed in, your inventories maintain themselves.
