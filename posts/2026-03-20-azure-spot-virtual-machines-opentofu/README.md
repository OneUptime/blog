# How to Configure Azure Spot Virtual Machines with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Spot VMs, Cost Optimization, Interruptible Workloads, Infrastructure as Code

Description: Learn how to configure Azure Spot Virtual Machines with OpenTofu to run fault-tolerant workloads at up to 90% cost savings compared to regular on-demand VMs.

## Introduction

Azure Spot Virtual Machines use Azure's excess compute capacity at up to 90% discount compared to regular VMs. In exchange, Azure can evict Spot VMs with only about 30 seconds' notice when it needs the capacity back. Spot VMs are ideal for batch processing, data analytics, CI/CD pipelines, stateless web frontends, and any workload that can tolerate interruption and restart. They are not suitable for databases, production stateful services, or SLA-critical applications.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- A Resource Group and Virtual Network
- Workloads designed for interruption handling

## Step 1: Create a Spot VM

```hcl
resource "azurerm_linux_virtual_machine" "spot" {
  name                = "${var.project_name}-spot-vm"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = "Standard_D4s_v3"

  # Enable Spot pricing
  priority        = "Spot"
  eviction_policy = "Deallocate"  # Deallocate or Delete

  # Optional: set max price (in USD/hour)
  # Set to -1 to avoid price-based eviction and pay at most on-demand price (default)
  max_bid_price = -1

  network_interface_ids           = [azurerm_network_interface.spot.id]
  admin_username                  = "azureuser"
  disable_password_authentication = true

  admin_ssh_key {
    username   = "azureuser"
    public_key = var.ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"  # Use Standard for Spot cost savings
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  tags = {
    Name     = "${var.project_name}-spot-vm"
    Priority = "Spot"
  }
}
```

## Step 2: Spot VM Scale Set for Batch Workloads

```hcl
resource "azurerm_linux_virtual_machine_scale_set" "spot" {
  name                = "${var.project_name}-spot-vmss"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Standard_D4s_v3"
  instances           = 5

  # Spot configuration
  priority        = "Spot"
  eviction_policy = "Delete"   # Delete VMs when evicted (cheaper - no disk charges)
  max_bid_price   = 0.04       # Max price in USD/hour per instance

  admin_username                  = "azureuser"
  disable_password_authentication = true

  admin_ssh_key {
    username   = "azureuser"
    public_key = var.ssh_public_key
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  network_interface {
    name    = "primary"
    primary = true

    ip_configuration {
      name      = "internal"
      primary   = true
      subnet_id = var.subnet_id
    }
  }

  # Spread across zones for better capacity availability
  zones = ["1", "2", "3"]

  # Attempt to restore evicted Spot instances
  spot_restore {
    enabled = true
    timeout = "PT1H"  # Try to restore for 1 hour after eviction
  }
}
```

## Step 3: Handle Eviction Events

```hcl
# Azure Scheduled Events listener (installed as a systemd service on the VM)

# Monitor: http://169.254.169.254/metadata/scheduledevents

resource "azurerm_virtual_machine_extension" "eviction_handler" {
  name                 = "eviction-handler"
  virtual_machine_id   = azurerm_linux_virtual_machine.spot.id
  publisher            = "Microsoft.Azure.Extensions"
  type                 = "CustomScript"
  type_handler_version = "2.1"

  settings = jsonencode({
    script = base64encode(<<-EOT
      #!/bin/bash
      # Install eviction handler service
      cat > /usr/local/bin/spot-eviction-handler.sh <<'HANDLER'
      #!/bin/bash
      while true; do
        EVENTS=$(curl -s -H "Metadata: true" \
          "http://169.254.169.254/metadata/scheduledevents?api-version=2020-07-01")
        if echo "$EVENTS" | grep -q "Preempt"; then
          # Graceful shutdown: drain tasks, trigger durable checkpointing, flush logs
          # Replace app-worker.service with your workload service name.
          systemctl stop app-worker.service || true
          # Replace this with your own durable checkpoint upload step, such as Azure Blob Storage.
          sync
          exit 0
        fi
        sleep 1
      done
      HANDLER

      cat > /etc/systemd/system/spot-eviction-handler.service <<'SERVICE'
      [Unit]
      Description=Azure Spot eviction handler
      After=network-online.target
      Wants=network-online.target

      [Service]
      Type=simple
      ExecStart=/usr/local/bin/spot-eviction-handler.sh
      Restart=on-failure
      RestartSec=5

      [Install]
      WantedBy=multi-user.target
      SERVICE

      chmod +x /usr/local/bin/spot-eviction-handler.sh
      systemctl daemon-reload
      systemctl enable --now spot-eviction-handler.service
    EOT
    )
  })
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check current Spot VM power state
az vm show \
  --resource-group <rg> \
  --name <vm-name> \
  --show-details \
  --query "{Priority: priority, EvictionPolicy: evictionPolicy, PowerState: powerState}"

# Check whether a VM size supports Spot in a region
az vm list-skus \
  --location eastus \
  --size Standard_D4s_v3 \
  --query "[].{Name: name, SpotCapable: capabilities[?name=='LowPriorityCapable'].value}"
```

## Conclusion

Use `eviction_policy = "Delete"` for stateless batch workloads (avoids ongoing disk charges after eviction) and `eviction_policy = "Deallocate"` for workloads that need to resume from where they stopped. Setting `max_bid_price = -1` means the VM will not be evicted for price reasons, while never charging more than the on-demand price, useful when you only want capacity-based evictions. For VM Scale Sets, deploy across multiple zones with `spot_restore` enabled to automatically attempt to restore evicted instances. Always poll the Azure Scheduled Events endpoint (http://169.254.169.254/metadata/scheduledevents) from within Spot VMs to receive best-effort eviction notices, which Azure attempts to deliver up to 30 seconds before eviction, and save checkpoint state.
