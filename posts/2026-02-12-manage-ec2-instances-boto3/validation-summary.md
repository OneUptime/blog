# Validation Summary: How to Manage EC2 Instances with Boto3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS EC2
- Boto3
- Python
- Amazon CloudWatch
- EC2 user data

## Sources Consulted
- Boto3 EC2 `create_instances` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/service-resource/create_instances.html
- Boto3 EC2 `stop_instances` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/stop_instances.html
- Boto3 EC2 `start_instances` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/start_instances.html
- Boto3 EC2 `InstanceStopped` waiter documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/waiter/InstanceStopped.html
- Boto3 EC2 `modify_instance_attribute` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/modify_instance_attribute.html
- Boto3 EC2 `Instance.create_image` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/instance/create_image.html
- Boto3 EC2 `Image.wait_until_exists` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/image/wait_until_exists.html
- Boto3 CloudWatch `get_metric_statistics` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/get_metric_statistics.html
- Amazon EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html

## Issues Found
- The bulk operations example stopped instances and then immediately called `start_instances` on the same instance IDs. Since `start_instances` starts instances that have already reached the stopped state, I added an `instance_stopped` waiter between the stop and start calls.
- The user data example imported `base64` but did not use it. Boto3 accepts `UserData` as a string for instance launch, so I removed the unused import to avoid implying manual encoding is required in that sample.

## Review Notes
The examples are syntactically valid Python and use current Boto3 APIs. The AMI example waits for `Image.wait_until_exists` with a `state=available` filter, which is a valid way to wait until the created AMI is returned as available. In production code, these examples should also add explicit region/profile configuration, IAM permission notes, and structured error handling.
