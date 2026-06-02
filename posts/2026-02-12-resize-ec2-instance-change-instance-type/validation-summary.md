# Validation Summary: How to Resize an EC2 Instance (Change Instance Type)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon EBS
- AWS CLI
- EC2 instance types
- Elastic IP addresses
- Elastic Load Balancing / Application Load Balancer health checks
- Amazon EC2 Auto Scaling
- AWS Compute Optimizer

## Sources Consulted
- AWS EC2 User Guide: Change the instance type for your Amazon EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/change-instance-type-of-ebs-backed-instance.html
- AWS EC2 User Guide: Compatibility for changing the instance type - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/resize-limitations.html
- AWS EC2 User Guide: Amazon EC2 instance state changes - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html
- AWS EC2 User Guide: How EC2 instance stop and start works - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-ec2-instance-stop-start-works.html
- AWS CLI Command Reference: ec2 modify-instance-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS CLI User Guide: Change an Amazon EC2 instance type with a bash script in the AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/cli-services-ec2-instance-type-script.html
- AWS Elastic Load Balancing Guide: Health checks for Application Load Balancer target groups - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- Amazon EC2 Auto Scaling User Guide: Set the health check grace period for an Auto Scaling group - https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-check-grace-period.html
- AWS Compute Optimizer User Guide: Viewing EC2 instance recommendations - https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-ec2-recommendations.html
- AWS CLI Command Reference: compute-optimizer get-ec2-instance-recommendations - https://docs.aws.amazon.com/cli/latest/reference/compute-optimizer/get-ec2-instance-recommendations.html

## Issues Found
- The CLI examples used `m7g` Graviton instance types without establishing that the source AMI and current instance architecture were ARM-compatible. Changed the examples to `m7i` types so the sample is consistent with a common x86 resize path and with the later architecture warning.
- The compatibility section said "Here are the restrictions" but omitted the AWS restriction that Spot Instance types cannot be changed. Added a concise note before the restriction list.
- The instance store note implied switching from an instance-store instance through the stop-modify-start path. AWS documents this process for EBS-backed instances, and instance store data is lost on stop/start. Scoped the warning to attached instance store volumes on an EBS-backed instance.
- The load balancer note referred to an ALB "health check grace period," which is an Auto Scaling group concept, not an ALB target group setting. Updated the wording to distinguish ALB healthy thresholds from Auto Scaling health check grace periods.

## Review Notes
- The AWS CLI is not installed in the local environment, so command validation was performed against the official AWS CLI documentation rather than local `aws --help` output.
- The post remains a concise guide and does not cover every AWS consideration, such as EBS volume attachment limits, NVMe driver preparation, Auto Scaling process suspension, or ENA Express compatibility. Those omissions are not blockers for validation, but they are useful future additions for production-focused guidance.
