# Validation Summary: How to Calculate TCO for AWS Migration

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS migration planning
- AWS Pricing Calculator
- AWS Migration Evaluator
- AWS Application Migration Service
- AWS Database Migration Service
- AWS Savings Plans and Reserved Instances
- AWS Compute Optimizer
- Amazon EC2 Spot Instances
- Amazon S3 storage classes
- Python
- Mermaid

## Sources Consulted
- AWS Pricing Calculator: https://aws.amazon.com/aws-cost-management/aws-pricing-calculator/
- AWS Migration Evaluator features: https://aws.amazon.com/migration-evaluator/features
- AWS Migration Evaluator, AWS Prescriptive Guidance: https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-tools/business-case-migration-evaluator.html
- AWS Savings Plans and Reserved Instances documentation: https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html
- AWS Compute Optimizer EC2 recommendations documentation: https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-ec2-recommendations.html
- Amazon EC2 Spot best practices documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS Prescriptive Guidance document history for CloudEndure Migration Factory: https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-factory-cloudendure/doc-history.html
- AWS Prescriptive Guidance document history for large migration strategy: https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-large-scale-migrations/doc-history.html
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/
- Python 3 execution check for the embedded Python examples.

## Issues Found
- The post referred to "AWS Migration Assessment Service," which is not the current product name used by AWS for TCO and migration business-case assessment. Changed it to "AWS Migration Evaluator" because AWS documents Migration Evaluator as the migration assessment service for creating a directional AWS business case.
- The post listed "CloudEndure" as migration tooling. AWS documentation states that CloudEndure Migration has been discontinued and replaced by AWS Application Migration Service for migration tooling. Changed the example to "AWS Application Migration Service, AWS DMS, etc."

## Review Notes
The Python snippets are syntactically valid and produce the stated staffing output. The AWS monthly cost estimator is intentionally rough and clearly tells readers to replace assumptions with actual AWS Pricing Calculator values. Savings claims for Savings Plans, Reserved Instances, Spot Instances, and Compute Optimizer are directionally consistent with AWS documentation, though exact savings depend on region, instance family, operating system, utilization, commitment term, payment option, and workload flexibility.
