# Validation Summary: How to Implement NIST 800-53 Controls with OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide mapping NIST SP 800-53 control families to OpenTofu (Terraform AWS provider) resource examples.

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS provider resources: `aws_iam_role`, `aws_iam_role_policy`, `aws_s3_bucket_policy`, `aws_cloudtrail`, `aws_cloudwatch_log_group`, `aws_ssm_patch_baseline`, `aws_guardduty_detector`, `aws_alb_listener` / `aws_lb_listener`, `aws_ebs_encryption_by_default`, `aws_organizations_policy`
- AWS services: IAM, S3, CloudTrail, CloudWatch Logs, KMS, Systems Manager Patch Manager, GuardDuty, ELB/ALB, EBS, AWS Organizations / SCPs
- NIST SP 800-53 control families: AC, AU, SI, SC, IA

## Sources Consulted
- Terraform AWS provider docs — `aws_cloudwatch_log_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group (and the source markdown in the hashicorp/terraform-provider-aws repo, which lists exact valid `retention_in_days` values)
- Terraform AWS provider docs — `aws_ssm_patch_baseline`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_patch_baseline
- AWS Systems Manager docs — How patch baseline rules work on Linux-based systems: https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-linux-rules.html
- AWS Systems Manager docs — Patch Manager prerequisites (AL2023): https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-prerequisites.html
- AWS CloudWatch Logs API reference (`PutRetentionPolicy`): https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutRetentionPolicy.html
- AWS docs on TLS/SSL policies for ELB listeners (verifying `ELBSecurityPolicy-TLS13-1-2-2021-06` is a valid policy name)
- NIST SP 800-53 Rev. 5 control catalog (for control family/identifier accuracy: AC-2, AC-3, AU-2, AU-3, AU-9, AU-11, SI-2, SI-3, SC-8, SC-28, IA-5)

## Issues Found

1. **Invalid `retention_in_days` value (AU-11 example).** The original code used `retention_in_days = 2555` claiming "7 years". `2555` is not in the API's list of accepted values. The Terraform AWS provider documents the valid set as: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653, and 0. Applying `2555` would fail with `InvalidParameterException`. Changed to `2557`, which is the documented ~7-year value.

2. **Invalid `CLASSIFICATION` filter value (SI-2 patch baseline).** The original `patch_filter` for `CLASSIFICATION` listed `["Security", "Bugfix", "Critical"]`. "Critical" is a `SEVERITY` value, not a `CLASSIFICATION` value (per the AWS Patch Manager Linux patch-baseline rules documentation, and confirmed by the AL2023 example in the official docs which uses `CLASSIFICATION = [Security, Bugfix]` and `SEVERITY = [Critical, Important]`). Removed `"Critical"` from the CLASSIFICATION values list; it is already correctly present in the SEVERITY filter immediately below.

3. **Intro listed a control family the post never covers.** The introduction said the post would cover "access control, audit logging, system integrity, and media protection," but no MP (Media Protection) section exists in the post. The post actually covers AC, AU, SI, SC, and IA. Replaced "media protection" with "system and communications protection," which matches the SC section that is actually present.

## Review Notes

- The `aws_alb_listener` resource name is the legacy alias for `aws_lb_listener`; both are still functional in the current AWS provider, but new code should prefer `aws_lb_listener`. Left as-is since it is not technically incorrect.
- The `aws_guardduty_detector` resource's nested `datasources { ... }` block (used in the SI-3 example) is deprecated in current AWS provider versions in favor of the standalone `aws_guardduty_detector_feature` resource. The shown configuration still works with current providers, so left as-is, but readers adopting this pattern should be aware that future provider releases may remove the `datasources` argument.
- The AC-3 S3 `enforce_tls` policy denies only `arn:aws:s3:::${aws_s3_bucket.data.bucket}/*` (object-level). A stricter, commonly-recommended pattern is to also deny on the bucket ARN itself (`arn:aws:s3:::${aws_s3_bucket.data.bucket}`) so that bucket-level operations also require TLS. This is a hardening note, not a technical error.
- The IA-5 SCP uses `Action = ["*"]` and `Resource = "*"` with a `BoolIfExists` MFA condition and a `StringNotEquals` exclusion for `aws:PrincipalType = "Service"`. Syntactically valid, but in practice deploying a "deny everything without MFA" SCP across an organization without further exclusions (e.g. for service-linked roles, break-glass roles, or `aws:ViaAWSService`) typically locks out automation. This is a pattern caveat for readers, not a code bug.
- Several snippets reference resources defined elsewhere (`aws_s3_bucket.data`, `aws_s3_bucket.cloudtrail`, `aws_lb.main`, `aws_lb_target_group.app`, `aws_kms_key.audit`, `var.certificate_arn`). These are clearly illustrative fragments rather than complete root modules, so the missing surrounding definitions are not flagged as errors.
- The `ssl_policy = "ELBSecurityPolicy-TLS13-1-2-2021-06"` value is a valid AWS-published security policy.
- All control identifiers cited (AC-2, AC-3, AU-2, AU-3, AU-9, AU-11, SI-2, SI-3, SC-8, SC-28, IA-5) exist in NIST SP 800-53 Rev. 5 and the mappings to the chosen AWS services are reasonable and widely used in FedRAMP/NIST compliance reference architectures.
