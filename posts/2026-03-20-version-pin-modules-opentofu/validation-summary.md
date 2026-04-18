# Validation Summary: How to Version Pin Modules in OpenTofu

## Status
validated

## Post Type
Tutorial / Best-practice guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform HCL module syntax
- Terraform Registry module sources
- Git-sourced modules (`git::` source protocol)
- Semantic Versioning (SemVer)
- Git tags
- GitHub Dependabot

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu version constraints documentation: https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu `tofu init` CLI documentation (including `-upgrade` flag)
- GitHub Dependabot options reference: https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference
- Semantic Versioning 2.0.0: https://semver.org/

## Issues Found
- **Dependabot `package-ecosystem` value**: The post originally used `package-ecosystem: terraform`. GitHub Dependabot now ships a dedicated `opentofu` ecosystem (distinct from `terraform`, which is documented as supporting Terraform 0.13 through 1.10.x). For an OpenTofu-focused post, `opentofu` is the correct value. Updated the `.github/dependabot.yml` snippet accordingly.

## Review Notes
- The pessimistic constraint explanation (`~> 5.0` → `>= 5.0.0, < 6.0.0`) matches OpenTofu's documented behavior — only the rightmost version component increments.
- The `version = "= 20.8.4"` form is valid; OpenTofu supports `=`, `!=`, `>`, `>=`, `<`, `<=`, and `~>` operators.
- The `git::` source syntax with `//subdir?ref=…` ordering is correct (subdirectory before query args).
- Minor nuance worth keeping in mind (not an error): `tofu init -upgrade` upgrades providers to the newest version satisfying existing constraints, not unconditionally the newest release. The post's phrasing ("download the new version" after updating the constraint) is consistent with this.
- Local modules correctly lack a `version` argument — verified against OpenTofu module block reference.
