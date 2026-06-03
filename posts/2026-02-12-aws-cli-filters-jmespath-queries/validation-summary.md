# Validation Summary: How to Use AWS CLI Filters and JMESPath Queries

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- AWS CLI
- AWS EC2 CLI commands and filters
- AWS RDS CLI commands and filters
- AWS S3 API CLI commands
- JMESPath query expressions
- Shell pipelines for CLI output processing

## Sources Consulted
- AWS CLI User Guide: Filtering output in the AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html
- AWS CLI Command Reference: ec2 describe-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS EC2 API Reference: Filter: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_Filter.html
- AWS CLI Command Reference: ec2 describe-security-groups: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html
- AWS CLI Command Reference: ec2 describe-volumes: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-volumes.html
- AWS CLI Command Reference: rds describe-db-instances: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- AWS CLI Command Reference: s3api list-buckets: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-buckets.html
- JMESPath Specification: https://jmespath.org/specification.html
- JMESPath JavaScript implementation used for local expression sanity checks: https://www.npmjs.com/package/jmespath

## Issues Found
- The post stated that S3 buckets do not support server-side filters. Current `aws s3api list-buckets` does not use the generic `--filters` option, but it does support API-side narrowing with `--prefix` and `--bucket-region`. Updated the comment to distinguish `--filters` from S3's supported parameters.
- The "Instances launched in the last 24 hours" example used a fixed date that is no longer "last 24 hours" after the post date. Changed the comment to "on or after a cutoff date" and added a final flatten projection so EC2 reservation grouping does not produce nested arrays.
- The flattening section used `Reservations[].Instances[].InstanceId` as the "without flattening" example even though `[]` is already a flatten projection. Updated the non-flattened example to use `[*]` and the flattened example to use `[]`.

## Review Notes
AWS CLI was not installed in the local workspace, so command behavior was verified against official AWS CLI documentation and local JMESPath expression evaluation. The article's remaining examples use current AWS CLI options and standard JMESPath syntax. Readers on non-Unix shells may need quoting adjustments, which AWS also documents for CLI examples.
