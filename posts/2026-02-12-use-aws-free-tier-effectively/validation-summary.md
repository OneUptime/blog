# Validation Summary: How to Use AWS Free Tier Effectively

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- AWS Free Tier
- AWS Billing and Cost Management
- AWS Budgets
- AWS CLI
- Amazon EC2
- Amazon EBS
- Amazon RDS
- AWS Lambda
- Amazon S3
- Amazon CloudFront
- Amazon DynamoDB
- Amazon CloudWatch Logs
- Elastic IP addresses and public IPv4 pricing
- NAT Gateway

## Sources Consulted
- AWS Free Tier page: https://aws.amazon.com/free/
- AWS Billing User Guide, Explore AWS services with AWS Free Tier: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html
- AWS Billing User Guide, Trying services using AWS Free Tier before July 15, 2025: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-free-tier.html
- AWS Billing User Guide, Tracking your AWS Free Tier usage: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/tracking-free-tier-usage.html
- AWS CLI Command Reference, `budgets create-budget`: https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html
- AWS CLI Command Reference, `freetier get-free-tier-usage`: https://docs.aws.amazon.com/cli/latest/reference/freetier/get-free-tier-usage.html
- Amazon EC2 User Guide, Track your Free Tier usage for Amazon EC2: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html
- AWS CLI Command Reference, `ec2 run-instances`: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Amazon RDS Free Tier: https://aws.amazon.com/rds/free/
- AWS CLI Command Reference, `rds create-db-instance`: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS Lambda pricing: https://aws.amazon.com/lambda/pricing/
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/
- Amazon CloudFront FAQs: https://aws.amazon.com/cloudfront/faqs/
- Amazon DynamoDB pricing: https://aws.amazon.com/dynamodb/pricing/
- Amazon EC2 User Guide, Elastic IP addresses: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- AWS News Blog, public IPv4 address charge: https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/
- Amazon CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/
- Amazon Inspector pricing: https://aws.amazon.com/inspector/pricing/
- Amazon Redshift pricing: https://aws.amazon.com/redshift/pricing/
- SageMaker AI pricing: https://aws.amazon.com/sagemaker-ai/pricing/

## Issues Found
- The post described AWS Free Tier as only three offer types. That is outdated for a 2026 post because AWS changed the program on July 15, 2025. Updated the framing to distinguish newer Free/Paid plan accounts from legacy pre-July 15, 2025 12-month Free Tier accounts.
- The EC2 section said t2.micro or t3.micro were generally included in the 750-hour free tier. Updated this to clarify legacy account behavior and note that newer accounts use a different eligible instance set.
- The RDS section implied a single db.t3.micro free-tier rule. Updated it to describe eligible single-AZ micro DB instances for legacy accounts and current Free plan eligible classes for supported engines.
- The billing alert snippet used `aws ce update-preferences` without required options and for the wrong purpose. Removed that invalid command and kept the console-based Free Tier alert instruction.
- The AWS Budgets snippet described an 80% Free Tier usage alert but configured a cost budget with `Threshold: 0.01`. Updated the comment and added `ThresholdType: "ABSOLUTE_VALUE"` so the example clearly alerts on monthly cost exceeding $0.01.
- Added `aws freetier get-free-tier-usage` as the current AWS CLI command for programmatic Free Tier usage visibility.
- The Redshift trial example was stale. Updated it to reflect the current Redshift Serverless $300 credit with 90-day expiration and the provisioned-cluster trial fallback where Redshift Serverless is unavailable.
- The S3 free tier section presented 12-month storage and request allowances without noting that they are legacy account rules. Updated the section opener.
- The Elastic IP guidance said an EIP attached to a running instance is free. That has been wrong since AWS began charging for all public IPv4 addresses on February 1, 2024. Updated the section to cover all public IPv4 and Elastic IP address charges, plus the legacy EC2 public IPv4 Free Tier allowance.
- The NAT Gateway monthly estimate was rounded and omitted the associated public IPv4 charge. Updated it to a us-east-1 example and mentioned the additional IPv4 charge.
- The CloudWatch Logs note omitted the monthly free allowance. Updated the wording to say ingestion after the allowance is commonly $0.50/GB in US regions.

## Review Notes
- The AWS CLI binary is not installed in the local environment, so CLI syntax was verified against official AWS CLI command reference pages rather than local `--help` output.
- AWS Free Tier eligibility and pricing vary by account creation date, plan type, region, service, and AWS account organization/billing setup. The post now calls out the largest 2026-era caveat, but readers should still verify the console's current "Free tier eligible" labels before launching paid resources.
