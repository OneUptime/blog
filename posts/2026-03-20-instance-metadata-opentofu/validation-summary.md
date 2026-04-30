# Validation Summary: How to Configure EC2 Instance Metadata with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Amazon EC2 Instance Metadata Service (IMDS/IMDSv2)
- AWS Organizations service control policies (SCPs)
- Amazon CloudWatch
- Bash and `curl` in EC2 user data

## Sources Consulted
- AWS EC2 User Guide: Configure the Instance Metadata Service options — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html
- AWS EC2 User Guide: Use the Instance Metadata Service to access instance metadata — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- AWS EC2 User Guide: Use instance metadata to manage your EC2 instance — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
- AWS EC2 User Guide: View tags for your EC2 instances using instance metadata — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/work-with-tags-in-IMDS.html
- AWS EC2 User Guide: Modify instance metadata options for existing instances — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-existing-instances.html
- AWS EC2 User Guide: Example policies to control access the Amazon EC2 API — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ExamplePolicies_EC2.html
- AWS EC2 User Guide: CloudWatch metrics that are available for your instances — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- AWS provider resource docs: `aws_ec2_instance_metadata_defaults` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_instance_metadata_defaults.html.markdown
- AWS provider resource docs: `aws_launch_template` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown
- AWS provider resource docs: `aws_instance` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown

## Issues Found
- The introduction and account-level defaults section described `aws_ec2_instance_metadata_defaults` as enforcement. I changed that wording to "set account-level defaults" because AWS documents launch-time settings as higher precedence than account defaults, and the reviewed provider resource manages regional defaults.
- The launch template comment and conclusion described hop-limit guidance too absolutely and tied it to "bare-metal workloads". I corrected the wording to reflect AWS's documented behavior: hop limit is about metadata network hops, and `2` is used when containers or similar software on the instance need IMDS access.
- The SCP section title overstated the scope of the example. I renamed it to clarify that the sample policy governs new instance launches through `RunInstances`, rather than all IMDS behavior organization-wide.

## Review Notes
- The sample SCP still caps `ec2:MetadataHttpPutResponseHopLimit` at `1`. If containers on the instance need IMDS access, that limit should be raised accordingly.
- AWS documents a separate account-level IMDSv2 enforcement setting (`HttpTokensEnforced`). The reviewed `aws_ec2_instance_metadata_defaults` provider documentation covers defaults, so readers should not treat those defaults as unoverrideable enforcement.
