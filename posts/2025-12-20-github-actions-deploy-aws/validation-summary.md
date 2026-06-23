# Validation Summary: How to Deploy to AWS from GitHub Actions

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GitHub Actions (workflows, OIDC `id-token` permission, environments)
- AWS IAM (OIDC identity provider, roles, trust policies)
- `aws-actions/configure-aws-credentials@v4`
- `aws-actions/amazon-ecr-login@v2`
- `aws-actions/amazon-ecs-render-task-definition@v1`
- `aws-actions/amazon-ecs-deploy-task-definition@v2`
- `aws-actions/aws-cloudformation-github-deploy@v1`
- AWS CLI (`aws s3`, `aws cloudfront`, `aws ecs`, `aws lambda`, `aws elbv2`, `aws iam`)
- Amazon S3, CloudFront, ECS/ECR, Lambda, CloudFormation, ELBv2

## Sources Consulted
- aws-actions/amazon-ecs-render-task-definition (README / action.yml) — https://github.com/aws-actions/amazon-ecs-render-task-definition (confirmed the action outputs `task-definition`, a file path; it does not output `revision`)
- AWS CLI `ecs wait services-stable` reference — https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html (confirmed command/flag syntax)
- aws-actions/aws-cloudformation-github-deploy — https://github.com/aws-actions/aws-cloudformation-github-deploy (confirmed `parameter-overrides` accepts comma-separated `Key=Value` pairs or a JSON file, not newline-separated lists)
- GitHub Changelog: GitHub Actions – Update on OIDC integration with AWS — https://github.blog/changelog/2023-06-27-github-actions-update-on-oidc-integration-with-aws/ (thumbprint context)
- AWS Security Blog: Use IAM roles to connect GitHub Actions to actions in AWS — https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/

## Issues Found
1. **CloudFormation `parameter-overrides` used an invalid newline-separated format.** The post passed parameters as a `|` block scalar:
   ```yaml
   parameter-overrides: |
     Environment=production
     InstanceType=t3.medium
   ```
   The `aws-actions/aws-cloudformation-github-deploy` action parses `parameter-overrides` as a comma-separated list of `Key=Value` pairs (or a `file://` JSON path). The block-scalar form yields a single malformed string and would not be parsed into two parameters. **Fix:** changed it to `parameter-overrides: "Environment=production,InstanceType=t3.medium"`.

2. **Blue-Green snippet referenced a non-existent action output `steps.task-def.outputs.revision`.** The `amazon-ecs-render-task-definition` action outputs `task-definition` (the rendered file path), not `revision`, so `--task-definition my-task:${{ steps.task-def.outputs.revision }}` would resolve to `my-task:` and fail. **Fix:** changed to `--task-definition my-task`, which is valid AWS CLI usage (deploys the latest ACTIVE revision of the family).

3. **Rollback snippet had the same invalid `steps.task-def.outputs.revision` reference** in its initial deploy command. **Fix:** changed to `--task-definition my-task`. (The rollback step itself correctly derives the previous task definition from `describe-services` and was left unchanged.)

## Review Notes
- The OIDC thumbprint `6938fd4d98bab03faadb97b34396831e3780aea1` is still valid and widely documented. Since mid-2023 AWS validates the GitHub OIDC provider against its own trusted root CA store, so the thumbprint value is effectively no longer enforced for `token.actions.githubusercontent.com`, but supplying it remains correct and harmless. Left as-is.
- All AWS GitHub Action versions referenced are current and non-deprecated: `configure-aws-credentials@v4`, `amazon-ecr-login@v2`, `amazon-ecs-render-task-definition@v1`, `amazon-ecs-deploy-task-definition@v2`, `aws-cloudformation-github-deploy@v1`.
- `aws ecs wait services-stable`, `aws lambda wait function-updated`, `aws lambda update-function-code`, `aws elbv2 modify-listener`, and the S3/CloudFront commands all use correct subcommands and flags.
- Minor non-error caveat: the S3 `--cache-control "max-age=31536000"` is applied to all synced objects including HTML; in production an immutable long cache is usually reserved for fingerprinted assets while HTML uses a short TTL. This is a best-practice nuance, not an error, so it was left unchanged.
- The OIDC trust-policy, identity-provider creation, role creation, and branch-restriction `sub` condition examples are all syntactically and semantically correct.
