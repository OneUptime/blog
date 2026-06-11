# Validation Summary: How to Create Orphan Resource Detection

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- AWS EC2 (EBS Volumes, Elastic IPs, Snapshots)
- AWS CLI v2
- boto3 (Python AWS SDK)
- AWS Lambda
- Amazon S3
- Amazon SNS
- Google Cloud (gcloud CLI: compute disks, addresses, snapshots)
- Microsoft Azure (az CLI: disk, network public-ip, snapshot)
- Mermaid diagrams (flowchart, xychart-beta)
- Terraform / Pulumi (referenced as IaC tools)
- CloudTrail
- JMESPath query syntax

## Sources Consulted
- AWS EC2 boto3 documentation (describe_volumes, describe_addresses, describe_snapshots, get_paginator) — https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2.html
- AWS CLI describe-volumes / describe-addresses reference — https://docs.aws.amazon.com/cli/latest/reference/ec2/
- AWS public IPv4 address charge announcement (Feb 1, 2024) — https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/
- AWS EBS pricing — https://aws.amazon.com/ebs/pricing/
- AWS EBS snapshot pricing — https://aws.amazon.com/ebs/snapshots/
- gcloud compute disks/addresses/snapshots filter reference — https://cloud.google.com/sdk/gcloud/reference/compute/
- Azure CLI az disk / az network public-ip / az snapshot reference — https://learn.microsoft.com/en-us/cli/azure/
- Python dataclasses documentation — https://docs.python.org/3/library/dataclasses.html
- JMESPath specification — https://jmespath.org/specification.html

## Issues Found
- **EIP pricing claim was outdated.** The original text stated "Elastic IPs cost nothing when attached to a running instance. The moment they become unattached, AWS charges you." Since February 1, 2024, AWS charges $0.005/hour for ALL public IPv4 addresses, including those attached to running EC2 instances. Updated the paragraph to reflect that all public IPv4 addresses are billed, and that unattached EIPs remain pure waste because they route nowhere. The downstream cost calculation ($0.005/hour ≈ $3.60/month per unattached EIP) is correct and was left intact.

## Review Notes
- The EBS pricing table in the Python script is labeled as "rough figures, varies by region" — this disclaimer covers minor drift (e.g., sc1 has dropped to ~$0.015/GB-month in some regions vs. the $0.025 listed). Acceptable as an estimate; no change made.
- The AWS CLI JMESPath query `Addresses[?AssociationId==\`null\`]` works correctly for unassociated EIPs because the API includes `AssociationId` only when the address is associated; in some boto3 responses the field may simply be absent rather than null. The companion Python script correctly uses `'AssociationId' not in address`.
- The io1/io2 cost rate in the script only accounts for storage ($0.125/GB-month) and not the provisioned IOPS charge, which is correctly noted as a rough estimate.
- The gcloud filter `--filter="NOT users:*"` correctly identifies disks with no attached users (instances). The `creationTimestamp` and `timeCreated` date comparisons use a hardcoded 2024-01-01 cutoff that readers should adjust for their context.
- The Lambda example schedules from "CloudWatch Events" — modern AWS terminology is "EventBridge Scheduler" or "EventBridge Rules," but CloudWatch Events still works and is widely recognized.
- The post correctly uses `timezone.utc`-aware datetimes when comparing to boto3's tz-aware `CreateTime`/`StartTime` fields, avoiding the common naive-datetime comparison bug.
