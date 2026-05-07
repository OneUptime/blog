# How to Configure IPv6 on Azure VM Scale Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, VMSS, VM Scale Sets, Autoscaling, Dual-Stack

Description: Configure Azure Virtual Machine Scale Sets with dual-stack IPv4 and IPv6 network interfaces, enabling autoscaled workloads to serve IPv6 clients.

## Introduction

Azure VM Scale Sets (VMSS) support dual-stack IPv6 networking by adding an IPv6 IP configuration to the scale set's NIC profile. As the scale set scales out, new VMs automatically receive both IPv4 and IPv6 addresses from the configured dual-stack subnet. For dual-stack load balancing, attach an NSG to the subnet or NIC and allow Azure Load Balancer health probes, including IPv6 probes. This is essential for autoscaling web applications that need to serve IPv6 clients.

## Terraform VMSS with Dual-Stack Networking

```hcl
# vmss_ipv6.tf

# Load balancer for VMSS

resource "azurerm_lb" "vmss" {
  name                = "lb-vmss"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard"

  frontend_ip_configuration {
    name                 = "frontend-ipv4"
    public_ip_address_id = azurerm_public_ip.vmss_ipv4.id
  }

  frontend_ip_configuration {
    name                 = "frontend-ipv6"
    public_ip_address_id = azurerm_public_ip.vmss_ipv6.id
  }
}

resource "azurerm_lb_backend_address_pool" "vmss_ipv4" {
  loadbalancer_id = azurerm_lb.vmss.id
  name            = "backend-vmss-ipv4"
}

resource "azurerm_lb_backend_address_pool" "vmss_ipv6" {
  loadbalancer_id = azurerm_lb.vmss.id
  name            = "backend-vmss-ipv6"
}

resource "azurerm_lb_rule" "http_ipv4" {
  loadbalancer_id                = azurerm_lb.vmss.id
  name                           = "http-ipv4"
  protocol                       = "Tcp"
  frontend_port                  = 80
  backend_port                   = 80
  frontend_ip_configuration_name = "frontend-ipv4"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.vmss_ipv4.id]
  probe_id                       = azurerm_lb_probe.http.id
}

resource "azurerm_lb_rule" "http_ipv6" {
  loadbalancer_id                = azurerm_lb.vmss.id
  name                           = "http-ipv6"
  protocol                       = "Tcp"
  frontend_port                  = 80
  backend_port                   = 80
  frontend_ip_configuration_name = "frontend-ipv6"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.vmss_ipv6.id]
  probe_id                       = azurerm_lb_probe.http.id
}

resource "azurerm_lb_probe" "http" {
  loadbalancer_id = azurerm_lb.vmss.id
  name            = "http-probe"
  protocol        = "Http"
  port            = 80
  request_path    = "/"
}

# VM Scale Set with dual-stack
resource "azurerm_linux_virtual_machine_scale_set" "web" {
  name                = "vmss-web"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  sku       = "Standard_B2s"
  instances = 2

  admin_username = "azureuser"

  admin_ssh_key {
    username   = "azureuser"
    public_key = file(pathexpand("~/.ssh/id_rsa.pub"))
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  os_disk {
    storage_account_type = "Standard_LRS"
    caching              = "ReadWrite"
  }

  network_interface {
    name    = "nic-vmss"
    primary = true

    ip_configuration {
      name                                   = "ipv4-config"
      primary                                = true
      subnet_id                              = azurerm_subnet.web.id
      version                                = "IPv4"
      load_balancer_backend_address_pool_ids = [azurerm_lb_backend_address_pool.vmss_ipv4.id]
    }

    ip_configuration {
      name      = "ipv6-config"
      primary   = false
      subnet_id = azurerm_subnet.web.id
      version   = "IPv6"
      # Backend pool association for IPv6 traffic
      load_balancer_backend_address_pool_ids = [azurerm_lb_backend_address_pool.vmss_ipv6.id]
    }
  }

  lifecycle {
    ignore_changes = [instances]
  }

  # Custom data script for initial configuration
  custom_data = base64encode(<<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
  EOF
  )

  depends_on = [
    azurerm_lb_rule.http_ipv4,
    azurerm_lb_rule.http_ipv6,
  ]

  tags = { Name = "web-vmss" }
}

# Autoscale settings
resource "azurerm_monitor_autoscale_setting" "vmss" {
  name                = "autoscale-vmss-web"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  target_resource_id  = azurerm_linux_virtual_machine_scale_set.web.id

  profile {
    name = "default"

    capacity {
      default = 2
      minimum = 1
      maximum = 10
    }

    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.web.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 75
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = 1
        cooldown  = "PT5M"
      }
    }
  }
}
```

## Verify VMSS IPv6 Configuration

```bash
# List VMSS instances with their IPs
az vmss nic list \
    --resource-group "$RG" \
    --vmss-name vmss-web \
    --query "[*].ipConfigurations[*].{name:name, version:privateIPAddressVersion, ip:privateIPAddress}"

# Test load balancer IPv6
IPV6_LB=$(az network public-ip show \
    --resource-group "$RG" \
    --name pip-vmss-ipv6 \
    --query ipAddress -o tsv)

curl -6 "http://[${IPV6_LB}]/"
```

## Conclusion

Azure VMSS dual-stack requires configuring two IP configurations in the NIC profile - one IPv4 (primary) and one IPv6. Each IP configuration should be associated with its matching load balancer backend pool so the IPv4 and IPv6 frontend rules can target the same VMSS without requiring Floating IP. New instances added during scale-out automatically receive both IPv4 and IPv6 addresses. The Standard Load Balancer with separate IPv4 and IPv6 frontend configurations handles traffic distribution for both protocols, and an attached NSG must allow Azure Load Balancer probes for IPv6 health checks to succeed.
