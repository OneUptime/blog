# Validation Summary: How to Set Up Terraform on Apple Silicon (M1/M2/M3) Macs

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Terraform CLI
- Terraform providers and provider dependency lock files
- Apple Silicon macOS
- Rosetta 2
- Homebrew
- tfenv
- Docker Desktop and multi-architecture images
- Visual Studio Code
- Go cross-compilation

## Sources Consulted
- HashiCorp Developer, Install Terraform: https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli
- HashiCorp Releases, Terraform 1.7.5 and 1.15.4 binaries: https://releases.hashicorp.com/terraform/
- HashiCorp Checkpoint API, current Terraform release metadata: https://checkpoint-api.hashicorp.com/v1/check/terraform
- HashiCorp Developer, terraform providers lock command: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- HashiCorp Developer, dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- HashiCorp Developer, provider registry protocol: https://developer.hashicorp.com/terraform/internals/provider-registry-protocol
- HashiCorp Developer, recommended provider OS/architecture binaries: https://developer.hashicorp.com/terraform/registry/providers/os-arch
- Terraform Registry provider version APIs for hashicorp/aws, hashicorp/azurerm, hashicorp/google, hashicorp/kubernetes, and kreuzwerker/docker: https://registry.terraform.io/
- Homebrew installation documentation: https://docs.brew.sh/Installation.html
- Apple Support, using Intel-based apps on Apple Silicon with Rosetta: https://support.apple.com/en-us/102527
- Docker CLI reference for docker run: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Hub, hashicorp/terraform image metadata: https://hub.docker.com/r/hashicorp/terraform/
- Visual Studio Code macOS setup documentation: https://code.visualstudio.com/docs/setup/mac
- Go documentation for cross-compilation environment variables: https://go.dev/doc/install/source#environment

## Issues Found
- The examples used Terraform 1.7.5. That version still exists and has a darwin_arm64 binary, but it is outdated as of the review date. Updated examples to Terraform 1.15.4, verified through HashiCorp release metadata and Docker manifest inspection.
- The Rosetta command implied that `arch -x86_64 terraform plan` works with a native ARM64 Terraform binary. Clarified that the command requires an x86_64 or universal Terraform binary in `PATH`.
- The provider compatibility section incorrectly said Terraform falls back to Rosetta translation for AMD64-only providers. Updated it to explain that native `darwin_arm64` Terraform does not automatically install `darwin_amd64` providers, and that an AMD64 Terraform CLI/provider pairing is needed if using Rosetta.
- The lock-file wording implied that platforms are specified in HCL. Updated the text to clarify that `required_providers` selects source/version while `terraform providers lock -platform=...` records checksums and verifies platform package availability.
- The "Bad CPU type in executable" section was too narrow. Updated it to explain the architecture mismatch and Rosetta availability cases more accurately.

## Review Notes
The post is technically relevant and accurate after the corrections. Future updates should refresh the example Terraform version if the blog wants to keep examples pinned to the latest stable release rather than a known-good release.
