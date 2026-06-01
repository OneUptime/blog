# Validation Summary: How to Use AWS Compute Optimizer to Right-Size EC2 Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Compute Optimizer
- Amazon EC2
- AWS CLI
- Amazon CloudWatch
- Amazon CloudWatch Agent
- Amazon EC2 Auto Scaling
- EC2 launch templates
- AWS Graviton

## Sources Consulted
- AWS CLI Command Reference: get-ec2-instance-recommendations - https://docs.aws.amazon.com/cli/latest/reference/compute-optimizer/get-ec2-instance-recommendations.html
- AWS CLI Command Reference: put-recommendation-preferences - https://docs.aws.amazon.com/cli/latest/reference/compute-optimizer/put-recommendation-preferences.html
- AWS Compute Optimizer User Guide: Viewing EC2 instance recommendations - https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-ec2-recommendations.html
- AWS Compute Optimizer User Guide: Enhanced infrastructure metrics - https://docs.aws.amazon.com/compute-optimizer/latest/ug/enhanced-infrastructure-metrics.html
- AWS Compute Optimizer User Guide: Resource requirements - https://docs.aws.amazon.com/compute-optimizer/latest/ug/requirements.html
- AWS Compute Optimizer User Guide: EC2 instance metrics - https://docs.aws.amazon.com/compute-optimizer/latest/ug/ec2-metrics-analyzed.html
- AWS Compute Optimizer API Reference: InstanceRecommendation - https://docs.aws.amazon.com/compute-optimizer/latest/APIReference/API_InstanceRecommendation.html
- AWS Compute Optimizer pricing - https://aws.amazon.com/compute-optimizer/pricing/
- AWS CLI Command Reference: modify-instance-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS Graviton documentation - https://docs.aws.amazon.com/whitepapers/latest/aws-graviton-performance-testing/what-is-aws-graviton.html

## Issues Found
- Corrected the performance risk scale from 1-5 to 0-4, matching the Compute Optimizer API and CLI documentation.
- Updated the initial recommendation timing from "about 12 hours" to "up to 24 hours" and added the EC2 requirement for at least 30 hours of CloudWatch metric data in the lookback period.
- Replaced invalid 9-digit sample AWS account IDs with 12-digit account IDs in ARNs and recommendation preference examples.
- Corrected the sample utilization metric enum casing from `CPU` / `MEMORY` and `MAXIMUM` to `Cpu` / `Memory` and `Maximum`.
- Updated the enhanced infrastructure metrics price from `$0.0003360219` to the current AWS-published `$0.0003360215` per resource-hour.
- Corrected the `Finding` filter value from `OVER_PROVISIONED` to `Overprovisioned`, which is the value documented for the AWS CLI filter.
- Clarified that the CloudWatch example checks EC2 CPU only; memory must come from CloudWatch agent metrics.
- Changed the Graviton price-performance claim from a broad "20-40%" statement to AWS's documented "up to 40%" wording.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI and AWS service documentation. The post's operational flow is technically sound, but production right-sizing should also account for platform differences in Compute Optimizer recommendations, such as architecture, storage interface, hypervisor, and instance store availability.
