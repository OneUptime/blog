# Validation Summary: How to Handle Secrets in Pulumi

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi (CLI, TypeScript SDK, Config, Outputs, secrets provider URLs)
- `@pulumi/aws` (Secrets Manager, RDS, Lambda, CloudTrail, CloudWatch, IAM)
- `@pulumi/random` (RandomPassword)
- `@pulumi/vault` (HashiCorp Vault integration)
- AWS KMS, Azure KeyVault, GCP KMS (as Pulumi secrets providers)
- GitHub Actions (`pulumi/actions@v5`, `aws-actions/configure-aws-credentials@v4`)
- Mermaid diagrams

## Sources Consulted
- Pulumi secrets documentation: https://www.pulumi.com/docs/iac/concepts/secrets/
- Pulumi `pulumi config set` reference: https://www.pulumi.com/docs/iac/cli/commands/pulumi_config_set/
- Pulumi `replaceOnChanges` resource option: https://www.pulumi.com/docs/iac/concepts/options/replaceonchanges/
- Pulumi `@pulumi/random` RandomPassword: https://www.pulumi.com/registry/packages/random/api-docs/randompassword/
- Pulumi secrets providers (`awskms://`, `azurekeyvault://`, `gcpkms://`, `passphrase`): https://www.pulumi.com/docs/iac/concepts/secrets/#configuring-secrets-encryption
- Pulumi `change-secrets-provider`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_change-secrets-provider/
- AWS CloudTrail data event support: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_DataResource.html
- AWS Secrets Manager + CloudTrail logging: https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring-cloudtrail.html
- AWS Lambda runtime deprecation schedule: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- `pulumi/actions` GitHub Action: https://github.com/pulumi/actions

## Issues Found

1. **Section 6 — Incorrect `replaceOnChanges` usage.** The original code passed a runtime value (`rotationTrigger`) into `replaceOnChanges`. Per Pulumi docs, `replaceOnChanges` accepts a list of *property name strings* on the resource (e.g. `["password"]`), not arbitrary values. Passing `[rotationTrigger]` would be interpreted as a literal property path (e.g. `"v1"`) that does not exist on `RandomPassword`, and would not trigger regeneration on change.
   - **Fix:** Replaced with the idiomatic `keepers` map on `random.RandomPassword`, which is the documented mechanism for forcing regeneration when an arbitrary value changes. Also removed the redundant `additionalSecretOutputs: ["result"]` since `result` is already marked secret by `RandomPassword`.

2. **Section 10 — Invalid CloudTrail `dataResources.type` for Secrets Manager.** The original code declared `dataResources` with `type: "AWS::SecretsManager::Secret"` inside a basic `eventSelectors` block. Per the AWS CloudTrail `DataResource` reference, basic event selectors only support `AWS::S3::Object`, `AWS::Lambda::Function`, and `AWS::DynamoDB::Table`. Secrets Manager API calls (including `GetSecretValue`) are logged as **management events**, not data events.
   - **Fix:** Removed the invalid `dataResources` block. The remaining `includeManagementEvents: true` is the correct mechanism for capturing Secrets Manager access in CloudTrail.

## Review Notes

- `nodejs18.x` in section 5 is technically still valid as of 2026-06-07 — AWS Lambda's Phase 1 deprecation began 2025-09-01 (only blocks runtime deprecation warnings), but Phase 2 (block function creation) is scheduled for 2027-02-01 and Phase 3 (block updates) for 2027-03-03. Existing deployments still work. Authors may want to update to `nodejs20.x` or `nodejs22.x` in a future pass.
- `engineVersion: "15.4"` in section 3 is a valid PostgreSQL version; AWS RDS periodically retires minor versions, so readers should pick a currently-supported minor version for new deployments.
- Section 5's HashiCorp Vault example references `vault.generic.getSecretOutput` which is correct, but the `vault.generic.*` namespace has been progressively replaced by typed resources (e.g. `kv.getSecretV2Output`) in newer `@pulumi/vault` versions. Still works, just worth noting.
- Section 6's `random.RandomPassword.result` is automatically marked as secret by the provider, so explicit `additionalSecretOutputs: ["result"]` is redundant (and was removed alongside the `replaceOnChanges` fix).
- Section 7's `pulumi.log.info("Configuring API integration", undefined)` works (the second argument is an optional `Resource`), but simply calling `pulumi.log.info("Configuring API integration")` reads more cleanly. Left as-is since it is not technically incorrect.
- Section 10's example references undeclared identifiers (`auditBucket`, `alertTopic`, `productionSecret`, `applicationRole`, `deploymentRole`, and `rotationRole` in section 6) — these are clearly illustrative snippets rather than full standalone programs, which is appropriate for the post's scope.
