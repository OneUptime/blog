# How to Deploy Portainer on Azure VM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, Virtual Machine, Docker, Self-Hosted, Infrastructure

Description: Learn how to provision an Azure VM and deploy Portainer CE to manage Docker containers on Azure infrastructure.

---

Portainer can be deployed on Azure Virtual Machines as a Docker container. This guide uses OpenTofu to provision the VM and cloud-init to install Docker and Portainer automatically.

---

## Create the Azure VM with OpenTofu

```hcl
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "portainer" {
  name     = "portainer-rg"
  location = "eastus"
}

resource "azurerm_virtual_network" "portainer" {
  name                = "portainer-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.portainer.location
  resource_group_name = azurerm_resource_group.portainer.name
}

resource "azurerm_subnet" "portainer" {
  name                 = "portainer-subnet"
  resource_group_name  = azurerm_resource_group.portainer.name
  virtual_network_name = azurerm_virtual_network.portainer.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_public_ip" "portainer" {
  name                = "portainer-public-ip"
  location            = azurerm_resource_group.portainer.location
  resource_group_name = azurerm_resource_group.portainer.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_interface" "portainer" {
  name                = "portainer-nic"
  location            = azurerm_resource_group.portainer.location
  resource_group_name = azurerm_resource_group.portainer.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.portainer.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.portainer.id
  }
}

resource "azurerm_linux_virtual_machine" "portainer" {
  name                = "portainer-vm"
  resource_group_name = azurerm_resource_group.portainer.name
  location            = azurerm_resource_group.portainer.location
  size                = "Standard_B2s"
  admin_username      = "azureuser"

  network_interface_ids = [azurerm_network_interface.portainer.id]

  admin_ssh_key {
    username   = "azureuser"
    public_key = file(pathexpand("~/.ssh/id_rsa.pub"))
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  custom_data = base64encode(<<-EOF
    #cloud-config
    packages:
      - ca-certificates
      - curl

    runcmd:
      - curl -fsSL https://get.docker.com | sh
      - docker volume create portainer_data
      - >
        docker run -d --name portainer --restart=always
        -p 9443:9443
        -v /var/run/docker.sock:/var/run/docker.sock
        -v portainer_data:/data
        portainer/portainer-ce:lts
  EOF
  )
}
```

---

## Network Security Group

```hcl
variable "admin_cidr" {
  description = "The public IP or CIDR block allowed to reach Portainer, for example 203.0.113.10/32"
  type        = string
}

resource "azurerm_network_security_group" "portainer" {
  name                = "portainer-nsg"
  location            = azurerm_resource_group.portainer.location
  resource_group_name = azurerm_resource_group.portainer.name

  security_rule {
    name                       = "allow-portainer"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_address_prefix      = var.admin_cidr
    destination_address_prefix = "*"
    source_port_range          = "*"
    destination_port_range     = "9443"
  }
}

resource "azurerm_subnet_network_security_group_association" "portainer" {
  subnet_id                 = azurerm_subnet.portainer.id
  network_security_group_id = azurerm_network_security_group.portainer.id
}
```

---

## Output the Public IP

```hcl
output "portainer_url" {
  value = "https://${azurerm_public_ip.portainer.ip_address}:9443"
}
```

---

## Summary

Use `custom_data` with a cloud-config script to install Docker and launch Portainer on first boot. Use a Standard public IP and associate the NSG with the subnet so the rule is enforced, allowing port 9443 only from your admin IP or CIDR block. Run `tofu init`, then `tofu apply`, and access Portainer at the output URL within a few minutes after the VM boots.
