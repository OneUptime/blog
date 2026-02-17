# How to Manage Azure Resource Groups and VMs Programmatically Using azure-mgmt SDK in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Python, azure-mgmt, Virtual Machines, Resource Management, Infrastructure as Code, SDK

Description: Learn how to create and manage Azure resource groups, virtual machines, and other infrastructure programmatically using the azure-mgmt Python SDKs.

---

The Azure portal and CLI are great for interactive work, but when you need to manage infrastructure from application code - dynamic resource provisioning, automated scaling, cleanup scripts - you want the azure-mgmt SDKs. These Python packages give you programmatic access to the Azure Resource Manager API, letting you create, update, query, and delete Azure resources from your Python code.

In this post, I will walk through managing resource groups and virtual machines using the azure-mgmt libraries.

## Installing the SDKs

The management SDKs are organized by resource type. You install only the ones you need.

```bash
# Install the management SDKs for resources and compute
pip install azure-identity azure-mgmt-resource azure-mgmt-compute azure-mgmt-network
```

## Authentication

All management SDKs use the same credential pattern via azure-identity.

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.network import NetworkManagementClient

# Your Azure subscription ID
SUBSCRIPTION_ID = "your-subscription-id"

# Create a credential (works locally via Azure CLI, in production via managed identity)
credential = DefaultAzureCredential()

# Create management clients
resource_client = ResourceManagementClient(credential, SUBSCRIPTION_ID)
compute_client = ComputeManagementClient(credential, SUBSCRIPTION_ID)
network_client = NetworkManagementClient(credential, SUBSCRIPTION_ID)
```

## Managing Resource Groups

Resource groups are containers for Azure resources. Every resource lives in a resource group.

```python
def create_resource_group(name: str, location: str) -> dict:
    """Create a new resource group."""
    result = resource_client.resource_groups.create_or_update(
        name,
        {"location": location}
    )
    print(f"Resource group '{result.name}' created in {result.location}")
    return result


def list_resource_groups():
    """List all resource groups in the subscription."""
    groups = resource_client.resource_groups.list()
    for group in groups:
        print(f"  {group.name} - {group.location} - {group.provisioning_state}")


def delete_resource_group(name: str):
    """
    Delete a resource group and ALL resources inside it.
    This is an async operation that can take several minutes.
    """
    poller = resource_client.resource_groups.begin_delete(name)
    print(f"Deleting resource group '{name}'...")
    poller.result()  # Wait for completion
    print(f"Resource group '{name}' deleted")


# Example usage
create_resource_group("demo-rg", "eastus")
list_resource_groups()
```

## Listing Resources in a Group

You can enumerate all resources inside a resource group regardless of type.

```python
def list_resources_in_group(group_name: str):
    """List all resources in a resource group."""
    resources = resource_client.resources.list_by_resource_group(group_name)

    for resource in resources:
        print(f"  Name: {resource.name}")
        print(f"  Type: {resource.type}")
        print(f"  Location: {resource.location}")
        print()

list_resources_in_group("demo-rg")
```

## Tagging Resources

Tags help organize and track costs across resources.

```python
def tag_resource_group(group_name: str, tags: dict):
    """Apply tags to a resource group."""
    # Get the current resource group to preserve existing tags
    rg = resource_client.resource_groups.get(group_name)
    existing_tags = rg.tags or {}
    existing_tags.update(tags)

    resource_client.resource_groups.create_or_update(
        group_name,
        {"location": rg.location, "tags": existing_tags}
    )
    print(f"Tags applied to '{group_name}': {existing_tags}")


tag_resource_group("demo-rg", {
    "environment": "development",
    "team": "engineering",
    "cost-center": "CC-1234"
})
```

## Creating a Virtual Network

Before creating a VM, you need networking infrastructure.

```python
def create_virtual_network(group_name: str, location: str):
    """Create a virtual network with a subnet."""
    # Create the virtual network
    vnet_poller = network_client.virtual_networks.begin_create_or_update(
        group_name,
        "demo-vnet",
        {
            "location": location,
            "address_space": {
                "address_prefixes": ["10.0.0.0/16"]
            }
        }
    )
    vnet = vnet_poller.result()
    print(f"VNet created: {vnet.name}")

    # Create a subnet inside the VNet
    subnet_poller = network_client.subnets.begin_create_or_update(
        group_name,
        "demo-vnet",
        "default-subnet",
        {"address_prefix": "10.0.1.0/24"}
    )
    subnet = subnet_poller.result()
    print(f"Subnet created: {subnet.name}")
    return subnet


def create_public_ip(group_name: str, location: str):
    """Create a public IP address for the VM."""
    poller = network_client.public_ip_addresses.begin_create_or_update(
        group_name,
        "demo-public-ip",
        {
            "location": location,
            "sku": {"name": "Standard"},
            "public_ip_allocation_method": "Static"
        }
    )
    ip = poller.result()
    print(f"Public IP created: {ip.ip_address}")
    return ip


def create_network_interface(group_name: str, location: str, subnet, public_ip):
    """Create a network interface card for the VM."""
    poller = network_client.network_interfaces.begin_create_or_update(
        group_name,
        "demo-nic",
        {
            "location": location,
            "ip_configurations": [{
                "name": "default",
                "subnet": {"id": subnet.id},
                "public_ip_address": {"id": public_ip.id}
            }]
        }
    )
    nic = poller.result()
    print(f"NIC created: {nic.name}")
    return nic
```

## Creating a Virtual Machine

Now we can put it all together and create a VM.

```python
def create_virtual_machine(group_name: str, location: str, nic_id: str):
    """Create a Linux virtual machine."""
    vm_params = {
        "location": location,
        "hardware_profile": {
            "vm_size": "Standard_B1s"  # Small, cheap VM for demo
        },
        "storage_profile": {
            "image_reference": {
                "publisher": "Canonical",
                "offer": "0001-com-ubuntu-server-jammy",
                "sku": "22_04-lts-gen2",
                "version": "latest"
            },
            "os_disk": {
                "name": "demo-os-disk",
                "caching": "ReadWrite",
                "create_option": "FromImage",
                "managed_disk": {
                    "storage_account_type": "Standard_LRS"
                }
            }
        },
        "os_profile": {
            "computer_name": "demo-vm",
            "admin_username": "azureuser",
            "linux_configuration": {
                "disable_password_authentication": True,
                "ssh": {
                    "public_keys": [{
                        "path": "/home/azureuser/.ssh/authorized_keys",
                        "key_data": "ssh-rsa AAAA...your-public-key..."
                    }]
                }
            }
        },
        "network_profile": {
            "network_interfaces": [{
                "id": nic_id
            }]
        }
    }

    print("Creating virtual machine (this takes a few minutes)...")
    poller = compute_client.virtual_machines.begin_create_or_update(
        group_name,
        "demo-vm",
        vm_params
    )
    vm = poller.result()
    print(f"VM created: {vm.name}")
    return vm
```

## Full Provisioning Script

Here is the complete script that creates everything from scratch.

```python
def provision_environment():
    """Provision a complete environment with VNet and VM."""
    group_name = "demo-rg"
    location = "eastus"

    # Step 1: Create resource group
    print("Step 1: Creating resource group...")
    create_resource_group(group_name, location)

    # Step 2: Create networking
    print("\nStep 2: Creating network infrastructure...")
    subnet = create_virtual_network(group_name, location)
    public_ip = create_public_ip(group_name, location)
    nic = create_network_interface(group_name, location, subnet, public_ip)

    # Step 3: Create VM
    print("\nStep 3: Creating virtual machine...")
    vm = create_virtual_machine(group_name, location, nic.id)

    # Step 4: Tag everything
    print("\nStep 4: Applying tags...")
    tag_resource_group(group_name, {
        "environment": "demo",
        "created_by": "python-script"
    })

    print("\nProvisioning complete!")
    print(f"  VM: {vm.name}")
    print(f"  Public IP: {public_ip.ip_address}")

provision_environment()
```

## Managing VM State

Once a VM exists, you can control its lifecycle.

```python
def start_vm(group_name: str, vm_name: str):
    """Start a stopped virtual machine."""
    print(f"Starting VM '{vm_name}'...")
    poller = compute_client.virtual_machines.begin_start(group_name, vm_name)
    poller.result()
    print("VM started")


def stop_vm(group_name: str, vm_name: str):
    """Stop (deallocate) a virtual machine to stop billing."""
    print(f"Stopping VM '{vm_name}'...")
    poller = compute_client.virtual_machines.begin_deallocate(group_name, vm_name)
    poller.result()
    print("VM stopped and deallocated")


def restart_vm(group_name: str, vm_name: str):
    """Restart a running virtual machine."""
    print(f"Restarting VM '{vm_name}'...")
    poller = compute_client.virtual_machines.begin_restart(group_name, vm_name)
    poller.result()
    print("VM restarted")


def get_vm_status(group_name: str, vm_name: str):
    """Get the current power state of a VM."""
    vm = compute_client.virtual_machines.get(
        group_name,
        vm_name,
        expand="instanceView"
    )

    for status in vm.instance_view.statuses:
        if status.code.startswith("PowerState"):
            print(f"VM '{vm_name}' power state: {status.display_status}")
            return status.display_status

    return "Unknown"
```

## Listing VMs Across Subscriptions

```python
def list_all_vms():
    """List all VMs in the subscription with their status."""
    vms = compute_client.virtual_machines.list_all()

    for vm in vms:
        # Extract the resource group from the VM's ID
        rg = vm.id.split("/")[4]
        print(f"VM: {vm.name}")
        print(f"  Resource Group: {rg}")
        print(f"  Location: {vm.location}")
        print(f"  Size: {vm.hardware_profile.vm_size}")
        print(f"  OS: {vm.storage_profile.os_disk.os_type}")
        print()

list_all_vms()
```

## Cleanup Script

Automating cleanup prevents forgotten resources from running up costs.

```python
def cleanup_old_environments(tag_key: str, tag_value: str):
    """Delete all resource groups matching a specific tag."""
    groups = resource_client.resource_groups.list()

    for group in groups:
        if group.tags and group.tags.get(tag_key) == tag_value:
            print(f"Deleting resource group: {group.name}")
            poller = resource_client.resource_groups.begin_delete(group.name)
            # Do not wait - let deletions run in parallel
            print(f"  Deletion started for {group.name}")

# Delete all resource groups tagged as demo
cleanup_old_environments("environment", "demo")
```

## Error Handling

Management operations can fail for various reasons. Handle errors properly.

```python
from azure.core.exceptions import HttpResponseError, ResourceNotFoundError

try:
    vm = compute_client.virtual_machines.get("my-rg", "nonexistent-vm")
except ResourceNotFoundError:
    print("VM does not exist")
except HttpResponseError as e:
    print(f"Azure error: {e.status_code} - {e.message}")
```

## Best Practices

1. **Use long-running operation pollers.** Many operations (creating VMs, deleting resource groups) are asynchronous. Always use `begin_` methods and handle the poller.
2. **Tag everything.** Tags make it possible to find, track, and clean up resources programmatically.
3. **Use managed identity in production.** Do not embed credentials in your automation scripts.
4. **Handle rate limiting.** Azure has API rate limits. The SDK includes retry logic, but batch operations carefully.
5. **Clean up after yourself.** Automated resource creation should always have automated resource deletion.

## Wrapping Up

The azure-mgmt SDKs give you full control over Azure infrastructure from Python. Whether you are building a self-service portal, automating environment provisioning, or writing cleanup scripts, these libraries provide the building blocks. The pattern is consistent across resource types: create a management client, call methods, handle pollers for long-running operations.
