# Validation Summary: How to Set Up RDS Custom for Oracle Workloads

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Amazon RDS Custom for Oracle
- AWS CLI
- AWS IAM roles and instance profiles
- AWS KMS
- Amazon VPC security groups and DB subnet groups
- AWS Systems Manager Session Manager
- Oracle Database custom engine versions
- Amazon CloudWatch metrics

## Sources Consulted
- AWS RDS User Guide: Amazon RDS Custom: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-custom.html
- AWS RDS User Guide: Setting up your environment for Amazon RDS Custom for Oracle: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-setup-orcl.html
- AWS RDS User Guide: Creating a CEV: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-cev.create.html
- AWS RDS User Guide: Configuring a DB instance for Amazon RDS Custom for Oracle: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-creating.html
- AWS RDS User Guide: Connecting to your RDS Custom DB instance using Session Manager: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-creating.ssm.html
- AWS RDS User Guide: Customizing your RDS Custom environment: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-managing.customizing-env.html
- AWS RDS User Guide: Troubleshooting DB issues for Amazon RDS Custom for Oracle: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-troubleshooting.html
- AWS CLI Command Reference: create-custom-db-engine-version: https://docs.aws.amazon.com/cli/latest/reference/rds/create-custom-db-engine-version.html
- AWS CLI Command Reference: modify-db-instance: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- AWS managed policy reference: AmazonRDSCustomInstanceProfileRolePolicy: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonRDSCustomInstanceProfileRolePolicy.html
- AWS Prescriptive Guidance: Performance monitoring for RDS for Oracle and RDS Custom for Oracle: https://docs.aws.amazon.com/prescriptive-guidance/latest/replatform-oracle-database-options/performance-monitoring.html

## Issues Found
- The JSON trust policy snippet contained a JavaScript-style comment, which made the snippet invalid JSON. Moved the explanatory text outside the JSON block.
- The IAM role and instance profile names used `AmazonRDSCustom...`, but AWS requires the RDS Custom for Oracle instance profile name to begin with `AWSRDSCustom`. Updated the role/profile examples and the `create-db-instance` command.
- The CEV engine version example used a standard RDS minor-version-style string. Updated it to the documented CEV naming format, `19.customized_string`.
- The CEV creation time was listed as 30-60 minutes. AWS documentation says CEV creation typically takes about two hours, so the estimate was corrected.
- The RDS Custom DB instance creation command was missing `--no-auto-minor-version-upgrade`, which AWS lists as required for RDS Custom for Oracle CLI creation. Added it.
- The Session Manager example passed `DbiResourceId` directly to `aws ssm start-session`. AWS requires the EC2 instance ID, so the example now resolves the EC2 instance ID with `aws ec2 describe-instances` using the RDS resource ID tag.
- The pause and resume automation commands were reversed. Corrected pause to `--automation-mode all-paused` with a minimum 60-minute resume window, and corrected resume to `--automation-mode full`.
- The Oracle Spatial example was misleading because standard RDS for Oracle supports Spatial through the `SPATIAL` option. Replaced it with a generic additional software component example aligned with AWS RDS Custom guidance.
- The monitoring section claimed parity with standard RDS and showed an Enhanced Monitoring command. Enhanced Monitoring is not supported for RDS Custom for Oracle, so the section now describes CloudWatch metrics and host-level monitoring agents instead.
- The support perimeter section listed additional storage volumes as safe to change, but AWS support perimeter checks flag added EBS volumes. Replaced that with a safer statement about software that does not modify monitored RDS Custom resources.
- Added AWS's announced March 31, 2027 end-of-support date for RDS Custom for Oracle.

## Review Notes
The post is technically relevant and was validated after corrections. Future maintenance should revisit it before March 31, 2027 because AWS has announced end of support for RDS Custom for Oracle.
