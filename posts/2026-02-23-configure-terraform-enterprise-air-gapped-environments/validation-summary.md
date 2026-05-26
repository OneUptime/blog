# Validation Summary: How to Configure Terraform Enterprise with Air-Gapped Environments

## Status
validated

## Post Type
Technical guide / deployment tutorial

## Technologies Covered
- Terraform Enterprise
- Terraform CLI
- Terraform provider installation mirrors
- Terraform Enterprise Admin Terraform Versions API
- Docker and Docker Compose
- Internal artifact repositories and container registries
- VCS integrations for Terraform Enterprise

## Sources Consulted
- HashiCorp Terraform Enterprise Docker deployment documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/docker
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise releases: https://developer.hashicorp.com/terraform/enterprise/releases and https://developer.hashicorp.com/terraform/enterprise/releases/2.0.x
- HashiCorp Terraform Enterprise Admin Terraform Versions API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/terraform-versions
- HashiCorp Terraform CLI provider mirror command: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- HashiCorp Terraform CLI configuration file provider installation documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Terraform provider network mirror protocol: https://developer.hashicorp.com/terraform/internals/provider-network-mirror-protocol
- HashiCorp Terraform Enterprise license reporting documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/manage/license-report
- HashiCorp Help Center guidance for provider installation in Terraform Enterprise: https://support.hashicorp.com/hc/en-us/articles/1500001875182-How-To-Set-Up-Provider-Installation-in-Terraform-Enterprise

## Issues Found
- The TFE registry login used a generic `HASHICORP_TOKEN`. HashiCorp documents logging in to `images.releases.hashicorp.com` with username `terraform` and the Terraform Enterprise license as the password, so the example now uses `HASHICORP_LICENSE`.
- The TFE image tag was an old monthly release (`v202402-1`). The example now uses the current documented release `2.0.2` as of May 26, 2026.
- The Terraform CLI binary staging instructions used `TFE_TERRAFORM_BINARY_PATH`, which is not a documented Terraform Enterprise setting. The post now stages Terraform ZIP files on an internal artifact server and registers them through the Admin Terraform Versions API with URL and SHA-256 checksum.
- The manual provider mirror used a directory layout that did not match Terraform's packed filesystem mirror layout. The path now matches `HOSTNAME/NAMESPACE/TYPE/terraform-provider-TYPE_VERSION_TARGET.zip`.
- The TFE deployment snippet omitted required or documented Docker runtime settings, including `TFE_OPERATIONAL_MODE`, `TFE_ENCRYPTION_PASSWORD`, Docker run pipeline settings, disk cache volume configuration, and the Docker socket mount. These were added or corrected.
- The post implied that a static Terraform CLI config file could be mounted into TFE for all workspace runs. Terraform Enterprise dynamically generates CLI config for runs, so the post now recommends the documented custom run-pipeline image hook pattern and an internal network mirror.
- The post described license-server checking without explaining air-gapped reporting behavior. The deployment settings now opt out of automated license and usage reporting, consistent with HashiCorp's air-gapped guidance.

## Review Notes
The examples remain illustrative and still need site-specific values for certificates, database TLS parameters, object storage compatibility settings, internal registry credentials, and the custom run-pipeline image build process. Air-gapped upgrades may require intermediate TFE releases, so operators should always check the release notes for their current and target versions before staging upgrade artifacts.
