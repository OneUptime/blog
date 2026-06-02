# Validation Summary: How to Use Kinesis Data Streams On-Demand Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Kinesis Data Streams
- AWS CLI
- Boto3 / Python
- Amazon CloudWatch metrics
- AWS CloudFormation

## Sources Consulted
- Amazon Kinesis Data Streams Developer Guide: Choose the right mode to stream in - https://docs.aws.amazon.com/streams/latest/dev/how-do-i-size-a-stream.html
- Amazon Kinesis Data Streams quotas and limits - https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
- Amazon Kinesis Data Streams FAQs - https://aws.amazon.com/kinesis/data-streams/faqs/
- AWS CLI Command Reference: kinesis create-stream - https://docs.aws.amazon.com/cli/latest/reference/kinesis/create-stream.html
- AWS CLI Command Reference: kinesis update-stream-mode - https://docs.aws.amazon.com/cli/latest/reference/kinesis/update-stream-mode.html
- AWS CLI Command Reference: kinesis wait stream-exists - https://docs.aws.amazon.com/cli/latest/reference/kinesis/wait/stream-exists.html
- Amazon Kinesis API Reference: PutRecords - https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecords.html
- AWS CloudFormation Template Reference: AWS::Kinesis::Stream StreamModeDetails - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-kinesis-stream-streammodedetails.html
- Amazon Kinesis Data Streams pricing - https://aws.amazon.com/kinesis/data-streams/pricing/

## Issues Found
- The scaling explanation said on-demand handles double the previous peak "within seconds" and listed scale-up as "2x previous peak within 15 minutes." Updated this to match AWS documentation: on-demand accommodates up to double the previous peak write throughput observed in the last 30 days, while traffic above that can be throttled for about 15 minutes.
- The key numbers omitted the write record-rate quota and incorrectly described the maximum as the same as provisioned mode. Updated the defaults to include 4,000 records per second for writes and replaced the maximum with current on-demand regional throughput limits.
- The mode-switching example immediately changed shard count after switching back to provisioned mode. Added an `aws kinesis wait stream-exists` step because AWS requires the stream to be active before modifying properties again.
- The Python example used `datetime.utcnow()`, which is deprecated in current Python versions. Replaced it with `datetime.now(timezone.utc)`.
- The `PutRecords` batch limit was listed as 5 MB per call. Updated it to 10 MiB per call, matching the current Kinesis API reference.
- The CloudWatch throttling comment said throttling "should be 0" in on-demand mode. Updated it because on-demand streams can still throttle during rapid traffic ramps or hot partition-key patterns.
- The provisioned-mode guidance said to choose provisioned if you need more than the on-demand scaling speed. Replaced this with a more accurate reason: provisioned mode gives fine-grained shard split and partition-key distribution control.
- The cost section claimed provisioned is typically 15-20% cheaper and described on-demand as scaling down by shard count. Reworded this to avoid an unsupported percentage and to reflect that on-demand Standard billing is based on data written/read plus a per-stream-hour charge.

## Review Notes
AWS CLI was not installed in the local environment, so command verification was done against the official AWS CLI command reference instead of local `--help` output. The CloudFormation `StreamModeDetails` snippet is correct for `AWS::Kinesis::Stream`.
