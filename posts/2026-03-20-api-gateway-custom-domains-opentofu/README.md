# How to Set Up API Gateway Custom Domains with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Azure, GCP, API Gateway, Custom Domain, TLS, Infrastructure as Code

Description: Learn how to configure custom domains for AWS API Gateway, Azure API Management, and GCP API Gateway using OpenTofu with TLS certificates and DNS routing.

Custom domains replace the default auto-generated API Gateway URLs (like `abc123.execute-api.us-east-1.amazonaws.com`) with branded, memorable URLs like `api.yourcompany.com`. Managing custom domains in OpenTofu ensures consistent TLS certificate management and DNS routing alongside your API configuration.

## AWS API Gateway Custom Domain (HTTP API)

```hcl
# ACM certificate for the custom domain

resource "aws_acm_certificate" "api" {
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Validate certificate via Route53
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# API Gateway custom domain
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.${var.domain_name}"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  depends_on = [aws_acm_certificate_validation.api]
}

# Map the custom domain to the API stage
resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.production.id
}

# Route53 alias record to API Gateway
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

## REST API Custom Domain with Base Path Mapping

```hcl
resource "aws_api_gateway_domain_name" "api" {
  domain_name              = "api.${var.domain_name}"
  regional_certificate_arn = aws_acm_certificate_validation.api.certificate_arn
  security_policy          = "TLS_1_2"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Map /v1 path to the production stage
resource "aws_api_gateway_base_path_mapping" "v1" {
  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.production.stage_name
  domain_name = aws_api_gateway_domain_name.api.domain_name
  base_path   = "v1"  # api.example.com/v1/...
}

# Map /v2 path to a new API version
resource "aws_api_gateway_base_path_mapping" "v2" {
  api_id      = aws_api_gateway_rest_api.v2.id
  stage_name  = aws_api_gateway_stage.v2.stage_name
  domain_name = aws_api_gateway_domain_name.api.domain_name
  base_path   = "v2"  # api.example.com/v2/...
}
```

## Azure API Management Custom Domain

```hcl
# Key Vault certificate for the APIM custom domain
resource "azurerm_key_vault_certificate" "apim" {
  name         = "apim-api-cert"
  key_vault_id = azurerm_key_vault.main.id

  certificate_policy {
    issuer_parameters {
      name = "Self"
    }
    key_properties {
      exportable = true
      key_size   = 2048
      key_type   = "RSA"
      reuse_key  = false
    }
    lifetime_action {
      action {
        action_type = "AutoRenew"
      }

      trigger {
        days_before_expiry = 30
      }
    }
    secret_properties {
      content_type = "application/x-pkcs12"
    }
    x509_certificate_properties {
      key_usage = [
        "cRLSign",
        "dataEncipherment",
        "digitalSignature",
        "keyAgreement",
        "keyCertSign",
        "keyEncipherment",
      ]

      subject            = "CN=api.${var.domain_name}"
      validity_in_months = 12
      subject_alternative_names {
        dns_names = ["api.${var.domain_name}"]
      }
    }
  }
}

resource "azurerm_api_management" "main" {
  name                = "production-apim"
  location            = var.location
  resource_group_name = azurerm_resource_group.apim.name
  publisher_name      = "ACME Corp"
  publisher_email     = "api-team@example.com"
  sku_name            = "Premium_1"

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_key_vault_access_policy" "apim" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = azurerm_api_management.main.identity[0].tenant_id
  object_id    = azurerm_api_management.main.identity[0].principal_id

  secret_permissions = ["Get", "List"]
}

resource "azurerm_api_management_custom_domain" "main" {
  api_management_id = azurerm_api_management.main.id

  gateway {
    host_name                = "api.${var.domain_name}"
    key_vault_certificate_id = azurerm_key_vault_certificate.apim.versionless_secret_id
  }

  depends_on = [azurerm_key_vault_access_policy.apim]
}
```

## Multi-Environment Domain Routing

```hcl
locals {
  api_domains = {
    production = "api.${var.domain_name}"
    staging    = "api-staging.${var.domain_name}"
  }
}

resource "aws_acm_certificate" "envs" {
  for_each = local.api_domains

  domain_name       = each.value
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation_envs" {
  for_each = local.api_domains

  zone_id = data.aws_route53_zone.main.zone_id
  name    = tolist(aws_acm_certificate.envs[each.key].domain_validation_options)[0].resource_record_name
  type    = tolist(aws_acm_certificate.envs[each.key].domain_validation_options)[0].resource_record_type
  records = [tolist(aws_acm_certificate.envs[each.key].domain_validation_options)[0].resource_record_value]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "envs" {
  for_each = local.api_domains

  certificate_arn         = aws_acm_certificate.envs[each.key].arn
  validation_record_fqdns = [aws_route53_record.cert_validation_envs[each.key].fqdn]
}

resource "aws_apigatewayv2_domain_name" "envs" {
  for_each = local.api_domains

  domain_name = each.value

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.envs[each.key].certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "envs" {
  for_each = local.api_domains

  api_id      = var.api_ids[each.key]
  domain_name = aws_apigatewayv2_domain_name.envs[each.key].id
  stage       = var.stage_ids[each.key]
}

resource "aws_route53_record" "api_envs" {
  for_each = local.api_domains

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.envs[each.key].domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.envs[each.key].domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Conclusion

API Gateway custom domains in OpenTofu replace auto-generated URLs with branded endpoints. For AWS, use ACM for certificate provisioning with DNS validation via Route53, then create an alias record pointing to the API Gateway regional endpoint. Use base_path_mapping to host multiple API versions under a single domain. In Azure APIM, use Key Vault certificates with a system-assigned managed identity and a versionless Key Vault secret ID so API Management can pick up renewed certificate versions automatically. HTTP APIs require the `TLS_1_2` security policy; for REST APIs, `TLS_1_2` is a safe default and newer enhanced security policies are also available. Regional endpoints avoid the `us-east-1` certificate requirement of Edge-optimized custom domains.
