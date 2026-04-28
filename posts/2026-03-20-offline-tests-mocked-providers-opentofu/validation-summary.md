# Validation Summary: How to Run Offline Tests with Mocked Providers in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (1.7.0+)
- OpenTofu test framework (`.tftest.hcl` files)
- `mock_provider`, `mock_resource`, `mock_data` blocks
- OpenTofu CLI configuration (`~/.tofurc`, `provider_installation`, `filesystem_mirror`)
- `tofu providers mirror` for air-gapped environments
- GitHub Actions (`opentofu/setup-opentofu@v1`, `actions/cache@v4`, `actions/checkout@v4`)
- AWS provider env vars (`AWS_ACCESS_KEY_ID`, `AWS_EC2_METADATA_DISABLED`, etc.)

## Sources Consulted
- OpenTofu test command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu mocking / test framework documentation (for `mock_provider`, `mock_resource`, `mock_data`, `defaults` field)
- OpenTofu CLI configuration file documentation (`provider_installation`, `filesystem_mirror`, `direct`)
- `opentofu/setup-opentofu` GitHub Action README
- AWS SDK environment variable reference (`AWS_EC2_METADATA_DISABLED`)

## Issues Found
No technical issues found.

## Review Notes
- `mock_provider` was introduced in OpenTofu 1.7.0, which matches the `tofu_version: "1.7.0"` pinned in the workflow example. Readers using newer OpenTofu releases (1.8+) should know that resource override capabilities have been expanded since then.
- The `tofu init` step in the GitHub Actions example is still useful even when only mocked providers are referenced, because OpenTofu typically needs the provider lock file resolved during init; the explanatory comment "download providers once" accurately reflects this.
- The provider mirror snippet writes to `~/.tofurc`; this is the correct location for OpenTofu's CLI configuration file. (`.terraformrc` is not used by OpenTofu unless a fallback is configured.)
- The post correctly notes that tests use local state by default. State for `tofu test` is in-memory and ephemeral, which reinforces the "offline" property.
