# Validation Summary: How to Use Local Path Module Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (local path module sources)
- Terraform / HCL syntax
- AWS provider (illustrative example)
- Infrastructure as Code (monorepo organization patterns)

## Sources Consulted
- OpenTofu Module Sources documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu CLI documentation for `tofu init`, `tofu plan`, `tofu apply`

## Issues Found
1. **Incorrect claim about local module caching (Syntax section).** The original bullet stated "OpenTofu copies the module directory to a `.terraform` cache." Per the OpenTofu docs, local path modules are **not** installed/copied — they are referenced directly from the source directory. Updated the bullet to: "Local modules are not copied; OpenTofu references them directly from the source location."
2. **Misleading "source changes" wording (Advantages section).** The original advantage said "no `tofu init` needed for source changes," which is ambiguous and wrong if read as "changes to the `source` argument" (which *do* require re-init). Changed to "no `tofu init` needed for module code changes" to match the section heading further down and the actual OpenTofu behavior.
3. **Incorrect claim that local modules are copied on init (Conclusion / "No tofu init Needed" section).** The original sentence read "OpenTofu copies local modules to `.terraform/modules/` on init, but re-reads the source on each plan." Rewrote to clarify that, unlike remote modules, local modules are not copied to `.terraform/modules/` — they are referenced directly from their source directory.

## Review Notes
- The HCL syntax examples (module blocks, `required_providers`, provider configuration, relative path patterns) are all syntactically correct.
- The example references a `module.security_groups` that is not declared in the snippet; this is a minor stylistic gap (the snippet is illustrative only) and not a technical error, so it was left alone.
- The "Limitations" list is accurate: local modules do not support a `version` argument, and sharing across repositories does require copying or extracting to a separate module source (Git, registry, etc.).
- AWS provider version constraint `~> 5.0` is current and valid.
- `tofu init`, `tofu plan`, and `tofu apply` are correct OpenTofu CLI commands.
