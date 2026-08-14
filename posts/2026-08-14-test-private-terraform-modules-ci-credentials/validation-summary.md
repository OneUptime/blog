# Validation Summary: Test Private Terraform Modules in CI Without Leaking Credentials

## Status
validated

## Post Type
Security-focused technical guide / CI/CD implementation guide

## Technologies Covered

- Terraform CLI, HCL module sources, dependency locking, and provider installation
- Terraform test framework and provider mocks
- HCP Terraform and Terraform Enterprise private module registries
- Git and GitHub private module sources, SSH deploy keys, GitHub App tokens, and Git credential helpers
- GitHub Actions workflows, secrets, `GITHUB_TOKEN`, and action pinning
- GitHub Actions OpenID Connect (OIDC) and short-lived cloud credentials
- CI runner isolation, artifact handling, egress controls, and credential redaction

## Sources Consulted

- [Terraform module block reference](https://developer.hashicorp.com/terraform/language/block/module) - registry and Git source syntax, registry-only `version`, Git authentication, and `ref` behavior.
- [Use artifacts from the HCP Terraform private registry](https://developer.hashicorp.com/terraform/cloud-docs/registry/using) - private module addresses, user/team token authentication, hostname matching, and organization-level registry access.
- [Terraform CLI configuration and credentials](https://developer.hashicorp.com/terraform/cli/config/config-file) - `TF_TOKEN_<hostname>`, Terraform 1.2 requirement, `TF_CLI_CONFIG_FILE`, credential helpers, token types, and provider mirror configuration.
- [`terraform login` command reference](https://developer.hashicorp.com/terraform/cli/commands/login) - interactive-only behavior and default local plaintext credential storage, including the credentials-helper exception.
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock) - provider selections/checksums and the absence of remote module version or checksum locking.
- [Terraform module registry protocol](https://developer.hashicorp.com/terraform/internals/module-registry-protocol) - module version discovery and download-location behavior without provider-style package checksums.
- [Publish private modules to the HCP Terraform registry](https://developer.hashicorp.com/terraform/cloud-docs/registry/publish-modules) - tag/branch publishing and deletion/restoration behavior for module versions.
- [Terraform tests](https://developer.hashicorp.com/terraform/language/tests) and [provider mocking](https://developer.hashicorp.com/terraform/language/tests/mocking) - Terraform 1.6 test-framework minimum, Terraform 1.7 mock-provider minimum, and plan/apply test behavior.
- [`terraform init` command reference](https://developer.hashicorp.com/terraform/cli/commands/init) and [initialization tutorial](https://developer.hashicorp.com/terraform/tutorials/cli/init) - module/provider installation, reuse of installed modules, validation prerequisites, `.terraform/modules`, and `modules.json`.
- [Terraform sensitive-data guidance](https://developer.hashicorp.com/terraform/language/manage-sensitive-data) and [`terraform plan` reference](https://developer.hashicorp.com/terraform/cli/commands/plan) - plaintext plan/state contents and the limits of `sensitive = true`.
- [Terraform CLI environment variables](https://developer.hashicorp.com/terraform/cli/config/environment-variables) and [plugin logging guidance](https://developer.hashicorp.com/terraform/plugin/log/managing) - `TF_INPUT`, `TF_LOG=trace`, and logging behavior.
- [hashicorp/setup-terraform](https://github.com/hashicorp/setup-terraform) and its [v4 releases](https://github.com/hashicorp/setup-terraform/releases) - current `@v4` usage and the default latest-CLI behavior when `terraform_version` is omitted.
- [actions/checkout](https://github.com/actions/checkout) and its [v7 releases](https://github.com/actions/checkout/releases) - current `@v7` usage, recommended `contents: read`, and fork-checkout protections.
- [GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets), [private-repository fork settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#enabling-workflows-for-forks-of-private-repositories), and [`pull_request_target` security](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target) - default fork behavior, configurable exceptions, redaction limits, and trusted-context risks.
- [GitHub Actions OIDC reference](https://docs.github.com/en/actions/reference/security/oidc) and [OIDC overview](https://docs.github.com/en/actions/concepts/security/openid-connect) - token claims, trust-policy restrictions, and exchange for short-lived cloud credentials.
- [GitHub Actions secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use) - full-SHA action pinning, transformed-secret redaction limitations, and untrusted-code checkout risks.
- [Git credentials documentation](https://git-scm.com/docs/gitcredentials.html) and [GitHub App installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation) - credential-helper behavior and repository-scoped installation tokens.

## Issues Found

1. **Registry versions were described as making the whole job reproducible.** An exact registry constraint makes module version selection deterministic, but Terraform does not lock or checksum remote module content, and HCP Terraform can restore a deleted version under the same version label. Renamed the section, narrowed the description and claim to deterministic source/version selection, and clarified the lock file's lack of module content checksums.
2. **The description made an absolute guarantee about logs.** Secret redaction and provider/trace logging cannot guarantee that logs never expose a value. Reworded the description to describe practices that minimize exposure instead.
3. **HCP Terraform token scope needed a module-level caveat.** A team token can read its organization's registry and registries shared with that organization; it cannot be restricted to one module. Added the actual minimum read boundary.
4. **The GitHub Actions fragment did not state its trust assumption or Terraform test version floors.** Labeled it as a `jobs` fragment that belongs only in a workflow running trusted code, documented Terraform 1.6+ for `terraform test` and 1.7+ for provider mocks, and noted that `setup-terraform` installs the latest CLI unless a version is pinned.
5. **Git credential-helper terminology was ambiguous.** Replaced “source-host credential helper” with the standard “Git credential helper” so it is not confused with Terraform's registry `credentials_helper`.
6. **`terraform login` storage behavior was stated without its exception.** Added “By default” because a configured Terraform credentials helper can store the token outside the local credentials file.
7. **Fork-secret behavior was overgeneralized.** Replaced the absolute statement with the default behavior for fork-based `pull_request` workflows and documented that private-repository fork policies can override both secret and `GITHUB_TOKEN` defaults.
8. **The OIDC pipeline step called the cloud role short-lived.** The role and trust policy normally persist; the exchanged session credentials are short-lived. Updated the step accordingly.
9. **Provider installation settings were said to configure a generic proxy.** Terraform's `provider_installation` settings configure direct installation and filesystem/network mirrors, not an ordinary forward HTTP(S) proxy. Removed “or proxy.”
10. **The revocation check could pass against an already-downloaded module.** Required a fresh Terraform data directory for both the positive download check and the revocation failure check so the test exercises registry authentication instead of the local module cache.

## Review Notes

- `actions/checkout@v7` and `hashicorp/setup-terraform@v4` are valid current major tags as of 2026-08-14. The post correctly advises production users to follow their supply-chain policy and often pin actions by full commit SHA.
- The setup action currently installs the latest Terraform CLI when `terraform_version` is absent. The post now calls this out; a production test harness should pin a tested CLI release if complete toolchain reproducibility is required.
- The HCL examples passed `terraform fmt -check`, the 40-character Git commit reference is well formed, and the YAML job fragment parses successfully.
- All authored documentation links resolve to the intended official pages; several legacy GitHub documentation paths redirect to their current canonical locations. The `example.invalid` URL is intentionally non-resolving and is used only as an unsafe anti-pattern.
- The command sequence `terraform version`, `terraform init -input=false`, `terraform providers`, `terraform validate`, and `terraform test` is valid for a compatible initialized test harness.
