# How to Handle TLS Certificates in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, TLS, Certificate, Security, IaC, DevOps, HTTPS

Description: A practical guide to managing TLS certificates in Terraform, covering ACM, Let's Encrypt, self-signed certificates, certificate storage, renewal automation.

---

TLS certificates are a critical part of modern infrastructure. Every HTTPS endpoint, API gateway, and load balancer needs one. Managing certificates through Terraform brings the same benefits as managing any other infrastructure - version control, reproducibility, and automation. This guide covers the main patterns for handling TLS certificates in Terraform.

## AWS Certificate Manager (ACM)

ACM is the easiest way to manage certificates in AWS. It provides free public certificates that automatically renew:

```hcl
# Request a public certificate
resource "aws_acm_certificate" "main" {
  domain_name       = "example.com"
  validation_method = "DNS"

  # Include wildcard and additional domains
  subject_alternative_names = [
    "*.example.com",
    "api.example.com"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = "production"
  }
}

# DNS validation records (using Route53)
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for validation to complete
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Use the certificate with an ALB
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}
```

## Azure App Service Managed Certificates

Azure provides free managed certificates for App Service:

```hcl
# Custom domain binding
resource "azurerm_app_service_custom_hostname_binding" "main" {
  hostname            = "app.example.com"
  app_service_name    = azurerm_linux_web_app.main.name
  resource_group_name = azurerm_resource_group.main.name
}

# Managed certificate
resource "azurerm_app_service_managed_certificate" "main" {
  custom_hostname_binding_id = azurerm_app_service_custom_hostname_binding.main.id
}

# Bind the certificate
resource "azurerm_app_service_certificate_binding" "main" {
  hostname_binding_id = azurerm_app_service_custom_hostname_binding.main.id
  certificate_id      = azurerm_app_service_managed_certificate.main.id
  ssl_state           = "SniEnabled"
}
```

For Azure Key Vault-stored certificates:

```hcl
# Import a certificate to Key Vault
resource "azurerm_key_vault_certificate" "main" {
  name         = "app-tls-cert"
  key_vault_id = azurerm_key_vault.main.id

  certificate {
    contents = filebase64("certs/app.pfx")
    password = var.cert_password
  }
}
```

## GCP Managed SSL Certificates

Google Cloud provides managed certificates for load balancers:

```hcl
# Managed SSL certificate
resource "google_compute_managed_ssl_certificate" "main" {
  name = "myapp-cert"

  managed {
    domains = ["example.com", "www.example.com"]
  }
}

# Use with a load balancer
resource "google_compute_target_https_proxy" "main" {
  name             = "myapp-https-proxy"
  url_map          = google_compute_url_map.main.id
  ssl_certificates = [google_compute_managed_ssl_certificate.main.id]
}
```

## Let's Encrypt with ACME Provider

For environments where managed certificates are not available, use the ACME provider with Let's Encrypt:

```hcl
terraform {
  required_providers {
    acme = {
      source  = "vancluever/acme"
      version = "~> 2.19"
    }
  }
}

# Use Let's Encrypt staging for testing, production for real certs
provider "acme" {
  server_url = "https://acme-v02.api.letsencrypt.org/directory"
}

# Create an account key
resource "tls_private_key" "acme_account" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Register with ACME
resource "acme_registration" "main" {
  account_key_pem = tls_private_key.acme_account.private_key_pem
  email_address   = "admin@example.com"
}

# Request a certificate
resource "acme_certificate" "main" {
  account_key_pem = acme_registration.main.account_key_pem
  common_name     = "example.com"
  subject_alternative_names = ["*.example.com"]

  # DNS challenge using Route53
  dns_challenge {
    provider = "route53"

    config = {
      AWS_DEFAULT_REGION = "us-east-1"
    }
  }
}

# The certificate components are available as attributes
# acme_certificate.main.certificate_pem
# acme_certificate.main.private_key_pem
# acme_certificate.main.issuer_pem
```

## Self-Signed Certificates for Development

For development and testing environments:

```hcl
# Generate a private key
resource "tls_private_key" "dev" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Create a self-signed certificate
resource "tls_self_signed_cert" "dev" {
  private_key_pem = tls_private_key.dev.private_key_pem

  subject {
    common_name  = "dev.example.com"
    organization = "My Company"
  }

  validity_period_hours = 8760  # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth"
  ]

  dns_names = [
    "dev.example.com",
    "*.dev.example.com",
    "localhost"
  ]

  ip_addresses = ["127.0.0.1"]
}

# Store in Kubernetes for local development
resource "kubernetes_secret" "tls" {
  metadata {
    name      = "dev-tls"
    namespace = "default"
  }

  type = "kubernetes.io/tls"

  data = {
    "tls.crt" = tls_self_signed_cert.dev.cert_pem
    "tls.key" = tls_private_key.dev.private_key_pem
  }
}
```

## Storing Certificates Securely

Certificate private keys are highly sensitive. Store them in secret managers:

```hcl
# Store certificate in AWS Secrets Manager
resource "aws_secretsmanager_secret" "tls_cert" {
  name = "production/tls/example-com"
}

resource "aws_secretsmanager_secret_version" "tls_cert" {
  secret_id = aws_secretsmanager_secret.tls_cert.id

  secret_string = jsonencode({
    certificate = acme_certificate.main.certificate_pem
    private_key = acme_certificate.main.private_key_pem
    chain       = acme_certificate.main.issuer_pem
    full_chain  = "${acme_certificate.main.certificate_pem}${acme_certificate.main.issuer_pem}"
  })
}

# Store in Azure Key Vault as a certificate object
resource "azurerm_key_vault_certificate" "main" {
  name         = "example-com-cert"
  key_vault_id = azurerm_key_vault.main.id

  certificate {
    contents = base64encode("${acme_certificate.main.private_key_pem}${acme_certificate.main.certificate_pem}${acme_certificate.main.issuer_pem}")
  }
}
```

## Importing Existing Certificates

If you have certificates from an external CA:

```hcl
# Import a certificate to ACM
resource "aws_acm_certificate" "imported" {
  private_key       = file("certs/private.key")
  certificate_body  = file("certs/certificate.crt")
  certificate_chain = file("certs/chain.crt")

  lifecycle {
    create_before_destroy = true
  }
}
```

For security, do not store certificate files in your repository. Fetch them from a secret manager or pass them as variables:

```hcl
variable "certificate_body" {
  type      = string
  sensitive = true
}

variable "private_key" {
  type      = string
  sensitive = true
}

resource "aws_acm_certificate" "imported" {
  private_key      = var.private_key
  certificate_body = var.certificate_body
}
```

## Certificate Renewal Automation

Managed certificates (ACM, GCP, Azure) renew automatically. For others, set up monitoring:

```hcl
# Monitor certificate expiration with CloudWatch
resource "aws_cloudwatch_metric_alarm" "cert_expiry" {
  alarm_name          = "certificate-expiring-soon"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DaysToExpiry"
  namespace           = "AWS/CertificateManager"
  period              = 86400
  statistic           = "Minimum"
  threshold           = 30
  alarm_description   = "TLS certificate expires in less than 30 days"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CertificateArn = aws_acm_certificate.main.arn
  }
}
```

## Multi-Domain and Wildcard Certificates

Handle complex certificate requirements:

```hcl
# Certificate with multiple domains across services
resource "aws_acm_certificate" "multi_domain" {
  domain_name = "example.com"

  subject_alternative_names = [
    "*.example.com",        # Wildcard for subdomains
    "api.example.com",      # Explicit API domain
    "cdn.example.com",      # CDN domain
    "example.org",          # Additional domain
    "*.example.org"         # Wildcard for additional domain
  ]

  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}
```

## Monitoring Your HTTPS Endpoints

After deploying TLS certificates, monitor that they are working correctly. [OneUptime](https://oneuptime.com) can monitor your HTTPS endpoints, checking not just availability but also certificate validity, expiration dates, and SSL configuration. This catches issues like expired certificates or misconfigured SSL before they affect your users.

## Conclusion

TLS certificate management in Terraform ranges from simple (managed cloud certificates) to complex (custom CA-issued certificates with manual rotation). Use managed certificates whenever possible - they are free, auto-renewing, and require minimal configuration. For everything else, combine the ACME provider or certificate imports with secret manager storage to keep your private keys secure. Always monitor certificate expiration, even for auto-renewing certificates, because validation failures can prevent renewal.

For more on Terraform security, see our guides on [OIDC for provider authentication](https://oneuptime.com/blog/post/2026-02-23-how-to-use-oidc-for-provider-authentication-in-terraform/view) and [handling sensitive variables](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-sensitive-variables-in-terraform-securely/view).
