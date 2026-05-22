# Validation Summary: How to Set Up TLS Certificates for Terraform Enterprise

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Enterprise
- Terraform CLI
- TLS certificates and certificate chains
- Let's Encrypt and Certbot
- OpenSSL
- Docker Compose
- AWS Application Load Balancer

## Sources Consulted
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise Docker deployment guide: https://developer.hashicorp.com/terraform/enterprise/deploy/docker
- HashiCorp Terraform Enterprise diagnostics and readiness endpoints: https://developer.hashicorp.com/terraform/enterprise/deploy/troubleshoot/perform-diagnostics
- HashiCorp Terraform Enterprise credentials requirements: https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/requirements/credentials
- HashiCorp Terraform CLI configuration file reference: https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Terraform login command reference: https://developer.hashicorp.com/terraform/cli/commands/login
- HashiCorp support article for Terraform CLI custom CA trust errors: https://support.hashicorp.com/hc/en-us/articles/4415187888019--x509-certificate-signed-by-unknown-authority-from-Terraform-CLI-with-a-Terraform-Enterprise-remote
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Docker Compose file reference for the obsolete version field: https://docs.docker.com/reference/compose-file/version-and-name/
- AWS Application Load Balancer TLS security policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html

## Issues Found
- The Let's Encrypt DNS validation wording implied it always works for internal-facing instances. I clarified that it requires the ability to create the public DNS TXT record required by ACME validation.
- The renewal example copied certificates to filenames that did not match the later TFE configuration. I changed the copy destinations to `tfe-fullchain.crt` and `tfe.key`.
- The renewal example restarted TFE on every cron run, even when no certificate was renewed. I changed it to use a Certbot deploy hook so the copy and restart happen after a successful renewal.
- The Docker Compose example used the obsolete top-level `version` field. I removed it.
- The Docker Compose example used the `latest` Terraform Enterprise image tag. I changed it to a version placeholder to avoid recommending an unpinned production TFE image.
- The load balancer and curl examples used the deprecated `/_health_check` endpoint. I updated them to use `/api/v1/health/readiness`.
- The Terraform CLI troubleshooting section suggested a `host` block in `.terraformrc` to fix certificate trust. Terraform CLI configuration supports credentials and other CLI settings, but it does not override TLS trust. I removed that snippet and added a note that the client OS must trust the issuing CA.

## Review Notes
- The OpenSSL examples are syntactically valid for the intended CSR, signing, chain inspection, and key/certificate comparison workflows.
- The AWS ALB listener example uses a valid TLS 1.2/1.3 security policy. AWS now documents newer post-quantum TLS policies as available, but the policy in the post is still valid.
- The Certbot manual DNS example is correct for initial issuance, but unattended renewal requires DNS automation hooks or a DNS plugin in real deployments.
