# Validation Summary: How to Import Multiple Resources at Once in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- OpenTofu import blocks
- OpenTofu configuration generation
- AWS CLI
- Bash
- AWS VPC, Subnet, Internet Gateway, NAT Gateway, EC2, Security Group, and RDS resources

## Sources Consulted
- OpenTofu language docs, `import` blocks: https://opentofu.org/docs/language/import/
- OpenTofu language docs, generating configuration: https://opentofu.org/docs/v1.9/language/import/generating-configuration/
- OpenTofu language docs, configuration syntax: https://opentofu.org/docs/language/syntax/configuration/
- AWS CLI User Guide, output formats: https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-output-format.html
- AWS CLI Command Reference, `ec2 describe-instances`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI Command Reference, `s3api list-buckets`: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-buckets.html
- AWS CLI Command Reference, `rds describe-db-instances`: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html

## Issues Found
- The post implied that import blocks alone were enough for every example. OpenTofu requires a matching `resource` block for each `to` address unless configuration is being generated, so I added that prerequisite to the introduction.
- The config generation section and conclusion implied that generated configuration works with `for_each` import blocks. OpenTofu documentation explicitly notes that configuration generation is not available when `for_each` is used on an `import` block, so I added that limitation and adjusted the wording.
- The first HCL example used compressed inline `import` blocks and some placeholder subnet IDs with non-hex characters. I rewrote those examples into the documented block form and replaced the invalid AWS-style placeholders with plausible example IDs.
- The AWS CLI discovery script parsed `--output text` output with plain `read`, which can split on whitespace inside values such as EC2 Name tags. I updated the script to use `read -r`, preserved tab-delimited parsing for the EC2 output, and aligned the query expressions with the AWS CLI documentation.
- The `-generate-config-out` workflow was presented without noting that the feature is still experimental. I added that caveat and clarified that the output path should be a new file.

## Review Notes
- `tofu` was not installed in the local workspace, so the review was validated against official OpenTofu and AWS CLI documentation rather than local CLI execution.
- OpenTofu still marks import-time configuration generation as experimental, so readers should expect possible formatting or behavior changes in later minor releases.
