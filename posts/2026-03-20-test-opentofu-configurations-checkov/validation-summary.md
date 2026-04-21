# Validation Summary: How to Test OpenTofu Configurations with Checkov - Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Checkov
- OpenTofu
- Terraform HCL
- AWS Terraform checks
- GitHub Actions
- Infrastructure as Code security scanning

## Sources Consulted
- Checkov official README / project documentation: https://github.com/bridgecrewio/checkov
- Checkov CLI Command Reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov Policy Index: https://www.checkov.io/5.Policy%20Index/all.html
- Checkov GitHub Action README: https://github.com/bridgecrewio/checkov-action
- Checkov GitHub Actions integration documentation: https://www.checkov.io/4.Integrations/GitHub%20Actions.html

## Issues Found
1. **Common check descriptions did not match Checkov's policy index**: `CKV_AWS_57` was described as a general "S3 bucket not public" check, but it specifically detects public WRITE ACLs. `CKV_AWS_8` was described as EC2 detailed monitoring, but it checks EBS encryption on EC2 instances or launch configurations. `CKV_AWS_111` was described as IAM policy wildcards, but it checks IAM write access without constraints. Updated the descriptions to match the official Checkov policy index.
2. **Inline suppression used the wrong check ID for the stated reason**: The public assets bucket example skipped `CKV_AWS_57`, which is for public WRITE ACLs. Updated it to `CKV_AWS_20`, the public READ ACL check used for public static content examples in Checkov's own suppression documentation.
3. **Unsupported `--check` examples**: The post showed `checkov -d . --check CIS_AWS` and `checkov -d . --check encryption`. Current Checkov CLI documentation describes `--check` as accepting Checkov IDs, Bridgecrew/Prisma Cloud IDs, severity values, and wildcards, not arbitrary compliance framework or category names. Replaced the examples with documented check-ID and wildcard filters.

## Review Notes
- Checkov's documented framework selector uses `terraform` for Terraform/OpenTofu-style HCL scanning; the GitHub Action and CLI examples using `framework: terraform` / `--framework terraform` are technically correct.
- `uses: bridgecrewio/checkov-action@master` is shown in official Checkov examples and is valid, though pinning to a version tag is generally preferable for reproducible CI behavior.
