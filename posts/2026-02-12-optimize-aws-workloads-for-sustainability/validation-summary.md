# Validation Summary: How to Optimize AWS Workloads for Sustainability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Well-Architected Sustainability Pillar
- AWS Compute Optimizer
- Amazon EC2, EC2 Fleet, and Spot Instances
- AWS Graviton
- AWS Lambda
- AWS Fargate
- Amazon Aurora Serverless
- Instance Scheduler on AWS
- Amazon S3 lifecycle policies and compression
- Amazon EBS
- Amazon CloudFront
- AWS CodeBuild
- Amazon CloudWatch custom metrics
- Boto3 and AWS CLI

## Sources Consulted
- AWS Well-Architected Sustainability Pillar: https://docs.aws.amazon.com/wellarchitected/latest/sustainability-pillar/sustainability-pillar.html
- AWS CLI `compute-optimizer get-ec2-instance-recommendations`: https://docs.aws.amazon.com/cli/latest/reference/compute-optimizer/get-ec2-instance-recommendations.html
- AWS Graviton Savings Dashboard guidance: https://docs.aws.amazon.com/guidance/latest/cloud-intelligence-dashboards/graviton-savings-dashboard.html
- AWS CLI `ec2 run-instances`: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI `ec2 request-spot-fleet`: https://docs.aws.amazon.com/cli/latest/reference/ec2/request-spot-fleet.html
- AWS CLI `ec2 create-fleet`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-fleet.html
- Instance Scheduler on AWS CloudFormation templates: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/aws-cloudformation-templates.html
- Instance Scheduler on AWS solution overview: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/solution-overview.html
- AWS CLI `s3api put-bucket-lifecycle-configuration`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS CLI `cloudfront create-distribution`: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- AWS CodeBuild EC2 compute images: https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html
- Boto3 CloudWatch `put_metric_data`: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/put_metric_data.html
- AWS Billing Customer Carbon Footprint Tool documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ccft-overview.html

## Issues Found
- The Compute Optimizer CLI example used `Name=Finding,Values=OVER_PROVISIONED`, but the current API uses the lowercase filter keys `name` and `values`, and the EC2 finding value is `Overprovisioned`. Updated the command accordingly.
- The Compute Optimizer query labeled projected utilization as `Savings`, which was misleading because `projectedUtilizationMetrics` contains utilization metrics, not savings amounts. Renamed the output field to `ProjectedUtilization`.
- The Graviton `run-instances` example used an invalid AMI placeholder (`ami-0graviton-amazon-linux`). Replaced it with an AMI-ID-shaped placeholder so the command structure is valid.
- The Lambda example called an undefined `process_data` function. Replaced it with a simple `print` placeholder so the snippet is syntactically valid and self-contained.
- The Spot example used `request-spot-fleet`, which AWS CLI documentation now warns is a legacy API with no planned investment. Updated the example to use `ec2 create-fleet` with Spot target capacity and the recommended `price-capacity-optimized` allocation strategy.
- The Instance Scheduler CloudFormation `TemplateURL` had the wrong S3 solution path (`aws-instance-scheduler-on-aws`). Updated it to the documented `instance-scheduler-on-aws` path.
- The CloudFront distribution config omitted the required `Comment` field and lacked an explicit empty `CacheBehaviors` block. Added both to make the distribution configuration valid.
- The CodeBuild example used the older Amazon Linux 2 AArch64 image name. Updated it to the current Amazon Linux 2023 AArch64 standard image identifier.

## Review Notes
Python snippets were parsed successfully with `ast`. The AWS CLI is not installed in this workspace, so CLI command validation was performed against official AWS CLI documentation rather than local `aws --help` output.
