# Validation Summary: How to Configure AWS Private 5G Network

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Private 5G
- AWS CLI
- Amazon VPC networking
- Amazon CloudWatch
- CBRS / SAS radio registration
- SIM and device identifier management

## Sources Consulted
- AWS CLI Command Reference: `privatenetworks` service and available commands: https://awscli.amazonaws.com/v2/documentation/api/2.18.18/reference/privatenetworks/index.html
- AWS CLI Command Reference: `create-network`: https://awscli.amazonaws.com/v2/documentation/api/2.18.18/reference/privatenetworks/create-network.html
- AWS CLI Command Reference: `create-network-site`: https://awscli.amazonaws.com/v2/documentation/api/2.9.6/reference/privatenetworks/create-network-site.html
- AWS CLI Command Reference: `update-network-site-plan`: https://awscli.amazonaws.com/v2/documentation/api/2.18.18/reference/privatenetworks/update-network-site-plan.html
- AWS CLI Command Reference: `configure-access-point`: https://awscli.amazonaws.com/v2/documentation/api/2.18.18/reference/privatenetworks/configure-access-point.html
- AWS CLI Command Reference: `activate-device-identifier` and `deactivate-device-identifier`: https://awscli.amazonaws.com/v2/documentation/api/2.18.18/reference/privatenetworks/activate-device-identifier.html
- AWS CLI Command Reference: `list-network-resources` and `get-network-resource`: https://awscli.amazonaws.com/v2/documentation/api/2.9.6/reference/privatenetworks/list-network-resources.html
- AWS Private 5G documentation overview: https://aws.amazon.com/cn/documentation-overview/private5g/
- AWS Private 5G general availability announcement: https://aws.amazon.com/about-aws/whats-new/2022/08/aws-private-5g-now-generally-available/
- AWS Private 5G commitment pricing announcement: https://aws.amazon.com/about-aws/whats-new/2023/06/commitment-pricing-aws-private-5g/

## Issues Found
- The AWS CLI service name was incorrect. Changed `aws private-networks ...` to the documented `aws privatenetworks ...` service namespace.
- The `create-network --tags` example used EC2-style tag syntax. Changed it to the documented map syntax, `Location=WarehouseA,Purpose=IoT`.
- The network plan example reused `create-network-site` and used uppercase JSON field names. Changed it to `update-network-site-plan` with lower camel case fields matching the CLI schema.
- The post described a `subnet` option in the Private 5G site plan and implied AWS Private 5G devices automatically appear as a normal VPC subnet. Removed that unsupported configuration and clarified that routing and security controls must be configured appropriately.
- The radio deployment section implied listing resources activates radios and used an unsupported `TYPE` filter for `list-network-resources`. Removed the invalid filter and added the documented `configure-access-point` flow for CPI/SAS registration.
- The SIM management commands used the wrong CLI service name. Updated them to `aws privatenetworks` and clarified that device identifiers include IMSI and ICCID.
- The CloudWatch alarm examples used unverified metric names and dimensions. Replaced them with `aws cloudwatch list-metrics --namespace "AWS/Private5G"` and described metrics only at the level documented by AWS.
- The coverage planning section presented precise square-foot and radius estimates without an official source. Reworked it to recommend site-survey-based planning.
- The cost model incorrectly listed a per-connected-device fee. Changed it to the documented hourly radio-unit commitment model with no per-device fees.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI command reference and AWS service documentation rather than local `aws help` output.
