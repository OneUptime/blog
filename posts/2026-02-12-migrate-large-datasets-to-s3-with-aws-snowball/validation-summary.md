# Validation Summary: How to Migrate Large Datasets to S3 with AWS Snowball

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Snowball Edge
- Amazon S3
- AWS Snow Family Job Management API
- Boto3
- AWS CLI
- AWS OpsHub
- AWS DataSync
- AWS Data Transfer Terminal

## Sources Consulted
- AWS Snowball Edge availability change: https://docs.aws.amazon.com/snowball/latest/developer-guide/snowball-edge-availability-change.html
- AWS Snowball Edge device hardware information: https://docs.aws.amazon.com/snowball/latest/developer-guide/device-differences.html
- AWS Snowball Edge API Reference, CreateJob: https://docs.aws.amazon.com/snowball/latest/api-reference/API_CreateJob.html
- Boto3 Snowball create_job reference: https://docs.aws.amazon.com/boto3/latest/reference/services/snowball/client/create_job.html
- Boto3 Snowball create_cluster reference: https://docs.aws.amazon.com/boto3/latest/reference/services/snowball/client/create_cluster.html
- Unlocking the Snowball Edge: https://docs.aws.amazon.com/snowball/latest/developer-guide/unlockdevice.html
- Configuring and using the Snowball Edge Client: https://docs.aws.amazon.com/snowball/latest/developer-guide/using-client-commands.html
- Transferring files using the Amazon S3 adapter: https://docs.aws.amazon.com/snowball/latest/developer-guide/using-adapter.html
- Supported AWS CLI commands for Snowball Edge data transfer: https://docs.aws.amazon.com/snowball/latest/developer-guide/using-adapter-cli.html
- Powering off the Snowball Edge: https://docs.aws.amazon.com/snowball/latest/developer-guide/turnitoff.html
- AWS Snowball pricing: https://aws.amazon.com/snowball/pricing/
- AWS Data Transfer Terminal User Guide: https://docs.aws.amazon.com/datatransferterminal/latest/userguide/what-is-dtt.html

## Issues Found
- AWS Snowball Edge availability had become outdated. Added that Snowball Edge is no longer available to new customers and pointed new customers to DataSync, Data Transfer Terminal, or AWS Partner solutions.
- The sizing guidance referenced the original standard Snowball 80 TB device and Snowmobile. Updated the decision guidance to use Snowball Edge Storage Optimized 210 TB for eligible existing customers and multiple import jobs for larger migrations.
- The Boto3 `create_job` example used stale device fields (`STANDARD`, `T80`) and invalid-looking sample IDs. Updated it to `SnowballType='V3_5S'`, `SnowballCapacityPreference='T240'`, a valid-shaped address ID, and 12-digit account ARNs.
- The job state notification list used `AtAWS`, which is not a valid Snowball job state. Replaced it with `WithAWS`.
- The provisioning timeline said 3-5 business days. Updated it to note that Snowball Edge provisioning can take up to 4 weeks.
- The setup text overstated provided network cabling and omitted current network options. Updated it to describe supported 10GbE RJ45, 25GbE SFP28, and 100GbE QSFP28 interfaces.
- The unlock and status commands used obsolete/non-current `snowball` commands. Replaced them with Snowball Edge Client `snowballEdge unlock-device` and `snowballEdge describe-device` examples.
- The transfer section showed `snowball cp` commands that are not the current documented Snowball Edge workflow. Replaced that subsection with AWS OpsHub guidance and kept S3 Adapter/AWS CLI commands for large transfers.
- The S3 Adapter examples did not show how to retrieve local S3 credentials and omitted the `snow` region. Added Snowball Edge Client credential commands and `--region snow` to AWS CLI examples.
- The return-shipping section used an invalid `snowball stop` command. Replaced it with current guidance to stop transfers and power off the device with AWS OpsHub or the power button before using the E Ink return label.
- The multiple-device section incorrectly used `create_cluster` for an S3 import migration. Updated it to recommend multiple import jobs and changed the code example to `create_job`.
- The cost section said the first 10 on-site days were included and that S3 import was simply free. Updated it to the current 15-day on-site language and clarified that S3 ingress has no data transfer fee but standard S3 storage and request charges still apply.

## Review Notes
AWS documentation still contains legacy S3 Adapter examples using `--endpoint`; the post follows that Snowball Edge documentation. For new AWS customers, this tutorial should be treated as historical or applicable only when an account is already eligible to order Snowball Edge.
