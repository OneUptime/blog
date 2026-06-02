# Validation Summary: How to Set Up AWS Elemental MediaConnect for Video Transport

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Elemental MediaConnect
- AWS CLI
- AWS CloudFormation
- AWS Secrets Manager
- Amazon CloudWatch
- SRT, Zixi, RIST, RTP, and RTP-FEC video transport protocols

## Sources Consulted
- AWS CLI Command Reference: create-flow - https://docs.aws.amazon.com/cli/latest/reference/mediaconnect/create-flow.html
- AWS CLI Command Reference: add-flow-sources - https://docs.aws.amazon.com/cli/latest/reference/mediaconnect/add-flow-sources.html
- AWS Elemental MediaConnect User Guide: Protocols in MediaConnect - https://docs.aws.amazon.com/mediaconnect/latest/ug/protocols.html
- AWS Elemental MediaConnect User Guide: Source failover on a MediaConnect flow - https://docs.aws.amazon.com/mediaconnect/latest/ug/source-failover.html
- AWS Elemental MediaConnect User Guide: Setting up SRT password encryption - https://docs.aws.amazon.com/mediaconnect/latest/ug/encryption-srt-password-set-up.html
- AWS Elemental MediaConnect User Guide: Setting up static key encryption - https://docs.aws.amazon.com/mediaconnect/latest/ug/encryption-static-key-set-up.html
- AWS Elemental MediaConnect User Guide: Source health metrics - https://docs.aws.amazon.com/mediaconnect/latest/ug/monitor-with-cloudwatch-metrics-source-health.html
- AWS CloudFormation Template Reference: AWS::MediaConnect::Flow - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-mediaconnect-flow.html
- AWS CloudFormation Template Reference: AWS::MediaConnect::FlowSource - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-mediaconnect-flowsource.html
- AWS CloudFormation Template Reference: AWS::MediaConnect::FlowOutput - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-mediaconnect-flowoutput.html

## Issues Found
- The encryption capability list omitted AES-192 and mixed static-key encryption with SRT password encryption. Updated the wording to reflect AWS-supported AES-128, AES-192, AES-256, and SRT password encryption options.
- The SRT caller source example used `SenderIpAddress` and `SenderControlPort`. Updated it to `SourceListenerAddress` and `SourceListenerPort`, which AWS documents for SRT caller sources.
- The external SRT output example used `SmoothingLatency`, which applies to RIST, RTP, and RTP-FEC streams. Replaced it with `MinLatency`, the SRT latency field documented by AWS.
- The failover CLI example specified `RecoveryWindow` with `FAILOVER` mode. Removed it because AWS documents recovery windows for merge-style recovery rather than SRT failover mode.
- The encryption example stored the secret as a JSON object and described it as a generic encryption key. Updated it to store the raw SRT password value in Secrets Manager and added `KeyType: srt-password`.
- The CloudFormation template claimed redundant sources but defined only one source. Added an `AWS::MediaConnect::FlowSource` backup source with the required `Description` property and source failover priority.

## Review Notes
The AWS CLI binary was not installed in the local environment, so CLI validation was performed against the current official AWS CLI command reference rather than local `--help` output. The example ARNs, AWS account IDs, IP addresses, and linked OneUptime article are placeholders or site-local references and were treated as illustrative.
