# Validation Summary: How to Use tfsec/trivy for Security Scanning with OpenTofu

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Trivy
- tfsec migration to Trivy
- Aqua Vulnerability Database (AVD) checks
- GitHub Actions
- SARIF upload to GitHub code scanning
- AWS security group, RDS, EC2, EBS, and S3 configuration checks

## Sources Consulted
- Trivy installation documentation: https://trivy.dev/docs/latest/getting-started/installation/
- Trivy `config` CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_config/
- Trivy Terraform IaC coverage: https://trivy.dev/docs/latest/coverage/iac/terraform/
- Trivy misconfiguration inline ignore documentation: https://trivy.dev/docs/latest/scanner/misconfiguration/config/config/
- Trivy filtering and `.trivyignore` documentation: https://trivy.dev/docs/latest/configuration/filtering/
- Aqua Security Trivy Action documentation: https://github.com/aquasecurity/trivy-action
- GitHub SARIF upload documentation: https://docs.github.com/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- Aqua AVD check for unrestricted SSH/RDP ingress, AVD-AWS-0107: https://avd.aquasec.com/misconfig/aws/ec2/avd-aws-0107/
- Aqua AVD check for RDS public access, AVD-AWS-0180: https://avd.aquasec.com/misconfig/aws/rds/avd-aws-0180/
- Aqua AVD check for standalone EBS volume encryption, AVD-AWS-0026: https://avd.aquasec.com/misconfig/aws/ec2/avd-aws-0026/
- Trivy checks source for root block device encryption, AVD-AWS-0131: https://github.com/aquasecurity/trivy-checks/blob/main/checks/cloud/aws/ec2/enable_at_rest_encryption.rego
- Trivy checks source for S3 bucket logging, AVD-AWS-0089: https://github.com/aquasecurity/trivy-checks/blob/main/checks/cloud/aws/s3/enable_logging.rego
- HashiCorp AWS provider `aws_instance` documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- HashiCorp AWS provider `aws_db_instance` documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown

## Issues Found
- The installation examples used older Homebrew syntax and omitted `sudo` for installing into `/usr/local/bin` on Linux. Updated the macOS command to `brew install trivy` and the Linux command to use the official install script with `sudo`.
- The sample Trivy output marked unrestricted SSH ingress as `CRITICAL`, but AVD-AWS-0107 is currently a `HIGH` severity check. Updated the sample output severity and code fence language.
- The RDS example used `AVD-AWS-0086`, which is an S3 public ACL block check, not RDS public access. Updated it to `AVD-AWS-0180`.
- The EC2 root block device encryption example used `AVD-AWS-0028`, which is the IMDSv2 token check. Updated it to `AVD-AWS-0131`, which matches the `root_block_device { encrypted = true }` example.
- The inline suppression example used `tfsec:ignore` inside a resource block and paired AVD-AWS-0107 with port 443 ALB traffic. Updated it to current `#trivy:ignore:AVD-AWS-0107` syntax immediately before a matching SSH security group exception.
- The GitHub Actions snippet used `aquasecurity/trivy-action@master` and `github/codeql-action/upload-sarif@v3`. Updated these to `aquasecurity/trivy-action@0.35.0` and `github/codeql-action/upload-sarif@v4`.
- The SARIF example filtered by severity but did not set `limit-severities-for-sarif`; Trivy Action documents that SARIF can otherwise include all severities. Added `limit-severities-for-sarif: true`.
- The `.trivyignore` format comment incorrectly suggested `AVD-ID[=reason]`, and the example reasons did not match the listed AVD IDs. Updated the format note and reasons to align with current `.trivyignore` behavior and the actual checks.

## Review Notes
The GitHub Actions section is a steps-only snippet. A full workflow that uploads SARIF also needs appropriate workflow permissions, especially `security-events: write`, as shown in GitHub's SARIF upload documentation.
