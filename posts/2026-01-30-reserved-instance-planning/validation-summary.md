# Validation Summary: How to Build Reserved Instance Planning

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- AWS EC2 Reserved Instances (Standard, Convertible)
- AWS Cost Explorer API (`boto3` `ce` client)
- AWS EC2 API (`boto3` `ec2` client)
- Python 3 (with `dataclasses`, `typing`, `collections.defaultdict`)
- Mermaid diagrams (graph, flowchart, pie)
- AWS Savings Plans (mentioned as alternative)

## Sources Consulted
- boto3 Cost Explorer `get_reservation_purchase_recommendation` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_reservation_purchase_recommendation.html
- boto3 Cost Explorer `get_reservation_coverage` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_reservation_coverage.html
- boto3 EC2 `describe_reserved_instances` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_reserved_instances.html
- AWS EC2 Reserved Instances User Guide: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html
- AWS re:Post — Scheduled Reserved Instances availability: https://repost.aws/questions/QU1SW0OmzqT1qYdRzXtyDc-Q/are-scheduled-reserve-instances-available
- AWS EC2 on-demand pricing (us-east-1 Linux): https://aws.amazon.com/ec2/pricing/on-demand/

## Issues Found

1. **Invalid AWS Cost Explorer API field name `CurrentOnDemandSpend`.** In `parse_ri_recommendations`, the code referenced `detail.get('CurrentOnDemandSpend', 0)`, but no such field exists in the `RecommendationDetail` response. The correct field is `EstimatedMonthlyOnDemandCost`. Because `.get()` was used with a default of `0`, the bug would silently produce zeros rather than raising. Fixed to use the correct field name.

2. **Scheduled Reserved Instances are deprecated.** The initial mermaid decision diagram included a "Scheduled RI → Up to 10% Savings" branch. AWS discontinued new Scheduled RI purchases on October 31, 2021, and has stated it will not be restored; AWS now directs customers toward Savings Plans and On-Demand Capacity Reservations for recurring/scheduled workloads. Updated the diagram branch to point recurring-schedule workloads at "Savings Plans / On-Demand Capacity Reservations" with "Varies by Commitment" savings to avoid steering readers toward an unavailable purchase option.

## Review Notes

- The advertised "Up to 72%" Standard RI and "Up to 66%" Convertible RI discount ceilings remain accurate per AWS public messaging.
- Spot-check of approximate hourly on-demand rates used in the code (m5.large $0.096, m5.xlarge $0.192, m5.2xlarge $0.384, c5.large $0.085, c5.xlarge $0.170, r5.large $0.126, r5.xlarge $0.252) matches current us-east-1 Linux on-demand pricing.
- API parameter values for `LookbackPeriodInDays` (`SEVEN_DAYS`/`THIRTY_DAYS`/`SIXTY_DAYS`), `TermInYears` (`ONE_YEAR`/`THREE_YEARS`), and `PaymentOption` (`NO_UPFRONT`/`PARTIAL_UPFRONT`/`ALL_UPFRONT`) are correct.
- `describe_reserved_instances` Filter (`state` = `active`) and the response fields used (`ReservedInstancesId`, `InstanceType`, `InstanceCount`, `AvailabilityZone`, `Scope`, `OfferingType`, `Start`/`End`, `FixedPrice`, `UsagePrice`, `State`) are valid.
- The `expected_utilization` key in `parse_ri_recommendations` is mapped from `EstimatedMonthlySavingsPercentage`, which is semantically misleading (savings %, not utilization), but the value is unused downstream so it is not a functional defect. Left as-is to respect the "only change what is technically wrong" guidance.
- The `pandas` import in Step 3 is unused (minor cleanup opportunity, not a correctness issue).
- The post is positioned as a generic RI guide; readers should be aware that for many workloads AWS Savings Plans (also mentioned in "Common Pitfalls") often provide comparable savings with greater flexibility. The post calls this out at a high level.
