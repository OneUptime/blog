# Validation Summary: How to Use CloudWatch Cross-Account Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch dashboards
- CloudWatch cross-account observability
- Observability Access Manager (OAM)
- AWS CLI
- AWS CloudFormation
- AWS Organizations
- CloudWatch SEARCH expressions
- CloudWatch alarm status widgets

## Sources Consulted
- AWS CloudWatch User Guide: CloudWatch cross-account observability - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html
- AWS CloudWatch User Guide: Link monitoring accounts with source accounts - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account-Setup.html
- AWS CLI Command Reference: oam create-link - https://docs.aws.amazon.com/cli/latest/reference/oam/create-link.html
- AWS CLI Command Reference: oam put-sink-policy - https://docs.aws.amazon.com/cli/latest/reference/oam/put-sink-policy.html
- AWS CLI Command Reference: oam list-attached-links - https://docs.aws.amazon.com/cli/latest/reference/oam/list-attached-links.html
- AWS OAM API Reference: CreateSink - https://docs.aws.amazon.com/OAM/latest/APIReference/API_CreateSink.html
- AWS CloudWatch User Guide: Using Amazon CloudWatch dashboards - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html
- AWS CloudWatch User Guide: Dashboard body structure and syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- AWS CloudWatch User Guide: CloudWatch search expression syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/search-expression-syntax.html

## Issues Found
- The original setup created an OAM sink but did not attach a sink policy. AWS requires a sink policy that permits the source account or organization before `create-link` can succeed. Added an `aws oam put-sink-policy` example and noted that the link resource types must be allowed by the sink policy.
- The source-account link example used `AccountName` as a literal label template. AWS documents `$AccountName` as the account-name variable, so the command now uses `--label-template '$AccountName'`.
- The post said links may need to be manually accepted in the monitoring account. OAM does not have a separate manual accept step; source accounts create links when the sink policy permits them. Replaced that step with verification using `aws oam list-attached-links`.
- The troubleshooting section referred to a pending/active link state. Replaced it with a concrete check that the link exists in the source account and appears in `list-attached-links` for the monitoring account sink.
- JSON examples contained JavaScript-style comments while using `json` fences. Removed the comments so the snippets are valid JSON.

## Review Notes
The post is technically relevant and remains current for CloudWatch cross-account observability as documented by AWS. The examples use placeholder account IDs, sink ARNs, organization IDs, and resource names that must be replaced before use.
