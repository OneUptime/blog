# Validation Summary: How to Implement Compliance as Code with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Checkov
- tfsec
- GitHub Actions
- GitHub code scanning SARIF uploads
- AWS Config
- AWS CLI
- AWS Security Hub
- Amazon RDS

## Sources Consulted
- OpenTofu input variable documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu custom conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu lifecycle documentation: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- Checkov GitHub Action README: https://github.com/bridgecrewio/checkov-action
- GitHub Docs, uploading a SARIF file to GitHub: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- tfsec config file documentation: https://aquasecurity.github.io/tfsec/v1.28.6/guides/configuration/config/
- tfsec custom checks documentation: https://aquasecurity.github.io/tfsec/v1.28.4/guides/configuration/custom-checks/
- tfsec AWS EC2 checks index: https://aquasecurity.github.io/tfsec/latest/checks/aws/ec2/
- tfsec `aws-ec2-no-public-ingress-sgr` check: https://aquasecurity.github.io/tfsec/v1.28.4/checks/aws/ec2/no-public-ingress-sgr/
- tfsec `aws-ec2-add-description-to-security-group` check: https://aquasecurity.github.io/tfsec/v1.28.11/checks/aws/ec2/add-description-to-security-group/
- AWS Config managed rules overview: https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_use-managed-rules.html
- AWS Config `s3-bucket-server-side-encryption-enabled` rule: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-server-side-encryption-enabled.html
- AWS Config `ec2-instances-in-vpc` rule: https://docs.aws.amazon.com/config/latest/developerguide/ec2-instances-in-vpc.html
- AWS Config `iam-root-access-key-check` rule: https://docs.aws.amazon.com/config/latest/developerguide/iam-root-access-key-check.html
- AWS Config `cloudtrail-enabled` rule: https://docs.aws.amazon.com/config/latest/developerguide/cloudtrail-enabled.html
- AWS Config delivery channel documentation: https://docs.aws.amazon.com/config/latest/developerguide/manage-delivery-channel.html
- AWS Config SNS notification documentation: https://docs.aws.amazon.com/config/latest/developerguide/notifications-for-AWS-Config.html
- AWS Config service integrations: https://docs.aws.amazon.com/config/latest/developerguide/service-integrations.html
- AWS CLI `describe-compliance-by-config-rule` reference: https://docs.aws.amazon.com/cli/latest/reference/configservice/describe-compliance-by-config-rule.html
- AWS Security Hub integrations: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-internal-providers.html

## Issues Found
- The Checkov GitHub Actions example used `bridgecrewio/checkov-action@master`, omitted checkout and workflow permissions, and uploaded SARIF with `upload-sarif@v2` without `if: success() || failure()`. I replaced it with a minimal current workflow job using checkout, explicit permissions, `checkov-action@v12`, `upload-sarif@v4`, and a conditional upload step so SARIF still uploads when findings fail the build.
- The tfsec example used invalid/currently undocumented config keys and layouts. I changed `exclude_checks` to `exclude`, moved the custom rule into its own `.tfsec/*_tfchecks.yaml` file example, updated the custom rule schema to use `checks`, `errorMessage`, and `relatedLinks`, and replaced the invalid `isTrue` matcher with `action: equals` plus `value: true`.
- The tfsec check identifiers in the example were outdated (`AWS006`, `AWS018`). I updated them to the current documented check IDs `aws-ec2-no-public-ingress-sgr` and `aws-ec2-add-description-to-security-group`.
- The OpenTofu variable validation examples could produce type errors if callers passed `null`. I added `nullable = false` to the affected variables so the validation behavior is consistent with the intended compliance checks.
- The AWS Config delivery channel comment overstated its role. I changed the wording to reflect that the delivery channel sends AWS Config notifications, including compliance changes, and added a note that the recorder and referenced S3/SNS resources are assumed to be configured separately.

## Review Notes
- The post is now technically sound after the fixes above.
- tfsec remains usable, but the project is being steered toward Trivy by Aqua; the current post is still valid because the cited tfsec docs and releases remain available.
- The AWS Config example is intentionally partial rather than a complete standalone module. It is acceptable as an illustrative snippet, but a future revision could add the recorder and IAM role setup if the post is expanded.
