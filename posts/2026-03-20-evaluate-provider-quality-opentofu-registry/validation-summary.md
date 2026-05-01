# Validation Summary: How to Evaluate Provider Quality on the OpenTofu Registry

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu Provider Registry
- HCL
- Go modules
- `govulncheck`
- Terraform Plugin Framework
- Terraform Plugin SDK v2

## Sources Consulted
- OpenTofu Providers: https://opentofu.org/docs/language/providers/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Dependency Lock File: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu Private Registries: https://opentofu.org/docs/cli/private_registry/
- OpenTofu Registry UI: https://search.opentofu.org/
- Terraform Plugin Framework docs: https://developer.hashicorp.com/terraform/plugin/framework
- Go Modules Reference (`go mod verify`): https://go.dev/ref/mod#go-mod-verify
- `govulncheck` command docs: https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck
- Example provider repository used for test-coverage checks: https://github.com/hashicorp/terraform-provider-http

## Issues Found
- The post linked to `https://registry.opentofu.org/providers`, which currently returns `404`. I changed it to `https://search.opentofu.org/` and added the working direct provider-page pattern `https://search.opentofu.org/provider/<namespace>/<type>/latest`.
- The "Finding Provider Details" snippet mixed a shell command with HCL inside one `hcl` block. I split it into a `bash` block for `cat .terraform.lock.hcl` and an `hcl` block for the lock-file example so the snippets are syntactically correct.
- The test-coverage example used `https://github.com/example/terraform-provider-foo`, which is a placeholder and not a real provider repository. I replaced it with a real provider repo (`hashicorp/terraform-provider-http`) and added `cd terraform-provider-http` so the follow-up commands run in the intended directory.
- The SDK guidance said the Plugin Framework is "newer, better performance". The official docs support that it is the recommended framework for new providers and offers advantages over SDK v2, but not that provider quality can be inferred from a blanket performance claim. I updated the wording accordingly.
- The supply-chain check suggested counting `go.sum` lines as verification. That does not verify dependency integrity. I replaced it with `go mod verify`, which the Go module reference documents as verifying cached modules against recorded hashes.
- The private-fork example used `source = "your-org/custom-provider"`, which implies the public default registry rather than a private registry. I changed it to an explicit private-registry-style source address: `registry.example.com/your-org/custom`.
- The provider-tier table implied "official" providers are maintained by `HashiCorp/OpenTofu`. OpenTofu's docs describe providers as being published by HashiCorp, platform maintainers, or users/volunteers. I corrected the table wording to avoid attributing maintenance incorrectly.
- The version-locking example used a vendor provider example and framed exact pins as a blanket community-provider rule. I changed it to a real community provider example and narrowed the wording to "consider exact pins for stricter change control", which is more accurate alongside OpenTofu's lock-file guidance.

## Review Notes
- The post is now technically accurate, but the "Provider Tiers" table is still a practical evaluation heuristic, not a formal classification built into the OpenTofu Registry.
- I could not execute `tofu` or `go` locally in this workspace because those binaries are not installed here, so command validation was done against official documentation and reachable upstream repositories rather than local CLI output.
