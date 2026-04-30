# Validation Summary: How to Implement HIPAA-Compliant Infrastructure with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- AWS KMS
- Amazon RDS
- AWS CloudTrail
- Amazon S3 (versioning, Object Lock, lifecycle policies, SSE-KMS)
- AWS IAM
- HIPAA Security Rule

## Sources Consulted
- HHS: Summary of the HIPAA Security Rule — https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- HHS FAQ: Is the use of encryption mandatory in the Security Rule? — https://www.hhs.gov/hipaa/for-professionals/faq/2001/is-the-use-of-encryption-mandatory-in-the-security-rule/index.html
- AWS: HIPAA Compliance — https://aws.amazon.com/compliance/hipaa-compliance/
- AWS KMS: Rotate AWS KMS keys — https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- AWS KMS: Default key policy — https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
- Amazon RDS: AWS KMS key management — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.Keys.html
- Amazon RDS: Backup retention period — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html
- Amazon S3: Configuring S3 Object Lock — https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html
- Amazon S3: Locking objects with Object Lock — https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- Amazon S3: Using server-side encryption with AWS KMS keys (SSE-KMS) — https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- AWS IAM: Global condition context keys (`aws:MultiFactorAuthPresent`) — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS CloudTrail: Validating CloudTrail log file integrity — https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html
- Terraform Registry: `aws_s3_bucket_object_lock_configuration` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration

## Issues Found
1. **The introduction overstated HIPAA's encryption requirement and omitted a core technical safeguard.** The original text said HIPAA requires encryption and listed only a subset of the technical safeguards. I updated the introduction and mermaid diagram to reflect HHS guidance: encryption is an addressable implementation specification, and person or entity authentication is a separate safeguard under 45 CFR §164.312(d).

2. **The KMS rotation guidance was incorrect.** The post claimed `enable_key_rotation = true` is required for HIPAA and said CMS requires at least annual rotation. I changed both the code comment and the best-practice bullet to match AWS KMS documentation: automatic rotation for customer-managed symmetric keys is optional and typically annual by default.

3. **The custom KMS key policy was misleading for the RDS/S3 example.** The original policy suggested a simplified service-principal model and omitted grant-related permissions that Amazon RDS documents for customer-managed keys. I removed the custom policy block so the example no longer teaches an incomplete or potentially non-working permissions model.

4. **The post incorrectly mapped HIPAA's six-year documentation rule onto backups and audit-log retention.** I changed the RDS backup comment to reflect the actual Amazon RDS automated-backup maximum of 35 days, and I rewrote the audit-log and Object Lock comments so the six-year values are presented as example retention policies rather than HIPAA mandates.

5. **Several operational statements were too absolute.** I changed the transmission-security example from "no unencrypted transport" to "secure transport controls," corrected the Multi-AZ comment so it no longer implies HIPAA specifically mandates Multi-AZ, and updated the Object Lock bullet to match AWS's documented COMPLIANCE-mode behavior.

6. **The access-control comment did not match what the IAM code actually does.** The snippet defines an identity policy, not a role binding. I changed the comment so it accurately describes the policy as an example to attach to approved principals.

7. **The restore-testing and AWS BAA guidance needed nuance.** I changed the quarterly restore-testing claim to regular testing aligned with HIPAA's periodic contingency-plan testing requirement, and I expanded the AWS BAA guidance to note that PHI workloads should stay on HIPAA-eligible AWS services.

## Review Notes
- The code samples are illustrative fragments, not a full standalone deployment. Supporting resources such as the CloudTrail bucket policy, CloudTrail delivery role, network/subnet configuration, and the remaining required RDS parameters are assumed to exist elsewhere in the infrastructure code.
- For federated or IAM Identity Center access patterns, `aws:MultiFactorAuthPresent` is not available in every request context. In production, MFA enforcement often also needs trust-policy conditions or session-tag-based controls.
- HIPAA compliance is broader than infrastructure-as-code alone. Administrative safeguards, physical safeguards, risk analysis, and operational procedures remain part of the full compliance picture.
