# Validation Summary: How to Configure HCP Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Cloud Platform (HCP)
- HCP Terraform provider
- HCP Vault Dedicated
- HCP Consul
- HCP Packer
- HashiCorp Virtual Networks (HVNs)
- AWS VPC peering

## Sources Consulted
- HCP provider documentation: https://registry.terraform.io/providers/hashicorp/hcp/latest/docs
- HCP provider authentication guide: https://registry.terraform.io/providers/hashicorp/hcp/latest/docs/guides/auth
- HCP provider version API: https://registry.terraform.io/v1/providers/hashicorp/hcp/versions
- `hcp_hvn` resource documentation: https://registry.terraform.io/providers/hashicorp/hcp/latest/docs/resources/hvn
- `hcp_vault_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/hcp/latest/docs/resources/vault_cluster
- `hcp_vault_cluster_admin_token` resource documentation: https://registry.terraform.io/providers/hashicorp/hcp/latest/docs/resources/vault_cluster_admin_token
- `hcp_consul_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/hcp/latest/docs/resources/consul_cluster
- `hcp_consul_cluster_root_token` resource documentation: https://registry.terraform.io/providers/hashicorp/hcp/latest/docs/resources/consul_cluster_root_token
- `hcp_aws_network_peering` resource documentation: https://registry.terraform.io/providers/hashicorp/hcp/latest/docs/resources/aws_network_peering
- `hcp_hvn_route` resource documentation: https://registry.terraform.io/providers/hashicorp/hcp/latest/docs/resources/hvn_route
- `hcp_packer_version` data source documentation: https://registry.terraform.io/providers/hashicorp/hcp/latest/docs/data-sources/packer_version
- `hcp_packer_artifact` data source documentation: https://registry.terraform.io/providers/hashicorp/hcp/latest/docs/data-sources/packer_artifact
- HCP CLI `hcp auth login` documentation: https://developer.hashicorp.com/hcp/docs/cli/commands/auth/login
- HCP Packer registry reference documentation: https://developer.hashicorp.com/hcp/docs/packer/store/reference

## Issues Found
- The provider version constraint used `~> 0.78`, while the current registry version is `0.111.0`. Updated the examples and best-practice text to use `~> 0.111`.
- The local authentication section said the provider would automatically use a token cached by `hcp auth login`. The HCP provider documentation describes client credentials, explicit credential files, and provider-initiated browser login for user sessions. Replaced that section with browser-login guidance and removed the misleading CLI-cache claim.
- The Consul example comment implied `public_endpoint` connects Consul clients from outside the HVN. The provider schema says `public_endpoint` exposes the Consul UI, while `connect_enabled` enables Consul service mesh. Updated the comment accordingly.
- The AWS peering example created the HCP peering request and HVN route but did not accept the AWS VPC peering connection. Added `aws_vpc_peering_connection_accepter` using the HCP peering resource's `provider_peering_id`.

## Review Notes
- Terraform is not installed in the local environment, so snippets were reviewed against official provider schemas and documentation rather than validated with `terraform validate`.
- The AWS examples remain illustrative and still assume a configured AWS provider, correct AWS credentials, AWS-side route table updates, and security group rules for real connectivity.
