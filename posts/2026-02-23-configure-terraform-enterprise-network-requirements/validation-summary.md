# Validation Summary: How to Configure Terraform Enterprise Network Requirements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform Enterprise
- Terraform AWS provider
- AWS security groups
- AWS VPC endpoints
- DNS
- HTTP proxy configuration
- Docker Compose
- Docker daemon systemd proxy configuration
- Bash, curl, nc, dig, and nslookup

## Sources Consulted
- HashiCorp Terraform Enterprise: Configure network access: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/network
- HashiCorp Terraform Enterprise: Configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise: Deploy to Docker: https://developer.hashicorp.com/terraform/enterprise/deploy/docker
- HashiCorp Terraform Enterprise: Replicated network requirements: https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/requirements/network
- Terraform AWS provider: aws_security_group resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider: aws_vpc_endpoint resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- Docker Docs: Daemon proxy configuration: https://docs.docker.com/engine/daemon/proxy/
- Docker Docs: Compose file version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The inbound requirements table omitted current Terraform Enterprise ingress ports for the admin API, optional metrics endpoints, host administration, and active-active Vault HA forwarding. Added rows for ports 22, 8443, 9090/9091, and 8201 based on HashiCorp's network documentation.
- The outbound requirements table omitted documented Terraform Enterprise endpoints for the HashiCorp container registry and Terraform Registry Algolia search API. Added those entries.
- The post referred to a generic HashiCorp License Server. HashiCorp's current documentation identifies the endpoint as `reporting.hashicorp.services` for license entitlement reporting unless reporting is opted out. Updated the table and network test script accordingly.
- The Docker Compose snippet used `images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest`. HashiCorp documents that `latest` is not a valid Terraform Enterprise image tag. Replaced it with the documented `<vYYYYMM-#>` placeholder.
- The Docker Compose snippet used the obsolete top-level `version` field. Removed it to match the current Compose Specification.
- The TFE proxy example used uppercase proxy variables, while the current Terraform Enterprise configuration reference documents `http_proxy`, `https_proxy`, and `no_proxy`. Updated the TFE examples and prose to use the documented lowercase names.
- The network testing script did not check the Terraform Registry search API or HashiCorp reporting service. Added reachability checks for `https://yy0ffni7mf-dsn.algolia.net/` and `https://reporting.hashicorp.services`.

## Review Notes
The AWS security group and VPC endpoint examples are illustrative and syntactically consistent with the Terraform AWS provider resources, but they are not standalone Terraform modules because referenced variables and security groups are intentionally omitted. The Docker daemon proxy example remains valid; Docker currently recommends `daemon.json` for daemon proxy settings, but still documents the systemd drop-in method used by the post.
