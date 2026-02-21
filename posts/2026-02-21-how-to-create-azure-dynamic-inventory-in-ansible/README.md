# How to Create Azure Dynamic Inventory in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Azure, Dynamic Inventory, Cloud Automation, DevOps

Description: Complete guide to configuring the Azure Resource Manager dynamic inventory plugin in Ansible for automatic discovery of Azure VMs and virtual machine scale sets.

---

Azure environments change constantly. VMs get created through ARM templates, scale sets resize based on load, and infrastructure-as-code pipelines provision new resources daily. The Azure dynamic inventory plugin for Ansible queries the Azure Resource Manager API to discover your VMs automatically, so your inventory always matches reality.

## Prerequisites

Install the Azure Ansible collection and the required Python SDK:

```bash
# Install the Azure collection
ansible-galaxy collection install azure.azcollection

# Install Azure Python dependencies
pip install azure-identity azure-mgmt-compute azure-mgmt-network azure-mgmt-resource
```

Set up Azure authentication. The plugin supports multiple authentication methods:

```bash
# Option 1: Service principal environment variables
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_SECRET="your-client-secret"
export AZURE_TENANT="your-tenant-id"

# Option 2: Azure CLI login (good for local development)
az login
```

## Basic Azure Inventory Configuration

Create a file ending in `azure_rm.yml` or `azure_rm.yaml`. The filename suffix tells Ansible to use the Azure Resource Manager plugin.

```yaml
# inventory/azure_rm.yml
# Basic Azure dynamic inventory
plugin: azure.azcollection.azure_rm

# Include all VMs from the subscription
include_vm_resource_groups:
  - "*"

# Authentication (if not using environment variables)
# auth_source: auto
# subscription_id: "your-subscription-id"
# client_id: "your-client-id"
# secret: "your-client-secret"
# tenant: "your-tenant-id"
```

Test it:

```bash
# List all Azure VMs
ansible-inventory -i inventory/azure_rm.yml --list

# Show group hierarchy
ansible-inventory -i inventory/azure_rm.yml --graph
```

## Filtering by Resource Group

In most cases, you want to limit discovery to specific resource groups rather than scanning your entire subscription.

```yaml
# inventory/azure_rm.yml
# Only discover VMs in specific resource groups
plugin: azure.azcollection.azure_rm

include_vm_resource_groups:
  - rg-production-web
  - rg-production-db
  - rg-production-cache

# Exclude resource groups (alternative approach)
# exclude_vm_resource_groups:
#   - rg-dev-*
#   - rg-test-*
```

## Grouping VMs

The `keyed_groups` and `conditional_groups` options create Ansible groups from Azure VM properties.

```yaml
# inventory/azure_rm.yml
# Group Azure VMs by tags, location, and resource group
plugin: azure.azcollection.azure_rm

include_vm_resource_groups:
  - "*"

keyed_groups:
  # Group by the "role" tag: creates groups like azure_role_web
  - key: tags.role
    prefix: azure_role
    separator: "_"

  # Group by the "environment" tag
  - key: tags.environment
    prefix: azure_env
    separator: "_"

  # Group by Azure region: creates groups like azure_location_eastus
  - key: location
    prefix: azure_location
    separator: "_"

  # Group by resource group name
  - key: resource_group
    prefix: azure_rg
    separator: "_"

  # Group by VM size
  - key: vm_size
    prefix: azure_size
    separator: "_"

  # Group by OS type
  - key: os_profile.system
    prefix: azure_os
    separator: "_"
```

## Setting Hostnames

Configure which property to use as the inventory hostname:

```yaml
# inventory/azure_rm.yml
# Use VM name as the hostname
plugin: azure.azcollection.azure_rm

include_vm_resource_groups:
  - rg-production-*

# Choose hostname format
hostvar_expressions:
  public_ip_address: (public_ipv4_addresses | first) if public_ipv4_addresses else None
  private_ip_address: (private_ipv4_addresses | first) if private_ipv4_addresses else None

# Use the private IP for connections
plain_host_names: true
```

## Composing Variables

Map Azure VM properties to Ansible variables:

```yaml
# inventory/azure_rm.yml
# Map Azure attributes to Ansible variables
plugin: azure.azcollection.azure_rm

include_vm_resource_groups:
  - rg-production-*

keyed_groups:
  - key: tags.role
    prefix: role
    separator: "_"
  - key: tags.environment
    prefix: env
    separator: "_"

compose:
  # Set connection address to private IP
  ansible_host: private_ipv4_addresses[0] if private_ipv4_addresses else public_ipv4_addresses[0]

  # Set SSH user
  ansible_user: "'azureuser'"

  # Map Azure properties to variables
  azure_vm_size: vm_size
  azure_location: location
  azure_resource_group: resource_group
  azure_vm_id: id
  azure_os_type: os_profile.system | default('linux')
  azure_tags: tags

  # Custom variables from tags
  server_role: tags.role | default('unknown')
  server_env: tags.environment | default('unknown')
```

## Complete Production Configuration

Here is a full production-ready Azure inventory:

```yaml
# inventory/azure_rm.yml
# Production Azure dynamic inventory
plugin: azure.azcollection.azure_rm

# Target specific resource groups
include_vm_resource_groups:
  - rg-prod-web
  - rg-prod-db
  - rg-prod-cache
  - rg-prod-workers

# Performance: cache results
cache: true
cache_plugin: jsonfile
cache_timeout: 300
cache_connection: /tmp/ansible_azure_cache

# Only discover running VMs
default_host_filters:
  - powerstate == 'running'

# Human-readable hostnames
plain_host_names: true

# Group by multiple dimensions
keyed_groups:
  - key: tags.role
    prefix: role
    separator: "_"
    default_value: untagged
  - key: tags.environment
    prefix: env
    separator: "_"
  - key: location
    prefix: location
    separator: "_"
  - key: resource_group
    prefix: rg
    separator: "_"
  - key: vm_size
    prefix: size
    separator: "_"

# Conditional groups
conditional_groups:
  # Group all Linux VMs together
  linux_vms: os_profile.system == 'linux'
  # Group all Windows VMs together
  windows_vms: os_profile.system == 'windows'
  # Group VMs with public IPs
  public_facing: public_ipv4_addresses | length > 0

# Variable mapping
compose:
  ansible_host: >-
    private_ipv4_addresses[0]
    if private_ipv4_addresses
    else public_ipv4_addresses[0]
  ansible_user: "'azureuser'"
  ansible_connection: "'winrm'" if os_profile.system == 'windows' else "'ssh'"
  azure_vm_name: name
  azure_resource_group: resource_group
  azure_location: location
  azure_vm_size: vm_size
  azure_private_ip: private_ipv4_addresses[0] if private_ipv4_addresses else ''
  azure_public_ip: public_ipv4_addresses[0] if public_ipv4_addresses else ''
```

## Using the Inventory in Playbooks

Target dynamically-discovered groups in your playbooks:

```yaml
# deploy-app.yml
# Deploy to Azure web servers
- hosts: role_web
  become: true
  tasks:
    - name: Update application
      git:
        repo: "https://github.com/company/webapp.git"
        dest: /opt/webapp
        version: main

    - name: Restart app service
      systemd:
        name: webapp
        state: restarted

# Database maintenance on production only
- hosts: role_db:&env_production
  become: true
  serial: 1
  tasks:
    - name: Run database maintenance
      command: /opt/scripts/db-maintenance.sh
```

## Including Virtual Machine Scale Sets

Azure Scale Sets (VMSS) need additional configuration:

```yaml
# inventory/azure_rm.yml
# Include Scale Set instances
plugin: azure.azcollection.azure_rm

include_vm_resource_groups:
  - rg-production-*

# Also include VMSS instances
include_vmss_resource_groups:
  - rg-production-*

keyed_groups:
  - key: tags.role
    prefix: role
    separator: "_"

compose:
  ansible_host: private_ipv4_addresses[0]
  ansible_user: "'azureuser'"
```

Scale Set instances will appear alongside regular VMs, and they can be grouped using the same tag-based approach.

## Authentication Best Practices

For production use, a managed identity or service principal is better than environment variables:

```yaml
# inventory/azure_rm.yml
# Using managed identity (when running from an Azure VM)
plugin: azure.azcollection.azure_rm
auth_source: msi

# Using a service principal with certificate
# plugin: azure.azcollection.azure_rm
# auth_source: credential_file
# credential_file: ~/.azure/credentials
```

The service principal needs the **Reader** role on the subscription or resource groups:

```bash
# Grant Reader role to the service principal
az role assignment create \
  --assignee "your-client-id" \
  --role "Reader" \
  --scope "/subscriptions/your-subscription-id"
```

## Troubleshooting

```bash
# Debug with verbose output
ansible-inventory -i inventory/azure_rm.yml --list -vvv

# Check Azure CLI authentication
az account show

# List VMs manually to compare
az vm list --resource-group rg-production-web --output table

# Clear the cache if stale data is showing
rm -rf /tmp/ansible_azure_cache
```

Common issues:
- **No VMs discovered**: Check resource group names, ensure VMs are running, verify authentication
- **Wrong IPs**: Check the `compose` section for the correct IP expression
- **Missing groups**: Ensure VMs have the expected tags in Azure

## Tagging Strategy

The inventory plugin is only as good as your Azure tagging. Establish consistent tags:

```bash
# Tag VMs for Ansible discovery
az vm update \
  --resource-group rg-production-web \
  --name web-prod-01 \
  --set tags.managed_by=ansible tags.role=web tags.environment=production tags.team=platform
```

The tags become the foundation of your dynamic grouping. Consistent tagging across all VMs ensures reliable inventory discovery.

Azure dynamic inventory eliminates manual inventory maintenance and guarantees your playbooks always run against the actual set of VMs in your subscription. Combine it with proper tagging, caching, and the constructed plugin for a production-grade setup.
