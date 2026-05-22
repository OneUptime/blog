# Validation Summary: How to Publish Custom Terraform Providers to Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Registry
- Terraform provider development
- GoReleaser
- GitHub Actions
- GPG signing
- Terraform provider registry manifest

## Sources Consulted
- HashiCorp Developer: Publish providers to the Terraform Registry: https://developer.hashicorp.com/terraform/registry/providers/publishing
- HashiCorp Developer: Terraform Registry providers overview: https://developer.hashicorp.com/terraform/registry/providers
- HashiCorp Developer: Terraform plugin protocol: https://developer.hashicorp.com/terraform/plugin/terraform-plugin-protocol
- HashiCorp terraform-provider-scaffolding-framework GoReleaser configuration: https://github.com/hashicorp/terraform-provider-scaffolding-framework/blob/main/.goreleaser.yml
- HashiCorp terraform-provider-scaffolding-framework release workflow: https://github.com/hashicorp/terraform-provider-scaffolding-framework/blob/main/.github/workflows/release.yml
- HashiCorp terraform-provider-scaffolding-framework registry manifest: https://github.com/hashicorp/terraform-provider-scaffolding-framework/blob/main/terraform-registry-manifest.json
- GoReleaser GitHub Actions documentation: https://www.goreleaser.com/customization/ci/actions/
- GoReleaser archives documentation: https://goreleaser.com/customization/package/archives/
- GoReleaser signing documentation: https://goreleaser.com/customization/sign/sign/

## Issues Found
- The prerequisites incorrectly stated that a Terraform Cloud account is required for Registry access. Changed this to a Terraform Registry account through GitHub sign-in, matching HashiCorp's public Registry publishing documentation.
- The GPG key instructions pointed users to organization settings and "GPG Keys." Updated the wording to User Settings > Signing Keys, which is the documented Terraform Registry location for adding provider signing keys.
- The GitHub Actions secret setup encoded the private key with base64 and used a passphrase secret name that did not match the current HashiCorp and GoReleaser examples. Updated the export command to write an ASCII-armored private key and changed `GPG_PASSPHRASE` to `PASSPHRASE` in both the instructions and workflow snippet.
- The GoReleaser checksum configuration did not include `terraform-registry-manifest.json` as an extra checksum file. Added `checksum.extra_files` so the manifest is included in the SHA256SUMS file as required by Terraform Registry release asset rules.
- The GoReleaser archive configuration used the deprecated singular `format` field. Updated it to the current `formats` field while preserving the intended zip archive output.
- The GitHub Actions workflow used an older GoReleaser action version and omitted the GoReleaser version selector. Updated the snippet to `goreleaser/goreleaser-action@v7` with `version: "~> v2"`, matching current GoReleaser documentation.

## Review Notes
The `protocol_versions` value of `["6.0"]` is correct for providers built with Terraform Plugin Framework. Providers built with Terraform Plugin SDK v2 should use `["5.0"]` unless they have been explicitly implemented for another supported protocol version.
