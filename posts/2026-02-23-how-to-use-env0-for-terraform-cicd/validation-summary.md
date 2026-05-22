# Validation Summary: How to Use env0 for Terraform CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- env0 / env zero
- Terraform
- AWS IAM and OIDC
- GCP Workload Identity Federation
- Open Policy Agent (OPA) / Rego
- GitHub Actions
- Cost monitoring and drift detection

## Sources Consulted
- env zero Custom Flows Overview: https://docs.envzero.com/guides/admin-guide/custom-flows
- env zero Custom Flow Schema (v2): https://docs.envzero.com/guides/admin-guide/custom-flows/version-2-schema
- env zero OIDC for AWS: https://docs.envzero.com/guides/integrations/oidc-integrations/oidc-with-aws
- env zero OIDC for GCP: https://docs.envzero.com/guides/integrations/oidc-integrations/oidc-with-google-cloud-platform
- env zero Manage Approval Policies: https://docs.envzero.com/guides/policies-governance/approval-policies
- env zero Manage Policies: https://docs.envzero.com/guides/policies-governance/policies
- env zero Configure Policy TTL: https://docs.envzero.com/guides/policies-governance/policy-ttl
- env zero Set Cost Monitoring: https://docs.envzero.com/guides/cost-monitoring/cost-monitoring
- env zero Set Budget Notifications: https://docs.envzero.com/guides/cost-monitoring/budget-notifications
- env zero Drift Detection & Management: https://docs.envzero.com/guides/admin-guide/environments/drift-detection
- env zero Deploy Environment API reference: https://docs.envzero.com/api-reference/environments/deploy-environment

## Issues Found
- The AWS OIDC example used `app.env0.com` and an organization ID as the audience. Updated it to env0's documented OIDC issuer `login.app.env0.com/`, the documented audience, a `sub` condition, and the `sts:TagSession` action used by env0 session tags.
- The AWS credential type was labeled as `AWS Assumed Role`. Updated it to `AWS OIDC`, matching the current env0 credential flow for OIDC.
- The GCP Workload Identity example described a static service account credential. Updated it to `GCP OIDC` with the JSON configuration file content from GCP Workload Identity Federation.
- The lifecycle configuration included an unsupported "destroy after no commits" inactivity policy and implied everything was configured under template settings. Reworded the pseudo-settings to align with organization/project TTL policies and environment scheduling.
- The OPA approval-policy examples used incorrect input paths (`input.plan.cost_estimation.*`) and an unsupported `require_approval` output rule. Updated them to `input.costEstimation.totalMonthlyCost`, `input.costEstimation.monthlyCostDiff`, and the documented `pending` rule.
- The S3 encryption policy checked `server_side_encryption_configuration` on `aws_s3_bucket`, which is not the current AWS provider resource model. Updated it to check for an accompanying `aws_s3_bucket_server_side_encryption_configuration` resource in the Terraform plan.
- The custom flow example used non-env0 hook names such as `setup`, `pre-plan`, `post-plan`, and `post-apply`. Updated it to env0 schema version 2 with `terraformInit`, `terraformPlan`, `terraformApply`, and `terraformDestroy` hooks using `before` and `after`.
- The custom flow example referenced an undocumented `$ENV0_PLAN_FILE`. Removed that dependency and used env0's documented `$ENV0_ENV` mechanism to force manual approval.
- The drift detection snippet referred to template settings and a natural-language interval. Updated it to environment settings and a cron expression.
- The drift response list claimed env0 can open a PR with required changes. Replaced it with manual remediation from the drift detection deployment, which matches the documented drift remediation flow.
- The API trigger example used bearer authentication. Updated it to the documented Basic authentication header and added a GitHub Actions secret environment variable for the encoded credential value.

## Review Notes
- The post uses illustrative UI snippets rather than exact exported configuration. Future updates could replace these with Terraform provider resources or direct env0 API examples if the article needs fully automatable setup instructions.
