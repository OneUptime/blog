# Validation Summary: How to Use Pulumi Stacks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi (CLI and IaC platform)
- TypeScript (`@pulumi/pulumi`, `@pulumi/aws` Node.js SDKs)
- AWS (EC2, VPC, Subnet, Security Group)
- YAML (Pulumi stack configuration files)
- GitHub Actions (`pulumi/actions@v5`, `actions/checkout@v4`, `actions/setup-node@v4`, `aws-actions/configure-aws-credentials@v4`)
- Mermaid diagrams (illustrative only)

## Sources Consulted
- Pulumi `stack rm` command reference: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_rm/
- Pulumi `destroy` command reference: https://www.pulumi.com/docs/iac/cli/commands/pulumi_destroy/
- Pulumi `refresh` command reference: https://www.pulumi.com/docs/iac/cli/commands/pulumi_refresh/
- Pulumi `stack` command reference: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack/
- Pulumi `cancel` command reference: https://www.pulumi.com/docs/iac/cli/commands/pulumi_cancel/
- pulumi/actions GitHub repository (v5 release notes): https://github.com/pulumi/actions
- Pulumi Registry — `@pulumi/aws` provider docs (Region typing): https://www.pulumi.com/registry/packages/aws/api-docs/provider/

## Issues Found
1. **Invalid `--preserve-history` flag on `pulumi stack rm`.** The post used `pulumi stack rm dev --preserve-history`, but Pulumi does not expose this flag. The correct flag is `--preserve-config`, which preserves the `Pulumi.<stack>.yaml` configuration file locally instead of the stack's update history. Replaced the command and updated the surrounding comment to describe what `--preserve-config` actually does.
2. **Misleading "force destroy" comment using `--skip-preview`.** The post claimed `pulumi destroy --yes --skip-preview` would "Force destroy even if some resources fail." `--skip-preview` only bypasses the preview phase; it does not affect error handling. The flag that continues a destroy after individual resource failures is `--continue-on-error`. Replaced the command with `pulumi destroy --yes --continue-on-error` and adjusted the comment to match.
3. **Incorrect description of `pulumi stack --show-ids`.** The post said this command shows "current stack lock status." Per the official CLI docs, `--show-ids` displays each resource's provider-assigned unique ID — it does not surface lock state. Updated the comment to correctly describe what the flag does.

## Review Notes
- The `StackReference` format `<organization>/<project>/<stack>` shown in the post matches current Pulumi docs.
- `pulumi/actions@v5` is a real, released major version (v7 is the current latest as of mid-2026); pinning to v5 is still valid for readers and matches the documented examples for the v5-era inputs (`command`, `stack-name`).
- The `aws.Region` type used in the combined-stack TypeScript example is exported by `@pulumi/aws` and is valid for casts of region strings.
- The AMI `ami-0c55b159cbfafe1f0` is a long-standing placeholder used throughout Pulumi documentation; readers should replace it with a region-specific, current AMI in practice. Not changed since it is clearly illustrative.
- The "Resource Already Exists" troubleshooting subsection is missing its `###` heading prefix (purely a markdown formatting issue, not a technical inaccuracy). Left in place per the "no stylistic changes" guidance.
- The Stack Lock Issues section references "manually remove the lock via Pulumi Cloud console" — Pulumi Cloud does expose update/lock controls per stack, but the exact UI path has shifted over time; readers should consult current Pulumi Cloud docs. Wording left as-is since it is directional, not incorrect.
- `config.getNumber("instanceCount") || defaults.instanceCount!` will fall back to the default when the configured value is `0`. Acceptable for typical environments but worth being aware of. Not changed since it is idiomatic for the post's audience.
