# Validation Summary: How to Set Up AWS Storage Gateway for Hybrid Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Storage Gateway
- Amazon S3 File Gateway
- Amazon FSx File Gateway
- Volume Gateway
- Tape Gateway
- AWS CLI
- Amazon EC2
- AWS Systems Manager Parameter Store
- Amazon CloudWatch
- AWS IAM
- AWS Direct Connect

## Sources Consulted
- AWS Storage Gateway documentation overview: https://docs.aws.amazon.com/storagegateway/
- AWS Storage Gateway product documentation overview: https://aws.amazon.com/documentation-overview/storagegateway/
- Create and activate an Amazon S3 File Gateway: https://docs.aws.amazon.com/filegateway/latest/files3/create-gateway-file.html
- Deploy a customized Amazon EC2 host for S3 File Gateway: https://docs.aws.amazon.com/filegateway/latest/files3/ec2-gateway-file.html
- File Gateway setup requirements: https://docs.aws.amazon.com/filegateway/latest/files3/Requirements.html
- Getting an activation key for your gateway: https://docs.aws.amazon.com/storagegateway/latest/vgw/get-activation-key.html
- AWS Storage Gateway ActivateGateway API / CLI reference: https://docs.aws.amazon.com/botocore/latest/reference/services/storagegateway/client/activate_gateway.html
- AWS Storage Gateway AddCache API reference: https://docs.aws.amazon.com/storagegateway/latest/APIReference/API_AddCache.html
- Understanding gateway metrics: https://docs.aws.amazon.com/storagegateway/latest/tgw/MonitoringGateways-common.html
- AWS CLI update-bandwidth-rate-limit reference: https://docs.aws.amazon.com/cli/latest/reference/storagegateway/update-bandwidth-rate-limit.html
- AWS CLI update-bandwidth-rate-limit-schedule reference: https://docs.aws.amazon.com/cli/latest/reference/storagegateway/update-bandwidth-rate-limit-schedule.html
- AWS Storage Gateway UpdateMaintenanceStartTime API reference: https://docs.aws.amazon.com/storagegateway/latest/APIReference/API_UpdateMaintenanceStartTime.html

## Issues Found
- The post said there were three gateway types. AWS documentation currently describes S3 File Gateway, FSx File Gateway, Volume Gateway, and Tape Gateway, with FSx File Gateway limited to existing customers. Updated the gateway type list and activation type list.
- The setup section implied `list-gateways` listed gateway types and that a gateway resource could be created before activation. Updated the wording and comment to reflect that activation creates the gateway resource, while `list-gateways` lists existing gateways.
- The IAM role was described as a gateway role. Updated the wording to clarify that it is an IAM role prepared for S3 file shares.
- The EC2 deployment example used a fake static AMI ID. Updated it to query the current S3 File Gateway AMI ID from the AWS Systems Manager public parameter `/aws/service/storagegateway/ami/FILE_S3/latest`.
- The VM configuration step said to set the gateway time zone to UTC. AWS activation accepts gateway time zones such as `GMT`, and the important requirement is accurate time synchronization, so the wording was corrected.
- The local disk section said S3 File Gateway uses disks for cache and upload buffering. AWS File Gateway setup requires cache disks; upload buffer assignment is relevant to other gateway types. Updated the text for the S3 File Gateway path shown in the article.
- The CloudWatch example monitored `UploadBufferPercentUsed`, which is not the best fit for the S3 File Gateway flow in this post. Replaced it with `CachePercentDirty`, which monitors dirty cache waiting to be uploaded to S3.
- The bandwidth throttling example used `update-bandwidth-rate-limit` with both upload and download limits. AWS documents that operation as unsupported for S3 File Gateway and directs S3 File Gateway users to `UpdateBandwidthRateLimitSchedule`; S3 File Gateway supports upload limits only. Updated the command and explanation accordingly.

## Review Notes
- The AWS CLI was not installed in the local environment, so command verification was performed against official AWS CLI and API documentation rather than local `aws --help` output.
- Some placeholder values remain in example commands, such as security group IDs, subnet IDs, key pair names, gateway ARNs, disk IDs, activation keys, and SNS topic ARNs. These are expected placeholders for a tutorial and must be replaced by readers.
