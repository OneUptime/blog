# Validation Summary: How to Handle Terraform Drift as a Security Concern

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform plan and show JSON output
- GitHub Actions
- HashiCorp setup-terraform action
- AWS Config
- AWS Config managed rules
- AWS Systems Manager Automation runbooks
- AWS Organizations service control policies
- AWS IAM, EC2 security groups, S3, KMS, CloudTrail, GuardDuty

## Sources Consulted
- Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform refresh-only drift tutorial: https://developer.hashicorp.com/terraform/tutorials/state/resource-drift
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform
- Terraform AWS provider `aws_config_configuration_recorder` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_configuration_recorder
- Terraform AWS provider `aws_config_configuration_recorder_status` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_configuration_recorder_status
- Terraform AWS provider `aws_config_remediation_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_remediation_configuration
- AWS Config managed rule `restricted-ssh`: https://docs.aws.amazon.com/config/latest/developerguide/restricted-ssh.html
- AWS Config managed rule `s3-bucket-public-read-prohibited`: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-public-read-prohibited.html
- AWS Config managed rule `cloudtrail-enabled`: https://docs.aws.amazon.com/config/latest/developerguide/cloudtrail-enabled.html
- AWS Systems Manager Automation runbook `AWS-EnableCloudTrail`: https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-enablecloudtrail.html
- Amazon EC2 security group API documentation: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_AuthorizeSecurityGroupIngress.html
- AWS Organizations SCP documentation: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html

## Issues Found
- The initial drift check used normal `terraform plan`, and the text said exit code 2 indicates drift. Normal plans can also report pending configuration changes. Changed the examples to use `terraform plan -refresh-only -detailed-exitcode` and clarified that exit code 2 indicates outside-Terraform changes only in refresh-only mode.
- The shell comment described `terraform plan -out=...` as machine-readable. Saved plan files are opaque until converted with `terraform show -json`. Updated the comment to describe creating a refresh-only plan file that can be converted to JSON.
- The GitHub Actions example piped Terraform through `tee` and then read `$?`, which would capture `tee`'s exit code rather than Terraform's. Updated the step to read `${PIPESTATUS[0]}` and disable the setup-terraform wrapper so the raw shell exit code is preserved.
- The AWS Config example created a configuration recorder and delivery channel but did not start the recorder. Added `aws_config_configuration_recorder_status` with a dependency on the delivery channel.
- The AWS Config remediation example used the `AWS-EnableCloudTrail` runbook but omitted the required `TrailName` parameter. Added a `TrailName` parameter.

## Review Notes
The post remains a practical security drift guide after the fixes. The Terraform version pinned in the GitHub Actions example is older than the latest Terraform documentation version checked, but it still supports `-refresh-only` because that option is available from Terraform 0.15.4 onward.
