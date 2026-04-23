# Validation Summary: How to Remediate Drift by Refreshing State in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu state management
- OpenTofu refresh-only planning and apply workflow
- OpenTofu lifecycle meta-arguments
- Infrastructure as Code drift remediation

## Sources Consulted
- OpenTofu `tofu plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `tofu refresh` documentation: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu resource behavior and `lifecycle` documentation: https://opentofu.org/docs/language/resources/behavior/

## Issues Found
- The selective refresh section implied `-target` refreshes exactly one resource. I changed the wording to reflect the official behavior: targeting is for exceptional cases and includes any dependencies the target needs.
- The deprecated command section described refresh as an older-version workflow. I corrected it to match current OpenTofu documentation: `tofu refresh` still exists for backward compatibility, but it is deprecated in favor of `tofu apply -refresh-only`.
- The HCL resource blocks were presented as if they were complete standalone resources even though they were illustrative fragments. I added minimal `# ... other required arguments ...` comments so the snippets are clearly excerpts, not copy-paste-complete configurations.

## Review Notes
- No other technical issues were found in the OpenTofu workflow description. The core guidance to review drift with `tofu plan -refresh-only`, accept it with `tofu apply -refresh-only`, and then update configuration to prevent future reversion is consistent with the official documentation.
- A local `tofu` binary was not available in the workspace, so CLI validation was performed against the official OpenTofu documentation rather than local `--help` output.
