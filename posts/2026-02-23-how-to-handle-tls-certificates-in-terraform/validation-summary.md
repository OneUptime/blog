# Validation Summary: How to Handle TLS Certificates in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- AWS Certificate Manager
- AWS Route 53
- AWS Application Load Balancer
- AWS Secrets Manager
- Amazon CloudWatch
- Azure App Service Managed Certificates
- Azure Key Vault
- Google Cloud managed SSL certificates
- Let's Encrypt / ACME
- Terraform TLS provider
- Kubernetes Secrets

## Sources Consulted
- Terraform AWS provider `aws_acm_certificate` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- Terraform AzureRM provider `azurerm_app_service_custom_hostname_binding` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_service_custom_hostname_binding
- Terraform AzureRM provider `azurerm_app_service_managed_certificate` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_service_managed_certificate
- Terraform AzureRM provider `azurerm_app_service_certificate_binding` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_service_certificate_binding
- Terraform AzureRM provider `azurerm_key_vault_certificate` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_certificate
- Microsoft Learn, Azure App Service TLS/SSL certificates: https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate
- Terraform Google provider `google_compute_managed_ssl_certificate` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_managed_ssl_certificate
- Terraform ACME provider `acme_certificate` documentation: https://registry.terraform.io/providers/vancluever/acme/latest/docs/resources/certificate
- Terraform TLS provider `tls_self_signed_cert` documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/self_signed_cert
- Terraform Kubernetes provider `kubernetes_secret` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- AWS Certificate Manager CloudWatch metrics documentation: https://docs.aws.amazon.com/acm/latest/userguide/cloudwatch-metrics.html

## Issues Found
- The Azure Key Vault certificate storage example built a PEM bundle by concatenating `private_key_pem`, `certificate_pem`, and `issuer_pem`, then wrapping it in `base64encode`. Azure Key Vault certificate imports are more reliable with PKCS#12/PFX input, and the ACME provider exposes `certificate_p12` as a base64-encoded PKCS#12 archive. Changed the example to set `certificate_p12_password` on `acme_certificate` and import `acme_certificate.main.certificate_p12` with the matching password.

## Review Notes
- The Terraform Kubernetes provider stores secret data in Terraform state, even when creating a Kubernetes TLS secret. The example is technically valid, but production usage should account for state-file sensitivity.
- Azure App Service managed certificates have limitations, including no wildcard support and renewal dependence on supported DNS/public reachability prerequisites. The post's examples use a single hostname, so they remain technically correct.
