# Validation Summary: How to Suppress GuardDuty False Positive Findings

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Amazon GuardDuty
- AWS CLI
- Amazon S3
- Amazon EventBridge
- Terraform AWS Provider

## Sources Consulted
- AWS CLI Command Reference: `guardduty create-ip-set` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/create-ip-set.html
- AWS CLI Command Reference: `guardduty update-ip-set` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/update-ip-set.html
- AWS CLI Command Reference: `guardduty create-filter` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/create-filter.html
- AWS CLI Command Reference: `guardduty list-findings` - https://docs.aws.amazon.com/cli/latest/reference/guardduty/list-findings.html
- Amazon GuardDuty User Guide: Suppression rules - https://docs.aws.amazon.com/guardduty/latest/ug/findings_suppression-rule.html
- Amazon GuardDuty User Guide: Customizing threat detection with entity lists and IP address lists - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload-lists.html
- Amazon GuardDuty User Guide: Updating an entity list or IP address list - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-lists-update-procedure.html
- Amazon GuardDuty quotas - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_limits.html
- Amazon GuardDuty finding types: EC2 - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-ec2.html
- Amazon GuardDuty finding types: IAM - https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-iam.html
- Terraform Registry: `aws_guardduty_filter` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_filter
- Terraform Registry: `aws_guardduty_ipset` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_ipset

## Issues Found
- The trusted IP list explanation was too broad. GuardDuty IP address lists apply to CloudTrail and VPC Flow Logs findings, not Route 53 Resolver DNS query log findings, and GuardDuty list entries apply only to traffic destined for publicly routable IP addresses and domains. Updated the explanation and IP list example accordingly.
- The Terraform `aws_guardduty_filter` example used `less_than = ["4"]`, but the Terraform provider documents `less_than` as a scalar value. Changed it to `less_than = "4"`.

## Review Notes
- The AWS CLI commands, GuardDuty filter fields, finding criteria operators, GuardDuty finding type names, suppression rule behavior, quota statement, and related OneUptime links were checked and are valid.
- The local environment did not have the AWS CLI installed, so CLI syntax was verified against the official AWS CLI command reference rather than local `aws --help` output.
