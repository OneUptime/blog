# Validation Summary: How to Calculate Real Spot Savings After Restarts and Transfer Costs

## Status

validated

## Post Type

Guide

## Technologies Covered

- EC2 Spot and On-Demand cost accounting
- Amazon S3 and VPC transfer costs
- AWS Savings Plans
- Python

## Sources Consulted

- [Interrupted Spot billing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/billing-for-interrupted-spot-instances.html)
- [EC2 On-Demand pricing](https://aws.amazon.com/ec2/pricing/on-demand/)
- [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/)
- [Amazon VPC pricing](https://aws.amazon.com/vpc/pricing/)
- [Savings Plans and Reserved Instances exclusions](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html)

## Issues Found

No technical issues found.

## Review Notes

- Verified that billing depends on interruption origin and operating system, retained EBS incurs charges, and NAT processing can remain chargeable on a same-Region S3 path. Savings Plans exclude Spot usage.
- Ran the Python example: baseline $120.00, Spot strategy $89.80, savings 25.2%, and remaining overhead margin $30.20.
- Rates are expressly fictional; this review validates arithmetic and accounting scope, not a current price quote or a particular AWS bill.
