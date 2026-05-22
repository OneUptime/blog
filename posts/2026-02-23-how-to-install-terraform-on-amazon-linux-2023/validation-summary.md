# Validation Summary: How to Install Terraform on Amazon Linux 2023

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Terraform CLI
- Amazon Linux 2023
- HashiCorp RPM repositories
- DNF/YUM package management
- AWS IAM instance profiles
- AWS CLI shared configuration profiles
- AWS Systems Manager Run Command
- Amazon S3

## Sources Consulted
- HashiCorp Terraform install documentation: https://developer.hashicorp.com/terraform/install
- Amazon Linux 2023 package management documentation: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html
- Terraform AWS provider authentication documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS CLI configuration and credential file settings: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS CLI `ssm send-command` reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html
- Amazon EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html

## Issues Found
- The Terraform version examples were outdated (`1.7.x`, `1.7.5`, and `1.8.0`). Updated them to `1.15.x` / `1.15.4`, matching the current HashiCorp install page consulted during validation.
- The HashiCorp Amazon Linux repository prerequisites omitted `shadow-utils`, which HashiCorp includes in its official Amazon Linux installation commands. Added `shadow-utils` to the package installation examples.
- The multi-account AWS profile example used `source_profile = default` even though the example only configured a default region and the surrounding context is EC2 instance profile authentication. Replaced it with `credential_source = Ec2InstanceMetadata`, which AWS documents for using the EC2 instance profile as source credentials for role assumption.
- The private-subnet troubleshooting note implied that S3 VPC endpoints can access the HashiCorp RPM repository. Corrected it to recommend NAT, proxy, or a local mirror for the HashiCorp repository, while keeping S3 as an option for copying a manually downloaded ZIP from a user-controlled bucket.
- The DNF lock troubleshooting snippet advised removing the DNF metadata lock file. Removed that command because deleting package-manager lock files is unsafe while a package-management process may still be running.

## Review Notes
- The post is technically relevant and remains a valid installation guide after the corrections.
- The manual binary method does not verify HashiCorp checksums or signatures. That is not required for basic installation, but it would be a useful hardening improvement for a future revision.
