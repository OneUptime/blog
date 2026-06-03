# Validation Summary: How to Use Boto3 Waiters for Async Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS
- Boto3
- Botocore
- Python
- Amazon EC2
- Amazon S3
- AWS CloudFormation
- Amazon RDS

## Sources Consulted
- Boto3 low-level clients and waiters guide: https://docs.aws.amazon.com/boto3/latest/guide/clients.html#waiters
- Boto3 EC2 InstanceRunning waiter documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/waiter/InstanceRunning.html
- Boto3 S3 BucketExists waiter documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/waiter/BucketExists.html
- Boto3 S3 create_bucket documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/create_bucket.html
- Boto3 CloudFormation StackCreateComplete waiter documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudformation/waiter/StackCreateComplete.html
- Boto3 RDS service waiter reference: https://docs.aws.amazon.com/boto3/latest/reference/services/rds.html
- OneUptime companion post link: https://oneuptime.com/blog/post/2026-02-12-boto3-errors-and-exceptions/view

## Issues Found
- The S3 bucket creation example used `CreateBucketConfiguration={'LocationConstraint': 'us-west-2'}` with a default S3 client. I changed the client to `boto3.client('s3', region_name='us-west-2')` so the example's endpoint region matches the bucket location constraint.
- The waiter configuration example imported `botocore.config.Config` but did not use it. I removed the unused import to keep the code example clean and executable as shown.
- The custom CloudFormation waiter used `import botocore.waiter` and then caught `botocore.exceptions.WaiterError`. I changed the example to import `WaiterError`, `WaiterModel`, and `create_waiter_with_client` explicitly, matching the APIs used in the snippet.
- The custom CloudFormation waiter treated `ROLLBACK_COMPLETE` as a failure but omitted `ROLLBACK_FAILED`. I added `ROLLBACK_FAILED` as a failure acceptor so failed stack creation does not wait until timeout in that state.

## Review Notes
The CloudFormation example demonstrates custom waiter construction, but CloudFormation already provides a built-in `stack_create_complete` waiter. The example is still technically valid as a custom waiter demonstration.
