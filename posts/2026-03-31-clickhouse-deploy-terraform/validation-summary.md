# Validation Summary: How to Deploy ClickHouse with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server, client, official APT repository)
- Terraform (HCL, AWS provider `hashicorp/aws` ~> 5.0)
- AWS (EC2, Security Groups, AMI data source)
- Ubuntu / Debian package management (apt, gpg keyrings)
- systemd (service enablement)

## Sources Consulted
- ClickHouse official install docs (Debian/Ubuntu): https://clickhouse.com/docs/install#available-installation-options
- Terraform AWS provider docs, `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider docs, `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform `count` and splat expression docs: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Debian wiki on deprecation of `apt-key`: https://wiki.debian.org/DebianRepository/UseThirdParty
- ClickHouse default ports reference (8123 HTTP, 9000 native TCP): https://clickhouse.com/docs/guides/sre/network-ports

## Issues Found
- **Deprecated `apt-key add` usage in user_data**: The original install script piped the ClickHouse signing key into `apt-key add -`, which is deprecated since Debian 11 / Ubuntu 22.04 and emits warnings on modern distributions. It also omitted `gnupg` from the installed prerequisite packages, which is required for `gpg --dearmor`. Updated the script to:
  - Install `gnupg` alongside the other prerequisites.
  - Store the dearmored key at `/usr/share/keyrings/clickhouse-keyring.gpg`.
  - Reference it in the sources list via `[signed-by=...]`, which matches the current ClickHouse official installation instructions.

## Review Notes
- The post references `data.aws_ami.ubuntu.id` without showing the `aws_ami` data source definition. This is a reasonable omission for a focused tutorial, but readers will need to add one (e.g., a Canonical owner filter) to make the config apply cleanly.
- The security group permits ingress from the entire `10.0.0.0/8` RFC 1918 range. This is appropriate for private-cluster traffic but readers should tighten to specific VPC CIDRs in production.
- Using `user_data` for bootstrap means the install runs only on first boot; configuration drift later must be handled via Ansible/cloud-init as the summary correctly notes.
- ClickHouse's `lts` APT channel is still valid; `stable` is an alternative channel if readers prefer the latest releases.
- The HCL uses `vpc_security_group_ids` (VPC-style) rather than the EC2-Classic `security_groups`, which is correct for any modern AWS account.
