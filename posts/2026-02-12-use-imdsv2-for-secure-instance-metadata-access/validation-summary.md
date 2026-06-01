# Validation Summary: How to Use IMDSv2 for Secure Instance Metadata Access

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- AWS EC2 Instance Metadata Service (IMDS and IMDSv2)
- AWS CLI for EC2 and CloudWatch
- EC2 instance metadata options, launch templates, and account-level metadata defaults
- IAM/SCP condition keys for EC2 metadata settings
- CloudWatch EC2 metrics and alarms
- Shell scripting with curl
- Python requests and boto3
- Docker/container networking considerations on EC2

## Sources Consulted
- Amazon EC2 User Guide: Use the Instance Metadata Service to access instance metadata - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- Amazon EC2 User Guide: Configure the Instance Metadata Service options - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html
- Amazon EC2 User Guide: Configure instance metadata options for new instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-new-instances.html
- Amazon EC2 User Guide: Modify instance metadata options for existing instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-existing-instances.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: modify-instance-metadata-options - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-metadata-options.html
- AWS CLI Command Reference: modify-instance-metadata-defaults - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-metadata-defaults.html
- AWS CLI Command Reference: describe-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS SDKs and Tools Reference Guide: IMDS credential provider - https://docs.aws.amazon.com/sdkref/latest/guide/feature-imds-credentials.html
- Amazon EC2 User Guide: CloudWatch metrics that are available for your instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- IAM Service Authorization Reference: Actions, resources, and condition keys for Amazon EC2 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html

## Issues Found
- The post described the IMDSv2 hop limit as applying to the PUT request itself. AWS documents this as the hop limit/time-to-live for the response to PUT requests. Updated the wording in the IMDSv2 explanation and container section.
- The container guidance said the default hop limit prevents containers from reaching the metadata service for the token request. The more accurate behavior is that containers can fail to receive the token response through the Docker bridge network. Updated the wording while preserving the same recommendation.
- The AWS SDK section stated that SDKs automatically use IMDSv2 with no caveat. AWS documents that supported SDKs use IMDSv2 by default for IMDS credentials, but some SDKs can fall back to IMDSv1 for certain non-retryable failures unless fallback is disabled or IMDSv2 is required on the instance. Added that caveat.
- The CloudWatch alarm example omitted an `InstanceId` dimension. Since `MetadataNoToken` is an EC2 instance metric and per-instance alarms are the most direct way to detect usage, added an example `--dimensions Name=InstanceId,Value=i-0123456789abcdef0`.

## Review Notes
The main AWS CLI commands, metadata option names, JMESPath queries, IAM condition key, IMDSv2 curl flow, Python requests example, and CloudWatch `MetadataNoToken` audit command were consistent with current AWS documentation. The AWS CLI was not installed in the local workspace, so CLI syntax was verified against AWS's official command reference rather than local `--help` output.
