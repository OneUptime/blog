# Validation Summary: How to Reduce EC2 Costs with Reserved Instances

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon EC2 Reserved Instances
- AWS Cost Explorer
- AWS CLI
- Boto3 for Python
- Amazon SNS
- AWS Savings Plans

## Sources Consulted
- AWS EC2 Reserved Instance Pricing: https://aws.amazon.com/ec2/pricing/reserved-instances/pricing/
- AWS EC2 Reserved Instances overview: https://docs.aws.amazon.com/AWSEC2/latest/DeveloperGuide/FAQs_Reserved_Instances.html
- AWS EC2 Types of Reserved Instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/reserved-instances-types.html
- AWS EC2 Modify Reserved Instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ri-modifying.html
- AWS CLI describe-reserved-instances-offerings: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-reserved-instances-offerings.html
- AWS CLI purchase-reserved-instances-offering: https://docs.aws.amazon.com/cli/latest/reference/ec2/purchase-reserved-instances-offering.html
- AWS CLI get-reserved-instances-exchange-quote: https://docs.aws.amazon.com/cli/latest/reference/ec2/get-reserved-instances-exchange-quote.html
- AWS CLI accept-reserved-instances-exchange-quote: https://docs.aws.amazon.com/cli/latest/reference/ec2/accept-reserved-instances-exchange-quote.html
- AWS CLI create-reserved-instances-listing: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-reserved-instances-listing.html
- Boto3 Cost Explorer get_reservation_coverage: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_reservation_coverage.html
- Boto3 Cost Explorer get_reservation_purchase_recommendation: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_reservation_purchase_recommendation.html
- AWS Savings Plans application order: https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html
- AWS EC2 Scheduled Instances API note: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_PurchaseScheduledInstances.html

## Issues Found
- Convertible RI discount was listed as up to 54%. AWS currently lists Convertible Reserved Instances as offering savings up to 66% compared to On-Demand, so the post was updated.
- The RI candidate script used `datetime.utcnow()` and stripped timezone information from AWS timestamps. Updated the snippet to use timezone-aware UTC datetimes with `datetime.now(timezone.utc)`.
- The RI candidate script used a single `describe_instances` call and could miss accounts with paginated results. Updated it to use the EC2 paginator.
- The RI candidate script derived the AWS Region by slicing the Availability Zone string, which is fragile for non-standard zone names. Updated it to use the configured EC2 client region.
- The RI candidate script used the raw EC2 `Platform` value, which returns `windows` only for Windows and omits Linux. Updated the display value to map Windows to `Windows` and default to `Linux/UNIX`.
- The Cost Explorer coverage snippet used naive UTC dates. Updated it to use timezone-aware UTC datetimes.
- The Convertible RI exchange command incorrectly passed `InstanceType` and `InstanceCount` to `accept-reserved-instances-exchange-quote`. AWS CLI requires target Convertible RI offering IDs, so the snippet now shows `get-reserved-instances-exchange-quote` and `accept-reserved-instances-exchange-quote` with `OfferingId`.
- The RI expiration script used naive UTC dates and stripped timezone information from AWS timestamps. Updated it to use timezone-aware UTC comparisons.
- The RI Marketplace listing command omitted the required `--client-token` argument. Added a UUID-based client token.

## Review Notes
- The AWS CLI is not installed in the local environment, so command validation was performed against the official AWS CLI command reference rather than local `aws --help` output.
- The fenced Python examples were syntax-checked with `python3` after edits.
- Scheduled Instances are no longer purchasable according to AWS documentation; the post's note that AWS is no longer offering new Scheduled RIs is consistent with that.
