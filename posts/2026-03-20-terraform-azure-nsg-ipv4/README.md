# How to Configure Azure Network Security Groups for IPv4 Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, NSG, Network Security Group, IPv4, Infrastructure as Code

Description: Configure Azure Network Security Groups (NSGs) for IPv4 using Terraform, covering inbound and outbound security rules, subnet and NIC associations, and priority management.

## Introduction

Azure NSGs are stateful packet filters applied to subnets or network interfaces. Terraform's `azurerm_network_security_group` and associated rule resources manage NSGs declaratively.

## NSG with Inline Rules

```hcl
# nsg.tf

resource "azurerm_resource_group" "main" {
  name     = "rg-networking"
  location = "East US"
}

resource "azurerm_network_security_group" "web" {
  name                = "nsg-web"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "Allow-HTTP"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-HTTPS"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-SSH-Mgmt"
    priority                   = 200
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "10.1.99.0/27"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Deny-All-Inbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = { Environment = "production" }
}
```

## Separate Security Rule Resources

Use standalone `azurerm_network_security_rule` resources instead of inline `security_rule` blocks for a given NSG; do not manage the same NSG's rules with both styles.

```hcl
resource "azurerm_network_security_rule" "block_bad_cidr" {
  name                        = "Block-Known-Bad"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "203.0.113.0/24"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.web.name
}
```

## Associate NSG with Subnet

```hcl
resource "azurerm_subnet_network_security_group_association" "web" {
  subnet_id                 = azurerm_subnet.web.id
  network_security_group_id = azurerm_network_security_group.web.id
}
```

## Associate NSG with NIC

```hcl
resource "azurerm_network_interface_security_group_association" "vm_nic" {
  network_interface_id      = azurerm_network_interface.vm.id
  network_security_group_id = azurerm_network_security_group.web.id
}
```

## Deploy

```bash
terraform init
terraform plan
terraform apply
```

## Conclusion

Azure NSGs in Terraform use priority-based rules (100–4096; lower = higher priority). Inline `security_rule` blocks are convenient for small NSGs; separate `azurerm_network_security_rule` resources are better for dynamic rule management. Do not combine inline rules and separate rule resources on the same NSG. Associate NSGs with subnets for broad policies and with NICs for instance-specific filtering; if both are associated, both must allow the traffic. Add explicit deny-all rules at priority 4096 only when you intentionally want to block remaining traffic before Azure's built-in default rules; Azure already includes default deny-all rules at priority 65500.
