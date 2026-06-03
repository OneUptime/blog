# Validation Summary: How to Use Boto3 Resource vs Client Interface

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS SDK for Python (Boto3)
- Botocore clients and paginators
- Boto3 resource interface and resource collections
- Amazon S3
- Amazon EC2

## Sources Consulted
- Boto3 low-level clients guide: https://docs.aws.amazon.com/boto3/latest/guide/clients.html
- Boto3 resources guide: https://docs.aws.amazon.com/boto3/latest/guide/resources.html
- Boto3 collections guide/reference: https://docs.aws.amazon.com/boto3/latest/guide/collections.html and https://docs.aws.amazon.com/boto3/latest/reference/core/collections.html
- Boto3 paginators guide: https://docs.aws.amazon.com/boto3/latest/guide/paginators.html
- Boto3 session reference for `get_available_resources()`: https://docs.aws.amazon.com/boto3/latest/reference/core/session.html
- Boto3 S3 Bucket resource reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/bucket/
- Boto3 S3 upload guide: https://docs.aws.amazon.com/boto3/latest/guide/s3-uploading-files.html
- Boto3 S3 `get_object` / object action references: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/get_object.html
- Boto3 EC2 service resource `create_instances` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/service-resource/create_instances.html
- Boto3 EC2 instance waiter reference: https://boto3.amazonaws.com/v1/documentation/api/1.35.6/reference/services/ec2/instance/wait_until_running.html

## Issues Found
- The introduction said clients and resources both let you accomplish the same tasks. That was too broad because Boto3 clients support all service operations while resource support is limited and no new resource features are planned. I changed it to say this applies where both interfaces are available.
- The resource explanation and quick reference implied resource responses are always objects. Boto3 resource actions can return low-level dictionaries, such as `S3.Object.get()`, so I clarified that resources are object-oriented but some action responses may still be dictionaries.

## Review Notes
The Python code blocks were checked with `ast.parse()` and are syntactically valid. Current Boto3 1.43.21 reports nine available resource services: CloudFormation, CloudWatch, DynamoDB, EC2, Glacier, IAM, S3, SNS, and SQS, matching the post's resource coverage discussion. The placeholder AMI ID and bucket names are illustrative and would need valid account/region-specific values to run.
