# How to Set Up Azure Firewall Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Firewall Policies, Network Security, Application Rules, IdP, Infrastructure as Code

Description: Learn how to configure Azure Firewall Policies with OpenTofu to centrally manage network, application, and NAT rules across multiple firewalls with IDPS and TLS inspection.

## Introduction

Azure Firewall Policy is a global resource that centralizes firewall configuration across multiple Azure Firewalls and Virtual WAN Secured Hubs. It supports hierarchical policies (parent/child) for organization-wide base rules and team-specific additions. Azure Firewall Premium tier adds IDPS (Intrusion Detection and Prevention), TLS inspection, and URL filtering, and provides more granular Web Categories matching than Standard.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials with Network permissions
- For TLS inspection: an Azure Key Vault secret containing the intermediate CA certificate, plus a user-assigned managed identity with Key Vault Secret Get/List permissions via Key Vault access policies
- An Azure Firewall or Secured Virtual Hub to attach the policy

## Step 1: Create Firewall Policy

```hcl
resource "azurerm_firewall_policy" "main" {
  name                = "${var.project_name}-fw-policy"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Premium"  # Premium is required for IDPS and TLS inspection

  identity {
    type         = "UserAssigned"
    identity_ids = [var.firewall_policy_identity_id]
  }

  # IDPS configuration (Premium only)
  intrusion_detection {
    mode = "Alert"  # Off, Alert, or Deny

    # Bypass IDPS for specific traffic
    traffic_bypass {
      name                  = "bypass-trusted-ranges"
      description           = "Bypass IDPS for internal monitoring"
      protocol              = "TCP"
      source_ip_groups      = [azurerm_ip_group.trusted.id]
      destination_ip_groups = [azurerm_ip_group.monitoring.id]
    }
  }

  # TLS inspection (Premium only)
  tls_certificate {
    key_vault_secret_id = var.intermediate_ca_secret_id
    name                = "${var.project_name}-tls-cert"
  }

  # Threat intelligence
  threat_intelligence_mode = "Alert"  # Off, Alert, or Deny

  dns {
    servers       = ["10.0.0.4", "10.0.0.5"]
    proxy_enabled = true  # Enable DNS proxy for FQDN rules
  }

  tags = {
    Name = "${var.project_name}-firewall-policy"
  }
}
```

## Step 2: Network Rule Collection

```hcl
resource "azurerm_firewall_policy_rule_collection_group" "network" {
  name               = "network-rules"
  firewall_policy_id = azurerm_firewall_policy.main.id
  priority           = 200

  network_rule_collection {
    name     = "allow-internal-traffic"
    priority = 100
    action   = "Allow"

    rule {
      name                  = "allow-spoke-to-spoke"
      protocols             = ["TCP", "UDP"]
      source_ip_groups      = [azurerm_ip_group.all_spokes.id]
      destination_ip_groups = [azurerm_ip_group.all_spokes.id]
      destination_ports     = ["*"]
    }

    rule {
      name              = "allow-ntp"
      protocols         = ["UDP"]
      source_addresses  = ["10.0.0.0/8"]
      destination_fqdns = ["time.windows.com"]
      destination_ports = ["123"]
    }
  }

  network_rule_collection {
    name     = "deny-unwanted"
    priority = 200
    action   = "Deny"

    rule {
      name              = "deny-smb"
      protocols         = ["TCP"]
      source_addresses  = ["*"]
      destination_addresses = ["*"]
      destination_ports = ["445"]
    }
  }
}
```

## Step 3: Application Rule Collection

```hcl
resource "azurerm_firewall_policy_rule_collection_group" "application" {
  name               = "application-rules"
  firewall_policy_id = azurerm_firewall_policy.main.id
  priority           = 300

  application_rule_collection {
    name     = "allow-microsoft-services"
    priority = 100
    action   = "Allow"

    rule {
      name = "allow-windows-update"
      source_addresses = ["10.0.0.0/8"]
      protocols {
        type = "Https"
        port = 443
      }
      destination_fqdn_tags = ["WindowsUpdate", "MicrosoftActiveProtectionService"]
    }

    rule {
      name             = "allow-azure-services"
      source_addresses = ["10.0.0.0/8"]
      protocols {
        type = "Https"
        port = 443
      }
      destination_fqdns = [
        "*.azure.com",
        "*.microsoft.com",
        "*.azurecr.io"
      ]
    }
  }

  application_rule_collection {
    name     = "deny-categories"
    priority = 200
    action   = "Deny"

    rule {
      name             = "block-social-media"
      source_addresses = ["10.0.0.0/8"]
      protocols {
        type = "Https"
        port = 443
      }
      web_categories = ["SocialNetworking", "Entertainment"]
    }
  }
}
```

## Step 4: NAT Rule Collection (DNAT)

```hcl
resource "azurerm_firewall_policy_rule_collection_group" "nat" {
  name               = "nat-rules"
  firewall_policy_id = azurerm_firewall_policy.main.id
  priority           = 100

  nat_rule_collection {
    name     = "inbound-nat"
    priority = 100
    action   = "Dnat"

    rule {
      name                = "rdp-to-jumpbox"
      protocols           = ["TCP"]
      source_addresses    = [var.admin_cidr]
      destination_address = var.firewall_public_ip
      destination_ports   = ["3389"]
      translated_address  = var.jumpbox_private_ip
      translated_port     = "3389"
    }
  }
}
```

## Step 5: Attach Policy to Firewall

```hcl
resource "azurerm_firewall" "main" {
  name                = "${var.project_name}-firewall"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku_name            = "AZFW_VNet"
  sku_tier            = "Premium"
  firewall_policy_id  = azurerm_firewall_policy.main.id

  ip_configuration {
    name                 = "primary"
    subnet_id            = var.firewall_subnet_id  # Must be "AzureFirewallSubnet"
    public_ip_address_id = var.firewall_pip_id
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check policy attachment

az network firewall show \
  --resource-group <rg> \
  --name <firewall-name> \
  --query "firewallPolicy"

# Monitor firewall logs
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "AZFWNetworkRule | take 10"
```

## Conclusion

Enable DNS proxy (`dns { proxy_enabled = true }`) on the Firewall Policy and configure your virtual network or clients to use the firewall's private IP as DNS when using FQDN-based network rules; otherwise, FQDN-based network rules won't work consistently. Use IP Groups (`azurerm_ip_group`) to group CIDR ranges for reuse across multiple rules instead of duplicating address lists. For hierarchical organizations, create a base parent policy with organization-wide rules and child policies for team-specific additions; child policies inherit parent network and application rule collections, while NAT rule collections must be defined in the child policy.
