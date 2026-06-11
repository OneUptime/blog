# Validation Summary: Reserved Instances vs Savings Plans - Which One Should You Choose

## Status
validated

## Post Type
Guide / Comparison article

## Technologies Covered
- AWS Reserved Instances (Standard and Convertible)
- AWS Savings Plans (Compute, EC2 Instance, SageMaker)
- AWS EC2, Fargate, Lambda
- AWS RDS, ElastiCache, Redshift Reserved Instances/Nodes
- AWS Cost Explorer (via boto3)
- AWS Graviton instances
- AWS Spot Instances
- Python (boto3 SDK)

## Sources Consulted
- AWS Reserved Instances documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html
- AWS Savings Plans User Guide: https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html
- AWS Savings Plans pricing page: https://aws.amazon.com/savingsplans/pricing/
- AWS Reserved Instance Marketplace docs (Convertible RIs not eligible for resale)
- boto3 Cost Explorer reference: get_cost_and_usage API
- Python 3.12 datetime deprecation notes (datetime.utcnow() deprecation)
- AWS Graviton documentation (price-performance claims)

## Issues Found
1. **Misleading RI payment option discount percentages**: The original table claimed "up to 36%" for No Upfront, which is too low — 3-year No Upfront Standard RIs can actually deliver ~60%+ discount. The differences between payment options within the same term are typically only a few percentage points, not 30+. Updated the table to remove the misleading specific percentages for Partial/No Upfront and added a note clarifying that term length (1-year vs 3-year) is the bigger lever than payment option choice.
2. **Deprecated `datetime.utcnow()` usage**: This API has been deprecated since Python 3.12. Replaced `datetime.utcnow()` with `datetime.now(timezone.utc)` and added `timezone` to the import. Also refactored to call `now` once instead of twice for cleaner code.

## Review Notes
- The Compute Savings Plans coverage of EC2, Fargate, and Lambda is accurate.
- The "up to 72%" RI discount and "up to 66%" Compute SP discount figures match AWS's published marketing claims.
- The Convertible RIs not being eligible for Marketplace resale is accurate as of AWS's current policy.
- The boto3 Cost Explorer service name filter ("Amazon Elastic Compute Cloud - Compute") is correct.
- The p10 calculation in the Python example is a rough approximation rather than a true percentile (no interpolation), but is fine for this conservative commitment-sizing use case.
- The 20-40% Graviton price-performance improvement is consistent with AWS's "up to 40% better price-performance" marketing.
