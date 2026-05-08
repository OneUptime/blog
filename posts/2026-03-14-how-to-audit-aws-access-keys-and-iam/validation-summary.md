# Validation Summary: Auditing AWS Access Keys and IAM Roles in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Amazon EKS
- AWS IAM
- AWS CloudTrail
- AWS CLI
- jq
- Mermaid

## Sources Consulted
- AWS CLI Command Reference: `iam get-role` - https://docs.aws.amazon.com/cli/latest/reference/iam/get-role.html
- AWS CLI Command Reference: `iam list-access-keys` - https://docs.aws.amazon.com/cli/latest/reference/iam/list-access-keys.html
- AWS CLI Command Reference: `iam get-access-key-last-used` - https://docs.aws.amazon.com/cli/latest/reference/iam/get-access-key-last-used.html
- AWS CLI Command Reference: `iam list-attached-role-policies` - https://docs.aws.amazon.com/cli/latest/reference/iam/list-attached-role-policies.html
- AWS CloudTrail User Guide: Viewing recent management events with the AWS CLI - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-cli.html
- AWS CloudTrail User Guide: Working with CloudTrail event history - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html
- AWS CloudTrail API Reference: `LookupAttribute` - https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_LookupAttribute.html
- AWS CloudTrail API Reference: `Event` - https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_Event.html
- AWS CloudTrail User Guide: CloudTrail `userIdentity` element - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-user-identity.html
- Cilium Command Reference: `cilium status` - https://docs.cilium.io/en/latest/cmdref/cilium_status/

## Issues Found
- The CloudTrail lookup example described the results as "Cilium API calls." The command is actually reviewing AWS API events associated with the Cilium IAM role, so the comment was updated to say "AWS API calls made by the Cilium role."
- The troubleshooting note said to ensure a CloudTrail trail is enabled for the correct region. `lookup-events` queries CloudTrail Event history for recent management events, and AWS documents Event history as separate from trail configuration. The note was updated to mention the correct region, management-event scope, and the need for a trail or event data store for data events.

## Review Notes
- The AWS CLI commands use current command names and options according to the AWS CLI v2 documentation.
- `aws cloudtrail lookup-events` only returns recent events from Event history and is limited to recent management events in a single Region. A broader compliance audit may require CloudTrail Lake or a trail-backed log analysis workflow.
- The access-key example reports key creation date for age/rotation checks. To audit last use of a static key, `aws iam get-access-key-last-used` can be used with the access key ID.
