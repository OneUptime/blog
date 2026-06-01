# Validation Summary: How to Use AWS Snowcone for Edge Computing and Data Transfer

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Snowcone
- AWS Snowball Edge client
- AWS Snow Family job management API and AWS CLI
- Amazon S3 compatible storage on Snow devices
- Amazon EC2-compatible instances on Snowcone
- AWS DataSync
- Network File System (NFS)
- AWS IoT Greengrass
- Bash scripting and cron-style automation

## Sources Consulted
- AWS Snowball Edge Developer Guide - document history and availability notice: https://docs.aws.amazon.com/snowball/latest/developer-guide/doc-history.html
- AWS CLI Command Reference - `aws snowball create-job`: https://docs.aws.amazon.com/cli/latest/reference/snowball/create-job.html
- AWS Snowcone documentation overview: https://aws.amazon.com/documentation-overview/snowcone/
- AWS announcement - AWS Snowcone SSD: https://aws.amazon.com/about-aws/whats-new/2021/09/aws-announces-aws-snowcone-ssd/
- AWS Storage Blog - Building an IoT solution at the edge with AWS Snowcone: https://aws.amazon.com/blogs/storage/building-an-iot-solution-at-the-edge-with-aws-snowcone/
- AWS Snowball Edge Developer Guide - Snowball Edge client commands: https://docs.aws.amazon.com/snowball/latest/developer-guide/using-client-commands.html
- AWS Snowball Edge Developer Guide - EC2-compatible endpoint commands: https://docs.aws.amazon.com/snowball/latest/developer-guide/using-ec2-endpoint.html
- AWS DataSync User Guide - activating a DataSync agent: https://docs.aws.amazon.com/datasync/latest/userguide/activate-agent.html
- AWS DataSync User Guide - configuring NFS locations: https://docs.aws.amazon.com/datasync/latest/userguide/create-nfs-location.html
- AWS Snowball Edge Developer Guide - powering off a Snowball Edge device: https://docs.aws.amazon.com/snowball/latest/developer-guide/turnitoff.html
- AWS Snowball pricing: https://aws.amazon.com/snowball/pricing/

## Issues Found
- Corrected Snowcone capacity. The post stated Snowcone has 14 TB generally; AWS documents Snowcone HDD as 8 TB usable and Snowcone SSD as 14 TB usable.
- Added the current availability caveat. AWS Snowball Edge devices are only available to existing customers as of November 7, 2025, so the ordering instructions needed that qualification.
- Fixed the Snow Family address ID example format by removing the extra hyphen after `ADID`, matching the AWS CLI documented pattern.
- Removed an unnecessary `KeyRange` object from an import job example. AWS documents key ranges as an export-job concept.
- Corrected Snowcone power guidance. Snowcone uses a compatible 45W+ USB-C power adapter or battery; the original text implied an included adapter.
- Clarified networking. Snowcone supports 1/10 GbE RJ45, and Wi-Fi depends on device configuration.
- Added a CA bundle setting for the local S3 endpoint because AWS Snow device S3 endpoints use device certificates.
- Replaced `snowballEdge describe-device` as the AMI listing command with `aws ec2 describe-images` against the EC2-compatible endpoint.
- Corrected the EC2-compatible endpoint examples to use the documented Snowcone-style `http://<device-ip>:8008` endpoint.
- Added the missing `snc1.medium` Snowcone instance type.
- Removed the incorrect `snowballEdge start-service datasync` command. DataSync agent activation should use an activation key and `aws datasync create-agent`.
- Replaced `snowballEdge stop-service s3` as a power-off step. The S3 adapter cannot be stopped with that command, and powering off is done with the device power button or AWS OpsHub.
- Updated the NFS stop-service example to use the documented `--service-id fileinterface` form.
- Fixed the example job ID format in the `describe-job` command.
- Replaced outdated Snowcone pricing numbers with a current-pricing caveat, since AWS Snow pricing and shipping terms have changed and vary by Region and plan.

## Review Notes
Snowcone and older Snow Family workflows are legacy for new customers, but the post remains technically useful for existing customers with access to Snowcone jobs. Future updates should consider adding a short alternative-path note for new customers using AWS DataSync, AWS Data Transfer Terminal, AWS Partner solutions, or AWS Outposts.
