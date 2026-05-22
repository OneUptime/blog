# Validation Summary: How to Set Up Terraform Provider Development Environment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform Plugin Framework
- Terraform provider development
- Go
- VS Code Go extension
- GoLand/IntelliJ
- Terraform provider development overrides
- Terraform provider debugging
- terraform-plugin-testing acceptance tests
- tfplugindocs
- Make

## Sources Consulted
- HashiCorp Developer: Terraform CLI configuration file and `dev_overrides`: https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Developer: Debugging Terraform providers: https://developer.hashicorp.com/terraform/plugin/debugging
- HashiCorp Developer: Acceptance testing for Terraform providers: https://developer.hashicorp.com/terraform/plugin/testing/acceptance-tests
- HashiCorp Developer: Install Terraform CLI: https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli
- HashiCorp Developer: Provider documentation and `tfplugindocs`: https://developer.hashicorp.com/terraform/registry/providers/docs
- Go documentation: Download and install Go: https://go.dev/doc/install
- Go downloads: https://go.dev/dl/
- Go package documentation: Terraform Plugin Framework Go compatibility: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework
- HashiCorp GitHub: Terraform provider scaffolding framework: https://github.com/hashicorp/terraform-provider-scaffolding-framework
- Golangci-lint documentation: VS Code integration and command usage: https://golangci-lint.run/docs/welcome/integrations/

## Issues Found
- The post stated that Go 1.21 or later was sufficient for Terraform Plugin Framework development. Current Terraform Plugin Framework documentation says Go 1.25 or later is required, so the requirement and example Go download were updated to Go 1.25.
- The manual Go install command extracted into `/usr/local` without removing an existing `/usr/local/go` tree. Go's official install instructions warn against extracting over an existing tree, so `sudo rm -rf /usr/local/go` was added before extraction.
- The scaffolding import replacement command used `sed -i ''`, which works on macOS BSD `sed` but fails on typical GNU/Linux `sed`. It was replaced with `sed -i.bak` plus removal of backup files, which works across BSD and GNU `sed`.
- The `TF_REATTACH_PROVIDERS` example used the short provider address `yourorg/yourservice`. HashiCorp's debugging examples use the fully-qualified provider address, so the example was updated to `registry.terraform.io/yourorg/yourservice`.
- The `go:generate` example showed `// //go:generate tfplugindocs` inside a shell block. It was corrected to show the actual Go directive form recommended by HashiCorp's provider documentation.

## Review Notes
- The local environment did not have `go` or `terraform` installed, so commands were verified against official documentation and the upstream scaffolding repository rather than local `--help` output.
- The VS Code and Makefile examples are valid starting points, but teams may prefer pinning versions of tools such as `tfplugindocs`, `gofumpt`, `goimports`, and `golangci-lint` for reproducible builds.
