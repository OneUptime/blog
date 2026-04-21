# Validation Summary: How to Use tfsec with OpenTofu for Security Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform HCL
- tfsec
- Trivy
- Rego / Open Policy Agent
- GitHub Actions SARIF upload
- AWS S3, EC2 subnet, RDS, and IAM security checks

## Sources Consulted
- tfsec README and installation/migration notes: https://github.com/aquasecurity/tfsec
- tfsec CLI flags source: https://github.com/aquasecurity/tfsec/blob/master/internal/app/tfsec/cmd/flags.go
- tfsec config file documentation: https://aquasecurity.github.io/tfsec/v1.28.4/guides/configuration/config/
- tfsec custom checks documentation: https://aquasecurity.github.io/tfsec/v1.28.4/guides/configuration/custom-checks/
- tfsec Rego policy documentation: https://aquasecurity.github.io/tfsec/v1.28.4/guides/rego/rego/
- tfsec AWS EC2 subnet check: https://aquasecurity.github.io/tfsec/v1.28.4/checks/aws/ec2/no-public-ip-subnet/
- tfsec AWS RDS backup retention check: https://aquasecurity.github.io/tfsec/v1.28.4/checks/aws/rds/specify-backup-retention/
- tfsec AWS S3 ACL check: https://aquasecurity.github.io/tfsec/v1.28.4/checks/aws/s3/no-public-access-with-acl/
- tfsec AWS IAM wildcard check: https://aquasecurity.github.io/tfsec/v1.28.4/checks/aws/iam/no-policy-wildcards/
- tfsec GitHub Action metadata and entrypoint: https://github.com/aquasecurity/tfsec-action
- Trivy Terraform scanning documentation: https://trivy.dev/docs/dev/tutorials/misconfiguration/terraform/
- Trivy misconfiguration rule ID and alias documentation: https://trivy.dev/docs/latest/scanner/misconfiguration/config/config/
- OpenTofu configuration syntax documentation: https://opentofu.org/docs/language/syntax/configuration/
- Trivy supply-chain advisory reviewed as current security context: https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23

## Issues Found
- The introduction described tfsec as a Terraform and OpenTofu tool. Official tfsec docs describe Terraform scanning, so this was changed to say tfsec scans Terraform configurations and can scan OpenTofu-compatible `.tf` HCL files.
- The subnet example used `aws-ec2-no-public-ip`, which is the wrong tfsec rule for `aws_subnet.map_public_ip_on_launch`. Updated it to `aws-ec2-no-public-ip-subnet` and fixed the matching ignore example.
- The RDS deletion-protection rule ID shown in the post is not a current tfsec AWS RDS check. Replaced it with the documented `aws-rds-specify-backup-retention` check and a matching insecure/secure RDS example.
- The inline suppression for S3 versioning was inside the resource block, where it may not apply to a block-level finding. Moved it directly above the resource, matching tfsec ignore documentation.
- The `.tfsec/config.yml` example included an unsupported `custom_checks` structure. Removed that block and left only supported config keys.
- The Rego custom policy used the wrong input structure for tfsec and Rego syntax not shown in tfsec's docs. Rewrote it to use the `custom` package namespace, `input.aws.s3.buckets`, `deny[res]`, and `result.new`, then added the required `--rego-policy-dir` command.
- The GitHub Action example used unsupported `minimum_severity` and `output` inputs. Moved those flags to `additional_args`. Also removed `soft_fail: false` because this action treats any non-empty `soft_fail` input as enabling `--soft-fail`.
- The Trivy migration sentence overstated check ID equivalence. Updated it to say Trivy uses the same Terraform scanning engine and accepts tfsec-style long rule IDs as aliases.

## Review Notes
tfsec remains available, but Aqua's documentation directs new work toward Trivy. Trivy had a March 2026 supply-chain advisory affecting specific releases/actions; future Trivy CI examples should pin safe versions or full SHAs. The HCL examples are still focused snippets and assume surrounding provider configuration and referenced resources exist in the real project.
