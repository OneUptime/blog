# Validation Summary: How to Manage Pulumi State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi (CLI, Cloud, DIY backends)
- Pulumi state and stack management
- AWS S3, DynamoDB, KMS
- Azure Blob Storage, Azure Key Vault
- Google Cloud Storage, GCP KMS
- TypeScript (`@pulumi/aws`, `@pulumi/pulumi`)
- GitHub Actions (`pulumi/actions`)
- AWS CloudWatch (alarming)
- Bash scripting

## Sources Consulted
- Pulumi CLI reference: https://www.pulumi.com/docs/iac/cli/commands/
- `pulumi refresh`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_refresh/
- `pulumi preview`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_preview/
- `pulumi state rename`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_state_rename/
- `pulumi login`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_login/
- `pulumi stack`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack/
- `pulumi config cp`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_config_cp/
- `pulumi org member`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_org_member/
- `pulumi stack init`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_init/
- `pulumi stack change-secrets-provider`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_change-secrets-provider/
- Using a DIY backend: https://www.pulumi.com/docs/iac/operations/stack-management/using-a-diy-backend/
- State and backends: https://www.pulumi.com/docs/iac/concepts/state-and-backends/
- Stack init `--teams` flag: https://www.pulumi.com/blog/stack-init-teams-flag/
- `pulumiservice.TeamStackPermission`: https://www.pulumi.com/registry/packages/pulumiservice/api-docs/teamstackpermission/
- `pulumi/actions` GitHub Action: https://github.com/pulumi/actions (README and releases)
- Pulumi issues referenced: pulumi/pulumi#6536, #9253, #14326

## Issues Found

1. **`pulumi refresh --preview` is not a valid flag.**
   - **Was:** `pulumi refresh --preview`
   - **Changed to:** `pulumi refresh --preview-only`
   - **Why:** `--preview` does not exist on `pulumi refresh`. The documented flag for previewing a refresh without applying it is `--preview-only` (alternatively, `pulumi preview --refresh`).

2. **`pulumi state rename` second argument must be a new resource name, not a full URN.**
   - **Was:** second arg was a fully constructed URN (`urn:pulumi:prod::...::new-name`).
   - **Changed to:** plain `new-name`.
   - **Why:** The CLI signature is `pulumi state rename <URN> <NEW-NAME>`. Passing a URN as the second argument would fail.

3. **DynamoDB state-locking section conflated Terraform's pattern with Pulumi.**
   - **Was:** A section instructing users to create a DynamoDB table and set `PULUMI_SELF_MANAGED_STATE_LOCKING=1` for S3 backend locking.
   - **Changed to:** A correct description of Pulumi's DIY backend locking, which is file-based (lock file written to `.pulumi/locks/<stack>/$lock.json` in the same bucket) and enabled by default for S3, Azure Blob, GCS, and local filesystem backends. The DynamoDB instructions and obsolete env var were removed.
   - **Why:** Pulumi DIY backends do not use DynamoDB at all — that is a Terraform convention. Pulumi ships file-based locking, on by default.

4. **Lock conflict instructions referenced the wrong recovery procedure.**
   - **Was:** "For S3+DynamoDB, delete the lock item from DynamoDB."
   - **Changed to:** "For DIY backends, delete the lock file under `.pulumi/locks/<stack>/` in the state bucket."
   - **Why:** Same root cause as #3 — the recovery action lives on the storage backend, not in DynamoDB.

5. **Team collaboration CLI commands do not exist.**
   - **Was:** `pulumi org member add ... --role admin`, `pulumi team create ...`, `pulumi stack set-team ... --permission write`.
   - **Changed to:** Use `pulumi org member edit` / `pulumi org member ls` (the only existing subcommands besides `remove`), invite new members via the Pulumi Cloud UI or REST API, assign teams at stack creation with `pulumi stack init --teams <team-name>`, and use the `pulumiservice.TeamStackPermission` resource for granular team/stack permissions.
   - **Why:** `pulumi org member` has no `add` subcommand, `pulumi team` does not exist as a top-level command, and `pulumi stack set-team` is not a real command. Stack-to-team assignment happens at init time via `--teams` (no `--permission` flag).

6. **`pulumi/actions@v5` is outdated.**
   - **Was:** `uses: pulumi/actions@v5`
   - **Changed to:** `uses: pulumi/actions@v7`
   - **Why:** v7 is the current major release of the official Pulumi GitHub Action. The `refresh` and `comment-on-pr` inputs used in the workflow remain valid in v7.

## Review Notes
- The TypeScript import example uses `aws.s3.Bucket` from the `@pulumi/aws` provider. In `@pulumi/aws` v6+, `aws.s3.Bucket` (and its inline `acl`/`versioning` arguments) is deprecated in favor of `aws.s3.BucketV2` with separate `aws.s3.BucketVersioningV2`, `aws.s3.BucketAclV2`, etc. The legacy resource still works, so the example is functional; teams writing new code should migrate to `BucketV2`.
- The CloudWatch alarm snippet references `snsTopicArn` without defining it. This is acceptable as an illustrative excerpt but readers will need to define it themselves.
- The `aws s3api create-bucket` example omits the `--create-bucket-configuration LocationConstraint=...` argument, which is fine for `us-east-1` (the default) but would need to be added for other regions. Not a defect for the chosen region.
- After v6 of `pulumi/actions`, `refresh: true` now causes `pulumi up`/`pulumi preview` to be invoked with `--refresh` rather than executing a separate `pulumi refresh` step beforehand. Behavior is equivalent for typical pipelines; worth noting for users migrating from older v5 workflows.
