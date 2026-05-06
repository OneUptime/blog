# Validation Summary: How to Check Which OpenTofu Version You Are Running

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- OpenTofu CLI
- OpenTofu configuration language (HCL)
- Bash
- jq
- tofuenv
- asdf

## Sources Consulted
- OpenTofu CLI `version` command: https://opentofu.org/docs/cli/commands/version/
- OpenTofu settings and `required_version`: https://opentofu.org/docs/language/settings/
- OpenTofu version constraint syntax: https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu `version` JSON output implementation: https://raw.githubusercontent.com/opentofu/opentofu/main/internal/command/views/version.go
- OpenTofu version-mismatch diagnostics: https://raw.githubusercontent.com/opentofu/opentofu/main/internal/configs/diagnostics.go
- OpenTofu latest release reference: https://github.com/opentofu/opentofu/releases/latest
- tofuenv documentation: https://github.com/tofuutils/tofuenv
- tofuenv shim entrypoint: https://raw.githubusercontent.com/tofuutils/tofuenv/master/bin/tofu
- asdf command reference: https://asdf-vm.com/manage/commands.html
- asdf plugin shortname index: https://github.com/asdf-vm/asdf-plugins

## Issues Found
- The basic `tofu version` example hard-coded an outdated upgrade notice saying the latest version was `1.10.0`. That was stale by the review date of May 6, 2026, so I removed the hard-coded upgrade message and kept the stable parts of the example output.
- The `tofu version -json` example included a `terraform_outdated` field that is not part of the current OpenTofu `version` JSON output. I removed that field so the example matches the documented and implemented schema.
- The binary-location section implied that `which tofu` under `tofuenv` resolves directly to a versioned binary path. In practice, `tofuenv` and `asdf` typically resolve to shims first, so I updated the examples and metadata commands to reflect the resolved command path more accurately.
- The provider-version section stated this behavior too absolutely. I changed it to note that provider versions can appear when a dependency lock file is present, such as after `tofu init`.
- The `required_version` error example did not match current OpenTofu diagnostics. I replaced it with an example consistent with the current incompatibility error wording.
- The final script was labeled as a version-compliance check, but it only performed exact string equality. I renamed the section and adjusted the variable names and output so the script now accurately describes what it does.

## Review Notes
- `terraform_version` remains the JSON key name in `tofu version -json` for compatibility, even in OpenTofu.
- The `terraform { required_version = ... }` block is still the correct OpenTofu syntax. OpenTofu documentation explicitly says a `tofu` block does not exist yet.
- `tofu version -json` may also include an optional `fips140` field when FIPS mode is enabled; omitting it in the example is fine because it is conditional.
