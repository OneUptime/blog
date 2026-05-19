# Validation Summary: How to Install Terraform on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Terraform (1.x)
- Ubuntu Server
- HashiCorp APT repository
- tfenv (Terraform version manager)
- AWS CLI / AWS provider
- Azure CLI / azurerm provider
- Google Cloud SDK / GCP provider
- Terraform S3 and azurerm backends
- bash / shell scripting

## Sources Consulted
- HashiCorp Terraform install docs: https://developer.hashicorp.com/terraform/install
- HashiCorp APT repository docs: https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli
- Terraform releases: https://releases.hashicorp.com/terraform
- tfenv README: https://github.com/tfutils/tfenv
- Terraform `local` provider: https://registry.terraform.io/providers/hashicorp/local/latest/docs
- Terraform S3 backend docs: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform azurerm backend docs: https://developer.hashicorp.com/terraform/language/backend/azurerm
- AWS CLI install docs: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- Azure CLI install docs: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux
- Google Cloud SDK install docs (Debian/Ubuntu): https://cloud.google.com/sdk/docs/install#deb
- Debian wiki on apt-key deprecation: https://wiki.debian.org/DebianRepository/UseThirdParty

## Issues Found
- **GCP CLI install used deprecated `apt-key`**: The GCP Provider Setup section used `sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -` to install Google's signing key. `apt-key` is deprecated in modern Ubuntu (22.04+) and is being removed. Mixing it with the `signed-by=` syntax in the sources.list line was inconsistent. Replaced with the current recommended approach: `curl ... | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg`, matching Google's official install documentation. Also added the prerequisite `apt-transport-https ca-certificates gnupg curl` install line per Google's docs, and reordered so the keyring is created before the sources.list entry references it.

## Review Notes
- The HashiCorp APT repository instructions (Method 1) follow the current recommended `signed-by=` approach with a dearmored keyring — correct and modern.
- The direct binary download (Method 2) downloads the `.sig` file but the example does not actually call `gpg --verify` on the SHA256SUMS file. The signature is verifiable, but the example only runs `sha256sum --check`. This is a minor gap (checksum verifies integrity but not authenticity without `gpg --verify`), but the existing flow is still functional and matches what many real-world install scripts do. Left as-is since it is not technically incorrect.
- `terraform version -json | jq -r .terraform_version` matches the actual JSON schema output of `terraform version -json`.
- The `awscli` Ubuntu package installs AWS CLI v1, which is older than the current v2 recommended by AWS. The package still works for the basic `aws configure` flow shown in the post, but readers on production systems should consider installing AWS CLI v2 from the official bundle. Not changed since the post's code is functional.
- The S3 backend example uses `dynamodb_table` for state locking, which remains the most widely-deployed pattern. Terraform 1.10+ supports native S3 lockfiles (`use_lockfile = true`) as an alternative, but the DynamoDB approach is still valid and documented.
- `tfenv use latest` is supported by tfenv in addition to specific version numbers — verified against the tfenv README.
- The manual completion line `complete -C /usr/bin/terraform terraform` assumes APT install location. For direct binary installs at `/usr/local/bin/terraform`, readers will need to adjust the path. The post leaves this implicit but it is not technically incorrect.
