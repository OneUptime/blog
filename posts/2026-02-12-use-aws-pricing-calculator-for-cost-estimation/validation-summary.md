# Validation Summary: How to Use AWS Pricing Calculator for Cost Estimation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Pricing Calculator
- AWS Price List API
- AWS CLI
- Amazon EC2
- Amazon EBS
- Amazon RDS
- Amazon S3
- AWS Lambda
- Python

## Sources Consulted
- AWS Pricing Calculator documentation: https://docs.aws.amazon.com/pricing-calculator/
- AWS Pricing Calculator getting started guide: https://docs.aws.amazon.com/pricing-calculator/latest/userguide/getting-started.html
- AWS Price List API documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/price-changes.html
- AWS CLI v2 `pricing describe-services` command reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/pricing/describe-services.html
- AWS CLI v2 `pricing get-products` command reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/pricing/get-products.html
- Amazon EC2 On-Demand pricing: https://aws.amazon.com/ec2/pricing/on-demand/
- Amazon VPC pricing for public IPv4 addresses: https://aws.amazon.com/vpc/pricing/
- Amazon EBS pricing: https://aws.amazon.com/ebs/pricing/
- Amazon RDS pricing: https://aws.amazon.com/rds/pricing/
- Amazon RDS for PostgreSQL pricing details: https://aws.amazon.com/rds/postgresql/pricing/
- Amazon RDS storage documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/
- AWS Lambda pricing: https://aws.amazon.com/lambda/pricing/

## Issues Found
- The EC2 checklist said Elastic IPs are free when attached and cost `$3.60/month` when not attached. AWS now charges for in-use and idle public IPv4 addresses, including Elastic IPs. Updated the checklist to say public IPv4 addresses are charged whether in use or idle.
- The EC2, RDS, and S3 data-transfer examples used a first `1GB` free allowance. AWS currently documents `100 GB` of free data transfer out to the internet each month, aggregated across AWS services and Regions except China and GovCloud. Updated the examples to use `100GB`.
- The RDS estimator used `0.08` per GB-month for gp3 storage. Current RDS gp3 storage pricing in US East (N. Virginia) is `0.115` per GB-month for Single-AZ MySQL/PostgreSQL-style DB instances, with Multi-AZ one-standby deployments effectively doubling storage cost. Updated the gp3 rate and fallback storage rate to `0.115`.
- The RDS estimator mentioned io2 in prose but did not include an `io2` storage-rate entry. Added `io2` at the same `0.125` per GB-month storage rate used for provisioned io2 storage in the checked region.
- The S3 estimator used `GLACIER` at `0.004` per GB-month, which matches S3 Glacier Instant Retrieval rather than S3 Glacier Flexible Retrieval. Renamed the entry to `GLACIER_INSTANT_RETRIEVAL` and added `GLACIER_FLEXIBLE_RETRIEVAL` at `0.0036`.

## Review Notes
The Python snippets compile and execute successfully. The cost scripts are still simplified estimators: actual bills can vary by Region, architecture, purchase commitments, per-service data-transfer aggregation, provisioned IOPS/throughput, and optional service features.
