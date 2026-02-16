# How to Use Terraform Dynamic Blocks for Azure Network Security Group Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, NSG, Dynamic Blocks, Networking, IaC, Security

Description: Use Terraform dynamic blocks to generate Azure Network Security Group rules from variable data, reducing code duplication and improving maintainability.

---

Azure Network Security Groups contain security rules that control inbound and outbound traffic. A typical production NSG might have 15 to 30 rules - each one defined as a nested block inside the `azurerm_network_security_group` resource. Writing each rule as a static block means a lot of repetitive HCL. When you need to add, remove, or modify rules, you are editing a wall of nearly identical code blocks.

Terraform's `dynamic` block solves this by generating nested blocks from a variable or local value. You define your rules as data - a list of objects - and the dynamic block iterates over them to produce the NSG rules. The result is cleaner, more maintainable code where rule changes are just data changes.

## The Problem with Static Rules

Here is what a typical NSG looks like with static rule blocks:

```hcl
resource "azurerm_network_security_group" "web" {
  name                = "nsg-web-tier"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "Allow-HTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-HTTP"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # ... 15 more rules that all look almost identical
}
```

Every rule has the same structure with slightly different values. This is exactly what dynamic blocks are designed for.

## Converting to Dynamic Blocks

First, define your rules as a list of objects in a local variable or variable.

```hcl
# Define rules as structured data
locals {
  web_nsg_rules = [
    {
      name                       = "Allow-HTTPS"
      priority                   = 100
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "443"
      source_address_prefix      = "*"
      destination_address_prefix = "*"
      description                = "Allow HTTPS traffic from the internet"
    },
    {
      name                       = "Allow-HTTP"
      priority                   = 110
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "80"
      source_address_prefix      = "*"
      destination_address_prefix = "*"
      description                = "Allow HTTP traffic for redirect to HTTPS"
    },
    {
      name                       = "Allow-SSH-From-Bastion"
      priority                   = 120
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "22"
      source_address_prefix      = "10.0.0.0/24"
      destination_address_prefix = "*"
      description                = "Allow SSH from the bastion subnet"
    },
    {
      name                       = "Allow-HealthProbe"
      priority                   = 130
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "*"
      source_address_prefix      = "AzureLoadBalancer"
      destination_address_prefix = "*"
      description                = "Allow Azure Load Balancer health probes"
    },
    {
      name                       = "Deny-All-Inbound"
      priority                   = 4096
      direction                  = "Inbound"
      access                     = "Deny"
      protocol                   = "*"
      source_port_range          = "*"
      destination_port_range     = "*"
      source_address_prefix      = "*"
      destination_address_prefix = "*"
      description                = "Deny all other inbound traffic"
    },
  ]
}
```

Now use a dynamic block to generate the rules.

```hcl
# NSG with dynamically generated rules
resource "azurerm_network_security_group" "web" {
  name                = "nsg-web-tier"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  dynamic "security_rule" {
    for_each = local.web_nsg_rules
    content {
      name                       = security_rule.value.name
      priority                   = security_rule.value.priority
      direction                  = security_rule.value.direction
      access                     = security_rule.value.access
      protocol                   = security_rule.value.protocol
      source_port_range          = security_rule.value.source_port_range
      destination_port_range     = security_rule.value.destination_port_range
      source_address_prefix      = security_rule.value.source_address_prefix
      destination_address_prefix = security_rule.value.destination_address_prefix
      description                = security_rule.value.description
    }
  }
}
```

The `dynamic` block iterates over each element in `local.web_nsg_rules` and generates a `security_rule` block for each one. Inside the `content` block, `security_rule.value` refers to the current element.

## Using Variables for Environment-Specific Rules

You can make rules configurable per environment by using a variable instead of a local.

```hcl
# variables.tf
variable "nsg_rules" {
  description = "List of NSG rules to create"
  type = list(object({
    name                       = string
    priority                   = number
    direction                  = string
    access                     = string
    protocol                   = string
    source_port_range          = string
    destination_port_range     = string
    source_address_prefix      = string
    destination_address_prefix = string
    description                = optional(string, "")
  }))
}
```

Then define environment-specific values in your tfvars files.

```hcl
# dev.tfvars - More permissive for development
nsg_rules = [
  {
    name                       = "Allow-All-Inbound-Dev"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "10.0.0.0/8"
    destination_address_prefix = "*"
    description                = "Allow all internal traffic in dev"
  },
]
```

```hcl
# prod.tfvars - Restrictive for production
nsg_rules = [
  {
    name                       = "Allow-HTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
    description                = "Allow HTTPS from internet"
  },
  {
    name                       = "Deny-All-Inbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
    description                = "Deny all other inbound traffic"
  },
]
```

## Handling Multiple Port Ranges

Some rules need multiple destination ports. The NSG resource supports both `destination_port_range` (single port) and `destination_port_ranges` (multiple ports), but you can only use one. Dynamic blocks handle this with conditional logic.

```hcl
locals {
  nsg_rules_multi_port = [
    {
      name                       = "Allow-Web-Ports"
      priority                   = 100
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_ranges    = ["80", "443", "8080"]
      destination_port_range     = null
      source_address_prefix      = "*"
      destination_address_prefix = "*"
    },
    {
      name                       = "Allow-SSH"
      priority                   = 110
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_ranges    = null
      destination_port_range     = "22"
      source_address_prefix      = "10.0.0.0/24"
      destination_address_prefix = "*"
    },
  ]
}

resource "azurerm_network_security_group" "multi_port" {
  name                = "nsg-multi-port"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  dynamic "security_rule" {
    for_each = local.nsg_rules_multi_port
    content {
      name                       = security_rule.value.name
      priority                   = security_rule.value.priority
      direction                  = security_rule.value.direction
      access                     = security_rule.value.access
      protocol                   = security_rule.value.protocol
      source_port_range          = security_rule.value.source_port_range
      # Use the singular or plural form based on which is set
      destination_port_range     = security_rule.value.destination_port_range
      destination_port_ranges    = security_rule.value.destination_port_ranges
      source_address_prefix      = security_rule.value.source_address_prefix
      destination_address_prefix = security_rule.value.destination_address_prefix
    }
  }
}
```

## Multiple NSGs from a Single Map

If you have several NSGs (one per subnet tier), you can use `for_each` on the NSG resource and dynamic blocks for the rules within each one.

```hcl
locals {
  nsgs = {
    web = {
      rules = [
        {
          name = "Allow-HTTPS", priority = 100, direction = "Inbound",
          access = "Allow", protocol = "Tcp", source_port_range = "*",
          destination_port_range = "443", source_address_prefix = "*",
          destination_address_prefix = "*"
        },
      ]
    }
    app = {
      rules = [
        {
          name = "Allow-From-Web", priority = 100, direction = "Inbound",
          access = "Allow", protocol = "Tcp", source_port_range = "*",
          destination_port_range = "8080", source_address_prefix = "10.0.1.0/24",
          destination_address_prefix = "*"
        },
      ]
    }
    db = {
      rules = [
        {
          name = "Allow-SQL-From-App", priority = 100, direction = "Inbound",
          access = "Allow", protocol = "Tcp", source_port_range = "*",
          destination_port_range = "1433", source_address_prefix = "10.0.2.0/24",
          destination_address_prefix = "*"
        },
      ]
    }
  }
}

# Create NSGs for each tier with their respective rules
resource "azurerm_network_security_group" "tier" {
  for_each = local.nsgs

  name                = "nsg-${each.key}-tier"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  dynamic "security_rule" {
    for_each = each.value.rules
    content {
      name                       = security_rule.value.name
      priority                   = security_rule.value.priority
      direction                  = security_rule.value.direction
      access                     = security_rule.value.access
      protocol                   = security_rule.value.protocol
      source_port_range          = security_rule.value.source_port_range
      destination_port_range     = security_rule.value.destination_port_range
      source_address_prefix      = security_rule.value.source_address_prefix
      destination_address_prefix = security_rule.value.destination_address_prefix
    }
  }
}
```

This creates three NSGs - `nsg-web-tier`, `nsg-app-tier`, and `nsg-db-tier` - each with their own set of rules, all from a single resource block.

## Tips and Pitfalls

Be careful with rule ordering. The `priority` field determines evaluation order, and you must ensure no two rules in the same NSG share the same priority. When using dynamic blocks with data from variables, validate that priorities are unique.

Do not mix inline `security_rule` blocks with separate `azurerm_network_security_rule` resources for the same NSG. Terraform will detect conflicts and one will overwrite the other. Pick one approach and stick with it.

Dynamic blocks make the plan output harder to read because Terraform shows them as indexed items. Use descriptive rule names so the plan output is still understandable.

Consider using the `azurerm_network_security_rule` resource with `for_each` as an alternative to dynamic blocks. This approach creates each rule as its own Terraform resource, which means adding or removing a rule does not force a recreation of the entire NSG. For production environments where you want minimal blast radius on changes, this can be preferable.

## Conclusion

Terraform dynamic blocks turn NSG rule management from a copy-paste exercise into a data-driven operation. Define your rules as structured data in locals or variables, and let the dynamic block generate the actual HCL. This approach scales cleanly from a handful of rules to dozens, and makes it straightforward to manage environment-specific rule sets. Combined with `for_each` on the NSG resource itself, you can manage an entire network security layer from a compact, readable configuration.
