# Validation Summary: How to Sign Custom Terraform Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Registry provider publishing
- Terraform CLI provider signature verification
- GnuPG / GPG key generation and signing
- GoReleaser release configuration
- GitHub Actions release automation
- GitHub CLI repository secrets

## Sources Consulted
- HashiCorp Developer: Publish providers to the Terraform Registry - https://developer.hashicorp.com/terraform/registry/providers/publishing
- HashiCorp Developer: Terraform CLI plugin signatures - https://developer.hashicorp.com/terraform/cli/plugins/signing
- HashiCorp Terraform provider scaffolding framework GoReleaser config - https://raw.githubusercontent.com/hashicorp/terraform-provider-scaffolding-framework/main/.goreleaser.yml
- HashiCorp Terraform provider scaffolding framework release workflow - https://raw.githubusercontent.com/hashicorp/terraform-provider-scaffolding-framework/main/.github/workflows/release.yml
- GoReleaser: Signing archives, installers, packages, and checksums - https://goreleaser.com/customization/sign/sign/
- GoReleaser: Checksums - https://goreleaser.com/customization/package/checksum/
- GoReleaser: Archives - https://goreleaser.com/customization/package/archives/
- GoReleaser: GitHub Actions - https://www.goreleaser.com/customization/ci/actions/
- Local CLI checks: `gpg --version`, `gh --version`

## Issues Found
- The post instructed readers to base64-encode the private key and store that value directly in `GPG_PRIVATE_KEY`, but the Terraform and GoReleaser GitHub Actions examples expect the ASCII-armored private key. Updated the export and GitHub secret examples to use `private-key.asc` directly.
- The GoReleaser checksum configuration did not include `terraform-registry-manifest.json`, even though Terraform Registry release requirements state the manifest must be covered by the SHA256SUMS file. Added `checksum.extra_files` with the manifest release name.
- The GoReleaser archive snippet used the deprecated singular `format: zip` field. Updated it to `formats: [zip]` in YAML block form.
- The GitHub Actions example used an older GoReleaser action version and did not pin the GoReleaser major version. Updated it to `goreleaser/goreleaser-action@v7` with `version: '~> v2'`.
- The best-practices section recommended Ed25519 keys, but the Terraform Registry publishing documentation states the Registry API accepts RSA and DSA keys, not the default ECC type. Updated the recommendation to RSA 4096-bit keys.

## Review Notes
The guide is technically relevant and generally aligned with Terraform Registry provider release requirements after the corrections above. The Terraform Registry documentation currently notes RSA and DSA support for signing keys; RSA 4096-bit is the safer practical recommendation for this tutorial.
