# Validation Summary: How to Configure Provider Filesystem Mirror in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform provider installation configuration
- Terraform filesystem mirrors
- Terraform network mirror metadata
- Bash
- GitHub Actions
- curl

## Sources Consulted
- Terraform CLI configuration file documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform `providers mirror` command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- Terraform provider network mirror protocol reference: https://developer.hashicorp.com/terraform/internals/provider-network-mirror-protocol
- Terraform `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp releases URL pattern for AWS provider packages and SHA256SUMS: https://releases.hashicorp.com/terraform-provider-aws/5.30.0/
- curl command help for `-o`, `-O`, `-f`, `-s`, `-S`, and `-L`

## Issues Found
- The post implied that JSON index files and hash metadata are part of filesystem mirror verification. Terraform's filesystem mirror uses the directory entries as authoritative and ignores the generated JSON files; those JSON files are for publishing the same content as a network mirror. Updated the packed layout explanation and best practice wording.
- The introduction said Terraform reads provider binaries directly from the mirror. Reworded this to provider packages, because packed filesystem mirrors contain provider zip packages that Terraform installs from the mirror.
- The manual download example used `curl -LO "$URL" -o "$PROVIDER_DIR/$FILENAME"`, which mixes remote-name output and explicit output and would not reliably place files in the provider mirror directory. Changed it to `curl -fsSL "$URL" -o "$PROVIDER_DIR/$FILENAME"` and wrote the SHA256SUMS file into the provider directory.
- The manual download example created `index.json` without a matching version JSON file, which is unnecessary for a filesystem mirror and incomplete for a network mirror. Replaced it with a note that zip files in the expected layout are enough for a filesystem mirror and that `terraform providers mirror` should be used when network mirror JSON metadata is needed.
- The network mirror example used `DataDog` in provider source patterns. Updated it to the lowercase namespace `datadog`, matching Terraform provider source address conventions.
- The disk space section stated that the AWS provider alone is over 300 MB per platform. This is too specific for zipped mirror packages and varies by version/platform. Reworded it to distinguish provider packages from extracted binaries.

## Review Notes
Terraform is not installed in this workspace, so CLI flag verification was performed against official HashiCorp documentation rather than local `terraform --help` output. The `terraform providers mirror` command and provider installation configuration examples are current for Terraform 0.13 and later.
