# Validation Summary: How to Update Documentation After Migrating to OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI, installer script, Homebrew formula)
- Terraform (for comparison / migration source)
- terraform-docs
- grep, sed, find (GNU/BSD shell utilities)
- Markdown / YAML config files

## Sources Consulted
- OpenTofu install script: https://get.opentofu.org/install-opentofu.sh (verified reachable, served as `application/x-sh`)
- OpenTofu Homebrew formula: https://formulae.brew.sh/formula/opentofu
- OpenTofu 1.6.0 GA release announcement (January 10, 2024)
- terraform-docs configuration reference: https://terraform-docs.io/user-guide/configuration/
- terraform-docs source (HCL parser — does not invoke the `terraform`/`tofu` CLI)
- GNU sed / BSD sed manpages for `-i.bak` behavior

## Issues Found

1. **Stray/typo code fence `\`\`\`hcl` at the end of the installation example.** The outer markdown code block was closed with `\`\`\`hcl` instead of just `\`\`\``, which opened a phantom HCL block that was never closed. Replaced with a plain closing fence.

2. **Incorrect advice about `terraform-docs` configuration.** The post recommended adding `settings.terraform-bin: tofu` to `.terraform-docs.yml`. This is not a real terraform-docs setting — the tool's `settings` block only accepts keys such as `anchor`, `color`, `default`, `description`, `escape`, `hide-empty`, `html`, `indent`, `lockfile`, `read-comments`, `required`, `sensitive`, and `type`. More importantly, terraform-docs parses HCL files directly via the HashiCorp HCL library and never shells out to the `terraform` or `tofu` CLI, so no migration-time config change is needed. Rewrote the section to state that terraform-docs works with OpenTofu modules without any configuration change, and kept the regeneration loop intact.

## Review Notes

- The `sed -i.bak 's/terraform /tofu /g'` one-liner is intentionally aggressive and works on both GNU and BSD sed. It will also rewrite prose references like "HashiCorp Terraform" into "HashiCorp tofu" when the casing matches — the post's closing paragraph already flags the need for manual review, so this is acceptable.
- Nested fenced code blocks (```` ```markdown ```` wrapping inner ```` ```bash ```` blocks) can render inconsistently across Markdown engines; CommonMark strictly requires a longer outer fence. Not technically incorrect in all renderers, and outside the scope of a correctness fix, so left as-is.
- OpenTofu version floor example (`>= 1.6.0`) correctly matches the first GA release.
