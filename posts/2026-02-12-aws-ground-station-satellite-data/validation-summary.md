# Validation Summary: How to Use AWS Ground Station for Satellite Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Ground Station
- AWS CLI
- Amazon EC2
- Amazon S3
- AWS Lambda
- Amazon CloudWatch
- Python
- boto3

## Sources Consulted
- AWS Ground Station User Guide - Plan your dataflow communication paths: https://docs.aws.amazon.com/ground-station/latest/ug/getting-started.step2.html
- AWS Ground Station User Guide - Use AWS Ground Station Configs: https://docs.aws.amazon.com/ground-station/latest/ug/how-it-works.config.html
- AWS Ground Station User Guide - AWS Ground Station Locations: https://docs.aws.amazon.com/ground-station/latest/ug/aws-ground-station-antenna-locations.html
- AWS Ground Station User Guide - Use the AWS Ground Station digital twin feature: https://docs.aws.amazon.com/ground-station/latest/ug/digital-twin.html
- AWS Ground Station User Guide - View metrics with Amazon CloudWatch: https://docs.aws.amazon.com/ground-station/latest/ug/monitoring.metrics.html
- AWS Ground Station pricing: https://aws.amazon.com/ground-station/pricing/
- AWS CLI Command Reference - groundstation create-dataflow-endpoint-group: https://docs.aws.amazon.com/cli/latest/reference/groundstation/create-dataflow-endpoint-group.html
- AWS CLI Command Reference - groundstation create-config: https://docs.aws.amazon.com/cli/latest/reference/groundstation/create-config.html
- AWS CLI Command Reference - groundstation create-mission-profile: https://docs.aws.amazon.com/cli/latest/reference/groundstation/create-mission-profile.html
- AWS CLI Command Reference - groundstation list-contacts: https://docs.aws.amazon.com/cli/latest/reference/groundstation/list-contacts.html
- AWS CLI Command Reference - groundstation reserve-contact: https://docs.aws.amazon.com/cli/latest/reference/groundstation/reserve-contact.html
- AWS CLI Command Reference - groundstation describe-contact: https://docs.aws.amazon.com/cli/latest/reference/groundstation/describe-contact.html
- AWS CLI Command Reference - groundstation list-satellites: https://docs.aws.amazon.com/cli/latest/reference/groundstation/list-satellites.html

## Issues Found
- The Ground Station location/Region wording was incomplete and named only a few regions. Updated it to reflect the current documented ground station locations and clarify that contacts and data delivery are configured from supported AWS Regions.
- The testing language implied generally available preconfigured public satellites. Updated it to match AWS documentation: public broadcast satellite examples such as Aqua are documented, and the digital twin feature can test scheduling/configuration without production antenna capacity or data delivery.
- The mission profile section skipped the required dataflow endpoint config. Added a `create-config` example for a `dataflowEndpointConfig` whose name matches the dataflow endpoint group endpoint.
- The `create-mission-profile` example used an invalid `dataflow-edges` shape and pointed to a dataflow endpoint group ARN. Updated it to the documented list-of-two-config-ARNs shape and UUID-style config ARNs.
- Several placeholder ARNs used nonconforming account IDs or resource names where AWS expects UUID-style resource IDs. Replaced them with syntactically valid placeholder ARNs.
- The `list-contacts` command used `--status`, but AWS CLI uses `--status-list`. Added the required `--mission-profile-arn` and `--ground-station` arguments for `AVAILABLE` contacts and corrected the query fields to `groundStation` and `maximumElevation.value`.
- The `reserve-contact` example used a non-documented ground station identifier style. Updated it to the documented ground station name format, such as `Ohio 1`.
- The first Python example imported unused `struct`. Removed it.
- The Lambda invocation example used `json.dumps` without importing `json`. Added the missing import.
- The `describe-contact` example used a non-UUID contact ID and queried the whole maximum elevation object. Updated it to a UUID-style placeholder and `maximumElevation.value`.
- The pricing section gave stale specific per-minute numbers. Replaced them with current pricing guidance based on On-Demand vs Reserved scheduling and narrowband vs wideband usage, pointing readers to AWS pricing tools for current estimates.

## Review Notes
The examples still use placeholders for satellite, config, mission profile, subnet, security group, bucket, and IAM role resources. Readers must replace those with values created during their own AWS Ground Station onboarding and configuration.
