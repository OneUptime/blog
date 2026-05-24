# Validation Summary: How to Handle Provider Releases and CI/CD

## Status
validated

## Post Type
Tutorial / Guide — step-by-step setup of a CI/CD pipeline for a custom Terraform provider using GitHub Actions and GoReleaser.

## Technologies Covered
- Terraform Provider Development
- GitHub Actions (workflows, triggers, permissions, conditional jobs)
- GoReleaser (v2 configuration for cross-platform Go builds)
- Go (build, test, coverage tooling)
- golangci-lint (linter aggregator)
- tfplugindocs (HashiCorp Terraform provider documentation generator)
- Codecov action (coverage reporting)
- GPG signing (via `crazy-max/ghaction-import-gpg`)
- Dependabot (automated dependency updates)
- Terraform Registry (release distribution)

## Sources Consulted
- GitHub Actions marketplace pages for `actions/checkout`, `actions/setup-go`, `actions/upload-artifact`, `codecov/codecov-action`, `golangci/golangci-lint-action`, `goreleaser/goreleaser-action`, `crazy-max/ghaction-import-gpg`
- GoReleaser documentation (https://goreleaser.com/customization/) for v2 schema, archives, signs, builds, changelog
- HashiCorp `terraform-provider-scaffolding-framework` reference `.goreleaser.yml` (https://github.com/hashicorp/terraform-provider-scaffolding-framework)
- Terraform Plugin Framework / Registry publishing docs (https://developer.hashicorp.com/terraform/registry/providers/publishing)
- `terraform-plugin-docs` README (https://github.com/hashicorp/terraform-plugin-docs) — confirms `generate` and `validate` subcommands
- golangci-lint documentation (https://golangci-lint.run/) — verified linter names (`errcheck`, `gosimple`, `govet`, `ineffassign`, `staticcheck`, `unused`, `gofmt`, `goimports`, `misspell`, `unconvert`)
- GitHub Dependabot configuration reference (https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- GitHub-hosted Ubuntu runner installed software list (https://github.com/actions/runner-images) — confirmed Terraform is pre-installed on `ubuntu-latest`

## Issues Found
No technical issues found.

All workflow examples are syntactically valid GitHub Actions YAML. Action versions referenced (`actions/checkout@v4`, `actions/setup-go@v5`, `actions/upload-artifact@v4`, `golangci/golangci-lint-action@v4`, `codecov/codecov-action@v4`, `goreleaser/goreleaser-action@v5`, `crazy-max/ghaction-import-gpg@v6`) are all real, released versions. The GoReleaser configuration (`version: 2`, `archives.format: zip`, signs with detached signatures over the checksum file, `release --clean` flag) matches HashiCorp's reference pattern and produces archives that meet the Terraform Registry's requirements. The bash script for parsing `go tool cover -func` output and gating on a coverage threshold is correct. The `tfplugindocs generate` / `tfplugindocs validate` commands and the `git diff --exit-code docs/` drift-check pattern are valid.

## Review Notes
- **Version drift caveat**: `golangci/golangci-lint-action@v4` paired with `version: latest` can install golangci-lint v2.x, whose configuration format differs from the v1-style `.golangci.yml` shown in the post. Readers using this exactly today may see deprecation warnings or migration prompts. The post's config is correct for golangci-lint v1.x; users on v2 would need to migrate `linters-settings` → `linters.settings`. Not a factual error in the post, but worth noting.
- **Codecov action input**: `codecov/codecov-action@v4` documents `files` (plural) as the canonical input; `file` (singular) still works for backwards compatibility but is deprecated. The example would benefit from `files: ./coverage.out` in future revisions.
- **`goreleaser-action@v5`**: Still maintained, but v6 is available. Either works.
- **`archives.format`**: In GoReleaser v2, `formats` (a list) is the recommended schema, but `format` is still accepted. No breaking change yet.
- **Release health check**: Relies on `terraform` being pre-installed on `ubuntu-latest`. This is currently true, but pinning via `hashicorp/setup-terraform@v3` would make the workflow more resilient to runner image changes.
- The release-check workflow does not check out the repository before running `terraform init` in a temp directory, but it constructs its own `main.tf` inline, so checkout is genuinely unnecessary — this is intentional and correct.
