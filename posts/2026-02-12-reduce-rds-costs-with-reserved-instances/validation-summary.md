# Validation Summary: How to Reduce RDS Costs with Reserved Instances

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon RDS
- RDS Reserved Instances
- AWS CLI
- AWS Cost Explorer
- Boto3 for Python
- Aurora Serverless v2
- CloudWatch metrics

## Sources Consulted
- Amazon RDS reserved DB instances user guide: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.html
- Amazon RDS reserved instances product page: https://aws.amazon.com/rds/reserved-instances
- Amazon RDS reserved DB instance purchasing guide: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.WorkingWith.html
- AWS CLI command reference for `describe-reserved-db-instances-offerings`: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-reserved-db-instances-offerings.html
- AWS CLI command reference for `purchase-reserved-db-instances-offering`: https://docs.aws.amazon.com/cli/latest/reference/rds/purchase-reserved-db-instances-offering.html
- Boto3 Cost Explorer `get_reservation_utilization` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_reservation_utilization.html
- AWS Cost Explorer API `GetReservationUtilization` reference: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetReservationUtilization.html
- AWS CLI command reference for `get-reservation-purchase-recommendation`: https://docs.aws.amazon.com/cli/latest/reference/ce/get-reservation-purchase-recommendation.html
- EC2 Reserved Instance Marketplace documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ri-market-general.html
- Aurora Serverless v2 scaling documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html
- AWS public pricing offer file for Amazon RDS: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/index.json

## Issues Found
- The post claimed RDS Reserved Instances can save up to 72%. AWS currently documents savings up to 69%, so the description, introduction, term range, and key takeaways were updated.
- The db.r6g.xlarge MySQL us-east-1 pricing table used outdated values and listed a 3-year No Upfront option. Current AWS pricing shows lower on-demand and reserved prices for Single-AZ MySQL db.r6g.xlarge, and AWS documents No Upfront RDS reservations as 1-year only. The table and opening annual cost estimate were updated.
- The initial matching explanation was too strict for size-flexible reservations. It now describes compatible attributes and notes that instance type or family matching depends on size flexibility.
- The size-flexibility normalization factors were incorrect. AWS documents `large` as 4 normalized units for Single-AZ, `xlarge` as 8, `2xlarge` as 16, and `4xlarge` as 32, so the table and example were corrected.
- The post said size flexibility does not apply to Multi-AZ deployments. AWS documents that reserved DB instance benefits apply to both Single-AZ and Multi-AZ configurations, so that statement was corrected.
- The post omitted Db2 from size-flexible RDS engines and did not distinguish Oracle BYOL from Oracle License Included. The engine list and exclusions were corrected.
- The Boto3 Cost Explorer script attempted to read `group['Attributes']['subscription_id']`, which is not the documented response shape. The script now reads the documented grouped result value and iterates all `UtilizationsByTime` entries.
- The post recommended selling unused RDS RIs on the AWS Reserved Instance Marketplace. AWS documents that RDS Reserved Instances cannot be sold on the EC2 Reserved Instance Marketplace and RDS reservations cannot be canceled, so the strategy was changed to planning for the full term and reusing compatible reservations.
- The Aurora Serverless v2 scale-to-zero note lacked a version caveat. AWS documents that scaling to 0 ACUs is available only on supported Aurora MySQL and PostgreSQL versions, so that caveat was added.

## Review Notes
The AWS CLI examples use current command names and options according to the AWS CLI reference. The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI documentation rather than local `--help` output.
