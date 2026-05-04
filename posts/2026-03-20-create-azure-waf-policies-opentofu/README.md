# How to Create Azure WAF Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, WAF, Application Gateway, Infrastructure as Code

Description: Learn how to create Azure Web Application Firewall policies with OpenTofu to protect Azure Application Gateway and Front Door deployments.

Azure WAF policies define managed rule sets and custom rules for protecting web applications. Managing them in OpenTofu ensures consistent security posture across all gateway-protected services.

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## WAF Policy for Application Gateway

```hcl
resource "azurerm_resource_group" "waf" {
  name     = "waf-rg"
  location = "eastus"
}

resource "azurerm_web_application_firewall_policy" "main" {
  name                = "myapp-waf-policy"
  resource_group_name = azurerm_resource_group.waf.name
  location            = azurerm_resource_group.waf.location

  policy_settings {
    enabled                     = true
    mode                        = "Prevention"  # Detection or Prevention
    request_body_check          = true
    file_upload_limit_in_mb     = 100
    max_request_body_size_in_kb = 128
  }

  # OWASP Core Rule Set 3.2
  managed_rules {
    managed_rule_set {
      type    = "OWASP"
      version = "3.2"
    }

    # Disable specific rules that cause false positives
    exclusion {
      match_variable          = "RequestHeaderNames"
      selector                = "user-agent"
      selector_match_operator = "Equals"
    }
  }

  # Custom rules
  custom_rules {
    name      = "BlockBadBots"
    priority  = 1
    rule_type = "MatchRule"
    action    = "Block"

    match_conditions {
      match_variables {
        variable_name = "RequestHeaders"
        selector      = "user-agent"
      }

      operator           = "Contains"
      negation_condition = false
      match_values       = ["BadBot", "scrapy", "sqlmap"]
      transforms         = ["Lowercase"]
    }
  }

  custom_rules {
    name      = "RateLimitPerIP"
    priority  = 2
    rule_type = "RateLimitRule"
    action    = "Block"
    rate_limit_threshold = 1000  # Requests per duration window
    rate_limit_duration  = "OneMin"  # OneMin or FiveMins
    group_rate_limit_by  = "ClientAddr"

    match_conditions {
      match_variables {
        variable_name = "RemoteAddr"
      }
      operator     = "IPMatch"
      match_values = ["0.0.0.0/0"]  # Apply to all IPs
    }
  }

  tags = {
    Environment = "production"
  }
}
```

## Associate with Application Gateway

```hcl
resource "azurerm_application_gateway" "main" {
  name                = "myapp-agw"
  resource_group_name = azurerm_resource_group.waf.name
  location            = azurerm_resource_group.waf.location

  sku {
    name     = "WAF_v2"
    tier     = "WAF_v2"
    capacity = 2
  }

  firewall_policy_id = azurerm_web_application_firewall_policy.main.id

  # ... other gateway configuration ...

  waf_configuration {
    enabled          = true
    firewall_mode    = "Prevention"
    rule_set_version = "3.2"
  }
}
```

## WAF Policy for Azure Front Door

```hcl
resource "azurerm_cdn_frontdoor_firewall_policy" "global" {
  name                              = "myapp-global-waf"
  resource_group_name               = azurerm_resource_group.waf.name
  sku_name                          = "Premium_AzureFrontDoor"
  enabled                           = true
  mode                              = "Prevention"
  redirect_url                      = "https://example.com/blocked"
  custom_block_response_status_code = 429

  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"
  }

  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }

  custom_rule {
    name     = "RateLimitLogin"
    type     = "RateLimitRule"
    action   = "Block"
    priority = 1
    rate_limit_threshold          = 100
    rate_limit_duration_in_minutes = 1

    match_condition {
      match_variable     = "RequestUri"
      operator           = "Contains"
      match_values       = ["/auth/login"]
      transforms         = ["Lowercase"]
    }
  }
}
```

## Conclusion

Azure WAF policies in OpenTofu protect Application Gateway and Front Door deployments with managed rule sets and custom rules. Use Prevention mode in production for active blocking, include the OWASP CRS 3.2 managed rule set, and add custom rules for bot blocking and rate limiting. Use exclusions to suppress false positives on specific headers or parameters that your application legitimately sends.
