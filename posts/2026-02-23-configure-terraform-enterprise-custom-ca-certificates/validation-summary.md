# Validation Summary: How to Configure Terraform Enterprise with Custom CA Certificates

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform Enterprise
- HCP Terraform / Terraform Enterprise agents
- TLS and X.509 CA certificates
- Docker Compose
- Kubernetes manifests
- OpenSSL CLI
- Terraform providers for Vault, Kubernetes, and AWS

## Sources Consulted
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise Docker deployment documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/docker
- HashiCorp Terraform Enterprise diagnostics documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/troubleshoot/perform-diagnostics
- HashiCorp HCP Terraform agent documentation: https://developer.hashicorp.com/terraform/cloud-docs/agents/agents
- HashiCorp HCP Terraform agent requirements: https://developer.hashicorp.com/terraform/cloud-docs/agents/requirements
- HashiCorp Help Center: Terraform Enterprise CA bundle setup: https://support.hashicorp.com/hc/en-us/articles/12004148501779-How-to-setup-Terraform-Enterprise-with-a-Certificate-Authority-CA-Bundle
- HashiCorp Help Center: HCP Terraform agent with custom CA certificate: https://support.hashicorp.com/hc/en-us/articles/49681731286803-How-to-Configure-HCP-Terraform-Agent-with-Proxy-and-Custom-CA-Certificate
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- OpenSSL local command help for `x509`, `crl2pkcs7`, and `verify`

## Issues Found
- The Docker Compose example used `images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest`. HashiCorp's Docker deployment documentation states that `latest` is not a valid Terraform Enterprise image tag, so the example now uses the documented release tag placeholder `<vYYYYMM-#>`.
- The Docker Compose example included the obsolete top-level `version` field. Docker Compose now treats this field as informative only and warns that it is obsolete, so it was removed.
- The agent examples used `TFC_AGENT_CUSTOM_CA_CERT_FILE`, which is not listed in the current HCP Terraform agent CLI options. The examples now use `SSL_CERT_FILE` and `REQUESTS_CA_BUNDLE`, matching HashiCorp's custom-CA agent guidance.
- The verification examples used `openssl x509` to validate a bundle. That only validates a single certificate from the input, so the commands now use `openssl crl2pkcs7 -nocrl -certfile ... | openssl pkcs7 -print_certs -noout` to parse the bundle.
- The verification section used Terraform Enterprise's deprecated `/_health_check` endpoint. It now uses `docker compose exec tfe tfectl app health readiness`, matching current Terraform Enterprise diagnostics guidance.
- The certificate expiration section included a loop that did not reliably iterate through every certificate in a PEM bundle. It now keeps the existing AWK-based per-certificate check.

## Review Notes
The main `TFE_TLS_CA_BUNDLE_FILE` guidance is accurate for current containerized Terraform Enterprise: the setting points to CA certificates that Terraform Enterprise adds to the OS CA bundle. Provider-specific CA configuration remains provider-dependent, so the Vault and Kubernetes examples are valid examples rather than universal provider behavior.
