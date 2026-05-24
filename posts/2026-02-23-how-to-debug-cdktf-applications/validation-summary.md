# Validation Summary: How to Debug CDKTF Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDKTF (Cloud Development Kit for Terraform)
- Terraform
- TypeScript
- AWS Provider (via `@cdktf/provider-aws`)
- Node.js debugger / VS Code launch configurations
- jq (for inspecting generated JSON)
- AWS CLI (`aws iam`, `aws sts`)

## Sources Consulted
- CDKTF CLI reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- CDKTF stacks/output structure: https://developer.hashicorp.com/terraform/cdktf/concepts/stacks
- CDKTF unit testing docs: https://developer.hashicorp.com/terraform/cdktf/test/unit-tests
- CDKTF Token API (source): https://github.com/hashicorp/terraform-cdk/blob/main/packages/cdktf/lib/tokens/token.ts
- CDKTF AWS provider Vpc reference (Input getter pattern): https://github.com/hashicorp/cdktf-aws-cdk
- Terraform `plan -refresh-only` (introduced in 0.15): https://developer.hashicorp.com/terraform/cli/commands/plan
- AWS CLI `iam simulate-principal-policy`: https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html

## Issues Found
No technical issues found.

Verified specifically:
- The synthesized output path `cdktf.out/stacks/<stack>/cdk.tf.json` is correct.
- `Token.isUnresolved()` is a valid static method exported from the `cdktf` package.
- `Testing.app()` and `Testing.synth(stack)` are valid; `Testing.synth` returns a JSON string parseable with `JSON.parse`.
- Generated AWS Vpc resource exposes the `cidrBlockInput` getter following the `<property>Input` pattern.
- `cdktf diff <stack-name>` correctly accepts a positional stack argument.
- `TF_LOG=DEBUG` is the correct Terraform debug env var (Terraform respects `TRACE|DEBUG|INFO|WARN|ERROR`).
- `terraform plan -refresh-only` is a valid command (since Terraform 0.15).
- `node --inspect-brk node_modules/.bin/cdktf synth` is a valid way to attach a debugger to the synth process.

## Review Notes
- The `cdktf synth --log-level debug` flag is registered in the CDKTF CLI's global options and appears in `--help` output. However, the official CDKTF documentation states that the log level is "only supported via setting the env `CDKTF_LOG_LEVEL`". The post helpfully shows both methods, with the env var (`CDKTF_LOG_LEVEL=debug`) as the documented/reliable approach — this is the safer recommendation for readers.
- The VS Code launch configuration's `outFiles: ["${workspaceFolder}/dist/**/*.js"]` assumes a `dist` output directory, which depends on the user's `tsconfig.json` settings. Readers using `ts-node` or different output paths may need to adjust. This is acceptable as an illustrative example.
- The example `aws_vpc.main_vpc_12345` in `terraform state show` reflects CDKTF's mangled/suffixed resource addressing; this is correct conceptually but the exact suffix depends on the user's construct IDs.
- The post correctly distinguishes the four error categories (synthesis, validation, plan, apply) — a useful mental model for CDKTF debugging.
