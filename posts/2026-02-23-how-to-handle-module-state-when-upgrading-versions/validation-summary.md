# Validation Summary: How to Handle Module State When Upgrading Versions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI, HCL configuration language)
- Terraform `moved` blocks (introduced in Terraform 1.1)
- Terraform `import` blocks (introduced in Terraform 1.5)
- Terraform state management commands (`state pull`, `state push`, `force-unlock`)
- Git (module sources via `git::` source URL syntax)
- GitHub Actions (workflow YAML, `hashicorp/setup-terraform@v3`, `actions/checkout@v4`, `actions/github-script@v7`)
- AWS provider resources (`aws_vpc`, `aws_subnet`, `aws_vpc_endpoint`) used in examples

## Sources Consulted
- Terraform `moved` block reference — https://developer.hashicorp.com/terraform/language/block/moved
- Terraform `import` block reference — https://developer.hashicorp.com/terraform/language/block/import
- Terraform `plan` command — https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `state push` — https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform `state pull` — https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform `force-unlock` — https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform module sources — https://developer.hashicorp.com/terraform/language/modules/sources
- Refactoring with `moved` blocks — https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- GitHub Actions: actions/checkout, actions/github-script, hashicorp/setup-terraform action versions

## Issues Found
No technical issues found. All commands, flag names, HCL syntax (`moved`, `import` blocks), Git module source URL format, and GitHub Actions action versions verified against official documentation.

## Review Notes
- The illustrative pseudo-output for a `moved` block in the "Using Moved Blocks for Upgrades" section reads `# module.vpc.aws_vpc.this will be moved from module.vpc.aws_vpc.main`. Terraform's actual plan output phrases it as `# module.vpc.aws_vpc.main has moved to module.vpc.aws_vpc.this`. The comment captures the correct intent and is presented as illustrative narration rather than a literal CLI quotation, so it was left unchanged.
- The post does not mention Terraform 1.7+ `removed` blocks, which provide an alternative to `terraform state rm` for removing resources from state without destroying them — useful when a module upgrade removes a resource you want to keep. This is a possible future enhancement, not a correctness issue.
- The "Never skip major versions" advice in the Best Practices Summary is a generally safe heuristic but is opinion rather than a hard technical rule; many community modules do support skipping versions when migration paths are documented. Left as-is since it is reasonable conservative guidance.
- The `grep -E '^\+.*resource|^\-.*resource'` command in the diff-inspection example will also match unified-diff header lines (`+++ file.tf`, `--- file.tf`); this is a minor cosmetic noise issue, not incorrect behavior.
- `terraform state push` of a backup may require `-force` if state lineage/serial diverges after a partial apply. The post's rollback example does not mention this caveat but the command itself is correct.
